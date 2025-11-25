
// FIX: TextItem is not directly exported from 'pdfjs-dist'. It must be imported from a deep path.
import type { PageViewport } from 'pdfjs-dist';
import type { TextItem } from 'pdfjs-dist/types/src/display/api';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export interface PdfTextItem {
  rawItem: TextItem;
  page: number;
  startIndex: number;
  endIndex: number;
}

export interface TextChunk {
  text: string;
  startIndex: number;
  endIndex: number;
}

export interface ProcessedPdf {
  file: File;
  fullText: string;
  textItems: PdfTextItem[];
  textItemsByPage: Record<number, PdfTextItem[]>;
  totalPages: number;
  pageViewports: PageViewport[]; // Will store viewports at scale 1.0
}