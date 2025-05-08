'use client';

import { useState } from 'react';
import { PlusIcon, DocumentIcon, TrashIcon, PencilIcon } from '@heroicons/react/24/outline';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';

interface Document {
  id: string;
  title: string;
  lastAccessed: Date;
  thumbnail?: string;
}

export default function Sidebar() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'application/pdf': ['.pdf']
    },
    onDrop: async (acceptedFiles) => {
      if (acceptedFiles.length === 0) return;

      setIsUploading(true);
      setError(null);

      const formData = new FormData();
      formData.append('file', acceptedFiles[0]);

      try {
        const response = await axios.post('http://localhost:8000/upload', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });

        const newDocument: Document = {
          id: response.data.document_id,
          title: acceptedFiles[0].name,
          lastAccessed: new Date(),
        };

        setDocuments(prev => [...prev, newDocument]);
        
        // Show success message in chat
        const event = new CustomEvent('documentUploaded', {
          detail: { documentId: response.data.document_id, fileName: acceptedFiles[0].name }
        });
        window.dispatchEvent(event);

      } catch (err) {
        console.error('Error uploading file:', err);
        setError('Failed to upload document. Please try again.');
      } finally {
        setIsUploading(false);
      }
    }
  });

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-purple-500">
        <h1 className="text-2xl font-bold">ChatPDF</h1>
      </div>

      {/* Document List */}
      <div className="flex-1 overflow-y-auto p-4">
        {documents.map((doc) => (
          <div
            key={doc.id}
            className="group relative mb-4 p-3 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
          >
            <div className="flex items-center space-x-3">
              <DocumentIcon className="w-6 h-6" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{doc.title}</p>
                <p className="text-xs text-purple-200">
                  {doc.lastAccessed.toLocaleDateString()}
                </p>
              </div>
            </div>
            
            {/* Hover Actions */}
            <div className="absolute right-2 top-2 hidden group-hover:flex space-x-2">
              <button className="p-1 hover:bg-white/20 rounded">
                <PencilIcon className="w-4 h-4" />
              </button>
              <button className="p-1 hover:bg-white/20 rounded">
                <TrashIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Upload Button */}
      <div className="p-4 border-t border-purple-500">
        <button
          {...getRootProps()}
          className={`w-full flex items-center justify-center space-x-2 bg-white/10 hover:bg-white/20 text-white py-3 rounded-lg transition-colors ${
            isUploading ? 'opacity-50 cursor-not-allowed' : ''
          }`}
          disabled={isUploading}
        >
          <input {...getInputProps()} />
          <PlusIcon className="w-5 h-5" />
          <span>{isUploading ? 'Uploading...' : 'Upload Document'}</span>
        </button>
        {error && (
          <p className="mt-2 text-sm text-red-300 text-center">{error}</p>
        )}
      </div>
    </div>
  );
} 