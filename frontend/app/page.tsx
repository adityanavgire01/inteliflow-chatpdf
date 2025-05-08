'use client';

import MainLayout from './components/layout/MainLayout';
import Sidebar from './components/sidebar/Sidebar';
import ChatInterface from './components/chat/ChatInterface';
import PDFViewer from './components/pdf/PDFViewer';

export default function Home() {
  return (
    <MainLayout>
      <Sidebar />
      <ChatInterface />
      <PDFViewer url="" />
    </MainLayout>
  );
} 