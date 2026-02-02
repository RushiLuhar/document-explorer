from app.services.claude_service import ClaudeService
from app.logging_config import get_logger

logger = get_logger(__name__)


class QAService:
    """Service for answering questions about document content."""

    def __init__(self):
        self.claude_service = ClaudeService()

    async def answer_question(self, question: str, context: str) -> dict:
        """
        Answer a question using the provided context.

        Args:
            question: The user's question
            context: Relevant document content

        Returns:
            dict with answer and confidence score
        """
        logger.info(f"Processing Q&A: '{question[:50]}...' with {len(context)} chars of context")
        result = await self.claude_service.answer_question(question, context)
        logger.info(f"Q&A complete, confidence: {result['confidence']}")
        return result
