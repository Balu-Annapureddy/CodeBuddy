class CanvasEditor {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.isDrawing = false;
        this.isDragging = false;
        this.isResizing = false;
        this.startX = 0;
        this.startY = 0;
        this.currentTool = 'rect'; // rect, text, select
        this.shapes = []; // {type, x, y, w, h, text, fillColor, borderColor, borderWidth, borderRadius, fontSize, fontColor}
        this.selectedShape = null;
        this.resizeHandle = null; // 'nw', 'ne', 'sw', 'se', 'n', 's', 'e', 'w'
        this.dragOffsetX = 0;
        this.dragOffsetY = 0;
        this.color = '#000';
        this.lineWidth = 2;

        // Undo/Redo stacks
        this.history = [];
        this.historyIndex = -1;
        this.maxHistory = 50;

        // Callback for selection changes
        this.onSelectionChange = null;

        // Bind events
        this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
        this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
        this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));

        // Keyboard events
        document.addEventListener('keydown', this.handleKeyDown.bind(this));

        // Initial draw
        this.redraw();
        this.saveState();
    }

    /**
     * Get accurate mouse coordinates relative to canvas
     * Accounts for canvas position, scaling, and devicePixelRatio
     */
    getMousePos(e) {
        const rect = this.canvas.getBoundingClientRect();

        // Calculate scale factors
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;

        // Get mouse position relative to canvas
        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;

        return { x, y };
    }

    setTool(tool) {
        this.currentTool = tool;
        this.selectedShape = null;
        this.redraw();
    }

    clear() {
        this.shapes = [];
        this.selectedShape = null;
        this.redraw();
        this.saveState();
    }

    getBlob() {
        return new Promise(resolve => {
            this.canvas.toBlob(resolve, 'image/png');
        });
    }

    hasContent() {
        return this.shapes.length > 0;
    }

    getShapesData() {
        // Export shapes with all properties for backend processing
        return this.shapes.map(shape => ({
            type: shape.type,
            x: shape.x,
            y: shape.y,
            w: shape.w,
            h: shape.h,
            text: shape.text || '',
            fillColor: shape.fillColor || 'transparent',
            borderColor: shape.borderColor || '#000',
            borderWidth: shape.borderWidth || 2,
            borderRadius: shape.borderRadius || 0,
            fontSize: shape.fontSize || 16,
            fontColor: shape.fontColor || '#000'
        }));
    }

    // ============ UNDO/REDO ============

    saveState() {
        // Remove any states after current index (when user makes new action after undo)
        this.history = this.history.slice(0, this.historyIndex + 1);

        // Save current state
        this.history.push(JSON.parse(JSON.stringify(this.shapes)));

        // Limit history size
        if (this.history.length > this.maxHistory) {
            this.history.shift();
        } else {
            this.historyIndex++;
        }
    }

    undo() {
        if (this.historyIndex > 0) {
            this.historyIndex--;
            this.shapes = JSON.parse(JSON.stringify(this.history[this.historyIndex]));
            this.selectedShape = null;
            this.redraw();
        }
    }

    redo() {
        if (this.historyIndex < this.history.length - 1) {
            this.historyIndex++;
            this.shapes = JSON.parse(JSON.stringify(this.history[this.historyIndex]));
            this.selectedShape = null;
            this.redraw();
        }
    }

    // ============ MOUSE HANDLERS ============

    handleMouseDown(e) {
        const pos = this.getMousePos(e);

        if (this.currentTool === 'select' || this.selectedShape) {
            // Check if clicking on resize handle
            const handle = this.getResizeHandle(pos.x, pos.y);
            if (handle) {
                this.isResizing = true;
                this.resizeHandle = handle;
                this.startX = pos.x;
                this.startY = pos.y;
                return;
            }

            // Check if clicking on selected shape (to drag)
            if (this.selectedShape && this.isPointInShape(pos.x, pos.y, this.selectedShape)) {
                this.isDragging = true;
                this.dragOffsetX = pos.x - this.selectedShape.x;
                this.dragOffsetY = pos.y - this.selectedShape.y;
                return;
            }

            // Check if clicking on any shape (to select)
            const clickedShape = this.getShapeAtPoint(pos.x, pos.y);
            if (clickedShape) {
                this.selectedShape = clickedShape;
                if (this.onSelectionChange) this.onSelectionChange(clickedShape);
                this.redraw();
                return;
            } else {
                this.selectedShape = null;
                if (this.onSelectionChange) this.onSelectionChange(null);
                this.redraw();
            }
        }

        // Drawing mode
        if (this.currentTool === 'rect') {
            this.isDrawing = true;
            this.startX = pos.x;
            this.startY = pos.y;
        } else if (this.currentTool === 'text') {
            this.handleTextTool(pos.x, pos.y);
        }
    }

    handleMouseMove(e) {
        const pos = this.getMousePos(e);

        // Update cursor based on what's under mouse
        this.updateCursor(pos.x, pos.y);

        if (this.isResizing) {
            this.handleResize(pos.x, pos.y);
            return;
        }

        if (this.isDragging) {
            this.selectedShape.x = pos.x - this.dragOffsetX;
            this.selectedShape.y = pos.y - this.dragOffsetY;
            this.redraw();
            return;
        }

        if (this.isDrawing && this.currentTool === 'rect') {
            this.redraw();

            // Draw preview rect
            this.ctx.beginPath();
            this.ctx.strokeStyle = this.color;
            this.ctx.lineWidth = this.lineWidth;
            this.ctx.strokeRect(this.startX, this.startY, pos.x - this.startX, pos.y - this.startY);
        }
    }

    handleMouseUp(e) {
        const pos = this.getMousePos(e);

        if (this.isResizing) {
            this.isResizing = false;
            this.resizeHandle = null;
            this.saveState();
            return;
        }

        if (this.isDragging) {
            this.isDragging = false;
            this.saveState();
            return;
        }

        if (this.isDrawing && this.currentTool === 'rect') {
            this.isDrawing = false;

            const w = pos.x - this.startX;
            const h = pos.y - this.startY;

            if (Math.abs(w) > 5 && Math.abs(h) > 5) {
                // Normalize negative dimensions
                const shape = {
                    type: 'rect',
                    x: w < 0 ? this.startX + w : this.startX,
                    y: h < 0 ? this.startY + h : this.startY,
                    w: Math.abs(w),
                    h: Math.abs(h),
                    fillColor: 'transparent',
                    borderColor: '#000',
                    borderWidth: 2,
                    borderRadius: 0
                };
                this.shapes.push(shape);
                this.saveState();
            }
            this.redraw();
        }
    }

    handleKeyDown(e) {
        // Delete key
        if (e.key === 'Delete' && this.selectedShape) {
            const index = this.shapes.indexOf(this.selectedShape);
            if (index > -1) {
                this.shapes.splice(index, 1);
                this.selectedShape = null;
                this.redraw();
                this.saveState();
            }
        }

        // Undo: Ctrl+Z
        if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
            e.preventDefault();
            this.undo();
        }

        // Redo: Ctrl+Y or Ctrl+Shift+Z
        if ((e.ctrlKey && e.key === 'y') || (e.ctrlKey && e.shiftKey && e.key === 'z')) {
            e.preventDefault();
            this.redo();
        }
    }

    // ============ SELECTION & RESIZE ============

    getShapeAtPoint(x, y) {
        // Check from top to bottom (reverse order for z-index)
        for (let i = this.shapes.length - 1; i >= 0; i--) {
            if (this.isPointInShape(x, y, this.shapes[i])) {
                return this.shapes[i];
            }
        }
        return null;
    }

    isPointInShape(x, y, shape) {
        if (shape.type === 'rect') {
            return x >= shape.x && x <= shape.x + shape.w &&
                y >= shape.y && y <= shape.y + shape.h;
        } else if (shape.type === 'text') {
            // Approximate text bounds
            const textWidth = this.ctx.measureText(shape.text).width;
            const textHeight = shape.fontSize || 16;
            return x >= shape.x && x <= shape.x + textWidth &&
                y >= shape.y - textHeight && y <= shape.y;
        }
        return false;
    }

    getResizeHandle(x, y) {
        if (!this.selectedShape || this.selectedShape.type !== 'rect') return null;

        const shape = this.selectedShape;
        const handleSize = 8;
        const tolerance = 4;

        const handles = {
            'nw': { x: shape.x, y: shape.y },
            'ne': { x: shape.x + shape.w, y: shape.y },
            'sw': { x: shape.x, y: shape.y + shape.h },
            'se': { x: shape.x + shape.w, y: shape.y + shape.h },
            'n': { x: shape.x + shape.w / 2, y: shape.y },
            's': { x: shape.x + shape.w / 2, y: shape.y + shape.h },
            'w': { x: shape.x, y: shape.y + shape.h / 2 },
            'e': { x: shape.x + shape.w, y: shape.y + shape.h / 2 }
        };

        for (const [name, pos] of Object.entries(handles)) {
            if (Math.abs(x - pos.x) <= handleSize + tolerance &&
                Math.abs(y - pos.y) <= handleSize + tolerance) {
                return name;
            }
        }

        return null;
    }

    handleResize(x, y) {
        const shape = this.selectedShape;
        const handle = this.resizeHandle;

        if (handle.includes('e')) {
            shape.w = Math.max(10, x - shape.x);
        }
        if (handle.includes('w')) {
            const newX = x;
            const newW = shape.x + shape.w - newX;
            if (newW > 10) {
                shape.x = newX;
                shape.w = newW;
            }
        }
        if (handle.includes('s')) {
            shape.h = Math.max(10, y - shape.y);
        }
        if (handle.includes('n')) {
            const newY = y;
            const newH = shape.y + shape.h - newY;
            if (newH > 10) {
                shape.y = newY;
                shape.h = newH;
            }
        }

        this.redraw();
    }

    updateCursor(x, y) {
        if (this.isResizing || this.isDragging) return;

        const handle = this.getResizeHandle(x, y);
        if (handle) {
            const cursors = {
                'nw': 'nw-resize', 'ne': 'ne-resize',
                'sw': 'sw-resize', 'se': 'se-resize',
                'n': 'n-resize', 's': 's-resize',
                'w': 'w-resize', 'e': 'e-resize'
            };
            this.canvas.style.cursor = cursors[handle];
        } else if (this.selectedShape && this.isPointInShape(x, y, this.selectedShape)) {
            this.canvas.style.cursor = 'move';
        } else if (this.currentTool === 'select') {
            this.canvas.style.cursor = 'default';
        } else {
            this.canvas.style.cursor = 'crosshair';
        }
    }

    // ============ TEXT TOOL ============

    handleTextTool(x, y) {
        const text = prompt("Enter label text:", "");
        if (text) {
            this.shapes.push({
                type: 'text',
                x: x,
                y: y,
                text: text,
                fontSize: 16,
                fontColor: '#000'
            });
            this.redraw();
            this.saveState();
        }
    }

    // ============ RENDERING ============

    redraw() {
        // Clear background
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw all shapes
        for (const shape of this.shapes) {
            this.drawShape(shape);
        }

        // Draw selection and resize handles
        if (this.selectedShape) {
            this.drawSelection(this.selectedShape);
        }
    }

    drawShape(shape) {
        if (shape.type === 'rect') {
            // Fill
            if (shape.fillColor && shape.fillColor !== 'transparent') {
                this.ctx.fillStyle = shape.fillColor;
                if (shape.borderRadius > 0) {
                    this.drawRoundedRect(shape.x, shape.y, shape.w, shape.h, shape.borderRadius, true, false);
                } else {
                    this.ctx.fillRect(shape.x, shape.y, shape.w, shape.h);
                }
            }

            // Border
            this.ctx.strokeStyle = shape.borderColor || '#000';
            this.ctx.lineWidth = shape.borderWidth || 2;
            if (shape.borderRadius > 0) {
                this.drawRoundedRect(shape.x, shape.y, shape.w, shape.h, shape.borderRadius, false, true);
            } else {
                this.ctx.strokeRect(shape.x, shape.y, shape.w, shape.h);
            }

            // Text inside rectangle
            if (shape.text) {
                this.ctx.fillStyle = shape.fontColor || '#000';
                this.ctx.font = `${shape.fontSize || 16}px Arial`;
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'middle';
                this.ctx.fillText(shape.text, shape.x + shape.w / 2, shape.y + shape.h / 2);
            }
        } else if (shape.type === 'text') {
            this.ctx.fillStyle = shape.fontColor || '#000';
            this.ctx.font = `${shape.fontSize || 16}px Arial`;
            this.ctx.textAlign = 'left';
            this.ctx.textBaseline = 'bottom';
            this.ctx.fillText(shape.text, shape.x, shape.y);
        }
    }

    drawRoundedRect(x, y, w, h, radius, fill, stroke) {
        this.ctx.beginPath();
        this.ctx.moveTo(x + radius, y);
        this.ctx.lineTo(x + w - radius, y);
        this.ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
        this.ctx.lineTo(x + w, y + h - radius);
        this.ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
        this.ctx.lineTo(x + radius, y + h);
        this.ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
        this.ctx.lineTo(x, y + radius);
        this.ctx.quadraticCurveTo(x, y, x + radius, y);
        this.ctx.closePath();
        if (fill) this.ctx.fill();
        if (stroke) this.ctx.stroke();
    }

    drawSelection(shape) {
        if (shape.type === 'rect') {
            // Selection outline
            this.ctx.strokeStyle = '#007bff';
            this.ctx.lineWidth = 2;
            this.ctx.setLineDash([5, 5]);
            this.ctx.strokeRect(shape.x - 2, shape.y - 2, shape.w + 4, shape.h + 4);
            this.ctx.setLineDash([]);

            // Resize handles
            const handleSize = 8;
            const handles = [
                { x: shape.x, y: shape.y }, // nw
                { x: shape.x + shape.w, y: shape.y }, // ne
                { x: shape.x, y: shape.y + shape.h }, // sw
                { x: shape.x + shape.w, y: shape.y + shape.h }, // se
                { x: shape.x + shape.w / 2, y: shape.y }, // n
                { x: shape.x + shape.w / 2, y: shape.y + shape.h }, // s
                { x: shape.x, y: shape.y + shape.h / 2 }, // w
                { x: shape.x + shape.w, y: shape.y + shape.h / 2 } // e
            ];

            this.ctx.fillStyle = '#007bff';
            this.ctx.strokeStyle = '#fff';
            this.ctx.lineWidth = 1;

            for (const handle of handles) {
                this.ctx.fillRect(handle.x - handleSize / 2, handle.y - handleSize / 2, handleSize, handleSize);
                this.ctx.strokeRect(handle.x - handleSize / 2, handle.y - handleSize / 2, handleSize, handleSize);
            }
        }
    }
}
