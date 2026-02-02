from fastapi import APIRouter, HTTPException

from app.models.schemas import WebSearchRequest, WebSearchResponse, WebSearchResult
from app.services.web_search import WebSearchService
from app.logging_config import get_logger

router = APIRouter()
logger = get_logger(__name__)
search_service = WebSearchService()


@router.post("/web", response_model=WebSearchResponse)
async def search_web(request: WebSearchRequest):
    """
    Search the web for information about a topic.

    This is useful for finding additional context about concepts
    mentioned in the document.
    """
    logger.info(f"Web search request: '{request.query}' (max_results={request.max_results})")
    try:
        results = await search_service.search(
            query=request.query,
            max_results=request.max_results,
        )

        logger.info(f"Web search completed: {len(results)} results")
        return WebSearchResponse(
            query=request.query,
            results=[
                WebSearchResult(
                    title=r["title"],
                    url=r["url"],
                    snippet=r["snippet"],
                )
                for r in results
            ],
        )
    except Exception as e:
        logger.exception(f"Web search failed: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Search failed: {str(e)}",
        )
