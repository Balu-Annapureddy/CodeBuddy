
document.addEventListener('DOMContentLoaded', () => {
    // Helper to get element by ID
    const $ = id => document.getElementById(id);

    // Components
    const canvasEditor = new CanvasEditor('drawing-canvas');

    // State
    let currentInputMode = 'draw'; // draw | upload
    let selectedFile = null;

    // --- Tab Switching ---
    const setupTabs = () => {
        const tabs = document.querySelectorAll('.tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                // Update UI state
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');

                // Show content
                const tabId = tab.dataset.tab;
                document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
                $(`tab-${tabId}`).classList.remove('hidden');

                currentInputMode = tabId;
            });
        });

        const viewToggles = document.querySelectorAll('.toggle');
        viewToggles.forEach(toggle => {
            toggle.addEventListener('click', () => {
                viewToggles.forEach(t => t.classList.remove('active'));
                toggle.classList.add('active');

                const viewId = toggle.dataset.view;
                document.querySelectorAll('.view-content').forEach(c => c.classList.add('hidden'));
                $(`view-${viewId}`).classList.remove('hidden');
            });
        });
    };

    // --- Tool Switching ---
    const setupTools = () => {
        const tools = document.querySelectorAll('.tool-btn');
        tools.forEach(tool => {
            tool.addEventListener('click', () => {
                const toolName = tool.dataset.tool;
                canvasEditor.setTool(toolName);

                tools.forEach(t => t.classList.remove('active'));
                tool.classList.add('active');
            });
        });

        $('btn-clear').addEventListener('click', () => {
            if (confirm('Clear canvas?')) {
                canvasEditor.clear();
            }
        });
    };

    // --- File Upload ---
    const setupUpload = () => {
        const dropZone = $('drop-zone');
        const fileInput = $('file-input');
        const btnBrowse = $('btn-upload-trigger');
        const previewImg = $('image-preview');

        // Drag & Drop
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.style.borderColor = 'var(--primary-color)';
        });

        dropZone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            dropZone.style.borderColor = '#333';
        });

        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.style.borderColor = '#333';
            handleFile(e.dataTransfer.files[0]);
        });

        // Browse
        btnBrowse.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', (e) => handleFile(e.target.files[0]));

        function handleFile(file) {
            if (!file || !file.type.startsWith('image/')) return;
            selectedFile = file;

            // Preview
            const reader = new FileReader();
            reader.onload = (e) => {
                previewImg.src = e.target.result;
                previewImg.classList.remove('hidden');
                dropZone.querySelector('.upload-placeholder').classList.add('hidden');
            };
            reader.readAsDataURL(file);
        }
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
                let imageBlob;

                if (currentInputMode === 'draw') {
                    imageBlob = await canvasEditor.getBlob();
                } else {
                    imageBlob = selectedFile;
                }

                // Call API with timeout handling
                const data = await window.api.convertImage(imageBlob);

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
        // Populate Code
        const htmlCode = data.html;
        const cssCode = data.css;

        $('code-html').textContent = htmlCode;
        $('code-css').textContent = cssCode;

        // Populate Preview
        const frame = $('preview-frame');
        const doc = frame.contentDocument || frame.contentWindow.document;
        doc.open();
        doc.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <style>${cssCode}</style>
            </head>
            <body>
                ${htmlCode}
            </body>
            </html>
        `);
        doc.close();

        // Switch to preview tab automatically? Yes
        document.querySelector('[data-view="render"]').click();
    };

    const setupClipboard = () => {
        document.querySelectorAll('.copy-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const targetId = btn.dataset.target;
                const text = $(targetId).textContent;
                navigator.clipboard.writeText(text);

                const originalText = btn.textContent;
                btn.textContent = 'Copied!';
                setTimeout(() => btn.textContent = originalText, 2000);
            });
        });
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

    // Init
    setupTabs();
    setupTools();
    setupUpload();
    setupConvert();
    setupClipboard();
});
