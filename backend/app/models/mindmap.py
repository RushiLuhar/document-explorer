from pydantic import BaseModel, Field
from uuid import UUID, uuid4
from typing import Optional
from enum import Enum


class NodeType(str, Enum):
    ROOT = "root"
    SECTION = "section"
    SUBSECTION = "subsection"
    TOPIC = "topic"
    DETAIL = "detail"


class MindMapNode(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    document_id: UUID
    parent_id: Optional[UUID] = None
    title: str
    summary: str  # Shown when collapsed
    full_content: Optional[str] = None  # Loaded on expansion
    node_type: NodeType
    depth: int
    children_ids: list[UUID] = Field(default_factory=list)
    key_concepts: list[str] = Field(default_factory=list)
    has_children: bool = False
    page_start: Optional[int] = None
    page_end: Optional[int] = None
    position_x: float = 0
    position_y: float = 0

    class Config:
        from_attributes = True


class MindMapNodeResponse(BaseModel):
    id: str
    document_id: str
    parent_id: Optional[str] = None
    title: str
    summary: str
    full_content: Optional[str] = None
    node_type: NodeType
    depth: int
    children_ids: list[str]
    key_concepts: list[str]
    has_children: bool
    page_start: Optional[int] = None
    page_end: Optional[int] = None
    position_x: float
    position_y: float


class MindMapResponse(BaseModel):
    document_id: str
    nodes: list[MindMapNodeResponse]
    root_id: str


class NodeExpandRequest(BaseModel):
    include_content: bool = True


class NodeExpandResponse(BaseModel):
    node: MindMapNodeResponse
    children: list[MindMapNodeResponse]
