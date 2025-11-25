import React, { useEffect } from 'react';
import { PlayIcon } from './icons/PlayIcon';
import { PauseIcon } from './icons/PauseIcon';
import type { TextChunk } from '../types';
import { LoaderIcon } from './icons/LoaderIcon';

interface AudioPlayerProps {
    audioChunks: string[];
    textChunks: TextChunk[];
    play: (chunks: string[]) => void;
    pause: () => void;
    setPlaybackRate: (rate: number) => void;
    isPlaying: boolean;
    isLoaded: boolean;
    playbackRate: number;
    currentChunkIndex: number | null;
}

const playbackRates = [1, 1.5, 2];

export default function AudioPlayer({
    audioChunks,
    textChunks,
    play,
    pause,
    setPlaybackRate,
    isPlaying,
    isLoaded,
    playbackRate,
    currentChunkIndex,
}: AudioPlayerProps) {
    
    useEffect(() => {
        // Automatically start playing when audio chunks are loaded
        if(audioChunks.length > 0) {
            play(audioChunks);
        }
    }, [audioChunks]);


    const handlePlayPause = () => {
        if (isPlaying) {
            pause();
        } else {
            play(audioChunks);
        }
    };

    return (
        <div className="flex items-center justify-between p-3 mb-2 bg-base-200 dark:bg-dark-base-300 rounded-lg">
            <button
                onClick={handlePlayPause}
                className="p-2 rounded-full bg-brand-primary text-white hover:bg-brand-secondary transition-colors disabled:opacity-50 disabled:cursor-wait"
                aria-label={isPlaying ? 'Pause' : 'Play'}
                disabled={!isLoaded}
            >
                {!isLoaded ? <LoaderIcon className="w-5 h-5 animate-spin"/> : isPlaying ? <PauseIcon className="w-5 h-5" /> : <PlayIcon className="w-5 h-5" />}
            </button>
            <div className="text-sm font-medium text-base-content dark:text-dark-content">
                {!isLoaded ? 'Loading audio...' : currentChunkIndex !== null ? `Playing ${currentChunkIndex + 1} of ${audioChunks.length}` : 'Ready to play'}
            </div>
            <div className="flex items-center gap-1 bg-base-300 dark:bg-dark-base-200 rounded-full p-1">
                {playbackRates.map((rate) => (
                    <button
                        key={rate}
                        onClick={() => setPlaybackRate(rate)}
                        disabled={!isLoaded}
                        className={`px-3 py-1 text-xs font-bold rounded-full transition-colors disabled:opacity-50 ${
                            playbackRate === rate
                                ? 'bg-brand-primary text-white'
                                : 'bg-transparent text-base-content dark:text-dark-content hover:bg-base-100 dark:hover:bg-dark-base-300'
                        }`}
                    >
                        {rate}x
                    </button>
                ))}
            </div>
        </div>
    );
}