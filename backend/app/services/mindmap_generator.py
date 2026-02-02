from uuid import UUID, uuid4
from typing import Optional

from app.models.mindmap import MindMapNode, NodeType
from app.services.claude_service import ClaudeService
from app.logging_config import get_logger

logger = get_logger(__name__)

# In-memory storage for nodes (replace with database in production)
nodes_store: dict[str, MindMapNode] = {}
mindmap_store: dict[str, str] = {}  # document_id -> root_node_id


class MindMapGenerator:
    """Service for generating mind-map structures from documents."""

    def __init__(self):
        self.claude_service = ClaudeService()

    async def generate_mindmap(self, document_id: UUID, extracted_data: dict) -> str:
        """
        Generate a mind-map from extracted document data.

        Args:
            document_id: The document UUID
            extracted_data: Data from PDF processor with text and pages

        Returns:
            The root node ID
        """
        logger.info(f"[{document_id}] Starting mind-map generation")

        # Use Claude to analyze structure
        logger.info(f"[{document_id}] Requesting structure analysis from Claude")
        structure = await self.claude_service.generate_structure(
            extracted_data["text"]
        )
        logger.info(f"[{document_id}] Structure received: {structure.get('title', 'Unknown')}")

        # Convert structure to nodes
        logger.info(f"[{document_id}] Creating nodes from structure")
        root_node = self._create_nodes_from_structure(
            document_id=document_id,
            structure=structure,
            parent_id=None,
            depth=0,
        )
        logger.info(f"[{document_id}] Created {len(nodes_store)} total nodes")

        # Calculate positions for layout
        logger.debug(f"[{document_id}] Calculating node positions")
        self._calculate_positions(str(root_node.id))

        # Store mapping
        mindmap_store[str(document_id)] = str(root_node.id)
        logger.info(f"[{document_id}] Mind-map complete, root node: {root_node.id}")

        return str(root_node.id)

    def _create_nodes_from_structure(
        self,
        document_id: UUID,
        structure: dict,
        parent_id: Optional[UUID],
        depth: int,
    ) -> MindMapNode:
        """Recursively create nodes from the structure."""
        # Determine node type based on depth
        node_type = NodeType.ROOT
        if depth == 1:
            node_type = NodeType.SECTION
        elif depth == 2:
            node_type = NodeType.SUBSECTION
        elif depth == 3:
            node_type = NodeType.TOPIC
        elif depth >= 4:
            node_type = NodeType.DETAIL

        node_id = uuid4()
        children = structure.get("children", [])

        node = MindMapNode(
            id=node_id,
            document_id=document_id,
            parent_id=parent_id,
            title=structure.get("title", "Untitled"),
            summary=structure.get("summary", ""),
            full_content=structure.get("full_content"),
            node_type=node_type,
            depth=depth,
            children_ids=[],
            key_concepts=structure.get("key_concepts", []),
            has_children=len(children) > 0,
            page_start=structure.get("page_start"),
            page_end=structure.get("page_end"),
        )

        # Store node
        nodes_store[str(node_id)] = node

        # Create children
        for child_structure in children:
            child_node = self._create_nodes_from_structure(
                document_id=document_id,
                structure=child_structure,
                parent_id=node_id,
                depth=depth + 1,
            )
            node.children_ids.append(child_node.id)

        return node

    def _calculate_positions(self, root_id: str, x: float = 0, y: float = 0):
        """
        Calculate x, y positions for nodes in a radial layout.

        This creates a tree layout where:
        - Root is at center
        - Children spread out radially
        - Deeper levels are further from center
        """
        import math

        if root_id not in nodes_store:
            return

        root = nodes_store[root_id]
        root.position_x = x
        root.position_y = y

        if not root.children_ids:
            return

        # Calculate positions for children
        num_children = len(root.children_ids)
        radius = 200 + (root.depth * 100)  # Increase radius with depth

        for i, child_id in enumerate(root.children_ids):
            angle = (2 * math.pi * i / num_children) - (math.pi / 2)  # Start from top

            child_x = x + radius * math.cos(angle)
            child_y = y + radius * math.sin(angle)

            child_id_str = str(child_id)
            if child_id_str in nodes_store:
                nodes_store[child_id_str].position_x = child_x
                nodes_store[child_id_str].position_y = child_y

                # Recursively position children
                self._calculate_positions(child_id_str, child_x, child_y)

    def _calculate_tree_positions(self, root_id: str):
        """
        Alternative: Calculate positions for a horizontal tree layout.
        """
        if root_id not in nodes_store:
            return

        # Track vertical position per depth level
        depth_y_positions: dict[int, float] = {}
        horizontal_spacing = 300
        vertical_spacing = 100

        def position_node(node_id: str, x: float):
            if node_id not in nodes_store:
                return 0

            node = nodes_store[node_id]
            node.position_x = x

            # Get or initialize y position for this depth
            if node.depth not in depth_y_positions:
                depth_y_positions[node.depth] = 0

            if not node.children_ids:
                node.position_y = depth_y_positions[node.depth]
                depth_y_positions[node.depth] += vertical_spacing
                return node.position_y

            # Position children first
            child_y_positions = []
            for child_id in node.children_ids:
                child_y = position_node(str(child_id), x + horizontal_spacing)
                child_y_positions.append(child_y)

            # Center parent among children
            node.position_y = sum(child_y_positions) / len(child_y_positions)
            return node.position_y

        position_node(root_id, 0)
