from fastapi import APIRouter, UploadFile, File, HTTPException, BackgroundTasks
from uuid import UUID, uuid4
import aiofiles
from pathlib import Path
from datetime import datetime

from app.config import get_settings
from app.logging_config import get_logger
from app.models.document import (
    Document,
    DocumentResponse,
    DocumentStatusResponse,
    DocumentListItem,
    AuditEntryResponse,
    ProcessingStatus,
)
from app.models.mindmap import MindMapNode
from app.services.pdf_processor import PDFProcessor
from app.services.mindmap_generator import MindMapGenerator, nodes_store, mindmap_store
from app.services.storage import get_storage, PersistedMindMap

router = APIRouter()
settings = get_settings()
logger = get_logger(__name__)

# In-memory storage for active documents (replace with database in production)
documents_store: dict[UUID, Document] = {}

# Track content_hash -> document_id mapping for loaded documents
hash_to_doc_id: dict[str, UUID] = {}


def _restore_mindmap_from_storage(mindmap: PersistedMindMap) -> str:
    """
    Restore a mindmap from persisted storage into in-memory stores.

    Args:
        mindmap: The persisted mindmap data

    Returns:
        The root node ID
    """
    from app.models.mindmap import NodeType

    # Clear any existing nodes for this document
    doc_id_str = mindmap.document_id

    # Restore nodes to in-memory store
    for node_data in mindmap.nodes:
        # Convert string IDs back to UUIDs in the MindMapNode
        node = MindMapNode(
            id=UUID(node_data["id"]),
            document_id=UUID(node_data["document_id"]),
            parent_id=UUID(node_data["parent_id"]) if node_data.get("parent_id") else None,
            title=node_data["title"],
            summary=node_data["summary"],
            full_content=node_data.get("full_content"),
            node_type=NodeType(node_data["node_type"]),
            depth=node_data["depth"],
            children_ids=[UUID(cid) for cid in node_data.get("children_ids", [])],
            key_concepts=node_data.get("key_concepts", []),
            has_children=node_data.get("has_children", False),
            page_start=node_data.get("page_start"),
            page_end=node_data.get("page_end"),
            position_x=node_data.get("position_x", 0),
            position_y=node_data.get("position_y", 0),
        )
        nodes_store[str(node.id)] = node

    # Restore document -> root mapping
    mindmap_store[doc_id_str] = mindmap.root_node_id

    logger.info(f"Restored {len(mindmap.nodes)} nodes from storage for document {doc_id_str}")

    return mindmap.root_node_id


async def process_document(document_id: UUID, content_hash: str):
    """Background task to process uploaded document."""
    logger.info(f"[{document_id}] Starting document processing")
    document = documents_store.get(document_id)
    if not document:
        logger.error(f"[{document_id}] Document not found in store")
        return

    storage = get_storage()

    try:
        document.status = ProcessingStatus.PROCESSING
        logger.info(f"[{document_id}] Status changed to PROCESSING")

        # Extract text from PDF
        logger.info(f"[{document_id}] Extracting text from PDF: {document.file_path}")
        pdf_processor = PDFProcessor()
        extracted_data = await pdf_processor.extract_text(document.file_path)

        document.page_count = extracted_data["page_count"]
        logger.info(f"[{document_id}] Extracted {document.page_count} pages, {len(extracted_data['text'])} characters")

        # Generate mind-map
        logger.info(f"[{document_id}] Generating mind-map structure with Claude API")
        generator = MindMapGenerator()
        root_node_id = await generator.generate_mindmap(document_id, extracted_data)
        logger.info(f"[{document_id}] Mind-map generated with root node: {root_node_id}")

        # Save mindmap to storage
        all_nodes = [node for node in nodes_store.values() if str(node.document_id) == str(document_id)]
        storage.save_mindmap(
            content_hash=content_hash,
            document_id=str(document_id),
            original_filename=document.original_filename,
            page_count=document.page_count,
            root_node_id=root_node_id,
            nodes=all_nodes,
        )
        logger.info(f"[{document_id}] Mindmap saved to storage with hash {content_hash}")

        # Track hash -> doc_id mapping
        hash_to_doc_id[content_hash] = document_id

        document.status = ProcessingStatus.COMPLETED
        document.processed_at = datetime.utcnow()
        logger.info(f"[{document_id}] Status changed to COMPLETED")

    except Exception as e:
        document.status = ProcessingStatus.FAILED
        document.error_message = str(e)
        logger.exception(f"[{document_id}] Processing failed: {e}")


