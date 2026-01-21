from typing import List, Dict
import logging

logger = logging.getLogger(__name__)

class LayoutNode:
    def __init__(self, component=None, node_type="container", direction="column"):
        self.component = component # The component data if leaf
        self.node_type = node_type # container, row, column, leaf
        self.children = []
        self.direction = direction # row or column (flex-direction)
        self.styles = {} # CSS styles

    def add_child(self, node):
        self.children.append(node)

def build_layout_tree(components: List[Dict]) -> LayoutNode:
    """
    Constructs a layout tree from flat list of components.
    
    CRITICAL FIX: Ensures each component is used exactly once to prevent duplicate HTML elements.
    Uses component ID tracking and improved vertical overlap calculation.
    """
    # Root container
    root = LayoutNode(node_type="root", direction="column")
    
    if not components:
        logger.info("No components to layout")
        return root

    # Track which components have been added to the layout tree
    used_component_ids = set()
    
    # Sort components by Y coordinate (primary) and X (secondary)
    sorted_comps = sorted(components, key=lambda c: (c.bbox[1], c.bbox[0]))
    logger.info(f"Building layout tree from {len(sorted_comps)} components")
    
    # Group components into rows based on vertical overlap
    current_row = []
    rows = []
    
    if sorted_comps:
        current_row.append(sorted_comps[0])
        
        for i in range(1, len(sorted_comps)):
            curr = sorted_comps[i]
            
            # Calculate vertical overlap with the current row
            # Use the first element in the row as reference
            ref = current_row[0]
            ref_y, ref_h = ref.bbox[1], ref.bbox[3]
            curr_y, curr_h = curr.bbox[1], curr.bbox[3]
            
            # Calculate center Y positions
            ref_center_y = ref_y + ref_h / 2
            curr_center_y = curr_y + curr_h / 2
            
            # Check if centers are within a reasonable vertical distance
            # This is more robust than pure overlap for hand-drawn sketches
            vertical_distance = abs(curr_center_y - ref_center_y)
            avg_height = (ref_h + curr_h) / 2
            
            # If vertical distance is less than 60% of average height, consider same row
            if vertical_distance < 0.6 * avg_height:
                current_row.append(curr)
                logger.debug(f"Added component {curr.id} to current row (vertical distance: {vertical_distance:.1f})")
            else:
                # Start new row
                rows.append(current_row)
                logger.debug(f"Created row with {len(current_row)} components")
                current_row = [curr]
        
        # Don't forget the last row
        if current_row:
            rows.append(current_row)
            logger.debug(f"Created final row with {len(current_row)} components")

    logger.info(f"Grouped components into {len(rows)} rows")

    # Convert rows to LayoutNodes, ensuring no duplicates
    for row_idx, row_comps in enumerate(rows):
        # Sort row items by X coordinate (left to right)
        row_comps.sort(key=lambda c: c.bbox[0])
        
        if len(row_comps) > 1:
            # Multiple components in this row
            row_node = LayoutNode(node_type="row", direction="row")
            for comp in row_comps:
                # CRITICAL: Check if component already used
                if comp.id in used_component_ids:
                    logger.warning(f"Component {comp.id} already used! Skipping to prevent duplicate.")
                    continue
                
                leaf = LayoutNode(component=comp, node_type="leaf")
                row_node.add_child(leaf)
                used_component_ids.add(comp.id)
                logger.debug(f"Added component {comp.id} ({comp.type}) to row {row_idx}")
            
            # Only add row if it has children
            if row_node.children:
                root.add_child(row_node)
        else:
            # Single component in this row
            comp = row_comps[0]
            
            # CRITICAL: Check if component already used
            if comp.id in used_component_ids:
                logger.warning(f"Component {comp.id} already used! Skipping to prevent duplicate.")
                continue
            
            leaf = LayoutNode(component=comp, node_type="leaf")
            root.add_child(leaf)
            used_component_ids.add(comp.id)
            logger.debug(f"Added single component {comp.id} ({comp.type})")

    # Validation: Ensure all components were used exactly once
    if len(used_component_ids) != len(components):
        logger.error(f"Component count mismatch! Input: {len(components)}, Used: {len(used_component_ids)}")
    else:
        logger.info(f"✓ Layout tree built successfully: {len(used_component_ids)} components, {len(rows)} rows")

    return root

def analyze_spacing(layout_node):
    # Pass to calculate margins/padding
    pass
