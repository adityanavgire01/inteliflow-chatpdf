'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import React from 'react';

interface MainLayoutProps {
  children: React.ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  const [isPdfPanelCollapsed, setIsPdfPanelCollapsed] = useState(false);

  // Convert children to array to access individual components
  const childrenArray = React.Children.toArray(children);
  const [sidebar, chat, pdf] = childrenArray;

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Left Sidebar - Document Management */}
      <motion.div
        initial={{ width: '25%' }}
        animate={{ width: '25%' }}
        className="h-full bg-gradient-to-b from-purple-600 to-blue-600 text-white"
      >
        {sidebar}
      </motion.div>

      {/* Center Panel - Chat Interface */}
      <motion.div
        initial={{ width: '60%' }}
        animate={{ width: isPdfPanelCollapsed ? '75%' : '60%' }}
        className="h-full flex flex-col bg-white"
      >
        {chat}
      </motion.div>

      {/* Right Panel - PDF Viewer */}
      <motion.div
        initial={{ width: '15%' }}
        animate={{ width: isPdfPanelCollapsed ? 0 : '15%' }}
        className={clsx(
          'h-full bg-gray-100 border-l border-gray-200',
          isPdfPanelCollapsed && 'hidden'
        )}
      >
        {pdf}
      </motion.div>
    </div>
  );
} 