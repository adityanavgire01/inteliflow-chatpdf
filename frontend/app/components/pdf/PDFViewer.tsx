'use client';

import { useState, useEffect } from 'react';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronDoubleLeftIcon,
  ChevronDoubleRightIcon,
} from '@heroicons/react/24/outline';

// Document type expected from MainLayout
interface DocumentToDisplay {
  id: string;
  name: string;
}

interface PDFViewerProps {
  highlightedPages?: number[];
  isCollapsed?: boolean;
  setIsCollapsed?: (isCollapsed: boolean) => void;
  onResizeStart?: (e: React.MouseEvent) => void;
  documentToDisplay?: DocumentToDisplay | null; // New prop from MainLayout
}

export default function PDFViewer({
  highlightedPages = [],
  isCollapsed,
  setIsCollapsed,
  onResizeStart,
  documentToDisplay,
}: PDFViewerProps) {
  const [scale, setScale] = useState<number>(1.0);

  if (isCollapsed) {
    return (
      <div
        className="flex items-center justify-center h-full w-full bg-gray-200 hover:bg-gray-300 cursor-pointer transition-colors"
        onClick={() => setIsCollapsed && setIsCollapsed(false)}
        title="Expand PDF Panel"
      >
        <ChevronDoubleRightIcon className="w-5 h-5 text-gray-700" />
      </div>
    );
  }

  if (!documentToDisplay) {
    return (
      <div className="flex flex-col h-full items-center justify-center text-gray-500 p-4 text-center bg-white">
        {setIsCollapsed && (
          <div className="absolute top-2 left-2">
            <button
              onClick={() => setIsCollapsed && setIsCollapsed(true)}
              className="p-1 hover:bg-gray-200 rounded"
              title="Collapse panel"
            >
              <ChevronDoubleLeftIcon className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        )}
        <p>Select or upload a document to view it here.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full relative bg-white">
      {onResizeStart && (
        <div
          onMouseDown={onResizeStart}
          className="absolute top-0 left-0 h-full w-2 cursor-col-resize bg-gray-300 hover:bg-gray-400 opacity-50 hover:opacity-100 transition-colors z-10"
          style={{ left: '-4px' }}
          title="Resize panel"
        />
      )}

      <div className="p-2 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center space-x-1">
          {setIsCollapsed && (
            <button
              onClick={() => setIsCollapsed && setIsCollapsed(true)}
              className="p-1 hover:bg-gray-100 rounded"
              title="Collapse panel"
            >
              <ChevronDoubleLeftIcon className="w-5 h-5 text-gray-600" />
            </button>
          )}
          <button
            onClick={() => {
              const iframe = document.querySelector('iframe');
              if (iframe) {
                iframe.contentWindow?.postMessage({ type: 'prevPage' }, '*');
              }
            }}
            className="p-1 hover:bg-gray-100 rounded disabled:opacity-50"
            disabled={!documentToDisplay}
          >
            <ChevronLeftIcon className="w-5 h-5" />
          </button>
          <span className="text-sm px-1 text-gray-700 truncate max-w-[150px] font-medium" title={documentToDisplay?.name || 'PDF Viewer'}>
            {documentToDisplay?.name || 'PDF Viewer'}
          </span>
          <button
            onClick={() => {
              const iframe = document.querySelector('iframe');
              if (iframe) {
                iframe.contentWindow?.postMessage({ type: 'nextPage' }, '*');
              }
            }}
            className="p-1 hover:bg-gray-100 rounded disabled:opacity-50"
            disabled={!documentToDisplay}
          >
            <ChevronRightIcon className="w-5 h-5" />
          </button>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setScale((prev) => Math.max(prev - 0.1, 0.5))}
            className="px-2 py-0.5 text-sm hover:bg-gray-100 rounded border"
            disabled={!documentToDisplay}
          >
            -
          </button>
          <span className="text-sm w-10 text-center">
            {documentToDisplay ? `${Math.round(scale * 100)}%` : '-'}
          </span>
          <button
            onClick={() => setScale((prev) => Math.min(prev + 0.1, 2))}
            className="px-2 py-0.5 text-sm hover:bg-gray-100 rounded border"
            disabled={!documentToDisplay}
          >
            +
          </button>
        </div>
      </div>

      {documentToDisplay && (
        <div className="flex-1 overflow-auto p-1 bg-gray-200">
          <iframe
            key={documentToDisplay.id}
            src={`http://localhost:8000/document/${documentToDisplay.id}`}
            className="w-full h-full border-0"
            style={{ transform: `scale(${scale})`, transformOrigin: '0 0' }}
            title={documentToDisplay.name || 'PDF Document'}
          />
        </div>
      )}
    </div>
  );
} 