@router.get("/", response_model=list[DocumentListItem])
async def list_documents():
    """List all persisted documents."""
    storage = get_storage()
    documents = storage.list_documents()

    return [
        DocumentListItem(
            content_hash=doc.content_hash,
            document_id=doc.document_id,
            original_filename=doc.original_filename,
            page_count=doc.page_count,
            created_at=doc.created_at,
            last_modified=doc.last_modified,
        )
        for doc in documents
    ]


@router.get("/{content_hash}/load", response_model=DocumentResponse)
async def load_document(content_hash: str):
    """
    Load a document from persistence.

    This restores the mindmap from storage without reprocessing.
    """
    storage = get_storage()

    if not storage.document_exists(content_hash):
        raise HTTPException(status_code=404, detail="Document not found")

    # Load mindmap from storage
    mindmap = storage.load_mindmap(content_hash)
    if not mindmap:
        raise HTTPException(status_code=500, detail="Failed to load mindmap")

    # Restore to in-memory stores
    _restore_mindmap_from_storage(mindmap)

    # Create/update document record
    doc_id = UUID(mindmap.document_id)
    document = Document(
        id=doc_id,
        filename=f"{doc_id}.pdf",
        original_filename=mindmap.original_filename,
        file_path=str(storage.get_pdf_path(content_hash) or ""),
        page_count=mindmap.page_count,
        status=ProcessingStatus.COMPLETED,
        processed_at=datetime.fromisoformat(mindmap.last_modified),
    )
    documents_store[doc_id] = document
    hash_to_doc_id[content_hash] = doc_id

    logger.info(f"Loaded document {doc_id} from storage (hash: {content_hash})")

    return DocumentResponse(
        id=document.id,
        filename=document.filename,
        original_filename=document.original_filename,
        page_count=document.page_count,
        status=document.status,
        created_at=document.created_at,
        processed_at=document.processed_at,
    )


@router.post("/upload", response_model=DocumentResponse)
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
):
    """Upload a PDF document for processing."""
    logger.info(f"Upload request received: {file.filename}")

    if not file.filename or not file.filename.lower().endswith(".pdf"):
        logger.warning(f"Rejected non-PDF file: {file.filename}")
        raise HTTPException(status_code=400, detail="Only PDF files are supported")

    storage = get_storage()

    # Save to temp location first to compute hash
    temp_doc_id = uuid4()
    temp_filename = f"{temp_doc_id}.pdf"
    temp_file_path = settings.upload_dir / temp_filename

    try:
        async with aiofiles.open(temp_file_path, "wb") as f:
            content = await file.read()
            if len(content) > settings.max_upload_size:
                logger.warning(f"File too large: {len(content)} bytes")
                raise HTTPException(status_code=400, detail="File too large")
            await f.write(content)
        logger.info(f"Saved temp file: {temp_file_path} ({len(content)} bytes)")
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Failed to save temp file: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")

    # Compute content hash
    content_hash = storage.compute_content_hash(temp_file_path)
    logger.info(f"Content hash: {content_hash}")

    # Check if document already exists
    if storage.document_exists(content_hash):
        logger.info(f"Document already exists with hash {content_hash}, loading from storage")

        # Clean up temp file
        temp_file_path.unlink(missing_ok=True)

        # Load existing document
        mindmap = storage.load_mindmap(content_hash)
        if mindmap:
            _restore_mindmap_from_storage(mindmap)

            doc_id = UUID(mindmap.document_id)
            document = Document(
                id=doc_id,
                filename=f"{doc_id}.pdf",
                original_filename=mindmap.original_filename,
                file_path=str(storage.get_pdf_path(content_hash) or ""),
                page_count=mindmap.page_count,
                status=ProcessingStatus.COMPLETED,
                processed_at=datetime.fromisoformat(mindmap.last_modified),
            )
            documents_store[doc_id] = document
            hash_to_doc_id[content_hash] = doc_id

            return DocumentResponse(
                id=document.id,
                filename=document.filename,
                original_filename=document.original_filename,
                page_count=document.page_count,
                status=document.status,
                created_at=document.created_at,
                processed_at=document.processed_at,
            )

    # Create document folder and copy PDF
    doc_id = uuid4()
    storage.create_document_folder(content_hash, temp_file_path)

    # Get the stored PDF path
    stored_pdf_path = storage.get_pdf_path(content_hash)
    if not stored_pdf_path:
        stored_pdf_path = temp_file_path

    # Clean up temp file if it was copied
    if stored_pdf_path != temp_file_path:
        temp_file_path.unlink(missing_ok=True)

    # Create document record
    document = Document(
        id=doc_id,
        filename=f"{doc_id}.pdf",
        original_filename=file.filename,
        file_path=str(stored_pdf_path),
    )
    documents_store[doc_id] = document
    hash_to_doc_id[content_hash] = doc_id
    logger.info(f"[{doc_id}] Document record created with status: {document.status}, hash: {content_hash}")

    # Start background processing
    background_tasks.add_task(process_document, doc_id, content_hash)
    logger.info(f"[{doc_id}] Background processing task scheduled")

    return DocumentResponse(
        id=document.id,
        filename=document.filename,
        original_filename=document.original_filename,
        page_count=document.page_count,
        status=document.status,
        created_at=document.created_at,
    )


