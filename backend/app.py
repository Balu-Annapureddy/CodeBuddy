from fastapi import FastAPI, UploadFile, File, HTTPException
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

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("CodeBuddyAPI")

@app.get("/")
def read_root():
    return {"message": "CodeBuddy API is running"}

@app.post("/api/upload")
async def upload_image(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        logger.info(f"Received image: {len(contents)} bytes")
        
        # 1. Preprocess
        processed_data = process_image(contents)
        
        # 2. Detect Components
        # Pass the original image data through to help with classification if needed
        components = detect_components(processed_data)
        logger.info(f"Detected {len(components)} components")
        
        # 3. OCR Extraction
        # Run OCR on each detected component's bbox in the original image
        original_image = processed_data['original']
        for comp in components:
            if comp.type in ['button', 'label', 'checkbox', 'input']:
                # Extract text for these types
                text = extract_text(original_image, comp.bbox)
                
                # Apply fallback text if OCR failed or returned empty
                if text:
                    comp.text = text
                else:
                    # Provide meaningful fallback based on component type
                    fallback_map = {
                        'button': 'Button',
                        'input': 'Enter text',
                        'label': 'Label',
                        'checkbox': 'Option'
                    }
                    comp.text = fallback_map.get(comp.type, 'Text')
                    logger.debug(f"Using fallback text for {comp.id}: '{comp.text}'")
                
                logger.info(f"OCR for {comp.id} ({comp.type}): '{comp.text}'")

        # 4. Layout Analysis
        layout_tree = build_layout_tree(components)
        
        # 5. Code Generation
        generated_html = generate_html(layout_tree)
        generated_css = generate_css()
        
        # Wrap HTML in a basic template for preview
        full_html = f"""<div id="generated-content">
{generated_html}
</div>"""

        return JSONResponse(content={
            "html": full_html,
            "css": generated_css,
            "components": [c.to_dict() for c in components]
        })

    except Exception as e:
        logger.error(f"Error processing upload: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
