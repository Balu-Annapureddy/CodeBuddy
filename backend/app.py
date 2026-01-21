from fastapi import FastAPI, UploadFile, File, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn
import io
import logging

from image_processing.preprocessor import process_image
from image_processing.detector import detect_components
from ocr.text_extractor import extract_text
from codegen.layout_engine import build_layout_tree
from codegen.html_gen import generate_html
from codegen.css_gen import generate_css
from codegen.html_gen_styled import generate_html_with_styles, generate_css_with_styles

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@app.get("/")
def read_root():
    return {"message": "CodeBuddy API is running"}

@app.post("/api/upload")
async def upload_image(file: UploadFile = File(...)):
    """
    Process uploaded image and convert to HTML/CSS
    """
    try:
        # Read image bytes
        image_bytes = await file.read()
        logger.info(f"Received image: {file.filename}, size: {len(image_bytes)} bytes")
        
        # Process image
        processed = process_image(image_bytes)
        
        # Detect components
        components = detect_components(processed['edges'])
        logger.info(f"Detected {len(components)} components")
        
        # Extract text for each component
        for comp in components:
            comp.text = extract_text(processed['original'], comp.bbox)
            if not comp.text:
                if comp.type == 'button':
                    comp.text = 'Button'
                elif comp.type == 'input':
                    comp.text = 'Enter text'
                elif comp.type == 'label':
                    comp.text = 'Label'
                elif comp.type == 'checkbox':
                    comp.text = 'Option'
        
        # Build layout tree
        layout_tree = build_layout_tree(components)
        
        # Generate HTML and CSS
        html = generate_html(layout_tree)
        css = generate_css()
        
        logger.info("Successfully generated HTML and CSS")
        
        return {
            "html": html,
            "css": css,
            "components": [
                {
                    "id": comp.id,
                    "type": comp.type,
                    "bbox": comp.bbox,
                    "text": comp.text
                } for comp in components
            ]
        }
    
    except Exception as e:
        logger.error(f"Error processing image: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/design")
async def convert_design(request: Request):
    """
    Convert canvas design data (JSON) to HTML/CSS
    Accepts shape data with styling properties
    """
    try:
        data = await request.json()
        shapes = data.get('shapes', [])
        
        if not shapes:
            raise HTTPException(status_code=400, detail="No shapes provided")
        
        logger.info(f"Processing {len(shapes)} shapes from canvas")
        
        # Convert shapes to components with styling
        components = []
        for i, shape in enumerate(shapes):
            comp_id = f"comp_{i:03d}"
            comp = {
                'id': comp_id,
                'type': shape.get('type', 'unknown'),
                'bbox': [
                    int(shape.get('x', 0)),
                    int(shape.get('y', 0)),
                    int(shape.get('w', 100)),
                    int(shape.get('h', 50))
                ],
                'text': shape.get('text', ''),
                'styles': {
                    'fillColor': shape.get('fillColor', 'transparent'),
                    'borderColor': shape.get('borderColor', '#000'),
                    'borderWidth': shape.get('borderWidth', 2),
                    'borderRadius': shape.get('borderRadius', 0),
                    'fontSize': shape.get('fontSize', 16),
                    'fontColor': shape.get('fontColor', '#000')
                }
            }
            components.append(comp)
        
        # Build layout tree
        layout_tree = build_layout_tree(components)
        
        # Generate HTML with styles
        html = generate_html_with_styles(layout_tree)
        
        # Generate CSS with custom styles
        css = generate_css_with_styles(components)
        
        logger.info("Successfully generated styled HTML and CSS")
        
        return {
            "html": html,
            "css": css,
            "components": components
        }
    
    except Exception as e:
        logger.error(f"Error processing design: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
