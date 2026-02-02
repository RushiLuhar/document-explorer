from fastapi import APIRouter, HTTPException
from uuid import UUID

from app.models.mindmap import (
    MindMapNodeResponse,
    NodeExpandRequest,
    NodeExpandResponse,
)
from app.services.mindmap_generator import nodes_store
from app.logging_config import get_logger

router = APIRouter()
logger = get_logger(__name__)


@router.get("/{node_id}", response_model=MindMapNodeResponse)
async def get_node(node_id: UUID):
    """Get a specific node by ID."""
    logger.debug(f"Get node request: {node_id}")
    node_id_str = str(node_id)

    if node_id_str not in nodes_store:
        logger.warning(f"Node not found: {node_id}")
        raise HTTPException(status_code=404, detail="Node not found")

    node = nodes_store[node_id_str]

    return MindMapNodeResponse(
        id=str(node.id),
        document_id=str(node.document_id),
        parent_id=str(node.parent_id) if node.parent_id else None,
        title=node.title,
        summary=node.summary,
        full_content=node.full_content,
        node_type=node.node_type,
        depth=node.depth,
        children_ids=[str(cid) for cid in node.children_ids],
        key_concepts=node.key_concepts,
        has_children=node.has_children,
        page_start=node.page_start,
        page_end=node.page_end,
        position_x=node.position_x,
        position_y=node.position_y,
    )


@router.post("/{node_id}/expand", response_model=NodeExpandResponse)
async def expand_node(node_id: UUID, request: NodeExpandRequest = None):
    """
    Expand a node to get its details and children.

    This is the main endpoint for progressive disclosure - when a user
    clicks on a node to expand it, this returns the full content and
    immediate children.
    """
    logger.info(f"Expand node request: {node_id}")
    if request is None:
        request = NodeExpandRequest()

    node_id_str = str(node_id)

    if node_id_str not in nodes_store:
        logger.warning(f"Node not found for expansion: {node_id}")
        raise HTTPException(status_code=404, detail="Node not found")

    node = nodes_store[node_id_str]

    # Get children
    children = []
    for child_id in node.children_ids:
        child_id_str = str(child_id)
        if child_id_str in nodes_store:
            child = nodes_store[child_id_str]
            children.append(MindMapNodeResponse(
                id=str(child.id),
                document_id=str(child.document_id),
                parent_id=str(child.parent_id) if child.parent_id else None,
                title=child.title,
                summary=child.summary,
                full_content=None,  # Don't include full content for children
                node_type=child.node_type,
                depth=child.depth,
                children_ids=[str(cid) for cid in child.children_ids],
                key_concepts=child.key_concepts,
                has_children=child.has_children,
                page_start=child.page_start,
                page_end=child.page_end,
                position_x=child.position_x,
                position_y=child.position_y,
            ))

    logger.info(f"Node expanded: {node.title} with {len(children)} children")
    return NodeExpandResponse(
        node=MindMapNodeResponse(
            id=str(node.id),
            document_id=str(node.document_id),
            parent_id=str(node.parent_id) if node.parent_id else None,
            title=node.title,
            summary=node.summary,
            full_content=node.full_content if request.include_content else None,
            node_type=node.node_type,
            depth=node.depth,
            children_ids=[str(cid) for cid in node.children_ids],
            key_concepts=node.key_concepts,
            has_children=node.has_children,
            page_start=node.page_start,
            page_end=node.page_end,
            position_x=node.position_x,
            position_y=node.position_y,
        ),
        children=children,
    )
