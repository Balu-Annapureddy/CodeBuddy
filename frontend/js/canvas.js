class CanvasEditor {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.isDrawing = false;
        this.startX = 0;
        this.startY = 0;
        this.currentTool = 'rect'; // rect, text
        this.shapes = []; // {type, x, y, w, h, text}
        this.color = '#000';
        this.lineWidth = 2;

        // Bind events
        this.canvas.addEventListener('mousedown', this.startDrawing.bind(this));
        this.canvas.addEventListener('mousemove', this.draw.bind(this));
        this.canvas.addEventListener('mouseup', this.stopDrawing.bind(this));
        // this.canvas.addEventListener('mouseout', this.stopDrawing.bind(this));

        // Initial draw
        this.redraw();
    }

    setTool(tool) {
        this.currentTool = tool;
    }

    clear() {
        this.shapes = [];
        this.redraw();
    }

    getBlob() {
        return new Promise(resolve => {
            this.canvas.toBlob(resolve, 'image/png');
        });
    }

    hasContent() {
        // Check if canvas has any shapes drawn
        return this.shapes.length > 0;
    }

    startDrawing(e) {
        const rect = this.canvas.getBoundingClientRect();
        this.startX = e.clientX - rect.left;
        this.startY = e.clientY - rect.top;
        this.isDrawing = true;

        if (this.currentTool === 'text') {
            this.handleTextTool(this.startX, this.startY);
            this.isDrawing = false; // Text is instant click
        }
    }

    draw(e) {
        if (!this.isDrawing || this.currentTool !== 'rect') return;

        const rect = this.canvas.getBoundingClientRect();
        const currentX = e.clientX - rect.left;
        const currentY = e.clientY - rect.top;

        this.redraw();

        // Draw preview rect
        this.ctx.beginPath();
        this.ctx.strokeStyle = this.color;
        this.ctx.lineWidth = this.lineWidth;
        this.ctx.strokeRect(this.startX, this.startY, currentX - this.startX, currentY - this.startY);
    }

    stopDrawing(e) {
        if (!this.isDrawing) return;
        this.isDrawing = false;

        if (this.currentTool === 'rect') {
            const rect = this.canvas.getBoundingClientRect();
            const currentX = e.clientX - rect.left;
            const currentY = e.clientY - rect.top;

            const w = currentX - this.startX;
            const h = currentY - this.startY;

            if (Math.abs(w) > 5 && Math.abs(h) > 5) {
                this.shapes.push({
                    type: 'rect',
                    x: this.startX,
                    y: this.startY,
                    w: w,
                    h: h
                });
            }
            this.redraw();
        }
    }

    handleTextTool(x, y) {
        const text = prompt("Enter label text:", "");
        if (text) {
            this.shapes.push({
                type: 'text',
                x: x,
                y: y,
                text: text
            });
            this.redraw();
        }
    }

    redraw() {
        // Clear background
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw all shapes
        this.ctx.strokeStyle = this.color;
        this.ctx.lineWidth = this.lineWidth;
        this.ctx.font = '16px Arial';
        this.ctx.fillStyle = '#000';

        for (const shape of this.shapes) {
            if (shape.type === 'rect') {
                this.ctx.strokeRect(shape.x, shape.y, shape.w, shape.h);
            } else if (shape.type === 'text') {
                this.ctx.fillText(shape.text, shape.x, shape.y);
            }
        }
    }
}
