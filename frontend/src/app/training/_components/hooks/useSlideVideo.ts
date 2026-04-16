'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

interface SlideVideoState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
}

interface MediaItem {
  slideId: number;
  type: string;
}

const API_BASE = '/api/training/media';

function getVideoUrl(slideId: number): string {
  return `${API_BASE}/${slideId}/video`;
}

export function useSlideVideo(currentSlideIndex: number) {
  const slideId = currentSlideIndex + 1;

  const [loadedSlides, setLoadedSlides] = useState<Set<number>>(new Set());
  const [videoState, setVideoState] = useState<SlideVideoState>({
    isPlaying: false,
    currentTime: 0,
    duration: 0,
  });
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // При первом монтировании — загружаем список всех медиафайлов с сервера
  useEffect(() => {
    fetch(API_BASE)
      .then(r => r.json())
      .then((items: MediaItem[]) => {
        const videoSlides = new Set(
          items.filter(i => i.type === 'video').map(i => i.slideId)
        );
        setLoadedSlides(videoSlides);
      })
      .catch(() => {});
  }, []);

  // Остановить и сбросить при смене слайда
  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.pause();
      video.currentTime = 0;
    }
    setVideoState({ isPlaying: false, currentTime: 0, duration: 0 });
  }, [currentSlideIndex]);

  // Загрузить видео если есть для текущего слайда
  useEffect(() => {
    if (!loadedSlides.has(slideId)) return;
    const video = videoRef.current;
    if (!video) return;

    video.src = getVideoUrl(slideId);
    video.load();
  }, [currentSlideIndex, loadedSlides, slideId]);

  // Слушатели событий video элемента
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
    if (!video || !loadedSlides.has(slideId)) return;

    if (video.paused) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, [loadedSlides, slideId]);

  const seek = useCallback((time: number) => {
    const video = videoRef.current;
    if (video) video.currentTime = time;
  }, []);

  const uploadVideo = useCallback(async (slideIndex: number, file: File) => {
    const id = slideIndex + 1;
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`${API_BASE}/${id}/video`, {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) throw new Error('Ошибка загрузки');

      setLoadedSlides(prev => new Set([...prev, id]));

      if (id === slideId) {
        const video = videoRef.current;
        if (video) {
          video.src = getVideoUrl(id) + '?t=' + Date.now();
          video.load();
        }
      }
    } catch (e) {
      console.error('Ошибка загрузки видео:', e);
    }
  }, [slideId]);

  const removeVideo = useCallback(async (slideIndex: number) => {
    const id = slideIndex + 1;
    try {
      await fetch(`${API_BASE}/${id}/video`, { method: 'DELETE' });
      setLoadedSlides(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });

      const video = videoRef.current;
      if (video && id === slideId) {
        video.pause();
        video.src = '';
        setVideoState({ isPlaying: false, currentTime: 0, duration: 0 });
      }
    } catch (e) {
      console.error('Ошибка удаления видео:', e);
    }
  }, [slideId]);

  const hasVideo = loadedSlides.has(slideId);

  // videoUrls — для SlideList (показываем иконку если есть видео)
  const videoUrls: Record<number, string> = {};
  loadedSlides.forEach(id => {
    videoUrls[id - 1] = getVideoUrl(id);
  });

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
