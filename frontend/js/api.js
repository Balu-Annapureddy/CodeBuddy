const API_BASE = 'http://localhost:8000/api';

class ApiService {
    async convertImage(imageBlob) {
        const formData = new FormData();
        formData.append('file', imageBlob, 'sketch.png');

        try {
            const response = await fetch(`${API_BASE}/upload`, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.detail || 'Conversion failed');
            }

            return await response.json();
        } catch (error) {
            console.error('API Error:', error);
            alert(`Error: ${error.message}`);
            throw error;
        }
    }
}

const api = new ApiService();
window.api = api;
