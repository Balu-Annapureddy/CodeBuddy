class CanvasEditor {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.isDrawing = false;
        this.isDragging = false;
        this.isResizing = false;
        this.startX = 0;
        this.startY = 0;
        this.currentTool = 'rect'; // rect, circle, line, text, select
        this.shapes = [];
        this.selectedShape = null;
        this.resizeHandle = null;
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

    getMousePos(e) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;
        return { x, y };
    }

    setTool(tool) {
        this.currentTool = tool;
        this.selectedShape = null;
        if (this.onSelectionChange) this.onSelectionChange(null);
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
        return this.shapes.map(shape => ({
            type: shape.type,
            x: shape.x,
            y: shape.y,
            w: shape.w,
            h: shape.h,
            radius: shape.radius,
            x2: shape.x2,
            y2: shape.y2,
            text: shape.text || '',
            fillColor: shape.fillColor || 'transparent',
            borderColor: shape.borderColor || '#000',
            borderWidth: shape.borderWidth || 2,
            borderRadius: shape.borderRadius || 0,
            fontSize: shape.fontSize || 16,
            fontColor: shape.fontColor || '#000',
            lineStyle: shape.lineStyle || 'solid'
        }));
    }

    // ============ UNDO/REDO ============

    saveState() {
        this.history = this.history.slice(0, this.historyIndex + 1);
        this.history.push(JSON.parse(JSON.stringify(this.shapes)));
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
            const handle = this.getResizeHandle(pos.x, pos.y);
            if (handle) {
                this.isResizing = true;
                this.resizeHandle = handle;
                this.startX = pos.x;
                this.startY = pos.y;
                return;
            }

            if (this.selectedShape && this.isPointInShape(pos.x, pos.y, this.selectedShape)) {
                this.isDragging = true;
                this.dragOffsetX = pos.x - this.selectedShape.x;
                this.dragOffsetY = pos.y - this.selectedShape.y;
                return;
            }

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
        if (this.currentTool === 'rect' || this.currentTool === 'circle' || this.currentTool === 'line') {
            this.isDrawing = true;
            this.startX = pos.x;
            this.startY = pos.y;
        } else if (this.currentTool === 'text') {
            this.handleTextTool(pos.x, pos.y);
        }
    }

    handleMouseMove(e) {
        const pos = this.getMousePos(e);
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

        if (this.isDrawing) {
            this.redraw();
            this.ctx.strokeStyle = this.color;
            this.ctx.lineWidth = this.lineWidth;

            if (this.currentTool === 'rect') {
                this.ctx.beginPath();
                this.ctx.strokeRect(this.startX, this.startY, pos.x - this.startX, pos.y - this.startY);
            } else if (this.currentTool === 'circle') {
                const dx = pos.x - this.startX;
                const dy = pos.y - this.startY;
                const radius = Math.sqrt(dx * dx + dy * dy);
                this.ctx.beginPath();
                this.ctx.arc(this.startX, this.startY, radius, 0, 2 * Math.PI);
                this.ctx.stroke();
            } else if (this.currentTool === 'line') {
                this.ctx.beginPath();
                this.ctx.moveTo(this.startX, this.startY);
                this.ctx.lineTo(pos.x, pos.y);
                this.ctx.stroke();
            }
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

        if (this.isDrawing) {
            this.isDrawing = false;

            if (this.currentTool === 'rect') {
                const w = pos.x - this.startX;
                const h = pos.y - this.startY;
                if (Math.abs(w) > 5 && Math.abs(h) > 5) {
                    this.shapes.push({
                        type: 'rect',
                        x: w < 0 ? this.startX + w : this.startX,
                        y: h < 0 ? this.startY + h : this.startY,
                        w: Math.abs(w),
                        h: Math.abs(h),
                        text: '',
                        fillColor: 'transparent',
                        borderColor: '#000',
                        borderWidth: 2,
                        borderRadius: 0,
                        fontSize: 16,
                        fontColor: '#000'
                    });
                    this.saveState();
                }
            } else if (this.currentTool === 'circle') {
                const dx = pos.x - this.startX;
                const dy = pos.y - this.startY;
                const radius = Math.sqrt(dx * dx + dy * dy);
                if (radius > 5) {
                    this.shapes.push({
                        type: 'circle',
                        x: this.startX,
                        y: this.startY,
                        radius: radius,
                        fillColor: 'transparent',
                        borderColor: '#000',
                        borderWidth: 2
                    });
                    this.saveState();
                }
            } else if (this.currentTool === 'line') {
                const dx = pos.x - this.startX;
                const dy = pos.y - this.startY;
                const length = Math.sqrt(dx * dx + dy * dy);
                if (length > 5) {
                    this.shapes.push({
                        type: 'line',
                        x: this.startX,
                        y: this.startY,
                        x2: pos.x,
                        y2: pos.y,
                        borderColor: '#000',
                        borderWidth: 2,
                        lineStyle: 'solid'
                    });
                    this.saveState();
                }
            }

            this.redraw();
        }
    }

    handleKeyDown(e) {
        if (e.key === 'Delete' && this.selectedShape) {
            const index = this.shapes.indexOf(this.selectedShape);
            if (index > -1) {
                this.shapes.splice(index, 1);
                this.selectedShape = null;
                if (this.onSelectionChange) this.onSelectionChange(null);
                this.redraw();
                this.saveState();
            }
        }

        if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
            e.preventDefault();
            this.undo();
        }

        if ((e.ctrlKey && e.key === 'y') || (e.ctrlKey && e.shiftKey && e.key === 'z')) {
            e.preventDefault();
            this.redo();
        }
    }

    // ============ SELECTION & RESIZE ============

    getShapeAtPoint(x, y) {
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
        } else if (shape.type === 'circle') {
            const dx = x - shape.x;
            const dy = y - shape.y;
            return Math.sqrt(dx * dx + dy * dy) <= shape.radius;
        } else if (shape.type === 'line') {
            const tolerance = 5;
            const dx = shape.x2 - shape.x;
            const dy = shape.y2 - shape.y;
            const length = Math.sqrt(dx * dx + dy * dy);
            if (length === 0) return false;

            const dot = ((x - shape.x) * dx + (y - shape.y) * dy) / (length * length);
            const closestX = shape.x + dot * dx;
            const closestY = shape.y + dot * dy;

            const dist = Math.sqrt((x - closestX) ** 2 + (y - closestY) ** 2);
            return dist <= tolerance && dot >= 0 && dot <= 1;
        } else if (shape.type === 'text') {
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
        const text = prompt("Enter text:", "");
        if (text && text.trim()) {
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
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        for (const shape of this.shapes) {
            this.drawShape(shape);
        }

        if (this.selectedShape) {
            this.drawSelection(this.selectedShape);
        }
    }

    drawShape(shape) {
        if (shape.type === 'rect') {
            if (shape.fillColor && shape.fillColor !== 'transparent') {
                this.ctx.fillStyle = shape.fillColor;
                if (shape.borderRadius > 0) {
                    this.drawRoundedRect(shape.x, shape.y, shape.w, shape.h, shape.borderRadius, true, false);
                } else {
                    this.ctx.fillRect(shape.x, shape.y, shape.w, shape.h);
                }
            }

            this.ctx.strokeStyle = shape.borderColor || '#000';
            this.ctx.lineWidth = shape.borderWidth || 2;
            this.ctx.setLineDash([]);
            if (shape.borderRadius > 0) {
                this.drawRoundedRect(shape.x, shape.y, shape.w, shape.h, shape.borderRadius, false, true);
            } else {
                this.ctx.strokeRect(shape.x, shape.y, shape.w, shape.h);
            }

            if (shape.text && shape.text.trim()) {
                this.ctx.fillStyle = shape.fontColor || '#000';
                this.ctx.font = `${shape.fontSize || 16}px Arial`;
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'middle';
                this.ctx.fillText(shape.text, shape.x + shape.w / 2, shape.y + shape.h / 2);
            }
        } else if (shape.type === 'circle') {
            if (shape.fillColor && shape.fillColor !== 'transparent') {
                this.ctx.fillStyle = shape.fillColor;
                this.ctx.beginPath();
                this.ctx.arc(shape.x, shape.y, shape.radius, 0, 2 * Math.PI);
                this.ctx.fill();
            }

            this.ctx.strokeStyle = shape.borderColor || '#000';
            this.ctx.lineWidth = shape.borderWidth || 2;
            this.ctx.setLineDash([]);
            this.ctx.beginPath();
            this.ctx.arc(shape.x, shape.y, shape.radius, 0, 2 * Math.PI);
            this.ctx.stroke();
        } else if (shape.type === 'line') {
            this.ctx.strokeStyle = shape.borderColor || '#000';
            this.ctx.lineWidth = shape.borderWidth || 2;

            if (shape.lineStyle === 'dashed') {
                this.ctx.setLineDash([10, 5]);
            } else if (shape.lineStyle === 'dotted') {
                this.ctx.setLineDash([2, 3]);
            } else {
                this.ctx.setLineDash([]);
            }

            this.ctx.beginPath();
            this.ctx.moveTo(shape.x, shape.y);
            this.ctx.lineTo(shape.x2, shape.y2);
            this.ctx.stroke();
            this.ctx.setLineDash([]);
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
            this.ctx.strokeStyle = '#007bff';
            this.ctx.lineWidth = 2;
            this.ctx.setLineDash([5, 5]);
            this.ctx.strokeRect(shape.x - 2, shape.y - 2, shape.w + 4, shape.h + 4);
            this.ctx.setLineDash([]);

            const handleSize = 8;
            const handles = [
                { x: shape.x, y: shape.y },
                { x: shape.x + shape.w, y: shape.y },
                { x: shape.x, y: shape.y + shape.h },
                { x: shape.x + shape.w, y: shape.y + shape.h },
                { x: shape.x + shape.w / 2, y: shape.y },
                { x: shape.x + shape.w / 2, y: shape.y + shape.h },
                { x: shape.x, y: shape.y + shape.h / 2 },
                { x: shape.x + shape.w, y: shape.y + shape.h / 2 }
            ];

            this.ctx.fillStyle = '#007bff';
            this.ctx.strokeStyle = '#fff';
            this.ctx.lineWidth = 1;

            for (const handle of handles) {
                this.ctx.fillRect(handle.x - handleSize / 2, handle.y - handleSize / 2, handleSize, handleSize);
                this.ctx.strokeRect(handle.x - handleSize / 2, handle.y - handleSize / 2, handleSize, handleSize);
            }
        } else if (shape.type === 'circle') {
            this.ctx.strokeStyle = '#007bff';
            this.ctx.lineWidth = 2;
            this.ctx.setLineDash([5, 5]);
            this.ctx.beginPath();
            this.ctx.arc(shape.x, shape.y, shape.radius + 2, 0, 2 * Math.PI);
            this.ctx.stroke();
            this.ctx.setLineDash([]);
        } else if (shape.type === 'line') {
            this.ctx.strokeStyle = '#007bff';
            this.ctx.lineWidth = (shape.borderWidth || 2) + 2;
            this.ctx.setLineDash([]);
            this.ctx.beginPath();
            this.ctx.moveTo(shape.x, shape.y);
            this.ctx.lineTo(shape.x2, shape.y2);
            this.ctx.stroke();
        }
    }
}
