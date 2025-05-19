import uuid
from fastapi import FastAPI, UploadFile, File, HTTPException, Response
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

# Get application environment (default to production)
APP_ENV = os.getenv("APP_ENV", "production")

# Initialize FastAPI app
app = FastAPI(title="ChatPDF API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # Local development
        "https://*.vercel.app",   # Vercel deployment
        os.getenv("FRONTEND_URL", "")  # Production frontend URL
    ],
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
if APP_ENV == "production":
    # For Railway deployment, we can use Chroma in a local persistence mode
    # This stores embeddings in a local directory
    try:
        chroma_client = chromadb.PersistentClient(path="./chroma_db")
        logger.info("Using Chroma in PersistentClient mode")
    except Exception as e:
        logger.error(f"Error initializing Chroma PersistentClient: {e}")
        # Fallback to HTTP client if running with ChromaDB service
        chroma_client = chromadb.HttpClient(
            host=os.getenv("CHROMA_HOST", "localhost"),
            port=int(os.getenv("CHROMA_PORT", "8000"))
        )
        logger.info("Fallback to Chroma HttpClient")
else:
    # For development with Docker, use the HttpClient
    chroma_client = chromadb.HttpClient(
        host=os.getenv("CHROMA_HOST", "localhost"),
        port=int(os.getenv("CHROMA_PORT", "8000"))
    )
    logger.info("Using Chroma HttpClient for development")

# If in development mode, clear all collections on startup
if APP_ENV == "development":
    logger.info("DEVELOPMENT MODE: Clearing all ChromaDB collections...")
    try:
        collections = chroma_client.list_collections()
        for collection in collections:
            logger.info(f"Deleting collection: {collection.name}")
            chroma_client.delete_collection(name=collection.name)
        logger.info(f"Successfully deleted {len(collections)} collections.")
    except Exception as e:
        logger.error(f"Error clearing ChromaDB collections: {e}")

# Models
class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    document_id: str

class ChatResponse(BaseModel):
    response: str

# Store for document files - now stores content and original name
document_files = {}

def chunk_text(text: str, chunk_size: int = 500) -> List[str]:
    """Split text into smaller chunks."""
    words = text.split()
    chunks = []
    current_chunk = []
    current_size = 0
    
    for word in words:
        word_size = len(word) + 1  # +1 for space
        if current_size + word_size > chunk_size:
            chunks.append(" ".join(current_chunk))
            current_chunk = [word]
            current_size = word_size
        else:
            current_chunk.append(word)
            current_size += word_size
    
    if current_chunk:
        chunks.append(" ".join(current_chunk))
    
    return chunks

@app.post("/upload")
async def upload_pdf(file: UploadFile = File(...)):
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")
    
    original_filename = file.filename
    document_id_uuid = str(uuid.uuid4())
    
    try:
        content = await file.read()
        pdf_file = io.BytesIO(content)
        pdf_reader = PyPDF2.PdfReader(pdf_file)
        
        text = ""
        for page in pdf_reader.pages:
            extracted_text = page.extract_text()
            if extracted_text:
                text += extracted_text + "\n"
        
        if not text.strip():
            logger.warning(f"No text could be extracted from PDF: {original_filename}")
            raise HTTPException(status_code=400, detail="No text could be extracted from the PDF")

        # Store the PDF file content and its original name
        document_files[document_id_uuid] = {"content": content, "name": original_filename}
        
        # Create collection and add chunks
        collection = chroma_client.get_or_create_collection(name=document_id_uuid)
        
        # Split text into smaller chunks
        chunks = chunk_text(text)
        
        if chunks:
            # Add chunks in batches of 100
            batch_size = 100
            for i in range(0, len(chunks), batch_size):
                batch_chunks = chunks[i:i + batch_size]
                collection.add(
                    documents=batch_chunks,
                    ids=[f"{document_id_uuid}_{j}" for j in range(i, i + len(batch_chunks))]
                )
            
        return {"document_id": document_id_uuid, "fileName": original_filename, "message": "PDF processed successfully"}
    
    except Exception as e:
        logger.error(f"Error in upload_pdf for {original_filename}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error processing {original_filename}: {str(e)}")

@app.get("/document/{document_id}")
async def get_document(document_id: str):
    if document_id not in document_files:
        raise HTTPException(status_code=404, detail="Document not found")
    
    doc_info = document_files[document_id]
    return Response(
        content=doc_info["content"],
        media_type="application/pdf",
        headers={"Content-Disposition": f"inline; filename={doc_info['name']}"}
    )

@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    try:
        logger.info(f"Received chat request for document UUID: {request.document_id}")
        
        try:
            collection = chroma_client.get_collection(name=request.document_id)
        except Exception as e:
            logger.error(f"Error getting collection by UUID {request.document_id}: {str(e)}")
            if request.document_id not in document_files:
                error_detail = "Document ID not found. It may not have been uploaded correctly."
            else:
                error_detail = f"Document {document_files[request.document_id]['name']} (UUID: {request.document_id}) not processed correctly for chat (collection missing)."
            raise HTTPException(status_code=404, detail=error_detail)
        
        last_message = next((msg for msg in reversed(request.messages) if msg.role == "user"), None)
        if not last_message:
            raise HTTPException(status_code=400, detail="No user message found")
        
        logger.info(f"Processing message: {last_message.content}")
        
        query_results = collection.query(
            query_texts=[last_message.content],
            n_results=3
        )
        
        if not query_results or not query_results.get("documents") or not query_results["documents"][0]:
            logger.warning(f"No relevant document chunks found in ChromaDB for query on UUID: {request.document_id}")
            context_for_openai = "No specific context found in the document for this query."
        else:
            context_for_openai = "\n".join(query_results["documents"][0])
        
        messages_for_openai = [
            {"role": "system", "content": f"You are a helpful assistant that answers questions based on the following context provided from a PDF document. If the context is not sufficient or irrelevant, say you cannot answer based on the provided document text.\n\nContext:\n{context_for_openai}"},
            *[{"role": msg.role, "content": msg.content} for msg in request.messages]
        ]
        
        logger.info("Sending request to OpenAI")
        
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=messages_for_openai,
            max_tokens=500
        )
        
        logger.info("Received response from OpenAI")
        
        return ChatResponse(response=response.choices[0].message.content)
    
    except HTTPException as e:
        raise e
    except Exception as e:
        doc_name_for_error = document_files.get(request.document_id, {}).get('name', request.document_id)
        logger.error(f"Error in chat endpoint for document {doc_name_for_error}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error processing chat for {doc_name_for_error}: {str(e)}")

@app.delete("/document/{document_id}")
async def delete_document(document_id: str):
    # Remove from in-memory store
    if document_id in document_files:
        del document_files[document_id]
    else:
        raise HTTPException(status_code=404, detail="Document not found")
    # Remove ChromaDB collection
    try:
        chroma_client.delete_collection(name=document_id)
    except Exception as e:
        logger.warning(f"ChromaDB collection for {document_id} could not be deleted: {e}")
    return {"message": f"Document {document_id} deleted successfully."}

# Health check endpoint
@app.get("/health")
async def health_check():
    return {"status": "ok", "environment": APP_ENV}

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run(app, host="0.0.0.0", port=port) 