import json
import re
import anthropic
from app.config import get_settings
from app.logging_config import get_logger

settings = get_settings()
logger = get_logger(__name__)


class ClaudeService:
    """Wrapper for Claude API interactions."""

    def __init__(self):
        # Use AsyncAnthropic for async operations
        self.client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)
        self.model_document = settings.claude_model_document
        self.model_qa = settings.claude_model_qa

    async def generate_structure(self, document_text: str) -> dict:
        """
        Analyze document and generate hierarchical structure for mind-map.

        Uses the document processing model configured in settings.

        Returns a nested structure representing the document's organization.
        """
        system_prompt = """You are a document analysis expert. Your task is to analyze documents and create hierarchical structures suitable for mind-map visualizations.

Always respond with valid JSON only, no additional text or markdown code blocks."""

        user_prompt = f"""Analyze this document and create a hierarchical structure for a mind-map visualization.

For each node, provide:
- title: A concise title (max 50 chars)
- summary: A 1-2 sentence summary of the content
- full_content: The complete relevant text from the document
- key_concepts: List of 2-5 key concepts/terms
- children: Nested child nodes (if any)

Return a JSON object with this structure:
{{
    "title": "Document Title",
    "summary": "Brief document overview",
    "full_content": "Full overview text",
    "key_concepts": ["concept1", "concept2"],
    "children": [
        {{
            "title": "Section 1",
            "summary": "Section summary",
            "full_content": "Full section content",
            "key_concepts": ["concept"],
            "children": [...]
        }}
    ]
}}

Important:
- Create a logical hierarchy that reflects the document's structure
- Each section should have meaningful, distinct content
- Limit depth to 4 levels maximum
- Include page numbers if identifiable from the text

Document text:
{document_text[:50000]}"""

        try:
            logger.info(f"Calling Claude API for structure generation (model: {self.model_document})")
            logger.debug(f"Document text length: {len(document_text)} characters")

            message = await self.client.messages.create(
                model=self.model_document,
                max_tokens=8000,
                system=system_prompt,
                messages=[
                    {"role": "user", "content": user_prompt}
                ],
            )

            # Extract JSON from response
            response_text = message.content[0].text
            logger.info(f"Claude API response received: {len(response_text)} characters")
            logger.debug(f"API usage: input_tokens={message.usage.input_tokens}, output_tokens={message.usage.output_tokens}")

            # Try to parse JSON from the response
            # First try direct parsing
            try:
                result = json.loads(response_text)
                logger.info(f"Successfully parsed JSON response: {result.get('title', 'Unknown')}")
                return result
            except json.JSONDecodeError:
                logger.debug("Direct JSON parsing failed, trying to extract from markdown")

            # Try to find JSON in the response (may be wrapped in markdown)
            json_match = re.search(r'\{[\s\S]*\}', response_text)
            if json_match:
                try:
                    result = json.loads(json_match.group())
                    logger.info(f"Extracted JSON from markdown: {result.get('title', 'Unknown')}")
                    return result
                except json.JSONDecodeError:
                    logger.warning("Failed to parse extracted JSON")

            # Fallback structure if parsing fails
            logger.warning("Could not parse response as JSON, using fallback structure")
            return {
                "title": "Document",
                "summary": "Document content",
                "full_content": document_text[:1000],
                "key_concepts": [],
                "children": [],
            }

        except anthropic.APIError as e:
            logger.exception(f"Anthropic API error in generate_structure: {e}")
            return {
                "title": "Error",
                "summary": f"Failed to process document: {str(e)}",
                "full_content": "",
                "key_concepts": [],
                "children": [],
            }

    async def answer_question(self, question: str, context: str) -> dict:
        """
        Answer a question based on the provided context.

        Uses the Q&A model configured in settings.

        Returns the answer and a confidence score.
        """
        system_prompt = """You are a helpful assistant that answers questions based on provided document content.

Always base your answers on the provided context. If the answer cannot be found in the context, clearly state that.

Format your response as:
ANSWER: [Your detailed answer here]
CONFIDENCE: [A number from 0.0 to 1.0]"""

        user_prompt = f"""Document content:
{context[:30000]}

Question: {question}

Provide a clear, accurate answer based only on the information in the document above."""

        try:
            logger.info(f"Calling Claude API for Q&A (model: {self.model_qa})")
            logger.debug(f"Question: {question[:100]}...")

            message = await self.client.messages.create(
                model=self.model_qa,
                max_tokens=2000,
                system=system_prompt,
                messages=[
                    {"role": "user", "content": user_prompt}
                ],
            )

            response_text = message.content[0].text
            logger.info(f"Q&A response received: {len(response_text)} characters")
            logger.debug(f"API usage: input_tokens={message.usage.input_tokens}, output_tokens={message.usage.output_tokens}")

            # Parse response
            answer = response_text
            confidence = 0.8  # Default confidence

            if "ANSWER:" in response_text:
                parts = response_text.split("CONFIDENCE:")
                answer = parts[0].replace("ANSWER:", "").strip()
                if len(parts) > 1:
                    try:
                        # Extract the confidence number
                        conf_str = parts[1].strip()
                        # Handle cases like "0.9" or "0.9 - high confidence"
                        conf_match = re.search(r'(\d+\.?\d*)', conf_str)
                        if conf_match:
                            confidence = float(conf_match.group(1))
                    except ValueError:
                        pass

            logger.info(f"Q&A completed with confidence: {confidence}")
            return {
                "answer": answer,
                "confidence": min(max(confidence, 0.0), 1.0),
            }

        except anthropic.APIError as e:
            logger.exception(f"Anthropic API error in answer_question: {e}")
            return {
                "answer": f"Sorry, I encountered an error while processing your question: {str(e)}",
                "confidence": 0.0,
            }
