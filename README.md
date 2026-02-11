# PSGPT Backend

Backend proxy server for [PSGPT AI](https://psgpt.web.app) — securely proxies requests to NVIDIA NIM APIs.

## Why?

The NVIDIA NIM API doesn't support CORS (browser-to-API calls are blocked). This backend acts as a secure proxy, keeping your API key server-side.

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Create `.env` file:**
   ```
   NVIDIA_API_KEY=your_nvidia_api_key_here
   PORT=3001
   ```

3. **Run locally:**
   ```bash
   npm run dev
   ```

## Deploy on Render

1. Push this folder to a GitHub repository.
2. Go to [Render Dashboard](https://dashboard.render.com/) → **New** → **Web Service**.
3. Connect your GitHub repo.
4. Configure:
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Environment Variables:** Add `NVIDIA_API_KEY` with your API key.
5. Deploy!

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/` | Health check |
| `GET` | `/health` | Health status |
| `POST` | `/api/nvidia/chat/completions` | Proxies to NVIDIA Chat API (streaming) |
| `POST` | `/api/nvidia/genai/*` | Proxies to NVIDIA GenAI API |
