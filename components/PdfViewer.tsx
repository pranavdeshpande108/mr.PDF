
import React, { useEffect, useRef, useState, useMemo } from 'react';
// FIX: Import TextChunk type to resolve TypeScript error.
import type { ProcessedPdf, PdfTextItem, TextChunk } from '../types';
import * as pdfjsLib from 'pdfjs-dist';
// FIX: TextItem and RenderParameters are not directly exported from 'pdfjs-dist'. They must be imported from a deep path.
import type { PDFDocumentProxy, PageViewport, RenderTask } from 'pdfjs-dist';
import type { TextItem, RenderParameters } from 'pdfjs-dist/types/src/display/api';
import { ZoomInIcon } from './icons/ZoomInIcon';
import { ZoomOutIcon } from './icons/ZoomOutIcon';
import { ArrowsPointingOutIcon } from './icons/ArrowsPointingOutIcon';

// Helper to calculate the scaled position of a text item.
const scaleTextItem = (item: TextItem, viewport: PageViewport) => {
    const tx = pdfjsLib.Util.transform(viewport.transform, item.transform);

    const fontHeight = Math.sqrt((tx[2] * tx[2]) + (tx[3] * tx[3]));
    let textWidth = 0;
    if (item.width) {
        textWidth = item.width * viewport.scale;
    }

    return {
        str: item.str,
        left: tx[4],
        top: tx[5] - fontHeight,
        width: textWidth || item.width,
        height: fontHeight,
    };
};

interface PageProps {
    pageNumber: number;
    pdfDoc: PDFDocumentProxy;
    pdfData: ProcessedPdf;
    highlightedTextItems: PdfTextItem[];
    scale: number;
}

