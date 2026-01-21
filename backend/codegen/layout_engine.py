from typing import List, Dict
import logging

logger = logging.getLogger(__name__)

class LayoutNode:
    def __init__(self, node_type="container", component=None):
        self.node_type = node_type  # "root", "row", "leaf"
        self.component = component
        self.children = []

    def add_child(self, node):
        self.children.append(node)

def build_layout_tree(components):
    """
    Build a layout tree from components (handles both dict and object format)
    """
    root = LayoutNode("root")
    
    if not components:
        return root
    
    # Helper to get bbox from either dict or object
    def get_bbox(comp):
        if isinstance(comp, dict):
            return comp.get('bbox', [0, 0, 100, 50])
        return comp.bbox
    
    # Sort by Y position
    sorted_comps = sorted(components, key=lambda c: get_bbox(c)[1])
    
    # Group into rows
    rows = []
    current_row = [sorted_comps[0]]
    
    for comp in sorted_comps[1:]:
        comp_bbox = get_bbox(comp)
        row_bbox = get_bbox(current_row[0])
        
        # Check vertical overlap
        if abs(comp_bbox[1] - row_bbox[1]) < row_bbox[3] * 0.5:
            current_row.append(comp)
        else:
            rows.append(current_row)
            current_row = [comp]
    
    rows.append(current_row)
    
    # Build tree
    for row in rows:
        if len(row) == 1:
            root.add_child(LayoutNode("leaf", row[0]))
        else:
            row_node = LayoutNode("row")
            sorted_row = sorted(row, key=lambda c: get_bbox(c)[0])
            for comp in sorted_row:
                row_node.add_child(LayoutNode("leaf", comp))
            root.add_child(row_node)
    
    return root
