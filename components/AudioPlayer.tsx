
import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2 } from 'lucide-react';

interface AudioPlayerProps {
  src: string;
  fromMe?: boolean;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({ src, fromMe }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const onTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const onLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (audioRef.current) {
      const time = parseFloat(e.target.value);
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.addEventListener('ended', () => setIsPlaying(false));
      return () => {
        audio.removeEventListener('ended', () => setIsPlaying(false));
      };
    }
  }, []);

  return (
    <div className={`p-3 w-64 md:w-72 rounded-2xl md:rounded-3xl transition-all duration-300 ${
      fromMe 
        ? 'bg-white/10 backdrop-blur-md border border-white/20' 
        : 'bg-slate-50 dark:bg-slate-800/50 backdrop-blur-md border border-slate-200/50 dark:border-slate-700/50 shadow-inner'
    }`}>
      <audio
        ref={audioRef}
        src={src}
        onTimeUpdate={onTimeUpdate}
        onLoadedMetadata={onLoadedMetadata}
        className="hidden"
      />
      
      <div className="flex items-center gap-3">
        {/* Play/Pause Button */}
        <button
          onClick={togglePlay}
          className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 group ${
            fromMe 
              ? 'bg-white text-legal-navy hover:scale-110 shadow-lg shadow-white/10' 
              : 'bg-legal-bronze text-white hover:scale-110 shadow-lg shadow-legal-bronze/20'
          }`}
        >
          {isPlaying ? <Pause size={18} /> : <Play size={18} className="translate-x-0.5" />}
        </button>

        {/* Waveform / Progress Container */}
        <div className="flex-1 flex flex-col gap-1">
          <div className="flex items-center gap-1 h-6">
            {/* Simulated Waveform Bars */}
            {[...Array(20)].map((_, i) => (
              <div
                key={i}
                className={`w-1 rounded-full transition-all duration-500 ${
                  fromMe ? 'bg-white/40' : 'bg-legal-bronze/30'
                }`}
                style={{
                  height: isPlaying 
                    ? `${20 + Math.random() * 80}%` 
                    : `${30 + (Math.sin(i * 0.5) * 20)}%`,
                  opacity: (currentTime / duration) > (i / 20) ? 1 : 0.4,
                  backgroundColor: (currentTime / duration) > (i / 20) && fromMe ? '#fff' : (currentTime / duration) > (i / 20) ? '#A67C52' : ''
                }}
              />
            ))}
          </div>

          {/* Hidden range input for scrubbing */}
          <div className="relative group h-2 flex items-center">
            <input
              type="range"
              min="0"
              max={duration || 0}
              step="0.01"
              value={currentTime}
              onChange={handleProgressChange}
              className={`absolute inset-0 w-full h-1 bg-transparent appearance-none cursor-pointer z-10 opacity-0 group-hover:opacity-100 transition-opacity`}
            />
            <div className={`absolute inset-y-0 left-0 h-1 rounded-full ${fromMe ? 'bg-white' : 'bg-legal-bronze'}`} style={{ width: `${(currentTime / duration) * 100}%` }} />
            <div className={`w-full h-1 rounded-full ${fromMe ? 'bg-white/20' : 'bg-slate-200 dark:bg-slate-700'}`} />
          </div>
        </div>

        {/* Volume / Info */}
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className={`text-[10px] font-bold font-mono ${fromMe ? 'text-white/80' : 'text-slate-500 dark:text-slate-400'}`}>
            {formatTime(currentTime)}
          </span>
          <Volume2 size={12} className={fromMe ? 'text-white/40' : 'text-slate-400'} />
        </div>
      </div>
    </div>
  );
};
