import cv2
import numpy as np
import logging
from typing import List, Dict

logger = logging.getLogger(__name__)

class Component:
    def __init__(self, id, type, bbox, text=""):
        self.id = id
        self.type = type
        self.bbox = bbox # (x, y, w, h)
        self.text = text
        self.children = []

    def to_dict(self):
        return {
            "id": self.id,
            "type": self.type,
            "bbox": self.bbox,
            "text": self.text,
            "children": [c.to_dict() for c in self.children]
        }

def detect_components(processed_data: dict) -> List[Component]:
    """
    Detect UI components from processed image data.
    
    Uses contour detection and rule-based classification to identify:
    - Buttons
    - Input fields
    - Checkboxes
    - Containers
    - Generic boxes
    """
    dilated = processed_data['dilated']
    original = processed_data['original']
    
    # Find contours using hierarchical retrieval to capture nested elements
    contours, hierarchy = cv2.findContours(dilated, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)
    logger.info(f"Found {len(contours)} raw contours")
    
    components = []
    noise_filtered = 0
    non_rect_filtered = 0
    
    # Filter and analyze contours
    for i, cnt in enumerate(contours):
        # Approximate the contour to reduce vertices
        epsilon = 0.04 * cv2.arcLength(cnt, True)
        approx = cv2.approxPolyDP(cnt, epsilon, True)
        
        # Bounding box
        x, y, w, h = cv2.boundingRect(approx)
        area = w * h
        aspect_ratio = float(w) / h
        
        # Filter noise (too small)
        if area < 500:
            noise_filtered += 1
            continue
            
        # Shape Analysis - focus on rectangles (4 vertices)
        if len(approx) == 4:
            comp_type = classify_shape(w, h, area, aspect_ratio, processed_data, x, y)
            if comp_type:
                # Create component with unique ID
                comp_id = f"comp_{len(components):03d}"
                components.append(Component(comp_id, comp_type, (x, y, w, h)))
        else:
            non_rect_filtered += 1
                
    logger.info(f"Detection pass: {len(components)} components, {noise_filtered} noise filtered, {non_rect_filtered} non-rectangles filtered")
    
    # Post-process to filter duplicates (inner/outer contours of thick borders)
    initial_count = len(components)
    components = filter_duplicates(components)
    duplicates_removed = initial_count - len(components)
    
    logger.info(f"Duplicate filtering: removed {duplicates_removed} duplicates, {len(components)} final components")
    
    # Log component type distribution
    type_counts = {}
    for comp in components:
        type_counts[comp.type] = type_counts.get(comp.type, 0) + 1
    logger.info(f"Component types: {type_counts}")
    
    return components

def filter_duplicates(components: List[Component], overlap_thresh=0.8) -> List[Component]:
    """
    Filter duplicate components caused by inner/outer contours of thick borders.
    
    Strategy:
    - Keep larger components when there's high overlap (IoU > 0.75)
    - Remove smaller components that are strongly contained within larger ones
    - Be more aggressive when component types match (likely same element)
    """
    if len(components) == 0:
        return []

    # Sort by area descending - prefer keeping larger components
    sorted_comps = sorted(components, key=lambda c: c.bbox[2] * c.bbox[3], reverse=True)
    
    keep = []
    filtered_count = 0
    
    for i, current in enumerate(sorted_comps):
        is_duplicate = False
        cx, cy, cw, ch = current.bbox
        c_area = cw * ch
        
        for kept in keep:
            kx, ky, kw, kh = kept.bbox
            k_area = kw * kh
            
            # Calculate intersection rectangle
            x_left = max(cx, kx)
            y_top = max(cy, ky)
            x_right = min(cx + cw, kx + kw)
            y_bottom = min(cy + ch, ky + kh)
            
            if x_right < x_left or y_bottom < y_top:
                intersection = 0
            else:
                intersection = (x_right - x_left) * (y_bottom - y_top)
            
            # Method 1: High Intersection over Union (same object detected twice)
            union = c_area + k_area - intersection
            iou = intersection / union if union > 0 else 0
            
            # Lowered threshold slightly to catch more duplicates
            if iou > 0.75:
                is_duplicate = True
                logger.debug(f"Filtering {current.id} (IoU={iou:.2f} with {kept.id})")
                break
                
            # Method 2: Strong containment (current is inside kept)
            # This catches inner contours of thick borders
            if intersection >= 0.80 * c_area:
                # If same type, be more aggressive (likely inner/outer border of same element)
                # If different type, be conservative (might be nested elements)
                size_ratio = c_area / k_area if k_area > 0 else 0
                
                if current.type == kept.type:
                    # Same type: remove if size is similar (>40% of kept)
                    if size_ratio > 0.4:
                        is_duplicate = True
                        logger.debug(f"Filtering {current.id} (contained in {kept.id}, same type)")
                        break
                else:
                    # Different type: only remove if very similar in size (>85%)
                    if size_ratio > 0.85:
                        is_duplicate = True
                        logger.debug(f"Filtering {current.id} (contained in {kept.id}, similar size)")
                        break
        
        if not is_duplicate:
            keep.append(current)
        else:
            filtered_count += 1
    
    logger.debug(f"Filtered {filtered_count} duplicate components")
    return keep

def classify_shape(w, h, area, ar, processed_data, x, y):
    """
    Rule-based classification of components.
    """
    # Checkbox: Small, roughly square
    if 200 < area < 2000 and 0.8 < ar < 1.2:
        return "checkbox"
        
    # Input field: Wide aspect ratio, moderate height
    if ar > 2.5 and h < 60: # Heuristic values need tuning
        return "input"
        
    # Button: Moderate aspect ratio, moderate size
    if 1.5 < ar < 4 and h > 30 and area < 20000:
        return "button"
        
    # Container: Large area
    if area > 40000:
        return "container"
        
    # Default fallback or Text/Label logic requires checking for text inside
    # For now return generic "box" or None if ambiguous
    return "box" # Placeholder