@router.get("/{document_id}", response_model=DocumentResponse)
async def get_document(document_id: UUID):
    """Get document details."""
    document = documents_store.get(document_id)
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    return DocumentResponse(
        id=document.id,
        filename=document.filename,
        original_filename=document.original_filename,
        page_count=document.page_count,
        status=document.status,
        error_message=document.error_message,
        created_at=document.created_at,
        processed_at=document.processed_at,
    )


@router.get("/{document_id}/status", response_model=DocumentStatusResponse)
async def get_document_status(document_id: UUID):
    """Check document processing status."""
    document = documents_store.get(document_id)
    if not document:
        logger.warning(f"Status check for non-existent document: {document_id}")
        raise HTTPException(status_code=404, detail="Document not found")

    logger.debug(f"[{document_id}] Status check: {document.status}")

    return DocumentStatusResponse(
        id=document.id,
        status=document.status,
        error_message=document.error_message,
    )


@router.get("/{content_hash}/audit", response_model=list[AuditEntryResponse])
async def get_audit_log(content_hash: str):
    """
    Get audit log for a document.

    Note: This endpoint is only available in DEBUG mode.
    """
    if not settings.debug:
        raise HTTPException(status_code=403, detail="Audit log only available in debug mode")

    storage = get_storage()

    if not storage.document_exists(content_hash):
        raise HTTPException(status_code=404, detail="Document not found")

    entries = storage.get_audit_log(content_hash)

    return [
        AuditEntryResponse(
            timestamp=entry.timestamp,
            action=entry.action,
            details=entry.details,
        )
        for entry in entries
    ]


@router.delete("/{content_hash}")
async def delete_document(content_hash: str):
    """Delete a document and all its files."""
    storage = get_storage()

    if not storage.document_exists(content_hash):
        raise HTTPException(status_code=404, detail="Document not found")

    # Get the document ID if we have it
    doc_id = hash_to_doc_id.get(content_hash)

    # Remove from in-memory stores
    if doc_id:
        # Remove document record
        documents_store.pop(doc_id, None)

        # Remove nodes for this document
        doc_id_str = str(doc_id)
        nodes_to_remove = [
            node_id for node_id, node in nodes_store.items()
            if str(node.document_id) == doc_id_str
        ]
        for node_id in nodes_to_remove:
            nodes_store.pop(node_id, None)

        # Remove mindmap mapping
        mindmap_store.pop(doc_id_str, None)

        # Remove hash mapping
        hash_to_doc_id.pop(content_hash, None)

    # Delete from storage
    if not storage.delete_document(content_hash):
        raise HTTPException(status_code=500, detail="Failed to delete document")

    logger.info(f"Deleted document with hash {content_hash}")

    return {"status": "deleted", "content_hash": content_hash}
