# Claude Constitution Explorer

A web application for visually exploring documents through interactive mind-maps with progressive disclosure. Upload a PDF, and Claude AI will analyze its structure and generate an interactive visualization you can explore, ask questions about, and search related topics.

![Mind Map Visualization](https://img.shields.io/badge/React_Flow-Mind_Map-blue)
![FastAPI Backend](https://img.shields.io/badge/FastAPI-Backend-green)
![Claude AI](https://img.shields.io/badge/Claude_AI-Powered-orange)

## Features

- **Document Processing**: Upload PDFs and automatically extract hierarchical structure
- **Interactive Mind-Map**: Visualize document structure with React Flow
- **Progressive Disclosure**: Click nodes to expand and reveal more detail
- **Q&A**: Ask questions about the document content with AI-powered answers
- **Web Search**: Search the web for related information on any topic

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React, TypeScript, Vite, Tailwind CSS |
| Mind-Map | React Flow (@xyflow/react) |
| State | Zustand, TanStack Query |
| Backend | Python, FastAPI |
| PDF Processing | PyMuPDF |
| AI | Claude API (Anthropic) |

## Prerequisites

- **Node.js** 18+ and npm
- **Python** 3.11+
- **Anthropic API Key** ([Get one here](https://console.anthropic.com/))

## Quick Start

### 1. Clone and Setup

```bash
git clone <repository-url>
cd claude-constitution
```

### 2. Configure Environment

```bash
# Copy the example environment file
cp .env.example .env

# Edit .env and add your Anthropic API key
# ANTHROPIC_API_KEY=your-api-key-here
```

### 3. Start the Backend

```bash
cd backend

# Create a virtual environment (recommended)
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy environment config
cp .env.example .env
# Edit .env with your ANTHROPIC_API_KEY

# Start the server
uvicorn app.main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`

### 4. Start the Frontend

Open a new terminal:

```bash
cd frontend

# Install dependencies
npm install

# Start the dev server
npm run dev
```

The app will be available at `http://localhost:5173`

### 5. Try It Out

1. Open `http://localhost:5173` in your browser
2. Upload `claudes-constitution.pdf` (included in the repo) or any PDF
3. Wait for processing to complete
4. Explore the mind-map!

## Running with Docker

### Development

```bash
# Set your API key
export ANTHROPIC_API_KEY=your-api-key-here

# Start services
docker-compose -f docker-compose.dev.yml up
```

### Production

```bash
# Set your API key
export ANTHROPIC_API_KEY=your-api-key-here

# Build and start
docker-compose up --build
```

## Configuration

### Model Configuration

You can configure which Claude models are used for different tasks via environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `CLAUDE_MODEL_DOCUMENT` | `claude-sonnet-4-5-20250929` | Model for document structure extraction |
| `CLAUDE_MODEL_QA` | `claude-haiku-4-5-20251001` | Model for Q&A responses |
| `CLAUDE_MODEL_SEARCH` | `claude-haiku-4-5-20251001` | Model for web search |

**Available Models (as of January 2026):**

| Model | API ID | Cost (Input/Output) | Best For |
|-------|--------|---------------------|----------|
| Opus 4.5 | `claude-opus-4-5-20251101` | $5/$25 per MTok | Maximum intelligence |
| Sonnet 4.5 | `claude-sonnet-4-5-20250929` | $3/$15 per MTok | Best balance |
| Haiku 4.5 | `claude-haiku-4-5-20251001` | $1/$5 per MTok | Speed & cost |

### Other Settings

| Variable | Default | Description |
|----------|---------|-------------|
| `DEBUG` | `false` | Enable debug mode |
| `MAX_UPLOAD_SIZE` | `52428800` | Max file size in bytes (50MB) |
| `MAX_DOCUMENT_PAGES` | `500` | Max pages to process |

## Project Structure

```
claude-constitution/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI entry point
│   │   ├── config.py            # Configuration
│   │   ├── api/routes/          # API endpoints
│   │   │   ├── documents.py     # Upload/status
│   │   │   ├── mindmap.py       # Mind-map retrieval
│   │   │   ├── nodes.py         # Node expansion
│   │   │   ├── qa.py            # Q&A
│   │   │   └── search.py        # Web search
│   │   ├── services/            # Business logic
│   │   │   ├── pdf_processor.py
│   │   │   ├── claude_service.py
│   │   │   ├── mindmap_generator.py
│   │   │   ├── qa_service.py
│   │   │   └── web_search.py
│   │   └── models/              # Data models
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/          # React components
│   │   │   ├── MindMap/         # Mind-map visualization
│   │   │   ├── DocumentUpload/  # File upload
│   │   │   ├── QA/              # Q&A panel
│   │   │   ├── WebSearch/       # Search panel
│   │   │   └── Layout/          # Layout components
│   │   ├── hooks/               # Custom hooks
│   │   ├── store/               # Zustand stores
│   │   ├── services/            # API client
│   │   └── types/               # TypeScript types
│   ├── package.json
│   └── Dockerfile
├── docker-compose.yml           # Production
├── docker-compose.dev.yml       # Development
└── claudes-constitution.pdf     # Sample document
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/documents/upload` | POST | Upload a PDF document |
| `/api/v1/documents/{id}` | GET | Get document details |
| `/api/v1/documents/{id}/status` | GET | Check processing status |
| `/api/v1/mindmap/{doc_id}` | GET | Get mind-map structure |
| `/api/v1/nodes/{node_id}` | GET | Get node details |
| `/api/v1/nodes/{node_id}/expand` | POST | Expand node (get children) |
| `/api/v1/qa/{doc_id}` | POST | Ask a question |
| `/api/v1/search/web` | POST | Web search |

## Development

### Backend

```bash
cd backend
source venv/bin/activate

# Run with auto-reload
uvicorn app.main:app --reload

# API docs available at http://localhost:8000/docs
```

### Frontend

```bash
cd frontend

# Development server
npm run dev

# Type checking
npm run build

# Linting
npm run lint
```

## Troubleshooting

### "ANTHROPIC_API_KEY not set"

Make sure you've created a `.env` file in the `backend/` directory with your API key:

```
ANTHROPIC_API_KEY=sk-ant-...
```

### "Module not found" errors (Python)

Ensure you're in the virtual environment and have installed dependencies:

```bash
source venv/bin/activate
pip install -r requirements.txt
```

### Frontend can't connect to backend

The frontend proxies `/api` requests to the backend. Make sure:
1. Backend is running on port 8000
2. Frontend is running on port 5173
3. No firewall blocking local connections

### Document processing fails

- Check the backend logs for detailed error messages
- Ensure the PDF is not corrupted or password-protected
- Verify your Anthropic API key has sufficient credits

## License

MIT

## Acknowledgments

- [Anthropic](https://www.anthropic.com/) for the Claude API
- [React Flow](https://reactflow.dev/) for the mind-map visualization
- Sample document: Claude's Constitution by Anthropic
