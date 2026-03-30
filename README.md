# Career Mentor AI

An AI-powered interview practice platform that helps candidates prepare for technical interviews with real-time gesture analysis, code execution, and AI-generated feedback.

## Features

### 1. Interview Practice
- **Real-time Video Interview Simulation**: Practice with a realistic interview interface
- **Gesture Analysis**: AI-powered analysis of your:
  - **Attention**: Tracks face presence and motion to detect if you're focused
  - **Eye Contact**: Monitors face position to ensure you're looking at the camera
  - **Posture**: Analyzes face size to determine if you're too close or too far from camera
- **Code Editor**: Integrated Monaco code editor for solving coding problems
- **Response Tracking**: Practice answering behavioral questions

### 2. ATS Resume Checker
- Parse and analyze resumes against job descriptions
- Get AI-powered suggestions to improve your resume
- Match your skills with job requirements

### 3. Dashboard
- View your interview history
- Track your progress over time
- Access all features from a centralized location

### 4. Pipeline Builder
- Build and customize your interview prep pipeline
- Organize questions by category and difficulty

## Tech Stack

### Frontend
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **shadcn/ui** - UI component library
- **Monaco Editor** - Code editor
- **Recharts** - Data visualization
- **React Router** - Client-side routing

### Backend
- **Python FastAPI** - Web framework
- **OpenCV** - Computer vision for gesture analysis
- **WebSocket** - Real-time communication

### Services
- **Supabase** - Authentication and database
- **Gemini AI** - AI-powered resume and interview analysis

## Project Structure

```
Career-mentor-Ai/
├── src/
│   ├── components/
│   │   ├── ui/              # Reusable UI components (shadcn/ui)
│   │   ├── auth/            # Authentication components
│   │   ├── CodeEditor.tsx   # Monaco code editor
│   │   └── Layout.tsx       # Main layout
│   ├── pages/
│   │   ├── Index.tsx        # Landing page
│   │   ├── Login.tsx        # User login
│   │   ├── Signup.tsx       # User registration
│   │   ├── Dashboard.tsx   # User dashboard
│   │   ├── Interview.tsx   # Main interview interface
│   │   ├── InterviewSetup.tsx # Interview configuration
│   │   ├── ATSChecker.tsx   # Resume analyzer
│   │   └── PipelineBuilder.tsx # Interview pipeline builder
│   ├── lib/
│   │   ├── gestureAnalysis.ts # Client-side gesture analysis
│   │   ├── aiService.ts     # AI service integration
│   │   └── supabaseClient.ts # Supabase client
│   └── main.tsx            # Application entry point
├── backend/
│   └── vision_service/
│       ├── app.py           # FastAPI vision service
│       └── requirements.txt # Python dependencies
├── package.json             # Node.js dependencies
├── tailwind.config.ts       # Tailwind configuration
└── vite.config.ts          # Vite configuration
```

## Prerequisites

- **Node.js** (v18 or higher)
- **Python** (v3.10 or higher)
- **npm** or **bun** for package management

## Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd Career-mentor-Ai
```

### 2. Frontend Setup

Install dependencies:

```bash
npm install
```

Or if using bun:

```bash
bun install
```

### 3. Backend Setup

Create a virtual environment (optional but recommended):

```bash
cd backend/vision_service
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

Install Python dependencies:

```bash
pip install -r requirements.txt
```

### 4. Environment Variables

The project uses the following environment variables. These are already configured in the `.env` file:

```env
# Gemini API Key for ATS analysis
# Get your API key from: https://aistudio.google.com/app/apikey
VITE_GEMINI_API_KEY=your_api_key_here

# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here

# Vision Service WebSocket URL
VITE_GESTURE_WS_URL=ws://localhost:8001/ws/gesture
```

