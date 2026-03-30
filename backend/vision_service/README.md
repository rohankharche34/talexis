## Vision service (Python)

This service provides real-time gesture signals (attention / eye contact / posture) over a WebSocket using MediaPipe.

### Run locally

```bash
cd backend/vision_service
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app:app --host 0.0.0.0 --port 8001 --reload
```

### Endpoints

- `GET /health`
- `WS /ws/gesture`

WebSocket expects JSON:

```json
{ "image": "data:image/jpeg;base64,..." }
```

and responds with:

```json
{
  "attention": "good|warning|poor",
  "eyeContact": "good|warning|poor",
  "posture": "good|warning|poor",
  "faceDetected": true,
  "confidence": 0.0,
  "details": ["..."]
}
```