const Page: React.FC<PageProps> = ({ pageNumber, pdfDoc, pdfData, highlightedTextItems, scale }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [viewport, setViewport] = useState<PageViewport | null>(null);

    const baseViewport = pdfData.pageViewports[pageNumber - 1];
    const scaledWidth = baseViewport.width * scale;
    const scaledHeight = baseViewport.height * scale;

    useEffect(() => {
        let isMounted = true;
        let renderTask: RenderTask | null = null; // To hold the render task

        const renderPage = async () => {
            const page = await pdfDoc.getPage(pageNumber);
            const newViewport = page.getViewport({ scale });
            if (!isMounted) return;
            setViewport(newViewport);
            
            const canvas = canvasRef.current;
            if (!canvas) return;

            const context = canvas.getContext('2d');
            if (!context) return;
            
            canvas.height = newViewport.height;
            canvas.width = newViewport.width;

            // FIX: The RenderParameters type requires the `canvas` property to be passed along with the context.
            const renderContext: RenderParameters = {
                canvasContext: context,
                viewport: newViewport,
                canvas,
                // Disable rendering of PDF annotations (like highlights) and forms
                annotationMode: pdfjsLib.AnnotationMode.DISABLE,
            };
            
            // Start the render and store the task
            renderTask = page.render(renderContext);
            await renderTask.promise;
        };

        renderPage();

        return () => { 
            isMounted = false; 
            // Cancel the render task on cleanup to prevent errors
            if (renderTask) {
                renderTask.cancel();
            }
        };
    }, [pdfDoc, pageNumber, scale]);

    const pageTextItems = pdfData.textItemsByPage[pageNumber] || [];

    return (
        <div 
            className="relative shadow-lg mb-4 bg-white" 
            style={{ width: scaledWidth, height: scaledHeight }}
        >
            <canvas ref={canvasRef} style={{width: '100%', height: '100%'}} />
            {viewport && (
                <div className="absolute top-0 left-0 w-full h-full text-layer">
                    {pageTextItems.map((item, index) => {
                        const isHighlighted = highlightedTextItems.some(hItem => hItem.startIndex === item.startIndex && hItem.endIndex === item.endIndex);
                        const scaledCoords = scaleTextItem(item.rawItem, viewport);
                        return (
                            <div
                                key={index}
                                style={{
                                    left: `${scaledCoords.left}px`,
                                    top: `${scaledCoords.top}px`,
                                    height: `${scaledCoords.height}px`,
                                    width: `${scaledCoords.width}px`,
                                    position: 'absolute',
                                    userSelect: 'text',
                                    color: 'transparent',
                                    backgroundColor: isHighlighted ? 'rgba(255, 255, 0, 0.4)' : 'transparent',
                                    transition: 'background-color 0.2s ease-in-out',
                                }}
                            >
                                {scaledCoords.str}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

interface PdfViewerProps {
    pdfData: ProcessedPdf;
    textChunks: TextChunk[];
    highlightedChunkIndex: number | null;
}

export default function PdfViewer({ pdfData, textChunks, highlightedChunkIndex }: PdfViewerProps) {
    const [scale, setScale] = useState(1.0);
    const [fitMode, setFitMode] = useState<'width' | null>('width');
    const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const loadPdf = async () => {
            try {
                const doc = await pdfjsLib.getDocument(URL.createObjectURL(pdfData.file)).promise;
                setPdfDoc(doc);
            } catch (error) {
                console.error("Error loading PDF document in viewer:", error);
            }
        };
        loadPdf();
    }, [pdfData.file]);

    useEffect(() => {
        const calculateFitWidthScale = () => {
            if (fitMode === 'width' && pdfDoc && containerRef.current) {
                pdfDoc.getPage(1).then(page => {
                    const viewport = page.getViewport({ scale: 1.0 });
                    // Subtract padding (p-4 = 1rem = 16px, *2 for both sides)
                    const containerWidth = containerRef.current!.offsetWidth - 32;
                    setScale(containerWidth / viewport.width);
                });
            }
        };

        calculateFitWidthScale();
        
        const resizeObserver = new ResizeObserver(calculateFitWidthScale);
        if (containerRef.current) {
            resizeObserver.observe(containerRef.current);
        }

        return () => resizeObserver.disconnect();
    }, [pdfDoc, fitMode]);

    const handleZoomIn = () => { setFitMode(null); setScale(s => s * 1.25); };
    const handleZoomOut = () => { setFitMode(null); setScale(s => s / 1.25); };
    const handleFitWidth = () => { if (fitMode !== 'width') setFitMode('width'); };

    const highlightedTextItems = useMemo(() => {
        if (highlightedChunkIndex === null) return [];
        const chunk = textChunks[highlightedChunkIndex];
        if (!chunk) return [];

        return pdfData.textItems.filter(item => 
            item.startIndex < chunk.endIndex && item.endIndex > chunk.startIndex
        );
    }, [highlightedChunkIndex, textChunks, pdfData.textItems]);

    return (
        <div ref={containerRef} className="relative w-full h-full overflow-hidden bg-base-200 dark:bg-dark-base-200">
             {pdfDoc && (
                <div className="absolute top-2 left-1/2 -translate-x-1/2 z-20 bg-gray-900/60 backdrop-blur-sm text-white rounded-full shadow-lg p-1 flex items-center gap-1">
                    <button onClick={handleZoomOut} className="p-2 hover:bg-white/20 rounded-full transition-colors" aria-label="Zoom Out"><ZoomOutIcon className="w-5 h-5" /></button>
                    <span className="px-2 text-sm font-semibold w-16 text-center">{Math.round(scale * 100)}%</span>
                    <button onClick={handleZoomIn} className="p-2 hover:bg-white/20 rounded-full transition-colors" aria-label="Zoom In"><ZoomInIcon className="w-5 h-5" /></button>
                    <div className="w-px h-5 bg-white/30 mx-1"></div>
                    <button onClick={handleFitWidth} className="p-2 hover:bg-white/20 rounded-full transition-colors" aria-label="Fit to width"><ArrowsPointingOutIcon className="w-5 h-5" /></button>
                </div>
            )}
            <div className="w-full h-full overflow-y-auto p-4 pt-14">
                <div className="flex flex-col items-center">
                    {!pdfDoc ? (
                        <div className="text-center p-8">
                            <p className="text-lg font-medium text-gray-700 dark:text-gray-300">Loading PDF...</p>
                        </div>
                     ) : (
                        Array.from({ length: pdfDoc.numPages }, (_, i) => i + 1).map((pageNumber) => (
                            <Page 
                                key={pageNumber} 
                                pageNumber={pageNumber} 
                                pdfDoc={pdfDoc}
                                pdfData={pdfData} 
                                highlightedTextItems={highlightedTextItems.filter(item => item.page === pageNumber)}
                                scale={scale}
                            />
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}