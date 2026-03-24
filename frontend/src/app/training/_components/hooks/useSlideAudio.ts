import { useState, useRef, useEffect, useCallback } from 'react';

interface SlideAudioState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
}

export function useSlideAudio(currentSlideIndex: number) {
  const [audioUrls, setAudioUrls] = useState<Record<number, string>>({});
  const [audioState, setAudioState] = useState<SlideAudioState>({
    isPlaying: false,
    currentTime: 0,
    duration: 0,
  });
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Stop and reset when slide changes
  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
    setAudioState({ isPlaying: false, currentTime: 0, duration: 0 });
  }, [currentSlideIndex]);

  // Auto-play when slide changes if audio exists
  useEffect(() => {
    const url = audioUrls[currentSlideIndex];
    if (!url) return;

    const audio = audioRef.current;
    if (!audio) return;

    audio.src = url;
    audio.load();

    const playAudio = () => {
      audio.play().catch(() => {
        // autoplay blocked by browser — user will press play manually
      });
    };

    audio.addEventListener('canplay', playAudio, { once: true });
    return () => {
      audio.removeEventListener('canplay', playAudio);
    };
  }, [currentSlideIndex, audioUrls]);

  // Attach audio element event listeners
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onPlay = () => setAudioState(s => ({ ...s, isPlaying: true }));
    const onPause = () => setAudioState(s => ({ ...s, isPlaying: false }));
    const onEnded = () => setAudioState(s => ({ ...s, isPlaying: false, currentTime: 0 }));
    const onTimeUpdate = () => setAudioState(s => ({ ...s, currentTime: audio.currentTime }));
    const onDurationChange = () => setAudioState(s => ({ ...s, duration: audio.duration || 0 }));

    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('durationchange', onDurationChange);

    return () => {
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('durationchange', onDurationChange);
    };
  }, []);

  const togglePlayPause = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const url = audioUrls[currentSlideIndex];
    if (!url) return;

    if (audio.src !== url) {
      audio.src = url;
      audio.load();
    }

    if (audio.paused) {
      audio.play().catch(() => {});
    } else {
      audio.pause();
    }
  }, [audioUrls, currentSlideIndex]);

  const seek = useCallback((time: number) => {
    const audio = audioRef.current;
    if (audio) {
      audio.currentTime = time;
    }
  }, []);

  const uploadAudio = useCallback((slideIndex: number, file: File) => {
    // Revoke old URL to free memory
    const oldUrl = audioUrls[slideIndex];
    if (oldUrl) {
      URL.revokeObjectURL(oldUrl);
    }

    const url = URL.createObjectURL(file);
    setAudioUrls(prev => ({ ...prev, [slideIndex]: url }));
  }, [audioUrls]);

  const removeAudio = useCallback((slideIndex: number) => {
    const url = audioUrls[slideIndex];
    if (url) {
      URL.revokeObjectURL(url);
    }
    setAudioUrls(prev => {
      const next = { ...prev };
      delete next[slideIndex];
      return next;
    });

    const audio = audioRef.current;
    if (audio && slideIndex === currentSlideIndex) {
      audio.pause();
      audio.src = '';
      setAudioState({ isPlaying: false, currentTime: 0, duration: 0 });
    }
  }, [audioUrls, currentSlideIndex]);

  const hasAudio = audioUrls[currentSlideIndex] !== undefined;

  return {
    audioRef,
    fileInputRef,
    audioState,
    hasAudio,
    audioUrls,
    togglePlayPause,
    seek,
    uploadAudio,
    removeAudio,
  };
}
