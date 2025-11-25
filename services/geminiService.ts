import { GoogleGenAI, Modality } from "@google/genai";
import type { TextChunk } from '../types';

// FIX: The API key must be retrieved from `process.env.API_KEY` as per the coding guidelines.
// This change also resolves the TypeScript error "Property 'env' does not exist on type 'ImportMeta'".
const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  throw new Error("The API_KEY environment variable is not set. Please ensure it is configured.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

export const summarizePdf = async (text: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Provide a concise but comprehensive summary of the following document. Focus on the key points, findings, and conclusions. Use bullet points for clarity where appropriate.\n\n---\n\n${text}`,
    });
    return response.text;
  } catch (error) {
    console.error("Error summarizing text:", error);
    return "Sorry, I couldn't summarize the document. Please try again.";
  }
};

export const answerQuestionFromPdf = async (context: string, question: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Based on the content of the document provided below, please answer the following question. Your answer should be based solely on the information in the document. If the answer cannot be found, state that clearly.\n\n--DOCUMENT--\n${context}\n\n--QUESTION--\n${question}`,
    });
    return response.text;
  } catch (error) {
    console.error("Error answering question:", error);
    return "Sorry, I encountered an error trying to answer your question. Please try again.";
  }
};

export const generateAudioFromText = async (text: string): Promise<string | null> => {
  if (text.length > 5000) { // Safety check for long texts
     text = text.substring(0, 5000) + "...";
  }
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `Say clearly: ${text}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Kore' },
            },
        },
      },
    });
    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    return base64Audio || null;
  } catch (error) {
    console.error("Error generating audio:", error);
    return null;
  }
};

export const chunkText = (text: string, chunkSize: number = 500): TextChunk[] => {
    const sentences = text.match(/[^.!?]+[.!?]*/g) || [];
    const chunks: TextChunk[] = [];
    let currentChunk = "";
    let charIndex = 0;
    let chunkStartIndex = 0;

    for (const sentence of sentences) {
        if ((currentChunk + sentence).length > chunkSize && currentChunk) {
            chunks.push({
                text: currentChunk.trim(),
                startIndex: chunkStartIndex,
                endIndex: charIndex,
            });
            currentChunk = "";
            chunkStartIndex = charIndex;
        }
        currentChunk += sentence;
        charIndex += sentence.length;
    }
    if (currentChunk) {
        chunks.push({
            text: currentChunk.trim(),
            startIndex: chunkStartIndex,
            endIndex: charIndex,
        });
    }

    return chunks;
};


export const generateFullAudioFromPdfText = async (text: string): Promise<string[]> => {
    console.log('Starting audio generation for full text...');
    const chunks = chunkText(text).map(c => c.text);
    console.log(`Text split into ${chunks.length} chunks.`);
    const audioChunks: string[] = [];
    
    // Use Promise.all for concurrent requests with a sliding window for rate limiting
    const concurrencyLimit = 5;
    let activeRequests = 0;
    const results: (string | null)[] = new Array(chunks.length).fill(null);

    await new Promise((resolve, reject) => {
        let i = 0;
        const processNext = async () => {
            if (i >= chunks.length) {
                if (activeRequests === 0) resolve(true);
                return;
            }

            const chunkIndex = i++;
            const chunk = chunks[chunkIndex];

            while (activeRequests >= concurrencyLimit) {
                await new Promise(r => setTimeout(r, 100));
            }
            
            activeRequests++;
            console.log(`Generating audio for chunk ${chunkIndex + 1}/${chunks.length}`);
            generateAudioFromText(chunk)
                .then(audioData => {
                    if (audioData) results[chunkIndex] = audioData;
                })
                .catch(error => {
                    console.error(`Failed to generate audio for chunk ${chunkIndex + 1}:`, error);
                })
                .finally(() => {
                    activeRequests--;
                    processNext();
                });
        };

        for (let k = 0; k < concurrencyLimit && k < chunks.length; k++) {
            processNext();
        }
    });

    const successfulChunks = results.filter((r): r is string => r !== null);
    console.log(`Successfully generated ${successfulChunks.length} audio chunks.`);
    return successfulChunks;
};
