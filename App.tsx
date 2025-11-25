import React, { useState, useMemo, useEffect } from 'react';
import FileUpload from './components/FileUpload';
import ChatInterface from './components/ChatInterface';
import LoginPage from './components/LoginPage';
import { usePdfProcessor } from './hooks/usePdfProcessor';
import { LogoutIcon } from './components/icons/LogoutIcon';
import ResizablePanel from './components/ResizablePanel';
import PdfViewer from './components/PdfViewer';
import type { ProcessedPdf } from './types';
import { chunkText } from './services/geminiService';
import { DocumentTextIcon } from './components/icons/DocumentTextIcon';
import { ChatBubbleIcon } from './components/icons/ChatBubbleIcon';
import { XCircleIcon } from './components/icons/XCircleIcon';
import * as db from './utils/db';
import type { PdfHistoryItem } from './utils/db';
import HistoryModal from './components/HistoryModal';
import { HistoryIcon } from './components/icons/HistoryIcon';


// Set up pdf.js worker from a CDN. This is a robust way to avoid build issues.
import * as pdfjs from 'pdfjs-dist';
pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;


export default function App() {
  const [user, setUser] = useState(() => {
    const currentUserEmail = localStorage.getItem('mr-pdf-currentUser');
    return currentUserEmail ? { email: currentUserEmail } : null;
  });
  const [processedPdf, setProcessedPdf] = useState<ProcessedPdf | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const { isProcessing, error: processingError, processPdf } = usePdfProcessor();
  const [highlightedChunkIndex, setHighlightedChunkIndex] = useState<number | null>(null);
  const [mobileView, setMobileView] = useState<'pdf' | 'chat'>('pdf');
  const [history, setHistory] = useState<PdfHistoryItem[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  useEffect(() => {
    const fetchHistory = async () => {
      const historyItems = await db.getHistory();
      setHistory(historyItems);
    };
    fetchHistory();
  }, []);

  const textChunks = useMemo(() => 
    processedPdf ? chunkText(processedPdf.fullText) : [], 
    [processedPdf]
  );

  const handleFileSelect = async (file: File, fromHistory = false) => {
    setProcessedPdf(null);
    setFileName(null);
    const data = await processPdf(file);
    if (data) {
      setProcessedPdf(data);
      setFileName(file.name);
      if (!fromHistory) {
        try {
          await db.addPdf(file, file.name);
          const historyItems = await db.getHistory();
          setHistory(historyItems);
        } catch (error) {
          console.error("Failed to save PDF to history:", error);
        }
      }
    }
  };

  const handleReset = () => {
    setProcessedPdf(null);
    setFileName(null);
    setHighlightedChunkIndex(null);
    setMobileView('pdf'); // Reset to PDF view
  };

  const handleLogin = (userData: { email: string }) => {
    localStorage.setItem('mr-pdf-currentUser', userData.email);
    setUser({ email: userData.email });
  };
  
  const handleSignUp = (userData: { email: string; password?: string }) => {
    const users = JSON.parse(localStorage.getItem('mr-pdf-users') || '[]');
    users.push(userData);
    localStorage.setItem('mr-pdf-users', JSON.stringify(users));
    handleLogin({ email: userData.email }); // Auto-login after signup
  };

  const handleLogout = () => {
    localStorage.removeItem('mr-pdf-currentUser');
    setUser(null);
    handleReset(); // Also clear the current PDF
  };

  const handleSelectFromHistory = async (id: number) => {
    const pdfFile = await db.getPdf(id);
    if (pdfFile) {
      await handleFileSelect(pdfFile, true);
      setIsHistoryOpen(false);
    } else {
      console.error("Could not retrieve PDF from history.");
    }
  };

  const handleDeleteFromHistory = async (id: number) => {
    await db.deletePdf(id);
    const historyItems = await db.getHistory();
    setHistory(historyItems);
  };


  const AppContent = () => (
    <main className="w-full h-[95vh] sm:h-[90vh] bg-base-100 dark:bg-dark-base-100 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
      <header className="p-4 border-b border-base-300 dark:border-dark-base-300 flex justify-between items-center flex-shrink-0 z-10">
        <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">
          📄 Mr.PDF
        </h1>
        <div className="flex items-center gap-2 sm:gap-4">
          {fileName && (
            <div className="hidden sm:flex items-center gap-2">
              <span className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-[120px] sm:max-w-[200px]">{fileName}</span>
              <button
                onClick={handleReset}
                className="bg-red-500 text-white px-2 sm:px-3 py-1 rounded-md text-sm hover:bg-red-600 transition-colors flex items-center gap-1">
                <XCircleIcon className="w-4 h-4" />
                <span className="hidden sm:inline">New PDF</span>
              </button>
            </div>
          )}
           <button
            onClick={() => setIsHistoryOpen(true)}
            className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 hover:text-brand-primary dark:hover:text-brand-secondary"
            aria-label="Open history"
            >
            <HistoryIcon className="w-5 h-5" />
            <span className="hidden sm:inline">History</span>
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 hover:text-brand-primary dark:hover:text-brand-secondary"
            aria-label="Logout"
            >
            <LogoutIcon className="w-5 h-5" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      <div className="flex-grow overflow-hidden">
        {processedPdf ? (
          <>
            {/* Desktop: Resizable Panel */}
            <div className="hidden md:flex w-full h-full">
               <ResizablePanel
                leftPanel={
                  <PdfViewer 
                    pdfData={processedPdf} 
                    textChunks={textChunks}
                    highlightedChunkIndex={highlightedChunkIndex} 
                  />
                }
                rightPanel={
                  <ChatInterface 
                    pdfText={processedPdf.fullText} 
                    textChunks={textChunks}
                    onHighlightChunkChange={setHighlightedChunkIndex}
                  />
                }
              />
            </div>
           
            {/* Mobile: Tabbed View */}
            <div className="flex flex-col h-full md:hidden">
              <div className="flex items-center justify-center p-2 border-b border-base-300 dark:border-dark-base-300">
                  {fileName && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-[150px]">{fileName}</span>
                      <button
                        onClick={handleReset}
                        className="bg-red-500 text-white px-2 py-1 rounded-md text-sm hover:bg-red-600 transition-colors flex items-center gap-1">
                        <XCircleIcon className="w-4 h-4" />
                      </button>
                    </div>
                  )}
              </div>
              <div className="flex-grow overflow-y-auto">
                {mobileView === 'pdf' && (
                   <PdfViewer 
                    pdfData={processedPdf} 
                    textChunks={textChunks}
                    highlightedChunkIndex={highlightedChunkIndex} 
                  />
                )}
                 {mobileView === 'chat' && (
                  <ChatInterface 
                    pdfText={processedPdf.fullText} 
                    textChunks={textChunks}
                    onHighlightChunkChange={setHighlightedChunkIndex}
                  />
                )}
              </div>
              <div className="flex-shrink-0 border-t border-base-300 dark:border-dark-base-300 bg-base-100 dark:bg-dark-base-200">
                <div className="flex">
                  <button
                    onClick={() => setMobileView('pdf')}
                    className={`w-1/2 py-3 text-center font-semibold flex items-center justify-center gap-2 transition-colors ${mobileView === 'pdf' ? 'text-brand-primary bg-base-200 dark:bg-dark-base-300' : 'text-gray-500 dark:text-gray-400'}`}
                  >
                    <DocumentTextIcon className="w-5 h-5" />
                    PDF
                  </button>
                  <button
                    onClick={() => setMobileView('chat')}
                    className={`w-1/2 py-3 text-center font-semibold flex items-center justify-center gap-2 transition-colors ${mobileView === 'chat' ? 'text-brand-primary bg-base-200 dark:bg-dark-base-300' : 'text-gray-500 dark:text-gray-400'}`}
                  >
                    <ChatBubbleIcon className="w-5 h-5" />
                    Chat
                  </button>
                </div>
              </div>
            </div>
          </>
        ) : (
          <FileUpload onFileSelect={(file) => handleFileSelect(file, false)} isLoading={isProcessing} error={processingError} />
        )}
      </div>
      <HistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        history={history}
        onSelect={handleSelectFromHistory}
        onDelete={handleDeleteFromHistory}
      />
    </main>
  );

  return (
    <div className="min-h-screen bg-base-200 dark:bg-dark-base-200 flex flex-col items-center justify-center p-2 sm:p-4 transition-colors duration-500">
      {user ? <AppContent /> : <LoginPage onLogin={handleLogin} onSignUp={handleSignUp} />}
    </div>
  );
}
