from .layout_engine import LayoutNode

def generate_html(layout_node: LayoutNode, indent_level=0) -> str:
    """
    Recursively generate semantic HTML from the layout tree.
    
    Includes component ID comments for debugging and ensures proper indentation.
    """
    indent = "  " * indent_level
    
    if layout_node.node_type == "root":
        # Root container
        inner_html = ""
        for child in layout_node.children:
            inner_html += generate_html(child, indent_level)
        return inner_html

    if layout_node.node_type == "row":
        # Row container with flexbox layout
        inner = ""
        for child in layout_node.children:
            inner += generate_html(child, indent_level + 1)
        return f'{indent}<div class="row-container">\n{inner}{indent}</div>\n'
        
    if layout_node.node_type == "leaf":
        # Leaf node - actual UI component
        return generate_component_html(layout_node.component, indent_level)
        
    return ""

def generate_component_html(component, indent_level):
    """
    Generate semantic HTML for a single component.
    
    Includes component ID as HTML comment for debugging.
    Ensures proper semantic tags and attributes.
    """
    indent = "  " * indent_level
    c_type = component.type
    c_id = component.id
    text = component.text or ""
    
    # Add component ID comment for debugging
    comment = f'{indent}<!-- {c_id}: {c_type} -->\n'
    
    if c_type == "button":
        # Semantic button element
        safe_text = escape_html(text) if text else "Button"
        return f'{comment}{indent}<button class="btn">{safe_text}</button>\n'
    
    if c_type == "input":
        # Input field with placeholder
        safe_placeholder = escape_html(text) if text else "Enter text..."
        return f'{comment}{indent}<input type="text" class="input-field" placeholder="{safe_placeholder}" />\n'
    
    if c_type == "label":
        # Label element
        safe_text = escape_html(text) if text else "Label"
        return f'{comment}{indent}<label class="text-label">{safe_text}</label>\n'
    
    if c_type == "checkbox":
        # Checkbox with label
        safe_text = escape_html(text) if text else "Option"
        return f'{comment}{indent}<div class="checkbox-wrapper">\n{indent}  <input type="checkbox" id="{c_id}" />\n{indent}  <label for="{c_id}">{safe_text}</label>\n{indent}</div>\n'
    
    if c_type == "container":
        # Container/card element
        return f'{comment}{indent}<div class="card">\n{indent}  <!-- Container content -->\n{indent}</div>\n'
    
    # Fallback for unknown types
    return f'{comment}{indent}<div class="unknown-box" data-type="{c_type}"><!-- Unknown component type --></div>\n'

def escape_html(text: str) -> str:
    """
    Escape HTML special characters to prevent malformed output.
    """
    if not text:
        return ""
    return (text
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
        .replace("'", "&#39;")
    )
