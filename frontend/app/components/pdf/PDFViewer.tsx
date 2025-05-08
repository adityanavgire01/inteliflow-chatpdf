'use client';

import { useState, useEffect } from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

interface PDFViewerProps {
  url: string;
  highlightedPages?: number[];
}

export default function PDFViewer({ url, highlightedPages = [] }: PDFViewerProps) {
  const [scale, setScale] = useState<number>(1.0);
  const [currentDocument, setCurrentDocument] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    const handleDocumentUpload = (event: CustomEvent) => {
      const { documentId, fileName } = event.detail;
      setCurrentDocument({ id: documentId, name: fileName });
    };

    window.addEventListener('documentUploaded', handleDocumentUpload as EventListener);
    return () => {
      window.removeEventListener('documentUploaded', handleDocumentUpload as EventListener);
    };
  }, []);

  if (!currentDocument) {
    return (
      <div className="flex flex-col h-full items-center justify-center text-gray-500">
        <p>Upload a document to view it here</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Navigation Controls */}
      <div className="p-2 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => {
              const iframe = document.querySelector('iframe');
              if (iframe) {
                iframe.contentWindow?.postMessage({ type: 'prevPage' }, '*');
              }
            }}
            className="p-1 hover:bg-gray-100 rounded disabled:opacity-50"
          >
            <ChevronLeftIcon className="w-5 h-5" />
          </button>
          <span className="text-sm">PDF Viewer</span>
          <button
            onClick={() => {
              const iframe = document.querySelector('iframe');
              if (iframe) {
                iframe.contentWindow?.postMessage({ type: 'nextPage' }, '*');
              }
            }}
            className="p-1 hover:bg-gray-100 rounded disabled:opacity-50"
          >
            <ChevronRightIcon className="w-5 h-5" />
          </button>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setScale((prev) => Math.max(prev - 0.1, 0.5))}
            className="px-2 py-1 text-sm hover:bg-gray-100 rounded"
          >
            -
          </button>
          <span className="text-sm">{Math.round(scale * 100)}%</span>
          <button
            onClick={() => setScale((prev) => Math.min(prev + 0.1, 2))}
            className="px-2 py-1 text-sm hover:bg-gray-100 rounded"
          >
            +
          </button>
        </div>
      </div>

      {/* PDF Document */}
      <div className="flex-1 overflow-auto p-4">
        <iframe
          src={`http://localhost:8000/documents/${currentDocument.id}/view`}
          className="w-full h-full border-0"
          style={{ transform: `scale(${scale})`, transformOrigin: 'top left' }}
        />
      </div>
    </div>
  );
} 