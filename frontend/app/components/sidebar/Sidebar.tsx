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
  onDeleteDocument?: (docId: string) => void;
}

export default function Sidebar({
  uploadedDocuments = [],
  selectedDocumentId,
  onSelectDocument,
  onDeleteDocument,
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
    <div className="flex flex-col h-full bg-gray-100 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transition-colors duration-300">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
        <h1 className="text-2xl font-bold text-gray-700 dark:text-gray-200">ChatPDF</h1>
      </div>

      {/* Document List */}
      <div className="flex-1 overflow-y-auto p-4">
        {uploadedDocuments.map((doc) => (
          <div
            key={doc.id}
            onClick={() => onSelectDocument && onSelectDocument(doc.id)}
            className={clsx(
              "group relative mb-4 p-3 rounded-lg transition-colors cursor-pointer border border-transparent",
              doc.id === selectedDocumentId
                ? 'bg-gray-200 dark:bg-gray-800 border-gray-300 dark:border-gray-700'
                : 'bg-gray-50 dark:bg-gray-900 hover:bg-gray-200 dark:hover:bg-gray-800'
            )}
          >
            <div className="flex items-center space-x-3">
              <DocumentIcon className="w-6 h-6 text-gray-400 dark:text-gray-500" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate text-gray-800 dark:text-gray-200">{doc.name}</p>
              </div>
              {/* Delete button */}
              {onDeleteDocument && (
                <button
                  className="p-1 ml-2 hover:bg-red-100 dark:hover:bg-red-900 rounded text-red-600 dark:text-red-400"
                  title="Delete document"
                  disabled={isUploading}
                  onClick={e => {
                    e.stopPropagation();
                    onDeleteDocument(doc.id);
                  }}
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        ))}
        {uploadedDocuments.length === 0 && !isUploading && (
          <p className="text-gray-400 text-sm text-center">No documents uploaded yet. Click below to add one.</p>
        )}
      </div>

      {/* Upload Button */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
        <button
          {...getRootProps()}
          className={`w-full flex items-center justify-center space-x-2 bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 py-3 rounded-lg transition-colors ${
            isUploading ? 'opacity-50 cursor-not-allowed' : ''
          }`}
          disabled={isUploading}
        >
          <input {...getInputProps()} />
          <PlusIcon className="w-5 h-5" />
          <span>{isUploading ? 'Uploading...' : 'Upload Document'}</span>
        </button>
        {error && (
          <p className="mt-2 text-sm text-red-400 text-center">{error}</p>
        )}
      </div>
    </div>
  );
} 