import cv2
import numpy as np
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def process_image(image_bytes: bytes) -> dict:
    """
    Process raw image bytes into various stages for detection.
    Returns a dictionary containing the original and processed images.
    """
    try:
        # Decode image
        nparr = np.frombuffer(image_bytes, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if image is None:
            raise ValueError("Could not decode image")

        # Resize for consistency if needed (optional, skipping for now to preserve detail)
        # image = resize_image(image, width=1024)

        # Grayscale
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

        # Noise Reduction
        # Gaussian blur to reduce noise and detail
        blurred = cv2.GaussianBlur(gray, (5, 5), 0)

        # Edge Detection
        # Canny edge detection
        edges = cv2.Canny(blurred, 50, 150)

        # Dilation to close gaps in edges
        kernel = np.ones((3,3), np.uint8)
        dilated = cv2.dilate(edges, kernel, iterations=1)

        logger.info("Image processed successfully")

        return {
            "original": image,
            "gray": gray,
            "edges": edges,
            "dilated": dilated
        }

    except Exception as e:
        logger.error(f"Error processing image: {e}")
        raise e

def resize_image(image, width=None, height=None, inter=cv2.INTER_AREA):
    dim = None
    (h, w) = image.shape[:2]

    if width is None and height is None:
        return image

    if width is None:
        r = height / float(h)
        dim = (int(w * r), height)
    else:
        r = width / float(w)
        dim = (width, int(h * r))

    resized = cv2.resize(image, dim, interpolation=inter)
    return resized
