import pytesseract
import logging
from PIL import Image
import cv2
import numpy as np

logger = logging.getLogger(__name__)

# Set tesseract path if needed, e.g. for Windows
# pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'
# We assume it's in PATH for now or user configures it.

def extract_text(image: np.ndarray, bbox: tuple = None) -> str:
    """
    Extract text from an image or a specific bounding box.
    
    Applies preprocessing optimized for handwritten/sketched text and
    normalizes the output to ensure clean, usable text.
    """
    try:
        if bbox:
            x, y, w, h = bbox
            # Add padding to capture full text
            pad = 5
            h_img, w_img = image.shape[:2]
            x1 = max(0, x - pad)
            y1 = max(0, y - pad)
            x2 = min(w_img, x + w + pad)
            y2 = min(h_img, y + h + pad)
            
            roi = image[y1:y2, x1:x2]
        else:
            roi = image

        # Preprocessing for OCR
        if len(roi.shape) == 3:
            gray = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY)
        else:
            gray = roi
        
        # Enhanced preprocessing for handwritten text
        # 1. Apply bilateral filter to reduce noise while preserving edges
        denoised = cv2.bilateralFilter(gray, 9, 75, 75)
        
        # 2. Adaptive thresholding works better for varying lighting/sketches
        # than Otsu's method
        thresh = cv2.adaptiveThreshold(
            denoised, 
            255, 
            cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
            cv2.THRESH_BINARY, 
            11, 
            2
        )
        
        # 3. Morphological operations to clean up text
        kernel = np.ones((2, 2), np.uint8)
        cleaned = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, kernel)
        
        # Run Tesseract with optimized config for single-line text
        # psm 7 = Treat the image as a single text line
        text = pytesseract.image_to_string(cleaned, config='--psm 7').strip()
        
        # Normalize the extracted text
        normalized_text = normalize_text(text)
        
        logger.debug(f"OCR extracted: '{text}' -> normalized: '{normalized_text}'")
        return normalized_text

    except Exception as e:
        logger.warning(f"OCR failed: {e}")
        return ""

def normalize_text(text: str) -> str:
    """
    Normalize OCR output by cleaning up common artifacts.
    
    - Removes leading/trailing whitespace
    - Collapses multiple spaces into one
    - Removes common OCR artifacts (stray symbols)
    - Capitalizes first letter for labels/buttons
    """
    if not text:
        return ""
    
    # Remove leading/trailing whitespace
    text = text.strip()
    
    # Collapse multiple spaces into one
    import re
    text = re.sub(r'\s+', ' ', text)
    
    # Remove common OCR artifacts (isolated special characters)
    # Keep alphanumeric, spaces, and common punctuation
    text = re.sub(r'[^\w\s\-_.,!?]', '', text)
    
    # Remove leading/trailing punctuation
    text = text.strip('.,!?-_')
    
    # Capitalize first letter if it's a word
    if text and text[0].isalpha():
        text = text[0].upper() + text[1:]
    
    return text
