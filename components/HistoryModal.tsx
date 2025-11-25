import React from 'react';
import type { PdfHistoryItem } from '../utils/db';
import { XCircleIcon } from './icons/XCircleIcon';
import { TrashIcon } from './icons/TrashIcon';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  history: PdfHistoryItem[];
  onSelect: (id: number) => void;
  onDelete: (id: number) => void;
}

export default function HistoryModal({ isOpen, onClose, history, onSelect, onDelete }: HistoryModalProps) {
  if (!isOpen) return null;

  const handleDelete = (e: React.MouseEvent, id: number) => {
    e.stopPropagation(); // Prevent onSelect from firing
    onDelete(id);
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-gray-900 bg-opacity-60 backdrop-blur-sm flex items-center justify-center"
      onClick={onClose}
    >
      <div 
        className="bg-base-100 dark:bg-dark-base-100 w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="p-4 border-b border-base-300 dark:border-dark-base-300 flex justify-between items-center">
          <h2 className="text-xl font-bold">PDF History</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-base-200 dark:hover:bg-dark-base-200">
            <XCircleIcon className="w-6 h-6" />
          </button>
        </header>
        <div className="flex-grow p-4 overflow-y-auto">
          {history.length > 0 ? (
            <ul className="space-y-2">
              {history.map((item) => (
                <li 
                  key={item.id}
                  onClick={() => onSelect(item.id)}
                  className="flex justify-between items-center p-3 rounded-lg hover:bg-base-200 dark:hover:bg-dark-base-200 cursor-pointer transition-colors"
                >
                  <div>
                    <p className="font-semibold text-base-content dark:text-dark-content">{item.fileName}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {new Date(item.timestamp).toLocaleString()}
                    </p>
                  </div>
                  <button
                    onClick={(e) => handleDelete(e, item.id)}
                    className="p-2 text-gray-500 hover:text-red-500 rounded-full hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                    aria-label={`Delete ${item.fileName}`}
                  >
                    <TrashIcon className="w-5 h-5" />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-center py-12">
              <p className="text-lg text-gray-600 dark:text-gray-400">No history yet.</p>
              <p className="text-sm text-gray-500">Upload a PDF to get started!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}