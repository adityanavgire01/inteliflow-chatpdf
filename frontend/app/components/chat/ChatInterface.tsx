'use client';

import { useState, useEffect } from 'react';
import { PaperAirplaneIcon, PlusIcon } from '@heroicons/react/24/outline';
import { motion } from 'framer-motion';
import axios from 'axios';

interface Message {
  id: string;
  content: string;
  type: 'user' | 'ai';
  timestamp: Date;
  citations?: string[];
}

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [currentDocument, setCurrentDocument] = useState<{ id: string; name: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const handleDocumentUpload = (event: CustomEvent) => {
      const { documentId, fileName } = event.detail;
      setCurrentDocument({ id: documentId, name: fileName });
      setMessages([{
        id: Date.now().toString(),
        content: `Document "${fileName}" uploaded successfully! You can now ask questions about it.`,
        type: 'ai',
        timestamp: new Date(),
      }]);
    };

    window.addEventListener('documentUploaded', handleDocumentUpload as EventListener);
    return () => {
      window.removeEventListener('documentUploaded', handleDocumentUpload as EventListener);
    };
  }, []);

  const handleSend = async () => {
    if (!input.trim() || !currentDocument) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      content: input,
      type: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, newMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await axios.post('http://localhost:8000/chat', {
        messages: [{
          role: 'user',
          content: input
        }],
        document_id: currentDocument.id
      });

      const aiResponse: Message = {
        id: Date.now().toString(),
        content: response.data.response,
        type: 'ai',
        timestamp: new Date(),
        citations: response.data.citations,
      };

      setMessages(prev => [...prev, aiResponse]);
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        content: 'Error processing your request. Please try again.',
        type: 'ai',
        timestamp: new Date(),
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold">
          {currentDocument ? currentDocument.name : 'No Document Selected'}
        </h2>
      </div>

      {/* Message Thread */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <motion.div
            key={message.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[70%] rounded-lg p-3 ${
                message.type === 'user'
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
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center space-x-2">
          <button className="p-2 hover:bg-gray-100 rounded-lg">
            <PlusIcon className="w-5 h-5 text-gray-500" />
          </button>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={currentDocument ? "Ask about your document..." : "Upload a document to start chatting..."}
            className="flex-1 p-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            disabled={!currentDocument || isLoading}
          />
          <button
            onClick={handleSend}
            disabled={!currentDocument || isLoading || !input.trim()}
            className={`p-2 bg-purple-600 text-white rounded-lg transition-colors ${
              (!currentDocument || isLoading || !input.trim()) ? 'opacity-50 cursor-not-allowed' : 'hover:bg-purple-700'
            }`}
          >
            <PaperAirplaneIcon className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
} 