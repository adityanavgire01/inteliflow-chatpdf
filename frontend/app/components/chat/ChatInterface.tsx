'use client';

import { useState, useEffect } from 'react';
import { PaperAirplaneIcon, PlusIcon, SunIcon, MoonIcon } from '@heroicons/react/24/outline';
import { motion } from 'framer-motion';
import axios from 'axios';

// Message type should align with MainLayout's ChatMessage if possible, or be mapped.
// For now, using a local type and we assume MainLayout passes compatible data.
interface DisplayMessage {
  id: string; // MainLayout might not provide this, might need to generate here or adapt
  role: 'user' | 'ai'; // Renamed from type to role
  content: string;
  timestamp: Date; // MainLayout might not provide this
  citations?: string[];
}

// Props from MainLayout
interface ChatMessageFromLayout {
    role: string;
    content: string;
}

interface ChatInterfaceProps {
  messages?: ChatMessageFromLayout[]; // Messages for the selected document
  documentId?: string | null;      // ID of the selected document
  documentName?: string | null;    // Name of the selected document (for header)
  onAddMessage?: (message: ChatMessageFromLayout) => void;
  onNewChat?: () => void;
  theme?: 'light' | 'dark';
  setTheme?: (theme: 'light' | 'dark') => void;
}

export default function ChatInterface({
  messages = [],
  documentId,
  documentName,
  onAddMessage,
  onNewChat,
  theme = 'light',
  setTheme,
}: ChatInterfaceProps) {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Store timestamps for messages in a ref to avoid re-creating on every render
  const [messageTimestamps, setMessageTimestamps] = useState<{ [key: string]: Date }>({});

  // When messages array changes (new message added), add timestamp if not present
  useEffect(() => {
    if (!documentId) return;
    setMessageTimestamps(prev => {
      const updated = { ...prev };
      messages.forEach((msg, idx) => {
        const key = `${documentId}_${idx}`;
        if (!updated[key]) {
          updated[key] = new Date();
        }
      });
      return updated;
    });
  }, [messages, documentId]);

  // Use a stable key for each message (documentId + index)
  const displayMessages: DisplayMessage[] = messages.map((msg, index) => ({
    id: `${documentId}_${index}`,
    role: msg.role as 'user' | 'ai',
    content: msg.content,
    timestamp: messageTimestamps[`${documentId}_${index}`] || new Date(),
  }));

  const handleSend = async () => {
    if (!input.trim() || !documentId || !onAddMessage) return;

    const userMessage: ChatMessageFromLayout = {
      role: 'user',
      content: input,
    };
    
    // Add user message to local state/UI immediately via MainLayout
    onAddMessage(userMessage);
    
    const currentInput = input; // Save input before clearing
    setInput('');
    setIsLoading(true);

    try {
      // Prepare messages for the backend, mapping 'ai' to 'assistant' for OpenAI compatibility
      const messagesForBackend = [...messages, userMessage].map(m => ({
        role: m.role === 'ai' ? 'assistant' : m.role, // Key change here
        content: m.content
      }));

      const response = await axios.post('http://localhost:8000/chat', {
        messages: messagesForBackend, 
        document_id: documentId
      });

      const aiMessage: ChatMessageFromLayout = {
        role: 'ai', // Store as 'ai' internally in our app state via MainLayout
        content: response.data.response,
      };
      if (onAddMessage) {
        onAddMessage(aiMessage); 
      }

    } catch (error) {
      console.error('Error sending message:', error);
      if (onAddMessage) {
        onAddMessage({
          role: 'ai', // Store as 'ai' internally
          content: 'Error processing your request. Please try again.',
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewChatClick = () => {
    if (onNewChat) {
      onNewChat();
    }
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900 text-gray-900 dark:text-white transition-colors duration-300">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <h2 className="text-lg font-semibold truncate">
          {documentName ? documentName : 'No Document Selected'}
        </h2>
        {setTheme && (
          <button
            className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? (
              <SunIcon className="w-5 h-5 text-yellow-400" />
            ) : (
              <MoonIcon className="w-5 h-5 text-gray-700" />
            )}
          </button>
        )}
      </div>

      {/* Message Thread */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {displayMessages.map((message) => (
          <motion.div
            key={message.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[70%] rounded-lg p-3 ${
                message.role === 'user'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              <p className="text-sm">{message.content}</p>
              {message.citations && (
                <div className="mt-2 text-xs text-purple-200">
                  {message.citations.map((citation, index) => (
                    <div key={index} className="mt-1">
                      {citation}
                    </div>
                  ))}
                </div>
              )}
              <span className="text-xs opacity-70 mt-1 block">
                {message.timestamp.toLocaleTimeString()}
              </span>
            </div>
          </motion.div>
        ))}
        {displayMessages.length === 0 && documentId && (
            <p className="text-gray-400 text-sm text-center py-4">Chat history is empty. Ask something about "{documentName || 'this document'}".</p>
        )}
        {!documentId && (
            <p className="text-gray-400 text-sm text-center py-4">Please select or upload a document to start chatting.</p>
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center space-x-2">
          <button 
            onClick={handleNewChatClick}
            className="p-2 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            title="New Chat Session"
            disabled={!documentId || isLoading}
            >
            <PlusIcon className="w-5 h-5 text-gray-500" />
          </button>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={documentId ? "Ask about your document..." : "Upload or select a document..."}
            className="flex-1 p-2 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white text-gray-900 dark:bg-gray-800 dark:text-white transition-colors duration-300"
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            disabled={!documentId || isLoading}
          />
          <button
            onClick={handleSend}
            disabled={!documentId || isLoading || !input.trim()}
            className={`p-2 bg-purple-600 text-white rounded-lg transition-colors ${
              (!documentId || isLoading || !input.trim()) ? 'opacity-50 cursor-not-allowed' : 'hover:bg-purple-700'
            }`}
          >
            <PaperAirplaneIcon className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
} 