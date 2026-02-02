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
    ProcessingStatus,
)
from app.services.pdf_processor import PDFProcessor
from app.services.mindmap_generator import MindMapGenerator

router = APIRouter()
settings = get_settings()
logger = get_logger(__name__)

# In-memory storage (replace with database in production)
documents_store: dict[UUID, Document] = {}


async def process_document(document_id: UUID):
    """Background task to process uploaded document."""
    logger.info(f"[{document_id}] Starting document processing")
    document = documents_store.get(document_id)
    if not document:
        logger.error(f"[{document_id}] Document not found in store")
        return

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

        document.status = ProcessingStatus.COMPLETED
        document.processed_at = datetime.utcnow()
        logger.info(f"[{document_id}] Status changed to COMPLETED")

    except Exception as e:
        document.status = ProcessingStatus.FAILED
        document.error_message = str(e)
        logger.exception(f"[{document_id}] Processing failed: {e}")


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

    # Generate unique filename
    doc_id = uuid4()
    filename = f"{doc_id}.pdf"
    file_path = settings.upload_dir / filename

    # Save file
    try:
        async with aiofiles.open(file_path, "wb") as f:
            content = await file.read()
            if len(content) > settings.max_upload_size:
                logger.warning(f"File too large: {len(content)} bytes")
                raise HTTPException(status_code=400, detail="File too large")
            await f.write(content)
        logger.info(f"[{doc_id}] Saved file: {file_path} ({len(content)} bytes)")
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"[{doc_id}] Failed to save file: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")

    # Create document record
    document = Document(
        id=doc_id,
        filename=filename,
        original_filename=file.filename,
        file_path=str(file_path),
    )
    documents_store[doc_id] = document
    logger.info(f"[{doc_id}] Document record created with status: {document.status}")

    # Start background processing
    background_tasks.add_task(process_document, doc_id)
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
