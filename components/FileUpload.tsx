
import React, { useCallback, useState } from 'react';
import { PaperclipIcon } from './icons/PaperclipIcon';
import { LoaderIcon } from './icons/LoaderIcon';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  isLoading: boolean;
  error: string | null;
}

export default function FileUpload({ onFileSelect, isLoading, error }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onFileSelect(e.target.files[0]);
    }
  };

  const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);
  
  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onFileSelect(e.dataTransfer.files[0]);
    }
  }, [onFileSelect]);

  return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-base-100 dark:bg-dark-base-100">
      {isLoading ? (
        <div className="flex flex-col items-center gap-4">
          <LoaderIcon className="w-12 h-12 text-brand-primary animate-spin" />
          <p className="text-lg font-medium text-gray-700 dark:text-gray-300">Processing your PDF...</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">This might take a moment for large documents.</p>
        </div>
      ) : (
        <>
          <div 
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            className={`w-full max-w-lg p-10 border-2 border-dashed rounded-lg transition-colors duration-300 ${isDragging ? 'border-brand-primary bg-blue-50 dark:bg-blue-900/20' : 'border-gray-300 dark:border-gray-600 hover:border-brand-secondary'}`}
          >
            <input
              type="file"
              id="file-upload"
              className="hidden"
              accept=".pdf"
              onChange={handleFileChange}
              disabled={isLoading}
            />
            <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center gap-4">
              <PaperclipIcon className="w-12 h-12 text-gray-400 dark:text-gray-500" />
              <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">Drop your PDF here or click to browse</h2>
              <p className="text-gray-500 dark:text-gray-400">Your document will be processed locally in your browser.</p>
            </label>
          </div>
          {error && <p className="mt-4 text-red-500">{error}</p>}
        </>
      )}
    </div>
  );
}
