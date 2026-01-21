(() => {
    const $ = (id) => document.getElementById(id);

    let canvasEditor;
    let selectedFile = null;
    let currentInputMode = 'draw'; // draw | upload

    // --- Tab Switching ---
    const setupTabs = () => {
        document.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', () => {
                const tabName = tab.dataset.tab;
                currentInputMode = tabName;

                // Update active tab
                document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');

                // Show corresponding content
                document.querySelectorAll('.tab-content').forEach(content => {
                    content.classList.add('hidden');
                });
                $(`tab-${tabName}`).classList.remove('hidden');
            });
        });

        // View toggles
        document.querySelectorAll('.toggle').forEach(toggle => {
            toggle.addEventListener('click', () => {
                const viewName = toggle.dataset.view;

                document.querySelectorAll('.toggle').forEach(t => t.classList.remove('active'));
                toggle.classList.add('active');

                document.querySelectorAll('.view-content').forEach(view => {
                    view.classList.add('hidden');
                });
                $(`view-${viewName}`).classList.remove('hidden');
            });
        });
    };

    // --- Canvas Tools ---
    const setupTools = () => {
        canvasEditor = new CanvasEditor('drawing-canvas');

        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const tool = btn.dataset.tool;
                canvasEditor.setTool(tool);

                document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });

        $('btn-clear').addEventListener('click', () => {
            canvasEditor.clear();
        });
    };

    // --- File Upload ---
    const setupFileUpload = () => {
        const dropZone = $('drop-zone');
        const fileInput = $('file-input');
        const btnBrowse = $('btn-browse');
        const preview = $('image-preview');

        btnBrowse.addEventListener('click', () => fileInput.click());

        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                selectedFile = file;
                const reader = new FileReader();
                reader.onload = (e) => {
                    preview.src = e.target.result;
                    preview.classList.remove('hidden');
                    dropZone.querySelector('.upload-placeholder').style.display = 'none';
                };
                reader.readAsDataURL(file);
            }
        });

        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.style.borderColor = 'var(--primary-color)';
        });

        dropZone.addEventListener('dragleave', () => {
            dropZone.style.borderColor = 'var(--border-color)';
        });

        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.style.borderColor = 'var(--border-color)';

            const file = e.dataTransfer.files[0];
            if (file && file.type.startsWith('image/')) {
                selectedFile = file;
                const reader = new FileReader();
                reader.onload = (e) => {
                    preview.src = e.target.result;
                    preview.classList.remove('hidden');
                    dropZone.querySelector('.upload-placeholder').style.display = 'none';
                };
                reader.readAsDataURL(file);
            }
        });
    };

    // --- Main Logic: Convert ---
    const setupConvert = () => {
        $('btn-convert').addEventListener('click', async () => {
            // Validate input before processing
            if (currentInputMode === 'draw') {
                if (!canvasEditor.hasContent()) {
                    showNotification('Please draw something on the canvas first.', 'error');
                    return;
                }
            } else {
                if (!selectedFile) {
                    showNotification('Please upload an image first.', 'error');
                    return;
                }
            }

            // Show loading
            $('loading-overlay').classList.remove('hidden');

            try {
                let data;

                if (currentInputMode === 'draw') {
                    // Send canvas shape data as JSON
                    const shapes = canvasEditor.getShapesData();
                    data = await window.api.convertDesign(shapes);
                } else {
                    // Send image blob for OCR processing
                    const imageBlob = selectedFile;
                    data = await window.api.convertImage(imageBlob);
                }

                // Render result
                renderResult(data);

                // Show success notification
                showNotification('✨ Code generated successfully!', 'success');

            } catch (error) {
                console.error('Conversion error:', error);
                showNotification(
                    error.message || 'Failed to convert sketch. Please try again.',
                    'error'
                );
            } finally {
                $('loading-overlay').classList.add('hidden');
            }
        });
    };

    const renderResult = (data) => {
        // Display HTML
        $('html-output').textContent = data.html || '// No HTML generated';

        // Display CSS
        $('css-output').textContent = data.css || '// No CSS generated';

        // Render preview
        const previewFrame = $('preview-frame');
        const previewDoc = previewFrame.contentDocument || previewFrame.contentWindow.document;

        previewDoc.open();
        previewDoc.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <style>${data.css || ''}</style>
            </head>
            <body>
                ${data.html || ''}
            </body>
            </html>
        `);
        previewDoc.close();

        // Switch to preview tab automatically
        document.querySelector('[data-view="preview"]').click();
    };

    // --- Notification System ---
    const showNotification = (message, type = 'info') => {
        // Remove existing notifications
        const existing = document.querySelector('.notification');
        if (existing) existing.remove();

        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;

        // Add to DOM
        document.body.appendChild(notification);

        // Auto-remove after 4 seconds
        setTimeout(() => {
            notification.classList.add('fade-out');
            setTimeout(() => notification.remove(), 300);
        }, 4000);
    };

    // --- Properties Panel ---
    const setupPropertiesPanel = () => {
        const noSelection = $('no-selection');
        const shapeProps = $('shape-properties');

        // Property controls
        const fillColor = $('prop-fill');
        const fillNone = $('prop-fill-none');
        const borderColor = $('prop-border-color');
        const borderWidth = $('prop-border-width');
        const borderRadius = $('prop-border-radius');
        const fontSize = $('prop-font-size');
        const fontColor = $('prop-font-color');

        // Value displays
        const borderWidthVal = $('border-width-val');
        const borderRadiusVal = $('border-radius-val');
        const fontSizeVal = $('font-size-val');

        // Update panel when selection changes
        canvasEditor.onSelectionChange = (shape) => {
            if (shape && shape.type === 'rect') {
                noSelection.classList.add('hidden');
                shapeProps.classList.remove('hidden');

                // Load current values
                fillColor.value = shape.fillColor === 'transparent' ? '#ffffff' : shape.fillColor;
                borderColor.value = shape.borderColor || '#000000';
                borderWidth.value = shape.borderWidth || 2;
                borderRadius.value = shape.borderRadius || 0;
                fontSize.value = shape.fontSize || 16;
                fontColor.value = shape.fontColor || '#000000';

                borderWidthVal.textContent = `${borderWidth.value}px`;
                borderRadiusVal.textContent = `${borderRadius.value}px`;
                fontSizeVal.textContent = `${fontSize.value}px`;
            } else {
                noSelection.classList.remove('hidden');
                shapeProps.classList.add('hidden');
            }
        };

        // Apply changes
        fillColor.addEventListener('input', (e) => {
            if (canvasEditor.selectedShape) {
                canvasEditor.selectedShape.fillColor = e.target.value;
                canvasEditor.redraw();
            }
        });

        fillNone.addEventListener('click', () => {
            if (canvasEditor.selectedShape) {
                canvasEditor.selectedShape.fillColor = 'transparent';
                canvasEditor.redraw();
            }
        });

        borderColor.addEventListener('input', (e) => {
            if (canvasEditor.selectedShape) {
                canvasEditor.selectedShape.borderColor = e.target.value;
                canvasEditor.redraw();
            }
        });

        borderWidth.addEventListener('input', (e) => {
            if (canvasEditor.selectedShape) {
                canvasEditor.selectedShape.borderWidth = parseInt(e.target.value);
                borderWidthVal.textContent = `${e.target.value}px`;
                canvasEditor.redraw();
            }
        });

        borderRadius.addEventListener('input', (e) => {
            if (canvasEditor.selectedShape) {
                canvasEditor.selectedShape.borderRadius = parseInt(e.target.value);
                borderRadiusVal.textContent = `${e.target.value}px`;
                canvasEditor.redraw();
            }
        });

        fontSize.addEventListener('input', (e) => {
            if (canvasEditor.selectedShape) {
                canvasEditor.selectedShape.fontSize = parseInt(e.target.value);
                fontSizeVal.textContent = `${e.target.value}px`;
                canvasEditor.redraw();
            }
        });

        fontColor.addEventListener('input', (e) => {
            if (canvasEditor.selectedShape) {
                canvasEditor.selectedShape.fontColor = e.target.value;
                canvasEditor.redraw();
            }
        });
    };

    // Init
    setupTabs();
    setupTools();
    setupFileUpload();
    setupConvert();
    setupPropertiesPanel();
})();
