from fastapi import APIRouter, HTTPException
from uuid import UUID

from app.models.schemas import QARequest, QAResponse
from app.services.qa_service import QAService
from app.services.mindmap_generator import mindmap_store, nodes_store
from app.logging_config import get_logger

router = APIRouter()
logger = get_logger(__name__)
qa_service = QAService()


@router.post("/{document_id}", response_model=QAResponse)
async def ask_question(document_id: UUID, request: QARequest):
    """
    Ask a question about a document.

    The question will be answered using the document content as context.
    Optionally specify a context_node_id to focus the answer on a specific
    part of the document.
    """
    logger.info(f"[{document_id}] Q&A request: '{request.question[:50]}...'")
    doc_id_str = str(document_id)

    if doc_id_str not in mindmap_store:
        logger.warning(f"[{document_id}] Document not found for Q&A")
        raise HTTPException(status_code=404, detail="Document not found")

    # Gather context from nodes
    context_nodes = []

    if request.context_node_id:
        # Use specific node and its children as context
        if request.context_node_id in nodes_store:
            node = nodes_store[request.context_node_id]
            context_nodes.append(node)
            # Add children for more context
            for child_id in node.children_ids:
                child_id_str = str(child_id)
                if child_id_str in nodes_store:
                    context_nodes.append(nodes_store[child_id_str])
    else:
        # Use all nodes as context (for general questions)
        root_id = mindmap_store[doc_id_str]

        def collect_all_nodes(node_id: str):
            if node_id in nodes_store:
                context_nodes.append(nodes_store[node_id])
                for child_id in nodes_store[node_id].children_ids:
                    collect_all_nodes(str(child_id))

        collect_all_nodes(root_id)

    if not context_nodes:
        logger.warning(f"[{document_id}] No context nodes found")
        raise HTTPException(status_code=404, detail="No context available for this document")

    # Build context text
    context_text = "\n\n".join([
        f"## {node.title}\n{node.full_content or node.summary}"
        for node in context_nodes
    ])

    logger.debug(f"[{document_id}] Using {len(context_nodes)} context nodes, {len(context_text)} chars")

    # Get answer from QA service
    answer = await qa_service.answer_question(
        question=request.question,
        context=context_text,
    )

    logger.info(f"[{document_id}] Q&A completed with confidence: {answer['confidence']}")
    return QAResponse(
        answer=answer["answer"],
        source_nodes=[str(n.id) for n in context_nodes[:5]],  # Top 5 relevant nodes
        confidence=answer["confidence"],
    )


@router.post("/{document_id}/node/{node_id}", response_model=QAResponse)
async def ask_question_about_node(
    document_id: UUID,
    node_id: UUID,
    request: QARequest,
):
    """
    Ask a question specifically about a node's content.

    This is a convenience endpoint that sets the context_node_id automatically.
    """
    request.context_node_id = str(node_id)
    return await ask_question(document_id, request)
