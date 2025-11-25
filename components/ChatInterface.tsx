import React, { useState, useRef, useEffect } from 'react';
import type { Message, TextChunk } from '../types';
import { summarizePdf, answerQuestionFromPdf, generateAudioFromText, generateFullAudioFromPdfText } from '../services/geminiService';
import { useAudioPlayer } from '../hooks/useAudioPlayer';
import { SparklesIcon } from './icons/SparklesIcon';
import { SendIcon } from './icons/SendIcon';
import { AudioWaveformIcon } from './icons/AudioWaveformIcon';
import { FileAudioIcon } from './icons/FileAudioIcon';
import { LoaderIcon } from './icons/LoaderIcon';
import AudioPlayer from './AudioPlayer';
import { ShareIcon } from './icons/ShareIcon';
import { CheckIcon } from './icons/CheckIcon';

interface ChatInterfaceProps {
  pdfText: string;
  textChunks: TextChunk[];
  onHighlightChunkChange: (index: number | null) => void;
}

const AssistantMessage: React.FC<{ message: Message; onGenerateAudio: (text: string) => void; isGeneratingAudio: boolean; lastAssistantMessageId: string | null }> = ({ message, onGenerateAudio, isGeneratingAudio, lastAssistantMessageId }) => {
    return (
        <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-brand-primary flex items-center justify-center flex-shrink-0">
                <SparklesIcon className="w-5 h-5 text-white" />
            </div>
            <div className="bg-base-200 dark:bg-dark-base-200 p-3 rounded-lg rounded-tl-none max-w-xl break-words">
                <p className="text-base-content dark:text-dark-content whitespace-pre-wrap">{message.content}</p>
                {message.id === lastAssistantMessageId && (
                     <button
                        onClick={() => onGenerateAudio(message.content)}
                        disabled={isGeneratingAudio}
                        className="mt-2 flex items-center gap-2 text-sm text-brand-secondary hover:underline disabled:opacity-50 disabled:cursor-not-allowed">
                        {isGeneratingAudio ? (
                           <> <LoaderIcon className="w-4 h-4 animate-spin" /> Generating... </>
                        ) : (
                           <> <AudioWaveformIcon className="w-4 h-4" /> Generate Audio </>
                        )}
                    </button>
                )}
            </div>
        </div>
    );
};

const UserMessage: React.FC<{ message: Message }> = ({ message }) => {
    return (
        <div className="flex justify-end">
            <div className="bg-brand-primary text-white p-3 rounded-lg rounded-br-none max-w-xl break-words">
                <p className="whitespace-pre-wrap">{message.content}</p>
            </div>
        </div>
    );
};

