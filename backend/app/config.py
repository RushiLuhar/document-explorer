from pydantic_settings import BaseSettings
from functools import lru_cache
from pathlib import Path


class Settings(BaseSettings):
    # API settings
    api_v1_prefix: str = "/api/v1"
    project_name: str = "Claude Constitution Explorer"
    debug: bool = False

    # CORS
    cors_origins: list[str] = ["http://localhost:5173", "http://localhost:3000"]

    # Claude API
    anthropic_api_key: str = ""

    # Model configuration - separate models for different tasks
    #
    # Document processing model (structure extraction/mind-map generation)
    # Requires strong reasoning to understand document hierarchy and extract key concepts.
    # Recommended: claude-sonnet-4-5-20250929 (best intelligence/cost balance)
    # Alternative: claude-opus-4-5-20251101 (maximum intelligence for complex documents)
    claude_model_document: str = "claude-sonnet-4-5-20250929"

    # Q&A model (answering questions about document content)
    # Interactive use case where latency matters. Needs good comprehension.
    # Recommended: claude-haiku-4-5-20251001 (fastest, near-frontier intelligence)
    # Alternative: claude-sonnet-4-5-20250929 (for more nuanced answers)
    claude_model_qa: str = "claude-haiku-4-5-20251001"

    # Web search model (web search queries)
    # Simple task - invoke search tool and format results. Speed is priority.
    # Recommended: claude-haiku-4-5-20251001 (fastest and cheapest)
    claude_model_search: str = "claude-haiku-4-5-20251001"

    # File storage
    upload_dir: Path = Path("uploads")
    documents_dir: Path = Path("documents")
    max_upload_size: int = 50 * 1024 * 1024  # 50MB

    # Processing
    max_document_pages: int = 500

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache
def get_settings() -> Settings:
    return Settings()
