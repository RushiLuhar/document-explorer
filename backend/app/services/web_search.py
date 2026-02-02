import anthropic
from app.config import get_settings
from app.logging_config import get_logger

settings = get_settings()
logger = get_logger(__name__)


class WebSearchService:
    """Service for web search using Claude's built-in web search tool."""

    def __init__(self):
        self.client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)
        self.model = settings.claude_model_search

    async def search(self, query: str, max_results: int = 5) -> list[dict]:
        """
        Search the web for information about a topic using Claude's web search.

        Uses the web search model configured in settings.

        Args:
            query: Search query string
            max_results: Maximum number of results to return

        Returns:
            List of search results with title, url, and snippet
        """
        try:
            logger.info(f"Web search request: '{query}' (max_results={max_results})")

            # Use Claude with web search tool enabled
            # Tool type format: web_search_20250305 (as per latest API docs)
            response = await self.client.messages.create(
                model=self.model,
                max_tokens=2048,
                tools=[
                    {
                        "type": "web_search_20250305",
                        "name": "web_search",
                        "max_uses": max_results,
                    }
                ],
                messages=[
                    {
                        "role": "user",
                        "content": f"Search the web for: {query}",
                    }
                ],
            )

            logger.debug(f"Web search response received: {len(response.content)} content blocks")

            # Parse the response to extract search results
            # Response contains: text blocks, server_tool_use blocks, and web_search_tool_result blocks
            results = []

            for block in response.content:
                # Look for web_search_tool_result blocks
                if block.type == "web_search_tool_result":
                    # Check if content is an error
                    if hasattr(block, "content"):
                        # Handle error case
                        if isinstance(block.content, dict) and block.content.get("type") == "web_search_tool_result_error":
                            logger.warning(f"Web search error: {block.content.get('error_code')}")
                            continue

                        # Extract results from web_search_result items
                        if isinstance(block.content, list):
                            for result in block.content:
                                if hasattr(result, "type") and result.type == "web_search_result":
                                    results.append(
                                        {
                                            "title": getattr(result, "title", "") or "",
                                            "url": getattr(result, "url", "") or "",
                                            "snippet": getattr(result, "page_age", "") or "",
                                        }
                                    )

                # Also extract cited_text from citations in text blocks for snippets
                if block.type == "text" and hasattr(block, "citations"):
                    for citation in block.citations or []:
                        if hasattr(citation, "type") and citation.type == "web_search_result_location":
                            # Update snippet with cited_text if we have a matching URL
                            url = getattr(citation, "url", "")
                            cited_text = getattr(citation, "cited_text", "")
                            for result in results:
                                if result["url"] == url and cited_text:
                                    result["snippet"] = cited_text
                                    break

            # Limit to max_results
            logger.info(f"Web search complete: {len(results)} results found")
            return results[:max_results]

        except anthropic.APIError as e:
            logger.exception(f"Anthropic API error during web search: {e}")
            return []
        except Exception as e:
            logger.exception(f"Web search error: {e}")
            return []
