from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import os
from dotenv import load_dotenv
import PyPDF2
import io
from openai import OpenAI
from chromadb import Client, Settings
import chromadb
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Initialize FastAPI app
app = FastAPI(title="ChatPDF API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize OpenAI client
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
if not os.getenv("OPENAI_API_KEY"):
    logger.error("OPENAI_API_KEY not found in environment variables")
    raise ValueError("OPENAI_API_KEY not found in environment variables")

# Initialize ChromaDB client
chroma_client = chromadb.Client(Settings(
    persist_directory="db"
))

# Models
class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    document_id: str

class ChatResponse(BaseModel):
    response: str

# Store for document chunks
document_chunks = {}

@app.post("/upload")
async def upload_pdf(file: UploadFile = File(...)):
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")
    
    try:
        # Read PDF content
        content = await file.read()
        pdf_file = io.BytesIO(content)
        pdf_reader = PyPDF2.PdfReader(pdf_file)
        
        # Extract text from PDF
        text = ""
        for page in pdf_reader.pages:
            text += page.extract_text()
        
        # Create document ID
        document_id = file.filename.replace(".pdf", "")
        
        # Store chunks in ChromaDB
        collection = chroma_client.create_collection(name=document_id)
        chunks = [text[i:i+1000] for i in range(0, len(text), 1000)]
        collection.add(
            documents=chunks,
            ids=[f"{document_id}_{i}" for i in range(len(chunks))]
        )
        
        return {"document_id": document_id, "message": "PDF processed successfully"}
    
    except Exception as e:
        logger.error(f"Error in upload_pdf: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    try:
        logger.info(f"Received chat request for document: {request.document_id}")
        
        # Get relevant chunks from ChromaDB
        collection = chroma_client.get_collection(name=request.document_id)
        
        # Get the last user message
        last_message = next((msg for msg in reversed(request.messages) if msg.role == "user"), None)
        if not last_message:
            raise HTTPException(status_code=400, detail="No user message found")
        
        logger.info(f"Processing message: {last_message.content}")
        
        # Query relevant chunks
        results = collection.query(
            query_texts=[last_message.content],
            n_results=3
        )
        
        # Prepare context from chunks
        context = "\n".join(results["documents"][0])
        
        # Prepare messages for OpenAI
        messages = [
            {"role": "system", "content": f"You are a helpful assistant that answers questions based on the following context:\n\n{context}"},
            *[{"role": msg.role, "content": msg.content} for msg in request.messages]
        ]
        
        logger.info("Sending request to OpenAI")
        
        # Get response from OpenAI using the new API format
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=messages,
            max_tokens=500
        )
        
        logger.info("Received response from OpenAI")
        
        return ChatResponse(response=response.choices[0].message.content)
    
    except Exception as e:
        logger.error(f"Error in chat endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 