To use your own credentials:
1. Create a project at [Supabase](https://supabase.com)
2. Get your API key from [Google AI Studio](https://aistudio.google.com/app/apikey)
3. Update the `.env` file with your values

## Running the Application

### Option 1: Running Both Services

You need to run two services in separate terminals:

#### Terminal 1: Frontend (React)

```bash
npm run dev
```

The frontend will start at `http://localhost:8080`

#### Terminal 2: Vision Service (Python)

```bash
cd backend/vision_service
uvicorn app:app --host 0.0.0.0 --port 8001 --reload
```

The vision service will be available at `http://localhost:8001`

### Option 2: Running Only Frontend

If you don't need gesture analysis:

```bash
npm run dev
```

The frontend will start at `http://localhost:8080`

### Option 3: Production Build

Build the frontend:

```bash
npm run build
```

The production build will be in the `dist/` directory. You can serve it with any static file server:

```bash
npm run preview
```

## Usage Guide

### Starting an Interview

1. Open the application in your browser
2. Log in or sign up (if not already authenticated)
3. Navigate to the Dashboard
4. Click "Start Interview" or "Practice Interview"
5. Configure your interview settings:
   - Select interview type
   - Choose difficulty level
   - Set time limits
6. Grant camera and microphone permissions
7. Click "Start Interview"

### During the Interview

- **Video Section**: Shows your camera feed with gesture analysis overlay
- **Code Editor**: Solve coding problems in the integrated editor
- **Questions Panel**: Answer behavioral questions
- **Gesture Analysis**: Real-time feedback on:
  - Attention (focus level)
  - Eye Contact (looking at camera)
  - Posture (distance from camera)

### Gesture Analysis Metrics

| Metric | Good | Warning | Poor |
|--------|------|---------|------|
| Attention | Looking at camera, minimal movement | Slight movement | Looking away, excessive movement |
| Eye Contact | Face centered (dx < 0.08) | Slightly off-center (dx < 0.15) | Not looking at camera |
| Posture | Optimal distance (face area 6-18%) | Slightly too close/far | Too close or too far |

### Using the ATS Checker

1. Navigate to the ATS Checker page
2. Paste your resume content
3. Paste the job description
4. Click "Analyze"
5. Review the AI-generated feedback and suggestions

## Troubleshooting

### Frontend Issues

#### npm install fails
```bash
rm -rf node_modules package-lock.json
npm install
```

#### Port already in use
```bash
# Find and kill the process using port 8080
lsof -i :8080
kill -9 <PID>
```

#### Changes not reflecting
```bash
# Clear browser cache or use hard refresh
Ctrl+Shift+R (Windows/Linux)
Cmd+Shift+R (Mac)
```

### Vision Service Issues

#### Module not found: cv2
```bash
pip install opencv-python-headless
```

#### Port 8001 already in use
```bash
pkill -f "uvicorn.*8001"
cd backend/vision_service
uvicorn app:app --host 0.0.0.0 --port 8001
```

#### WebSocket connection refused
- Ensure the vision service is running: `uvicorn app:app --host 0.0.0.0 --port 8001`
- Check the WebSocket URL in `.env` matches: `VITE_GEMINI_WS_URL=ws://localhost:8001/ws/gesture`

### Camera Issues

#### Camera not detected
- Grant camera permissions in browser settings
- Ensure no other application is using the camera
- Try using a different browser

#### Camera works but gesture analysis stuck
- Ensure vision service is running on port 8001
- Check browser console for errors
- Try hard refreshing the page

## API Documentation

### Vision Service Endpoints

#### WebSocket: `/ws/gesture`

Real-time gesture analysis WebSocket endpoint.

**Connection:**
```javascript
const ws = new WebSocket('ws://localhost:8001/ws/gesture');
```

**Message Format (send):**
```json
{
  "image": "data:image/jpeg;base64,..."
}
```

**Message Format (receive):**
```json
{
  "attention": "good",
  "eyeContact": "good", 
  "posture": "good",
  "faceDetected": true,
  "confidence": 0.85,
  "details": ["motion=0.012", "center_dx=0.032", "face_area=0.095"]
}
```

#### GET `/health`

Health check endpoint.

**Response:**
```json
{
  "status": "ok"
}
```

#### GET `/docs`

Interactive API documentation (Swagger UI).

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## Deployment

### Frontend Deployment (Vercel)

The frontend can be deployed to Vercel for free.

#### Option 1: Vercel CLI (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

Follow the prompts:
- Set up and deploy? Yes
- Which scope? Your Vercel username
- Link to existing project? No
- Project name: career-mentor-ai
- Directory? ./
- Want to modify settings? No

#### Option 2: Vercel Dashboard

1. Push your code to GitHub
2. Go to [Vercel Dashboard](https://vercel.com/dashboard)
3. Click "Add New Project"
4. Import your GitHub repository
5. Configure:
   - Framework Preset: Vite
   - Build Command: `npm run build`
   - Output Directory: `dist`
6. Add environment variables:
   - `VITE_GEMINI_API_KEY`
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_GESTURE_WS_URL` (see below)
7. Deploy

### Backend Deployment (Vision Service)

The vision service needs to run on a server with Python. Options:

#### Option 1: Railway (Recommended for Python)

1. Push code to GitHub
2. Go to [Railway](https://railway.app)
3. Create new project from GitHub
4. Select the repository
5. Add the following in Railway dashboard:
   - Build Command: `pip install -r backend/vision_service/requirements.txt`
   - Start Command: `uvicorn app:app --host 0.0.0.0 --port $PORT`
6. Deploy

#### Option 2: Render

1. Push code to GitHub
2. Go to [Render Dashboard](https://dashboard.render.com)
3. Create new Web Service
4. Connect your GitHub repository
5. Configure:
   - Build Command: `pip install -r backend/vision_service/requirements.txt`
   - Start Command: `uvicorn app:app --host 0.0.0.0 --port $PORT`
6. Deploy

#### Option 3: Fly.io

1. Install Fly CLI
2. Create `Dockerfile` in `backend/vision_service/`:

```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
EXPOSE 8001
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8001"]
```

3. Deploy:
```bash
fly launch
fly deploy
```

### Updating Environment Variables for Production

After deploying, update your frontend's environment variable:

```env
# For Vercel, set this to your vision service URL
VITE_GESTURE_WS_URL=wss://your-vision-service.railway.app/ws/gesture
```

### Production Architecture

```
                    ┌─────────────────┐
                    │   Vercel        │
                    │   (Frontend)    │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
              ▼              ▼              ▼
        ┌──────────┐   ┌──────────┐   ┌──────────┐
        │ Supabase │   │ Gemini   │   │ Railway  │
        │ (Auth/   │   │   AI     │   │ (Vision  │
        │   DB)    │   │          │   │ Service) │
        └──────────┘   └──────────┘   └──────────┘
```

### Quick Deploy Script

Create `deploy.sh`:

```bash
#!/bin/bash

# Build frontend
echo "Building frontend..."
npm run build

# Deploy to Vercel (requires CLI)
echo "Deploying to Vercel..."
vercel --prod

echo "Deployment complete!"
```

Run:
```bash
chmod +x deploy.sh
./deploy.sh
```

## License

MIT License

## Support

For issues and questions:
- Open an issue on GitHub
- Check the troubleshooting section above
