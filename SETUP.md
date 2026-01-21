# CodeBuddy Setup Guide

## Prerequisites

Before running CodeBuddy, ensure you have the following installed:

### Required Software

1. **Python 3.8+**
   - Download from: https://www.python.org/downloads/
   - Verify installation: `python --version`

2. **Tesseract OCR**
   - **Windows**: Download installer from https://github.com/UB-Mannheim/tesseract/wiki
     - Install to default location: `C:\Program Files\Tesseract-OCR\`
     - Add to PATH or update `text_extractor.py` line 10 with installation path
   - **macOS**: `brew install tesseract`
   - **Linux**: `sudo apt-get install tesseract-ocr`
   - Verify installation: `tesseract --version`

3. **Modern Web Browser**
   - Chrome, Firefox, Edge, or Safari (latest version)

## Installation Steps

### 1. Clone or Download the Project

```bash
cd C:\Users\annap\Desktop\Projects
# Project should be in: C:\Users\annap\Desktop\Projects\CodeBuddy
```

### 2. Set Up Python Virtual Environment

```bash
cd CodeBuddy

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate

# macOS/Linux:
source venv/bin/activate
```

### 3. Install Python Dependencies

```bash
pip install -r requirements.txt
```

**Expected packages**:
- fastapi
- uvicorn
- python-multipart
- opencv-python
- pytesseract
- pillow
- numpy

### 4. Configure Tesseract (Windows Only)

If Tesseract is not in your PATH, edit `backend/ocr/text_extractor.py`:

```python
# Line 10 - Uncomment and set path:
pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'
```

## Running the Application

### Start Backend Server

Open a terminal in the project directory:

```bash
cd backend

# Activate virtual environment if not already active
..\venv\Scripts\activate  # Windows
# source ../venv/bin/activate  # macOS/Linux

# Start FastAPI server
python -m uvicorn app:app --host 0.0.0.0 --port 8000 --reload
```

**Expected output**:
```
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
INFO:     Started reloader process
INFO:     Started server process
INFO:     Waiting for application startup.
INFO:     Application startup complete.
```

**Backend is now running at**: http://localhost:8000

### Start Frontend Server

Open a **new terminal** in the project directory:

```bash
cd frontend

# Start simple HTTP server
python -m http.server 8081
```

**Expected output**:
```
Serving HTTP on :: port 8081 (http://[::]:8081/) ...
```

**Frontend is now running at**: http://localhost:8081

### Access the Application

1. Open your web browser
2. Navigate to: **http://localhost:8081**
3. You should see the CodeBuddy interface

## Testing the System

### Test 1: Canvas Drawing

1. Click on the **"Draw"** tab (should be active by default)
2. Use the rectangle tool (⬜) to draw 2 rectangles
3. Click the text tool (T) and click inside each rectangle to add labels
4. Click **"Convert to Code"**
5. Wait for processing (loading spinner)
6. View the generated code in the **"Code"** tab
7. View the live preview in the **"Preview"** tab

### Test 2: Image Upload

1. Click on the **"Upload"** tab
2. Drag and drop a UI sketch image, or click "Browse Files"
3. Supported formats: PNG, JPG, JPEG
4. Click **"Convert to Code"**
5. View results in Code/Preview tabs

### Expected Results

- **No duplicate HTML elements** for single detected components
- **Normalized text** from OCR (capitalized, cleaned)
- **Component ID comments** in generated HTML
- **Success notification** after conversion
- **Live preview** renders correctly with generated CSS

## Troubleshooting

### Backend Issues

**Problem**: `ModuleNotFoundError: No module named 'cv2'`
- **Solution**: Ensure virtual environment is activated and run `pip install opencv-python`

**Problem**: `TesseractNotFoundError`
- **Solution**: Install Tesseract OCR and add to PATH, or set path in `text_extractor.py`

**Problem**: `Port 8000 already in use`
- **Solution**: Change port in command: `uvicorn app:app --port 8001`

**Problem**: CORS errors in browser console
- **Solution**: Ensure backend is running and CORS middleware is configured (already done)

### Frontend Issues

**Problem**: `Failed to fetch` error when converting
- **Solution**: Verify backend is running at http://localhost:8000
- Check `frontend/js/api.js` line 1 for correct API_BASE URL

**Problem**: Canvas not drawing
- **Solution**: Ensure you're clicking and dragging on the white canvas area
- Check browser console for JavaScript errors

**Problem**: Blank preview
- **Solution**: Check browser console for errors
- Verify generated HTML/CSS in Code tab is not empty

### OCR Issues

**Problem**: OCR returning empty text
- **Solution**: 
  - Draw text more clearly
  - Use darker/thicker text
  - Fallback text will be used automatically

**Problem**: OCR text is garbled
- **Solution**:
  - Improve handwriting clarity
  - Use printed text instead of cursive
  - Text normalization should clean most artifacts

## Project Structure

```
CodeBuddy/
├── backend/
│   ├── app.py                    # FastAPI main application
│   ├── codegen/
│   │   ├── css_gen.py           # CSS generation
│   │   ├── html_gen.py          # HTML generation
│   │   └── layout_engine.py     # Layout analysis
│   ├── image_processing/
│   │   ├── detector.py          # Component detection
│   │   └── preprocessor.py      # Image preprocessing
│   └── ocr/
│       └── text_extractor.py    # OCR text extraction
├── frontend/
│   ├── index.html               # Main HTML page
│   ├── css/
│   │   ├── reset.css           # CSS reset
│   │   └── style.css           # Main styles
│   └── js/
│       ├── api.js              # API client
│       ├── app.js              # Main app logic
│       └── canvas.js           # Canvas editor
├── venv/                        # Virtual environment (created)
├── requirements.txt             # Python dependencies
├── ARCHITECTURE.md              # System architecture docs
└── SETUP.md                     # This file
```

## Development Tips

### Viewing Backend Logs

All backend operations are logged to console. Watch for:
- Component detection counts
- Duplicate filtering results
- OCR extraction results
- Layout tree construction

### Debugging Generated Code

- Check HTML comments for component IDs
- Verify component count in API response
- Use browser DevTools to inspect preview iframe

### Modifying Detection Rules

Edit `backend/image_processing/detector.py`:
- Adjust area thresholds in `classify_shape()` function
- Modify aspect ratio ranges for different component types
- Update noise filter threshold (currently 500 pixels)

### Customizing CSS

Edit `backend/codegen/css_gen.py`:
- Modify colors, fonts, spacing
- Add new component styles
- Adjust responsive behavior

## API Testing (Optional)

You can test the backend API directly using curl or Postman:

```bash
curl -X POST http://localhost:8000/api/upload \
  -F "file=@path/to/sketch.png"
```

Or visit http://localhost:8000/docs for interactive API documentation (FastAPI auto-generates this).

## Stopping the Application

1. **Stop Backend**: Press `Ctrl+C` in the backend terminal
2. **Stop Frontend**: Press `Ctrl+C` in the frontend terminal
3. **Deactivate Virtual Environment**: Run `deactivate` in terminal

## Next Steps

- Read [ARCHITECTURE.md](ARCHITECTURE.md) for detailed system design
- Experiment with different UI sketches
- Review generated code quality
- Check browser console for any errors
- Explore the codebase with inline comments

## Support

For issues or questions:
1. Check browser console for JavaScript errors
2. Check backend terminal for Python errors
3. Review ARCHITECTURE.md for system design
4. Verify all prerequisites are installed correctly
