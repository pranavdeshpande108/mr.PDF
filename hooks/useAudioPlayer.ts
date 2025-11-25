import { useState, useRef, useCallback, useEffect } from 'react';
import { decode, decodeAudioData } from '../utils/audioUtils';

interface UseAudioPlayerProps {
    onChunkStart?: (index: number) => void;
    onFinished?: () => void;
}

export const useAudioPlayer = ({ onChunkStart, onFinished }: UseAudioPlayerProps) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [isLoaded, setIsLoaded] = useState(false);
    const [playbackRate, setPlaybackRate] = useState(1);
    const [currentChunkIndex, setCurrentChunkIndex] = useState<number | null>(null);

    const audioContextRef = useRef<AudioContext | null>(null);
    const audioBuffersRef = useRef<AudioBuffer[]>([]);
    const currentSourceRef = useRef<AudioBufferSourceNode | null>(null);
    const audioChunksRef = useRef<string[]>([]);
    
    // Resume state
    const pausedTimeRef = useRef(0);
    const startedAtRef = useRef(0);

    const cleanup = useCallback(() => {
        if (currentSourceRef.current) {
            currentSourceRef.current.onended = null;
            currentSourceRef.current.stop();
            currentSourceRef.current = null;
        }
        setIsPlaying(false);
        pausedTimeRef.current = 0;
    }, []);

    useEffect(() => {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        return () => {
            cleanup();
            audioContextRef.current?.close();
        };
    }, [cleanup]);

    const playChunk = useCallback(async (index: number) => {
        if (index >= audioBuffersRef.current.length || !audioContextRef.current) {
            cleanup();
            setIsLoaded(false);
            setCurrentChunkIndex(null);
            onFinished?.();
            return;
        }

        cleanup();

        const source = audioContextRef.current.createBufferSource();
        source.buffer = audioBuffersRef.current[index];
        source.playbackRate.value = playbackRate;
        source.connect(audioContextRef.current.destination);
        
        const offset = pausedTimeRef.current;
        source.start(0, offset);
        
        startedAtRef.current = audioContextRef.current.currentTime - offset;
        pausedTimeRef.current = 0;
        
        currentSourceRef.current = source;
        setIsPlaying(true);
        setCurrentChunkIndex(index);
        onChunkStart?.(index);

        source.onended = () => {
            if (isPlaying) { // If it ended naturally, not by pausing
                playChunk(index + 1);
            }
        };
    }, [playbackRate, isPlaying, cleanup, onChunkStart, onFinished]);

    const pause = useCallback(() => {
        if (!currentSourceRef.current || !audioContextRef.current) return;
        
        pausedTimeRef.current = audioContextRef.current.currentTime - startedAtRef.current;
        cleanup();
    }, [cleanup]);
    
    const play = useCallback(async (chunks: string[]) => {
        if (isPlaying) {
            // If already playing the same content, resume
            if (currentChunkIndex !== null) {
                playChunk(currentChunkIndex);
            }
            return;
        }
        
        // If it's a new playlist or first play
        if (chunks !== audioChunksRef.current) {
            audioChunksRef.current = chunks;
            const decodedBuffers = await Promise.all(
                chunks.map(chunk => decode(chunk))
                .map(bytes => decodeAudioData(bytes, audioContextRef.current!, 24000, 1))
            );
            audioBuffersRef.current = decodedBuffers;
            setIsLoaded(true);
        }

        const startIndex = pausedTimeRef.current > 0 ? currentChunkIndex ?? 0 : 0;
        playChunk(startIndex);

    }, [isPlaying, currentChunkIndex, playChunk]);

    const changeRate = useCallback((rate: number) => {
        setPlaybackRate(rate);
        if (currentSourceRef.current) {
            currentSourceRef.current.playbackRate.value = rate;
        }
    }, []);

    return {
        play,
        pause,
        setPlaybackRate: changeRate,
        isPlaying,
        isLoaded,
        playbackRate,
        currentChunkIndex
    };
};