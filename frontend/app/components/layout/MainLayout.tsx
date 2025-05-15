'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import axios from "axios";
import { SunIcon, MoonIcon } from '@heroicons/react/24/outline';
// Removed clsx as it's not used in this simplified version of the PDF panel rendering
// import { ChevronDoubleLeftIcon, ChevronDoubleRightIcon } from '@heroicons/react/24/outline'; // Icons will be handled by PDFViewer

// Define types for better clarity
interface Document {
  id: string;
  name: string;
}

interface ChatMessage {
  role: string;
  content: string;
}

interface ChatSessions {
  [docId: string]: ChatMessage[];
}

interface MainLayoutProps {
  children: React.ReactNode;
}

const MIN_PANEL_WIDTH = 250;
const DEFAULT_PDF_WIDTH = 400;
const COLLAPSED_STRIP_WIDTH = 25;

export default function MainLayout({ children }: MainLayoutProps) {
  const [isPdfPanelCollapsed, setIsPdfPanelCollapsed] = useState(false);
  const [pdfPanelWidth, setPdfPanelWidth] = useState(DEFAULT_PDF_WIDTH);
  const [isResizing, setIsResizing] = useState(false);
  const layoutRef = useRef<HTMLDivElement>(null);

  // State for document-specific chats
  const [uploadedDocuments, setUploadedDocuments] = useState<Document[]>([]);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const [chatSessions, setChatSessions] = useState<ChatSessions>({});

  // Dark mode state
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('theme');
      if (stored === 'light' || stored === 'dark') return stored;
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
    }
    return 'light';
  });

  useEffect(() => {
    const savedWidth = localStorage.getItem('pdfPanelWidth');
    if (savedWidth) {
      setPdfPanelWidth(Math.max(MIN_PANEL_WIDTH, parseInt(savedWidth, 10)));
    }
    const savedCollapsed = localStorage.getItem('isPdfPanelCollapsed');
    if (savedCollapsed) {
      setIsPdfPanelCollapsed(savedCollapsed === 'true');
    }
    // TODO: Persist and load uploadedDocuments, selectedDocumentId, and chatSessions from localStorage if needed
  }, []);

  useEffect(() => {
    localStorage.setItem('pdfPanelWidth', pdfPanelWidth.toString());
  }, [pdfPanelWidth]);

  useEffect(() => {
    localStorage.setItem('isPdfPanelCollapsed', isPdfPanelCollapsed.toString());
  }, [isPdfPanelCollapsed]);

  // Apply theme to <html> and persist
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const root = window.document.documentElement;
      if (theme === 'dark') {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
      localStorage.setItem('theme', theme);
    }
  }, [theme]);

  // Handle document uploads from Sidebar
  useEffect(() => {
    const handleNewDocumentUpload = (event: CustomEvent) => {
      const { documentId, fileName } = event.detail;
      if (!documentId || !fileName) return;

      const newDocument: Document = { id: documentId, name: fileName };
      
      setUploadedDocuments(prevDocs => {
        // Avoid duplicates if event fires multiple times for same doc
        if (prevDocs.find(doc => doc.id === documentId)) return prevDocs;
        return [...prevDocs, newDocument];
      });
      
      setSelectedDocumentId(documentId);
      
      setChatSessions(prevSessions => {
        if (!prevSessions[documentId]) {
          return { ...prevSessions, [documentId]: [] };
        }
        return prevSessions; // Keep existing session if doc re-uploaded/selected
      });
    };

    window.addEventListener('documentUploaded', handleNewDocumentUpload as EventListener);
    return () => {
      window.removeEventListener('documentUploaded', handleNewDocumentUpload as EventListener);
    };
  }, []); // Empty dependency array: runs once on mount

  const handleSelectDocument = (docId: string) => {
    setSelectedDocumentId(docId);
    // PDFViewer will react to selectedDocumentId prop change
    // ChatInterface will react to messages prop change (derived from selectedDocumentId)
  };

  const handleAddChatMessage = (docId: string, message: ChatMessage) => {
    if (!docId) return; // Or handle error: no document selected
    setChatSessions(prevSessions => ({
      ...prevSessions,
      [docId]: [...(prevSessions[docId] || []), message],
    }));
  };

  const handleNewChatForDocument = (docId: string) => {
    if (!docId) return; 
    setChatSessions(prevSessions => ({
      ...prevSessions,
      [docId]: [], // Clear chat history for the specific document
    }));
  };
  
  const childrenArray = React.Children.toArray(children);
  const [sidebarChild, chatChild, pdfChild] = childrenArray.length >= 3 
    ? childrenArray 
    : [childrenArray[0] || null, childrenArray[1] || null, null];

  const handleMouseDownOnResizeHandle = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isResizing || !layoutRef.current || isPdfPanelCollapsed) return;
      const layoutRect = layoutRef.current.getBoundingClientRect();
      const sidebarEl = layoutRef.current.children[0] as HTMLElement;
      const sidebarWidth = sidebarEl.getBoundingClientRect().width;
      
      let newPdfWidth = layoutRect.right - e.clientX;
      const totalWidthForChatAndPdf = layoutRect.width - sidebarWidth;
      
      newPdfWidth = Math.max(MIN_PANEL_WIDTH, newPdfWidth);
      newPdfWidth = Math.min(newPdfWidth, totalWidthForChatAndPdf - MIN_PANEL_WIDTH);
      
      setPdfPanelWidth(newPdfWidth);
    },
    [isResizing, isPdfPanelCollapsed]
  );

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, handleMouseMove, handleMouseUp]);

  const sidebarPercentage = 25;
  const currentPdfContainerWidth = isPdfPanelCollapsed ? COLLAPSED_STRIP_WIDTH : pdfPanelWidth;
  const chatPanelCalcWidth = `calc(100% - ${sidebarPercentage}% - ${currentPdfContainerWidth}px)`;

  // Prepare props for children
  const currentChatMessages = selectedDocumentId ? chatSessions[selectedDocumentId] || [] : [];
  const selectedDocument = selectedDocumentId ? uploadedDocuments.find(doc => doc.id === selectedDocumentId) : null;

  const handleDeleteDocument = async (docId: string) => {
    // Remove from uploadedDocuments
    setUploadedDocuments(prev => prev.filter(doc => doc.id !== docId));
    // Remove from chatSessions
    setChatSessions(prev => {
      const updated = { ...prev };
      delete updated[docId];
      return updated;
    });
    // If the deleted document is selected, select another or clear selection
    setSelectedDocumentId(prev => {
      if (prev === docId) {
        const remaining = uploadedDocuments.filter(doc => doc.id !== docId);
        return remaining.length > 0 ? remaining[0].id : null;
      }
      return prev;
    });
    // Call backend to delete document
    try {
      await axios.delete(`http://localhost:8000/document/${docId}`);
    } catch (err) {
      // Optionally show error to user
      console.error("Failed to delete document from backend", err);
    }
  };

  const sidebar = sidebarChild && React.isValidElement(sidebarChild)
    ? React.cloneElement(sidebarChild as React.ReactElement<any>, {
        uploadedDocuments: uploadedDocuments,
        selectedDocumentId: selectedDocumentId,
        onSelectDocument: handleSelectDocument,
        onDeleteDocument: handleDeleteDocument, // Pass delete handler
      })
    : null;

  const chatInterface = chatChild && React.isValidElement(chatChild)
    ? React.cloneElement(chatChild as React.ReactElement<any>, {
        messages: currentChatMessages,
        documentId: selectedDocumentId, // Pass current doc ID for context
        documentName: selectedDocument ? selectedDocument.name : null, // Pass the name for the header
        onAddMessage: (message: ChatMessage) => selectedDocumentId && handleAddChatMessage(selectedDocumentId, message),
        onNewChat: () => selectedDocumentId && handleNewChatForDocument(selectedDocumentId),
        theme,
        setTheme,
      })
    : null;

  const pdfViewer = pdfChild && React.isValidElement(pdfChild)
   ? React.cloneElement(pdfChild as React.ReactElement<any>, {
       isCollapsed: isPdfPanelCollapsed,
       setIsCollapsed: (collapsed: boolean) => {
         setIsPdfPanelCollapsed(collapsed);
         if (!collapsed && pdfPanelWidth < MIN_PANEL_WIDTH) {
           const savedWidth = localStorage.getItem('pdfPanelWidth');
           setPdfPanelWidth(Math.max(MIN_PANEL_WIDTH, parseInt(savedWidth || DEFAULT_PDF_WIDTH.toString(), 10)));
         }
       },
       onResizeStart: handleMouseDownOnResizeHandle,
       // Pass the selected document details to PDFViewer
       // PDFViewer will need to be updated to use this instead of its own state for current doc
       documentToDisplay: selectedDocument, 
       // PDFViewer should remove its 'documentUploaded' listener as MainLayout handles selection
     })
   : null;

  return (
    <div ref={layoutRef} className="flex h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white overflow-hidden transition-colors duration-300">
      {/* Left Sidebar */}
      <motion.div
        style={{ width: `${sidebarPercentage}%` }}
        className="h-full bg-gradient-to-b from-purple-600 to-blue-600 text-white flex-shrink-0"
      >
        {sidebar}
      </motion.div>

      {/* Center Panel - Chat Interface */}
      <motion.div
        animate={{ width: chatPanelCalcWidth }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="h-full flex flex-col bg-white dark:bg-gray-900 flex-shrink-0 transition-colors duration-300"
      >
        {chatInterface} 
      </motion.div>

      {/* Right Panel - PDF Viewer Container (always rendered) */}
      {pdfViewer && (
         <motion.div
            animate={{ width: currentPdfContainerWidth }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="h-full bg-gray-100 dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 flex-shrink-0 overflow-hidden relative transition-colors duration-300"
         >
           {pdfViewer} 
         </motion.div>
      )}
    </div>
  );
} 