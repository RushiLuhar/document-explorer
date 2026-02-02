from fastapi import APIRouter, HTTPException
from uuid import UUID

from app.models.mindmap import MindMapResponse, MindMapNodeResponse
from app.services.mindmap_generator import mindmap_store, nodes_store
from app.logging_config import get_logger

router = APIRouter()
logger = get_logger(__name__)


@router.get("/{document_id}", response_model=MindMapResponse)
async def get_mindmap(document_id: UUID, depth: int = 1):
    """
    Get mind-map for a document.

    Args:
        document_id: The document UUID
        depth: How many levels deep to return (default 1 = root + first level)
    """
    logger.info(f"[{document_id}] Mind-map request (depth={depth})")
    doc_id_str = str(document_id)

    if doc_id_str not in mindmap_store:
        logger.warning(f"[{document_id}] Mind-map not found")
        raise HTTPException(status_code=404, detail="Mind-map not found for this document")

    root_id = mindmap_store[doc_id_str]

    # Collect nodes up to specified depth
    nodes_to_return = []

    def collect_nodes(node_id: str, current_depth: int):
        if node_id not in nodes_store:
            return

        node = nodes_store[node_id]
        nodes_to_return.append(MindMapNodeResponse(
            id=str(node.id),
            document_id=str(node.document_id),
            parent_id=str(node.parent_id) if node.parent_id else None,
            title=node.title,
            summary=node.summary,
            full_content=node.full_content if current_depth == 0 else None,
            node_type=node.node_type,
            depth=node.depth,
            children_ids=[str(cid) for cid in node.children_ids],
            key_concepts=node.key_concepts,
            has_children=node.has_children,
            page_start=node.page_start,
            page_end=node.page_end,
            position_x=node.position_x,
            position_y=node.position_y,
        ))

        if current_depth < depth:
            for child_id in node.children_ids:
                collect_nodes(str(child_id), current_depth + 1)

    collect_nodes(root_id, 0)

    logger.info(f"[{document_id}] Returning {len(nodes_to_return)} nodes")
    return MindMapResponse(
        document_id=doc_id_str,
        nodes=nodes_to_return,
        root_id=root_id,
    )
