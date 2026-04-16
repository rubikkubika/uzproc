import { useState, useRef, useEffect, useCallback } from 'react';

interface SlideVideoState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
}

export function useSlideVideo(currentSlideIndex: number) {
  const [videoUrls, setVideoUrls] = useState<Record<number, string>>({});
  const [videoState, setVideoState] = useState<SlideVideoState>({
    isPlaying: false,
    currentTime: 0,
    duration: 0,
  });
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Stop and reset when slide changes
  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.pause();
      video.currentTime = 0;
    }
    setVideoState({ isPlaying: false, currentTime: 0, duration: 0 });
  }, [currentSlideIndex]);

  // Load video when slide changes
  useEffect(() => {
    const url = videoUrls[currentSlideIndex];
    const video = videoRef.current;
    if (!url || !video) return;

    video.src = url;
    video.load();
  }, [currentSlideIndex, videoUrls]);

  // Attach video element event listeners
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onPlay = () => setVideoState(s => ({ ...s, isPlaying: true }));
    const onPause = () => setVideoState(s => ({ ...s, isPlaying: false }));
    const onEnded = () => setVideoState(s => ({ ...s, isPlaying: false, currentTime: 0 }));
    const onTimeUpdate = () => setVideoState(s => ({ ...s, currentTime: video.currentTime }));
    const onDurationChange = () => setVideoState(s => ({ ...s, duration: video.duration || 0 }));

    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('ended', onEnded);
    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('durationchange', onDurationChange);

    return () => {
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('ended', onEnded);
      video.removeEventListener('timeupdate', onTimeUpdate);
      video.removeEventListener('durationchange', onDurationChange);
    };
  }, []);

  const togglePlayPause = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    const url = videoUrls[currentSlideIndex];
    if (!url) return;

    if (video.paused) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, [videoUrls, currentSlideIndex]);

  const seek = useCallback((time: number) => {
    const video = videoRef.current;
    if (video) {
      video.currentTime = time;
    }
  }, []);

  const uploadVideo = useCallback((slideIndex: number, file: File) => {
    const oldUrl = videoUrls[slideIndex];
    if (oldUrl) {
      URL.revokeObjectURL(oldUrl);
    }

    const url = URL.createObjectURL(file);
    setVideoUrls(prev => ({ ...prev, [slideIndex]: url }));
  }, [videoUrls]);

  const removeVideo = useCallback((slideIndex: number) => {
    const url = videoUrls[slideIndex];
    if (url) {
      URL.revokeObjectURL(url);
    }
    setVideoUrls(prev => {
      const next = { ...prev };
      delete next[slideIndex];
      return next;
    });

    const video = videoRef.current;
    if (video && slideIndex === currentSlideIndex) {
      video.pause();
      video.src = '';
      setVideoState({ isPlaying: false, currentTime: 0, duration: 0 });
    }
  }, [videoUrls, currentSlideIndex]);

  const hasVideo = videoUrls[currentSlideIndex] !== undefined;

  return {
    videoRef,
    videoState,
    hasVideo,
    videoUrls,
    togglePlayPause,
    seek,
    uploadVideo,
    removeVideo,
  };
}
