const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// ─── CORS Configuration ──────────────────────────────────────────────
const allowedOrigins = [
    'https://psgpt.web.app',
    'https://psgpt.firebaseapp.com',
    'http://localhost:5173',  // Vite dev server
    'http://localhost:4173',  // Vite preview
];

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, curl, etc.)
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        return callback(new Error('Not allowed by CORS'));
    },
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '10mb' }));

// ─── Health Check ─────────────────────────────────────────────────────
app.get('/', (req, res) => {
    res.json({ status: 'online', service: 'PSGPT Backend Proxy', version: '1.0.0' });
});

app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── NVIDIA Chat Completions Proxy (Streaming) ───────────────────────
app.post('/api/nvidia/chat/completions', async (req, res) => {
    const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY;

    if (!NVIDIA_API_KEY) {
        return res.status(500).json({ error: 'NVIDIA API key not configured on server' });
    }

    try {
        const nvidiaResponse = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${NVIDIA_API_KEY}`,
                'Content-Type': 'application/json',
                'Accept': 'text/event-stream',
            },
            body: JSON.stringify(req.body),
        });

        if (!nvidiaResponse.ok) {
            const errText = await nvidiaResponse.text();
            console.error(`NVIDIA API Error: ${nvidiaResponse.status} - ${errText}`);
            return res.status(nvidiaResponse.status).json({ error: errText });
        }

        // Stream the response back to the client
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        const reader = nvidiaResponse.body.getReader();
        const decoder = new TextDecoder();

        const pump = async () => {
            while (true) {
                const { done, value } = await reader.read();
                if (done) {
                    res.end();
                    break;
                }
                const chunk = decoder.decode(value, { stream: true });
                res.write(chunk);
            }
        };

        await pump();
    } catch (error) {
        console.error('Proxy Error:', error.message);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Failed to proxy request to NVIDIA API' });
        } else {
            res.end();
        }
    }
});

// ─── NVIDIA Image Generation Proxy ───────────────────────────────────
app.post('/api/nvidia/image/generate', async (req, res) => {
    const IMAGE_API_KEY = process.env.NIM_IMAGE_GENERATION_API_KEY;

    if (!IMAGE_API_KEY) {
        return res.status(500).json({ error: 'Image generation API key not configured on server' });
    }

    const {
        prompt,
        negative_prompt = '',
        cfg_scale = 5,
        aspect_ratio = '16:9',
        seed = 0,
        steps = 50,
    } = req.body;

    if (!prompt) {
        return res.status(400).json({ error: 'Prompt is required' });
    }

    try {
        const nvidiaResponse = await fetch('https://ai.api.nvidia.com/v1/genai/stabilityai/stable-diffusion-3-medium', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${IMAGE_API_KEY}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify({
                prompt,
                negative_prompt,
                cfg_scale,
                aspect_ratio,
                seed,
                steps,
            }),
        });

        if (!nvidiaResponse.ok) {
            const errText = await nvidiaResponse.text();
            console.error(`NVIDIA Image Gen Error: ${nvidiaResponse.status} - ${errText}`);
            return res.status(nvidiaResponse.status).json({ error: errText });
        }

        const data = await nvidiaResponse.json();
        res.json(data);
    } catch (error) {
        console.error('Image Gen Proxy Error:', error.message);
        res.status(500).json({ error: 'Failed to generate image' });
    }
});

// ─── Start Server ─────────────────────────────────────────────────────
app.listen(PORT, () => {
    console.log(`🚀 PSGPT Backend running on port ${PORT}`);
    console.log(`📡 CORS allowed origins: ${allowedOrigins.join(', ')}`);
});
