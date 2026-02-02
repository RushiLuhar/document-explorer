from pydantic import BaseModel
from typing import Optional


class QARequest(BaseModel):
    question: str
    context_node_id: Optional[str] = None


class QAResponse(BaseModel):
    answer: str
    source_nodes: list[str]  # Node IDs that were used as context
    confidence: float


class WebSearchRequest(BaseModel):
    query: str
    max_results: int = 5


class WebSearchResult(BaseModel):
    title: str
    url: str
    snippet: str


class WebSearchResponse(BaseModel):
    query: str
    results: list[WebSearchResult]


class ErrorResponse(BaseModel):
    detail: str
    error_code: Optional[str] = None
