'use client';

import { useState } from 'react';
import { PlusIcon, DocumentIcon, TrashIcon, PencilIcon } from '@heroicons/react/24/outline';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';
import clsx from 'clsx';

interface Document {
  id: string;
  name: string;
}

interface SidebarProps {
  uploadedDocuments?: Document[];
  selectedDocumentId?: string | null;
  onSelectDocument?: (docId: string) => void;
}

export default function Sidebar({
  uploadedDocuments = [],
  selectedDocumentId,
  onSelectDocument,
}: SidebarProps) {
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
        {uploadedDocuments.map((doc) => (
          <div
            key={doc.id}
            onClick={() => onSelectDocument && onSelectDocument(doc.id)}
            className={clsx(
              "group relative mb-4 p-3 rounded-lg transition-colors cursor-pointer",
              doc.id === selectedDocumentId ? 'bg-white/25' : 'bg-white/10 hover:bg-white/20'
            )}
          >
            <div className="flex items-center space-x-3">
              <DocumentIcon className="w-6 h-6" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{doc.name}</p>
              </div>
            </div>
          </div>
        ))}
        {uploadedDocuments.length === 0 && !isUploading && (
          <p className="text-purple-300 text-sm text-center">No documents uploaded yet. Click below to add one.</p>
        )}
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