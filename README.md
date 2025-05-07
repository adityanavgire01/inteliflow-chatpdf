# ChatPDF

An interactive platform for chatting with PDF documents using AI. Upload PDFs and ask questions about their content in natural language.

## Features

- PDF Upload and Processing
- Natural Language Question Answering
- Contextual Conversation Memory
- Modern, Responsive UI
- Secure Document Handling

## Tech Stack

- Frontend: Next.js with TypeScript
- Backend: FastAPI (Python)
- AI: OpenAI GPT for text generation
- Vector Database: Chroma for document embeddings
- PDF Processing: PyPDF2

## Project Structure

```
inteliflow-chatpdf/
├── frontend/           # Next.js frontend application
├── backend/           # FastAPI backend server
└── README.md         # Project documentation
```

## Setup Instructions

### Prerequisites

- Node.js 18+ and npm
- Python 3.9+
- OpenAI API key

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Set up environment variables:
   ```bash
   cp .env.example .env
   # Edit .env with your OpenAI API key
   ```

5. Start the backend server:
   ```bash
   uvicorn main:app --reload
   ```

## Development

- Frontend runs on http://localhost:3000
- Backend runs on http://localhost:8000

## License

MIT 