"""
HTML generation with inline styles from canvas shape properties
"""

def escape_html(text):
    """Escape HTML special characters"""
    return (text.replace('&', '&amp;')
                .replace('<', '&lt;')
                .replace('>', '&gt;')
                .replace('"', '&quot;')
                .replace("'", '&#39;'))

def generate_html_with_styles(layout_node, indent=0):
    """
    Generate HTML from layout tree with inline styles from shape properties
    """
    indent_str = "  " * indent
    html_parts = []
    
    if layout_node.node_type == "root":
        html_parts.append(f'{indent_str}<div id="generated-content">')
        for child in layout_node.children:
            html_parts.append(generate_html_with_styles(child, indent + 1))
        html_parts.append(f'{indent_str}</div>')
    
    elif layout_node.node_type == "row":
        html_parts.append(f'{indent_str}<div class="row-container">')
        for child in layout_node.children:
            html_parts.append(generate_html_with_styles(child, indent + 1))
        html_parts.append(f'{indent_str}</div>')
    
    elif layout_node.node_type == "leaf" and layout_node.component:
        comp = layout_node.component
        comp_id = comp.get('id', 'unknown')
        comp_type = comp.get('type', 'unknown')
        text = comp.get('text', '')
        styles = comp.get('styles', {})
        
        # Build inline style string
        style_parts = []
        if styles.get('fillColor') and styles['fillColor'] != 'transparent':
            style_parts.append(f"background-color: {styles['fillColor']}")
        if styles.get('borderColor'):
            style_parts.append(f"border: {styles.get('borderWidth', 2)}px solid {styles['borderColor']}")
        if styles.get('borderRadius'):
            style_parts.append(f"border-radius: {styles['borderRadius']}px")
        if styles.get('fontSize'):
            style_parts.append(f"font-size: {styles['fontSize']}px")
        if styles.get('fontColor'):
            style_parts.append(f"color: {styles['fontColor']}")
        
        style_attr = f' style="{"; ".join(style_parts)}"' if style_parts else ''
        
        html_parts.append(f'{indent_str}<!-- {comp_id}: {comp_type} -->')
        
        if comp_type == 'rect':
            # Determine if it's a button or input based on aspect ratio
            bbox = comp.get('bbox', [0, 0, 100, 50])
            width, height = bbox[2], bbox[3]
            aspect_ratio = width / height if height > 0 else 1
            
            if aspect_ratio > 2.5:
                # Long rectangle → Input field
                placeholder = escape_html(text) if text else "Enter text"
                html_parts.append(f'{indent_str}<input type="text" class="input-field" placeholder="{placeholder}"{style_attr} />')
            else:
                # Regular rectangle → Button
                button_text = escape_html(text) if text else "Button"
                html_parts.append(f'{indent_str}<button class="btn"{style_attr}>{button_text}</button>')
        
        elif comp_type == 'text':
            # Standalone text → Label
            label_text = escape_html(text) if text else "Label"
            html_parts.append(f'{indent_str}<p class="text-label"{style_attr}>{label_text}</p>')
    
    return "\n".join(html_parts)

def generate_css_with_styles(components):
    """
    Generate base CSS (classes are still used for layout, inline styles for colors/fonts)
    """
    css = """/* Base Layout Styles */
#generated-content {
    padding: 20px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
}

.row-container {
    display: flex;
    flex-direction: row;
    gap: 12px;
    margin-bottom: 12px;
    align-items: center;
}

/* Button Styles */
.btn {
    padding: 10px 20px;
    cursor: pointer;
    font-weight: 500;
    transition: opacity 0.2s;
}

.btn:hover {
    opacity: 0.8;
}

/* Input Field Styles */
.input-field {
    padding: 10px 12px;
    font-size: 14px;
    outline: none;
}

.input-field:focus {
    outline: 2px solid #007bff;
    outline-offset: 2px;
}

/* Text Label Styles */
.text-label {
    margin: 0;
    line-height: 1.5;
}
"""
    return css
