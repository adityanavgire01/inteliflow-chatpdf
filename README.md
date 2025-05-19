# ChatPDF Application

This application allows users to upload PDFs and chat with them using AI. It consists of:
- A FastAPI backend that processes PDFs and manages chat interactions
- A ChromaDB vector store for semantic search
- A Next.js frontend interface

## Project Structure

```
.
├── backend/               # FastAPI backend
│   ├── main.py            # Main application file
│   ├── requirements.txt   # Python dependencies
│   ├── Procfile           # For Railway deployment
│   └── .env.example       # Example environment variables
├── frontend/              # Next.js frontend
│   ├── app/               # Next.js app directory
│   ├── package.json       # Node.js dependencies
│   └── .env.example       # Example environment variables
└── README.md              # This file
```

## Local Development

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create a virtual environment and activate it:
   ```bash
   python -m venv venv
   source venv/bin/activate   # On Windows: venv\Scripts\activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Copy the example environment file and update with your OpenAI API key:
   ```bash
   cp .env.example .env
   # Edit .env with your OpenAI API key
   ```

5. Run the backend server:
   ```bash
   uvicorn main:app --reload
   ```

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

4. Run the frontend development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Deployment

### Backend Deployment (Railway)

1. Create a Railway account at [railway.app](https://railway.app)

2. Install the Railway CLI and login:
   ```bash
   npm i -g @railway/cli
   railway login
   ```

3. Navigate to the backend directory and initialize a new project:
   ```bash
   cd backend
   railway init
   ```

4. Deploy to Railway:
   ```bash
   railway up
   ```

5. Set up environment variables in the Railway dashboard:
   - OPENAI_API_KEY (required)
   - APP_ENV=production
   - Other variables as needed

### Frontend Deployment (Vercel)

1. Push your code to GitHub

2. Go to [Vercel](https://vercel.com) and create an account

3. Import your GitHub repository

4. Configure the project:
   - Framework: Next.js
   - Root Directory: frontend
   - Build Command: npm run build
   - Output Directory: .next

5. Add environment variables:
   - NEXT_PUBLIC_API_URL: Your Railway backend URL (e.g., https://chatpdf-backend.railway.app)
   - NEXT_PUBLIC_APP_ENV: production

6. Deploy the project

## Features

- Upload PDF documents
- Chat with your documents using AI
- Context-aware responses based on document content
- Persistent document storage

## Technologies Used

- **Backend**: FastAPI, ChromaDB, OpenAI API
- **Frontend**: Next.js, TailwindCSS
- **Deployment**: Railway, Vercel

## API Endpoints

- `POST /upload` - Upload a PDF file
- `POST /chat` - Chat with the uploaded PDF
- `GET /document/{document_id}` - Get document details
- `DELETE /document/{document_id}` - Delete a document

## Environment Variables

### Backend (.env)
```
OPENAI_API_KEY=your_key_here
APP_ENV=production
CHROMA_HOST=chromadb
CHROMA_PORT=8000
MAX_REQUESTS_PER_MINUTE=60
MAX_FILE_SIZE_MB=10
```

### Frontend (.env)
```
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_APP_ENV=production
```

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License. 