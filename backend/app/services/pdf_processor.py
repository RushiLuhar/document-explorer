import fitz  # PyMuPDF
from pathlib import Path

from app.logging_config import get_logger

logger = get_logger(__name__)


class PDFProcessor:
    """Service for extracting text and structure from PDF documents."""

    async def extract_text(self, file_path: str) -> dict:
        """
        Extract text from a PDF file with page tracking.

        Returns:
            dict with:
                - text: Full document text
                - pages: List of page texts with page numbers
                - page_count: Total number of pages
        """
        logger.debug(f"Opening PDF: {file_path}")
        path = Path(file_path)
        if not path.exists():
            logger.error(f"PDF file not found: {file_path}")
            raise FileNotFoundError(f"PDF file not found: {file_path}")

        doc = fitz.open(file_path)
        logger.info(f"PDF opened successfully: {len(doc)} pages")

        pages = []
        full_text_parts = []

        for page_num in range(len(doc)):
            page = doc[page_num]
            text = page.get_text()

            pages.append({
                "page_number": page_num + 1,
                "text": text,
            })
            full_text_parts.append(text)
            logger.debug(f"Extracted page {page_num + 1}: {len(text)} characters")

        doc.close()
        total_chars = sum(len(p["text"]) for p in pages)
        logger.info(f"PDF extraction complete: {len(pages)} pages, {total_chars} total characters")

        return {
            "text": "\n\n".join(full_text_parts),
            "pages": pages,
            "page_count": len(pages),
        }

    async def extract_with_structure(self, file_path: str) -> dict:
        """
        Extract text with structural hints (headers, paragraphs).

        This attempts to identify document structure based on
        text formatting and layout.
        """
        path = Path(file_path)
        if not path.exists():
            raise FileNotFoundError(f"PDF file not found: {file_path}")

        doc = fitz.open(file_path)

        structured_content = []

        for page_num in range(len(doc)):
            page = doc[page_num]

            # Get text blocks with position info
            blocks = page.get_text("dict")["blocks"]

            for block in blocks:
                if "lines" not in block:
                    continue

                block_text = ""
                max_font_size = 0

                for line in block["lines"]:
                    for span in line["spans"]:
                        block_text += span["text"]
                        max_font_size = max(max_font_size, span["size"])
                    block_text += "\n"

                block_text = block_text.strip()
                if not block_text:
                    continue

                # Heuristic: larger fonts are likely headers
                block_type = "paragraph"
                if max_font_size > 14:
                    block_type = "header"
                elif max_font_size > 12:
                    block_type = "subheader"

                structured_content.append({
                    "type": block_type,
                    "text": block_text,
                    "page": page_num + 1,
                    "font_size": max_font_size,
                })

        doc.close()

        return {
            "structured_content": structured_content,
            "page_count": len(doc) if doc else 0,
        }
