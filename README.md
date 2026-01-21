# CodeBuddy - Sketch to Code Converter

[![Academic Project](https://img.shields.io/badge/Type-Academic%20Project-blue)](https://github.com/Balu-Annapureddy/CodeBuddy)
[![Python](https://img.shields.io/badge/Python-3.12-green)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.128-teal)](https://fastapi.tiangolo.com/)

**CodeBuddy** is an intelligent sketch-to-code converter that transforms hand-drawn UI mockups and canvas designs into clean, semantic HTML/CSS code. Built as an academic project, it demonstrates computer vision, OCR, and intelligent code generation techniques.

![CodeBuddy Demo](https://via.placeholder.com/800x400?text=CodeBuddy+Demo)

---

## 🎯 Features

### ✨ Canvas Drawing Tools
- **Rectangle Tool** - Draw buttons, inputs, and containers
- **Circle Tool** - Create circular elements
- **Line Tool** - Add dividers with solid/dashed/dotted styles
- **Text Tool** - Add labels and text content
- **Select Tool** - Move, resize, and edit shapes

### 🎨 Visual Styling
- **Fill Colors** - Customize background colors
- **Border Styles** - Adjust color, width, and radius
- **Typography** - Control font size and color
- **Properties Panel** - Context-aware styling controls

### 🤖 Intelligent Code Generation
- **Shape Interpretation** - Rectangles → Buttons/Inputs based on aspect ratio
- **Layout Detection** - Automatic row/column grouping
- **Styled HTML** - Inline styles from canvas properties
- **Clean CSS** - Base layout classes and responsive design
- **Live Preview** - See generated UI instantly

### 🔧 Core Capabilities
- **Undo/Redo** - Full history stack (Ctrl+Z / Ctrl+Y)
- **Delete** - Remove shapes with Delete key
- **Image Upload** - Process hand-drawn sketches via OCR
- **Dual Mode** - Canvas drawing OR image upload

---

## 🚀 Quick Start

### Prerequisites
- **Python 3.12+**
- **Tesseract OCR** (for image upload mode)
- **Git**

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Balu-Annapureddy/CodeBuddy.git
   cd CodeBuddy
   ```

2. **Create virtual environment**
   ```bash
   python -m venv venv
   
   # Windows
   venv\Scripts\activate
   
   # macOS/Linux
   source venv/bin/activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Install Tesseract OCR** (for image upload mode)
   - **Windows**: Download from [GitHub](https://github.com/UB-Mannheim/tesseract/wiki)
   - **macOS**: `brew install tesseract`
   - **Linux**: `sudo apt-get install tesseract-ocr`

### Running the Application

1. **Start the backend** (Terminal 1)
   ```bash
   cd backend
   python -m uvicorn app:app --host 0.0.0.0 --port 8000
   ```

2. **Start the frontend** (Terminal 2)
   ```bash
   cd frontend
   python -m http.server 8081
   ```

3. **Open in browser**
   ```
   http://localhost:8081
   ```

---

## 📖 Usage Guide

### Drawing Mode (Recommended)

1. **Select a tool** from the left toolbar:
   - **↖ Select** - Click shapes to edit
   - **⬜ Rectangle** - Drag to draw
   - **⭕ Circle** - Drag from center
   - **╱ Line** - Drag to create
   - **T Text** - Click and type

2. **Style your shapes**:
   - Click **Select tool** (↖)
   - Click on any shape
   - Use **Properties Panel** on the right to adjust:
     - Fill color
     - Border color, width, radius
     - Font size and color (for text)
     - Line style (solid/dashed/dotted)

3. **Generate code**:
   - Click **🪄 Convert to Code**
   - View generated HTML/CSS in the Output panel
   - Switch between **Preview** and **Code** tabs

### Upload Mode

1. Click **Upload** tab
2. Drag & drop or browse for a UI sketch image
3. Click **🪄 Convert to Code**
4. OCR will extract text and detect components

### Keyboard Shortcuts

- **Ctrl + Z** - Undo
- **Ctrl + Y** - Redo
- **Delete** - Remove selected shape
- **Ctrl + Shift + R** - Hard refresh browser

---

## 🏗️ Project Structure

```
CodeBuddy/
├── backend/
│   ├── app.py                      # FastAPI server & endpoints
│   ├── image_processing/
│   │   ├── preprocessor.py         # Image preprocessing
│   │   └── detector.py             # Component detection
│   ├── ocr/
│   │   └── text_extractor.py       # Tesseract OCR integration
│   └── codegen/
│       ├── layout_engine.py        # Layout tree builder
│       ├── html_gen.py             # HTML generator (image mode)
│       ├── html_gen_styled.py      # HTML generator (canvas mode)
│       └── css_gen.py              # CSS generator
├── frontend/
│   ├── index.html                  # Main UI
│   ├── css/
│   │   ├── reset.css               # CSS reset
│   │   └── style.css               # Application styles
│   └── js/
│       ├── api.js                  # Backend API client
│       ├── canvas.js               # Canvas editor logic
│       └── app.js                  # Main application logic
├── requirements.txt                # Python dependencies
├── ARCHITECTURE.md                 # System architecture
├── SETUP.md                        # Detailed setup guide
└── README.md                       # This file
```

---

## 🎓 Academic Context

This project was developed as an academic exercise to demonstrate:

- **Computer Vision** - Image preprocessing and component detection
- **OCR Integration** - Text extraction from hand-drawn sketches
- **Pattern Recognition** - Shape interpretation and layout inference
- **Code Generation** - Semantic HTML/CSS generation
- **Full-Stack Development** - FastAPI backend + Vanilla JS frontend

### Design Constraints

- **No frameworks** - Pure HTML/CSS/JavaScript (no React/Vue)
- **Deterministic logic** - No AI/ML models (academic requirement)
- **Canvas as input** - Treats drawing as structured data
- **1:1 mapping** - Each shape → one HTML element

---

## 🔬 Technical Details

### Canvas Mode Pipeline

```
User Drawing → Canvas Shapes (JSON) → Layout Tree → Styled HTML/CSS
```

1. **Canvas Editor** captures shapes with properties
2. **Layout Engine** groups shapes into rows/columns
3. **HTML Generator** creates semantic elements with inline styles
4. **CSS Generator** provides base layout classes

### Image Mode Pipeline

```
Image Upload → Preprocessing → Component Detection → OCR → HTML/CSS
```

1. **Preprocessing** - Grayscale, blur, edge detection
2. **Detection** - Contour analysis, bounding boxes
3. **OCR** - Tesseract text extraction
4. **Generation** - Layout tree → HTML/CSS

---

## 🐛 Known Limitations

- **Simple layouts only** - Best for basic forms and UIs
- **No nested components** - Flat structure only
- **Limited shape types** - Rectangle, circle, line, text
- **No responsive breakpoints** - Single layout output
- **OCR accuracy** - Depends on handwriting quality

---

## 🛠️ Development

### Running Tests

```bash
# Backend tests (if implemented)
cd backend
pytest

# Frontend - Manual testing via browser
```

### Code Style

- **Python**: PEP 8
- **JavaScript**: ES6+
- **HTML/CSS**: Semantic, BEM-like naming

---

## 📝 License

This project is developed for academic purposes. Feel free to use and modify for educational projects.

---

## 👤 Author

**Balu Annapureddy**
- GitHub: [@Balu-Annapureddy](https://github.com/Balu-Annapureddy)

---

## 🙏 Acknowledgments

- **Tesseract OCR** - Text extraction
- **FastAPI** - Backend framework
- **OpenCV** - Image processing
- **NumPy** - Numerical operations

---

## 📚 Additional Documentation

- [ARCHITECTURE.md](ARCHITECTURE.md) - System architecture and design
- [SETUP.md](SETUP.md) - Detailed installation and troubleshooting

---

**Built with ❤️ for learning and education**
