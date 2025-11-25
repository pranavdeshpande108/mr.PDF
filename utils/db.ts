import { openDB, IDBPDatabase } from 'idb';

const DB_NAME = 'MrPDFDB';
const DB_VERSION = 1;
const HISTORY_STORE = 'pdf_history';
const FILE_STORE = 'pdf_files';

export interface PdfHistoryItem {
  id: number;
  fileName: string;
  timestamp: number;
}

let dbPromise: Promise<IDBPDatabase> | null = null;

const initDB = () => {
  if (dbPromise) return dbPromise;
  dbPromise = openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(HISTORY_STORE)) {
        db.createObjectStore(HISTORY_STORE, { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains(FILE_STORE)) {
        db.createObjectStore(FILE_STORE, { keyPath: 'id' });
      }
    },
  });
  return dbPromise;
};

export const addPdf = async (file: File, fileName: string): Promise<number> => {
  const db = await initDB();
  const tx = db.transaction([HISTORY_STORE, FILE_STORE], 'readwrite');
  
  const historyItem = {
    fileName,
    timestamp: Date.now(),
  };

  const id = await tx.objectStore(HISTORY_STORE).add(historyItem);
  await tx.objectStore(FILE_STORE).put({ id, fileData: file });
  
  await tx.done;
  return id as number;
};

export const getHistory = async (): Promise<PdfHistoryItem[]> => {
  const db = await initDB();
  const items = await db.getAll(HISTORY_STORE);
  // Sort by timestamp descending (newest first)
  return items.sort((a, b) => b.timestamp - a.timestamp);
};

export const getPdf = async (id: number): Promise<File | null> => {
  const db = await initDB();
  const fileItem = await db.get(FILE_STORE, id);
  return fileItem ? fileItem.fileData : null;
};

export const deletePdf = async (id: number): Promise<void> => {
  const db = await initDB();
  const tx = db.transaction([HISTORY_STORE, FILE_STORE], 'readwrite');

  await tx.objectStore(HISTORY_STORE).delete(id);
  await tx.objectStore(FILE_STORE).delete(id);

  await tx.done;
};