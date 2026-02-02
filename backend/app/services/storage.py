"""
Document storage service for file-based persistence.

Provides filesystem-based storage for documents and their mindmaps,
avoiding the need to reprocess documents on server restart.
"""

import hashlib
import json
import re
import shutil
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Optional
from uuid import UUID

from pydantic import BaseModel

from app.config import get_settings
from app.logging_config import get_logger
from app.models.mindmap import MindMapNode

logger = get_logger(__name__)
settings = get_settings()


class PersistedMindMap(BaseModel):
    """Schema for mindmap.json files."""
    version: str = "1.0"
    document_id: str
    content_hash: str
    original_filename: str
    page_count: int
    root_node_id: str
    nodes: list[dict]
    created_at: str
    last_modified: str


class AuditEntry(BaseModel):
    """Schema for audit log entries."""
    timestamp: str
    action: str
    details: dict


@dataclass
class DocumentInfo:
    """Information about a persisted document."""
    content_hash: str
    document_id: Optional[str]
    original_filename: str
    page_count: int
    created_at: str
    last_modified: str


class DocumentStorage:
    """
    Manages filesystem-based document persistence.

    Directory structure:
        documents/
            <content_hash>/
                original.pdf
                mindmap.json
                audit.log
    """

    MINDMAP_FILENAME = "mindmap.json"
    AUDIT_FILENAME = "audit.log"
    PDF_FILENAME = "original.pdf"

    def __init__(self, documents_dir: Optional[Path] = None):
        self.documents_dir = documents_dir or settings.documents_dir
        self._ensure_documents_dir()

    def _ensure_documents_dir(self):
        """Ensure the documents directory exists."""
        self.documents_dir.mkdir(parents=True, exist_ok=True)

        # Create .gitkeep if it doesn't exist
        gitkeep = self.documents_dir / ".gitkeep"
        if not gitkeep.exists():
            gitkeep.touch()

    def _validate_content_hash(self, content_hash: str) -> None:
        """
        Validate that content_hash is in the expected format.

        Prevents path traversal attacks by ensuring the hash contains
        only hexadecimal characters and is exactly 16 characters long.

        Args:
            content_hash: The hash to validate

        Raises:
            ValueError: If the hash format is invalid
        """
        if not re.match(r'^[a-f0-9]{16}$', content_hash):
            raise ValueError(f"Invalid content hash format: {content_hash}")

    def _get_document_folder(self, content_hash: str) -> Path:
        """Get the folder path for a document by its content hash."""
        self._validate_content_hash(content_hash)
        return self.documents_dir / content_hash

    def compute_content_hash(self, file_path: Path) -> str:
        """
        Compute SHA-256 hash of file contents, returning first 16 characters.

        Args:
            file_path: Path to the file to hash

        Returns:
            First 16 characters of the hex-encoded SHA-256 hash
        """
        sha256_hash = hashlib.sha256()
        with open(file_path, "rb") as f:
            for chunk in iter(lambda: f.read(8192), b""):
                sha256_hash.update(chunk)
        return sha256_hash.hexdigest()[:16]

    def document_exists(self, content_hash: str) -> bool:
        """
        Check if a document with the given content hash exists.

        Args:
            content_hash: The content hash to check

        Returns:
            True if document folder and mindmap.json exist
        """
        folder = self._get_document_folder(content_hash)
        mindmap_path = folder / self.MINDMAP_FILENAME
        return folder.exists() and mindmap_path.exists()

    def create_document_folder(self, content_hash: str, source_pdf: Path) -> Path:
        """
        Create a document folder and copy the source PDF.

        Args:
            content_hash: The content hash for the document
            source_pdf: Path to the source PDF file

        Returns:
            Path to the created document folder
        """
        folder = self._get_document_folder(content_hash)
        folder.mkdir(parents=True, exist_ok=True)

        # Copy PDF to folder
        dest_pdf = folder / self.PDF_FILENAME
        if not dest_pdf.exists():
            shutil.copy2(source_pdf, dest_pdf)
            logger.info(f"Copied PDF to {dest_pdf}")

        self._append_audit_log(content_hash, "document_created", {
            "source_path": str(source_pdf)
        })

        return folder

    def get_pdf_path(self, content_hash: str) -> Optional[Path]:
        """
        Get the path to the stored PDF for a document.

        Args:
            content_hash: The content hash of the document

        Returns:
            Path to the PDF file, or None if not found
        """
        folder = self._get_document_folder(content_hash)
        pdf_path = folder / self.PDF_FILENAME
        return pdf_path if pdf_path.exists() else None

    def save_mindmap(
        self,
        content_hash: str,
        document_id: str,
        original_filename: str,
        page_count: int,
        root_node_id: str,
        nodes: list[MindMapNode],
    ) -> None:
        """
        Save a mindmap to the document folder.

        Args:
            content_hash: Document content hash
            document_id: UUID of the document
            original_filename: Original uploaded filename
            page_count: Number of pages in the document
            root_node_id: ID of the root node
            nodes: List of all mindmap nodes
        """
        folder = self._get_document_folder(content_hash)
        folder.mkdir(parents=True, exist_ok=True)

        now = datetime.utcnow().isoformat()

        # Convert nodes to serializable format
        nodes_data = []
        for node in nodes:
            node_dict = node.model_dump()
            # Convert UUIDs to strings
            node_dict["id"] = str(node_dict["id"])
            node_dict["document_id"] = str(node_dict["document_id"])
            if node_dict["parent_id"]:
                node_dict["parent_id"] = str(node_dict["parent_id"])
            node_dict["children_ids"] = [str(cid) for cid in node_dict["children_ids"]]
            nodes_data.append(node_dict)

        mindmap = PersistedMindMap(
            version="1.0",
            document_id=document_id,
            content_hash=content_hash,
            original_filename=original_filename,
            page_count=page_count,
            root_node_id=root_node_id,
            nodes=nodes_data,
            created_at=now,
            last_modified=now,
        )

        mindmap_path = folder / self.MINDMAP_FILENAME
        with open(mindmap_path, "w") as f:
            f.write(mindmap.model_dump_json(indent=2))

        logger.info(f"Saved mindmap to {mindmap_path} with {len(nodes)} nodes")

        self._append_audit_log(content_hash, "mindmap_saved", {
            "document_id": document_id,
            "node_count": len(nodes),
            "root_node_id": root_node_id,
        })

    def load_mindmap(self, content_hash: str) -> Optional[PersistedMindMap]:
        """
        Load a mindmap from the document folder.

        Args:
            content_hash: Document content hash

        Returns:
            PersistedMindMap if found, None otherwise
        """
        folder = self._get_document_folder(content_hash)
        mindmap_path = folder / self.MINDMAP_FILENAME

        if not mindmap_path.exists():
            logger.debug(f"No mindmap found at {mindmap_path}")
            return None

        try:
            with open(mindmap_path, "r") as f:
                data = json.load(f)

            mindmap = PersistedMindMap(**data)
            logger.info(f"Loaded mindmap from {mindmap_path} with {len(mindmap.nodes)} nodes")

            self._append_audit_log(content_hash, "mindmap_loaded", {
                "document_id": mindmap.document_id,
                "node_count": len(mindmap.nodes),
            })

            return mindmap
        except Exception as e:
            logger.error(f"Failed to load mindmap from {mindmap_path}: {e}")
            return None

    def update_mindmap_nodes(self, content_hash: str, updated_nodes: list[MindMapNode]) -> bool:
        """
        Update specific nodes in a saved mindmap.

        Args:
            content_hash: Document content hash
            updated_nodes: List of nodes to update

        Returns:
            True if update succeeded, False otherwise
        """
        mindmap = self.load_mindmap(content_hash)
        if not mindmap:
            return False

        # Build a map of existing nodes
        nodes_map = {node["id"]: node for node in mindmap.nodes}

        # Update nodes
        for node in updated_nodes:
            node_dict = node.model_dump()
            node_dict["id"] = str(node_dict["id"])
            node_dict["document_id"] = str(node_dict["document_id"])
            if node_dict["parent_id"]:
                node_dict["parent_id"] = str(node_dict["parent_id"])
            node_dict["children_ids"] = [str(cid) for cid in node_dict["children_ids"]]
            nodes_map[node_dict["id"]] = node_dict

        # Update mindmap
        mindmap.nodes = list(nodes_map.values())
        mindmap.last_modified = datetime.utcnow().isoformat()

        # Save
        folder = self._get_document_folder(content_hash)
        mindmap_path = folder / self.MINDMAP_FILENAME
        with open(mindmap_path, "w") as f:
            f.write(mindmap.model_dump_json(indent=2))

        logger.info(f"Updated mindmap at {mindmap_path}")

        self._append_audit_log(content_hash, "mindmap_updated", {
            "updated_node_count": len(updated_nodes),
        })

        return True

    def list_documents(self) -> list[DocumentInfo]:
        """
        List all persisted documents.

        Returns:
            List of DocumentInfo objects for all valid documents
        """
        documents = []

        if not self.documents_dir.exists():
            return documents

        for folder in self.documents_dir.iterdir():
            if not folder.is_dir() or folder.name.startswith("."):
                continue

            mindmap_path = folder / self.MINDMAP_FILENAME
            if not mindmap_path.exists():
                continue

            try:
                with open(mindmap_path, "r") as f:
                    data = json.load(f)

                documents.append(DocumentInfo(
                    content_hash=folder.name,
                    document_id=data.get("document_id"),
                    original_filename=data.get("original_filename", "Unknown"),
                    page_count=data.get("page_count", 0),
                    created_at=data.get("created_at", ""),
                    last_modified=data.get("last_modified", ""),
                ))
            except Exception as e:
                logger.warning(f"Failed to read mindmap in {folder}: {e}")
                continue

        # Sort by last_modified, newest first
        documents.sort(key=lambda d: d.last_modified, reverse=True)

        return documents

    def get_audit_log(self, content_hash: str) -> list[AuditEntry]:
        """
        Get the audit log for a document.

        Args:
            content_hash: Document content hash

        Returns:
            List of audit entries, newest first
        """
        folder = self._get_document_folder(content_hash)
        audit_path = folder / self.AUDIT_FILENAME

        if not audit_path.exists():
            return []

        entries = []
        try:
            with open(audit_path, "r") as f:
                for line in f:
                    line = line.strip()
                    if line:
                        data = json.loads(line)
                        entries.append(AuditEntry(**data))
        except Exception as e:
            logger.error(f"Failed to read audit log from {audit_path}: {e}")

        # Return newest first
        entries.reverse()
        return entries

    def delete_document(self, content_hash: str) -> bool:
        """
        Delete a document and all its files.

        Args:
            content_hash: Document content hash

        Returns:
            True if deletion succeeded, False if document not found
        """
        folder = self._get_document_folder(content_hash)

        if not folder.exists():
            return False

        try:
            shutil.rmtree(folder)
            logger.info(f"Deleted document folder: {folder}")
            return True
        except Exception as e:
            logger.error(f"Failed to delete document folder {folder}: {e}")
            return False

    def _append_audit_log(self, content_hash: str, action: str, details: dict) -> None:
        """
        Append an entry to the audit log.

        Args:
            content_hash: Document content hash
            action: Action name (e.g., "document_created", "mindmap_saved")
            details: Additional details dict
        """
        folder = self._get_document_folder(content_hash)
        audit_path = folder / self.AUDIT_FILENAME

        entry = AuditEntry(
            timestamp=datetime.utcnow().isoformat(),
            action=action,
            details=details,
        )

        try:
            with open(audit_path, "a") as f:
                f.write(entry.model_dump_json() + "\n")
        except Exception as e:
            logger.warning(f"Failed to write audit log: {e}")


# Singleton instance
_storage: Optional[DocumentStorage] = None


def get_storage() -> DocumentStorage:
    """Get the singleton DocumentStorage instance."""
    global _storage
    if _storage is None:
        _storage = DocumentStorage()
    return _storage
