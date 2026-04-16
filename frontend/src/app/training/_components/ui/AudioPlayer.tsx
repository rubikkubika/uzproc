'use client';

import { useRef } from 'react';
import { Play, Pause, Upload, Trash2, Music } from 'lucide-react';

interface AudioPlayerProps {
  slideIndex: number;
  hasAudio: boolean;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  onTogglePlayPause: () => void;
  onSeek: (time: number) => void;
  onUpload: (slideIndex: number, file: File) => void;
  onRemove: (slideIndex: number) => void;
  readOnly?: boolean;
}

function formatTime(seconds: number): string {
  if (!seconds || !isFinite(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function AudioPlayer({
  slideIndex,
  hasAudio,
  isPlaying,
  currentTime,
  duration,
  onTogglePlayPause,
  onSeek,
  onUpload,
  onRemove,
  readOnly = false,
}: AudioPlayerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUpload(slideIndex, file);
      e.target.value = '';
    }
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    onSeek(ratio * duration);
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="bg-gray-50 rounded-xl border border-gray-200 p-3 mt-3">
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={handleFileSelect}
      />

      <div className="flex items-center gap-3">
        <Music className="w-4 h-4 text-purple-600 flex-shrink-0" />
        <span className="text-sm font-semibold text-gray-700 flex-shrink-0">Озвучка</span>

        {hasAudio ? (
          <>
            <button
              onClick={onTogglePlayPause}
              className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-600 text-white hover:bg-purple-700 transition-colors flex-shrink-0"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
            </button>

            <div className="flex-1 flex items-center gap-2 min-w-0">
              <span className="text-xs text-gray-500 w-10 text-right flex-shrink-0">
                {formatTime(currentTime)}
              </span>
              <div
                className="flex-1 h-2 bg-gray-200 rounded-full cursor-pointer group"
                onClick={handleProgressClick}
              >
                <div
                  className="h-full bg-purple-500 rounded-full relative transition-all"
                  style={{ width: `${progress}%` }}
                >
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-purple-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
              <span className="text-xs text-gray-500 w-10 flex-shrink-0">
                {formatTime(duration)}
              </span>
            </div>

            {!readOnly && (
              <button
                onClick={() => onRemove(slideIndex)}
                className="flex items-center justify-center w-7 h-7 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors flex-shrink-0"
                title="Удалить озвучку"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </>
        ) : (
          !readOnly && (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white border border-gray-200 text-gray-600 hover:bg-purple-50 hover:border-purple-300 hover:text-purple-700 transition-colors"
            >
              <Upload className="w-3.5 h-3.5" />
              Загрузить аудио
            </button>
          )
        )}

        {hasAudio && !readOnly && (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center justify-center w-7 h-7 rounded-lg text-gray-400 hover:text-purple-600 hover:bg-purple-50 transition-colors flex-shrink-0"
            title="Заменить озвучку"
          >
            <Upload className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
