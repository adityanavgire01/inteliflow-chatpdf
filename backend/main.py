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

@app.post("/upload")
async def upload_pdf(file: UploadFile = File(...)):
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")
    
    original_filename = file.filename
    # Generate a unique ID for the document and collection name
    document_id_uuid = str(uuid.uuid4())
    
    try:
        content = await file.read()
        pdf_file = io.BytesIO(content)
        pdf_reader = PyPDF2.PdfReader(pdf_file)
        
        text = ""
        for page in pdf_reader.pages:
            extracted_text = page.extract_text()
            if extracted_text:
                text += extracted_text
        
        if not text.strip():
            logger.warning(f"No text could be extracted from PDF: {original_filename}")
            # Decide if you want to raise an error or allow upload of empty text PDFs
            # For now, let it proceed but it might not be useful for chat

        # Store the PDF file content and its original name
        document_files[document_id_uuid] = {"content": content, "name": original_filename}
        
        # Use get_or_create_collection for robustness
        collection = chroma_client.get_or_create_collection(name=document_id_uuid)
        
        chunks = [text[i:i+1000] for i in range(0, len(text), 1000)] if text else []
        if chunks: # Only add if there are chunks to add
            collection.add(
                documents=chunks,
                ids=[f"{document_id_uuid}_{i}" for i in range(len(chunks))]
            )
        else:
            logger.info(f"No text chunks to add to ChromaDB for document: {original_filename} (UUID: {document_id_uuid})")
            
        # Return the UUID as document_id and the original filename
        return {"document_id": document_id_uuid, "fileName": original_filename, "message": "PDF processed successfully"}
    
    except Exception as e:
        logger.error(f"Error in upload_pdf for {original_filename}: {str(e)}")
        # Clean up if collection was created but process failed partially (optional)
        # if chroma_client.get_collection(name=document_id_uuid): 
        #    chroma_client.delete_collection(name=document_id_uuid)
        # if document_id_uuid in document_files: del document_files[document_id_uuid]
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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 