import { useState, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import type { ProcessedPdf, PdfTextItem } from '../types';

export const usePdfProcessor = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const processPdf = useCallback(async (file: File): Promise<ProcessedPdf | null> => {
    setIsProcessing(true);
    setError(null);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
      const numPages = pdf.numPages;
      let fullText = '';
      const allTextItems: PdfTextItem[] = [];
      const textItemsByPage: Record<number, PdfTextItem[]> = {};
      const pageViewports: any[] = [];
      
      let charCount = 0;

      for (let i = 1; i <= numPages; i++) {
        const page = await pdf.getPage(i);
        // Get viewport at a base scale of 1.0 for calculations
        const viewport = page.getViewport({ scale: 1.0 });
        pageViewports.push(viewport);
        const textContent = await page.getTextContent();
        
        textItemsByPage[i] = [];

        for (const item of textContent.items) {
          if ('str' in item && item.str.trim().length > 0) {
              const textItem: PdfTextItem = {
                  rawItem: item, // Store the raw item from pdf.js
                  page: i,
                  startIndex: charCount,
                  endIndex: charCount + item.str.length,
              };
              allTextItems.push(textItem);
              textItemsByPage[i].push(textItem);
              fullText += item.str;
              charCount += item.str.length;
          }
        }
        // Add a space between pages instead of multiple newlines for more natural language processing
        if (i < numPages) {
            fullText += '\n\n';
            charCount += 2;
        }
      }
      
      setIsProcessing(false);
      return {
        file,
        fullText,
        textItems: allTextItems,
        textItemsByPage,
        totalPages: numPages,
        pageViewports,
      };
    } catch (e) {
      console.error('Error processing PDF:', e);
      setError('Failed to process PDF. Please ensure it is a valid file.');
      setIsProcessing(false);
      return null;
    }
  }, []);

  return { isProcessing, error, processPdf };
};