export default function ChatInterface({ pdfText, textChunks, onHighlightChunkChange }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([
    { id: 'initial', role: 'assistant', content: 'Hello! Your document is ready. You can ask me to summarize it, ask any specific questions, or convert the entire document to audio.' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [isConvertingToAudio, setIsConvertingToAudio] = useState(false);
  const [audioChunks, setAudioChunks] = useState<string[]>([]);
  const [isSingleMessageAudio, setIsSingleMessageAudio] = useState(false);
  const [showCopied, setShowCopied] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const {
      play,
      pause,
      setPlaybackRate,
      isPlaying,
      playbackRate,
      currentChunkIndex,
      isLoaded,
  } = useAudioPlayer({
      onChunkStart: (index) => {
          if (!isSingleMessageAudio) {
              onHighlightChunkChange(index);
          }
      },
      onFinished: () => onHighlightChunkChange(null),
  });

  const lastAssistantMessageId = messages.slice().reverse().find(m => m.role === 'assistant')?.id || null;
  const anyLoading = isLoading || isGeneratingAudio || isConvertingToAudio;

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const addMessage = (role: 'user' | 'assistant', content: string) => {
    setMessages(prev => [...prev, { id: Date.now().toString(), role, content }]);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || anyLoading) return;
    setAudioChunks([]);

    const userMessage = input;
    addMessage('user', userMessage);
    setInput('');
    setIsLoading(true);

    try {
      const answer = await answerQuestionFromPdf(pdfText, userMessage);
      addMessage('assistant', answer);
    } catch (error) {
      addMessage('assistant', 'Sorry, an error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSummarize = async () => {
    if (anyLoading) return;
    setAudioChunks([]);
    addMessage('user', 'Please summarize this document for me.');
    setIsLoading(true);
    try {
      const summary = await summarizePdf(pdfText);
      addMessage('assistant', summary);
    } catch (error) {
      addMessage('assistant', 'Sorry, an error occurred while summarizing. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateMessageAudio = async (text: string) => {
    if (anyLoading) return;
    setIsGeneratingAudio(true);
    setIsSingleMessageAudio(true);
    onHighlightChunkChange(null);
    setAudioChunks([]);
    try {
        const audioData = await generateAudioFromText(text);
        if(audioData){
            setAudioChunks([audioData]);
        } else {
            addMessage('assistant', "Sorry, I couldn't generate audio for this message.");
            setIsSingleMessageAudio(false);
        }
    } catch (error) {
        console.error(error);
        addMessage('assistant', "An error occurred while generating audio.");
        setIsSingleMessageAudio(false);
    } finally {
        setIsGeneratingAudio(false);
    }
  };

  const handleConvertToAudio = async () => {
    if (anyLoading) return;
    setIsSingleMessageAudio(false);
    setIsConvertingToAudio(true);
    setAudioChunks([]);
    addMessage('assistant', 'Generating audio for the entire document. This might take some time...');
    try {
        const generatedAudioChunks = await generateFullAudioFromPdfText(pdfText);
        if(generatedAudioChunks && generatedAudioChunks.length > 0){
            setAudioChunks(generatedAudioChunks);
            addMessage('assistant', 'Audio is ready. Use the player controls to listen.');
        } else {
            addMessage('assistant', 'Sorry, I was unable to generate any audio for the document.');
        }
    } catch (error) {
        console.error(error);
        addMessage('assistant', 'An unexpected error occurred while generating the document audio.');
    } finally {
        setIsConvertingToAudio(false);
    }
  };

  const handleShareChat = () => {
    const chatText = messages.map(msg => `${msg.role === 'user' ? 'You' : 'Mr.PDF'}:\n${msg.content}`).join('\n\n---\n\n');
    navigator.clipboard.writeText(chatText).then(() => {
        setShowCopied(true);
        setTimeout(() => setShowCopied(false), 2000);
    }, (err) => {
      console.error("Failed to copy chat:", err);
    });
  };

  return (
    <div className="flex flex-col h-full bg-base-100 dark:bg-dark-base-100">
      <div className="flex-shrink-0 p-4 border-b border-base-300 dark:border-dark-base-300 flex justify-between items-center">
        <h2 className="text-lg font-bold text-base-content dark:text-dark-content">Chat</h2>
        <div className="relative">
          <button 
            onClick={handleShareChat} 
            disabled={showCopied}
            className="p-2 text-gray-500 dark:text-gray-400 hover:text-brand-primary dark:hover:text-brand-secondary rounded-full hover:bg-base-200 dark:hover:bg-dark-base-200 transition-colors disabled:cursor-not-allowed" 
            aria-label={showCopied ? "Copied!" : "Copy chat to clipboard"}
          >
            {showCopied ? <CheckIcon className="w-5 h-5 text-green-500" /> : <ShareIcon className="w-5 h-5" />}
          </button>
           {showCopied && (
              <div className="absolute bottom-full mb-2 right-1/2 translate-x-1/2 px-2 py-1 text-xs text-white bg-gray-800 rounded-md">
                  Copied!
              </div>
          )}
        </div>
      </div>
      <div className="flex-grow p-6 space-y-6 overflow-y-auto">
        {messages.map((msg) => 
            msg.role === 'assistant' ? 
            <AssistantMessage key={msg.id} message={msg} onGenerateAudio={handleGenerateMessageAudio} isGeneratingAudio={isGeneratingAudio} lastAssistantMessageId={lastAssistantMessageId} /> : 
            <UserMessage key={msg.id} message={msg} />
        )}
        {isLoading && (
            <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-brand-primary flex items-center justify-center flex-shrink-0">
                    <SparklesIcon className="w-5 h-5 text-white" />
                </div>
                <div className="bg-base-200 dark:bg-dark-base-200 p-3 rounded-lg rounded-tl-none">
                    <LoaderIcon className="w-5 h-5 animate-spin text-base-content dark:text-dark-content" />
                </div>
            </div>
        )}
        <div ref={chatEndRef} />
      </div>
      <div className="p-4 border-t border-base-300 dark:border-dark-base-300 bg-base-100 dark:bg-dark-base-200">
        {audioChunks.length > 0 && (
          <AudioPlayer
            audioChunks={audioChunks}
            textChunks={textChunks}
            play={play}
            pause={pause}
            setPlaybackRate={setPlaybackRate}
            isPlaying={isPlaying}
            isLoaded={isLoaded}
            playbackRate={playbackRate}
            currentChunkIndex={currentChunkIndex}
          />
        )}
        <div className="mb-2 flex flex-col sm:flex-row gap-2">
            <button 
                onClick={handleSummarize} 
                disabled={anyLoading} 
                className="w-full px-4 py-2 text-base font-semibold bg-brand-secondary text-white rounded-lg hover:bg-brand-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
                Summarize Document
            </button>
             <button 
                onClick={handleConvertToAudio} 
                disabled={anyLoading} 
                className="w-full px-4 py-2 text-base font-semibold bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isConvertingToAudio ? (
                <>
                  <LoaderIcon className="w-5 h-5 animate-spin"/>
                  <span>Converting...</span>
                </>
              ) : (
                <>
                  <FileAudioIcon className="w-5 h-5" />
                  <span>Convert to Audio</span>
                </>
              )}
            </button>
        </div>
        <form onSubmit={handleSendMessage} className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question about the PDF..."
            className="flex-grow p-3 rounded-lg bg-base-200 dark:bg-dark-base-300 focus:outline-none focus:ring-2 focus:ring-brand-primary"
            disabled={anyLoading}
          />
          <button type="submit" disabled={!input.trim() || anyLoading} className="p-3 bg-brand-primary text-white rounded-full hover:bg-blue-800 disabled:bg-gray-400 disabled:dark:bg-gray-600 disabled:cursor-not-allowed transition-colors">
            <SendIcon className="w-6 h-6" />
          </button>
        </form>
      </div>
    </div>
  );
}