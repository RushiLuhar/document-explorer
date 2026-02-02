from pydantic import BaseModel, Field
from uuid import UUID, uuid4
from datetime import datetime
from enum import Enum
from typing import Optional


class ProcessingStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class Document(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    filename: str
    original_filename: str
    file_path: str
    page_count: int = 0
    status: ProcessingStatus = ProcessingStatus.PENDING
    error_message: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    processed_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class DocumentCreate(BaseModel):
    filename: str
    original_filename: str
    file_path: str


class DocumentResponse(BaseModel):
    id: UUID
    filename: str
    original_filename: str
    page_count: int
    status: ProcessingStatus
    error_message: Optional[str] = None
    created_at: datetime
    processed_at: Optional[datetime] = None


class DocumentStatusResponse(BaseModel):
    id: UUID
    status: ProcessingStatus
    error_message: Optional[str] = None
    progress: Optional[float] = None
