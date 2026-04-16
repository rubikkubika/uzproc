'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

interface SlideAudioState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
}

interface MediaItem {
  slideId: number;
  type: string;
}

const API_BASE = '/api/training/media';

function getAudioUrl(slideId: number): string {
  return `${API_BASE}/${slideId}/audio`;
}

export function useSlideAudio(currentSlideIndex: number) {
  // slideId = index + 1 (слайды в БД хранятся по id, а не по индексу массива)
  const slideId = currentSlideIndex + 1;

  // Множество слайдов у которых есть загруженное аудио
  const [loadedSlides, setLoadedSlides] = useState<Set<number>>(new Set());
  const [audioState, setAudioState] = useState<SlideAudioState>({
    isPlaying: false,
    currentTime: 0,
    duration: 0,
  });
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // При первом монтировании — загружаем список всех медиафайлов с сервера
  useEffect(() => {
    fetch(API_BASE)
      .then(r => r.json())
      .then((items: MediaItem[]) => {
        const audioSlides = new Set(
          items.filter(i => i.type === 'audio').map(i => i.slideId)
        );
        setLoadedSlides(audioSlides);
      })
      .catch(() => {});
  }, []);

  // Остановить и сбросить при смене слайда
  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
    setAudioState({ isPlaying: false, currentTime: 0, duration: 0 });
  }, [currentSlideIndex]);

  // Загрузить и начать воспроизведение, если аудио есть для текущего слайда
  useEffect(() => {
    if (!loadedSlides.has(slideId)) return;
    const audio = audioRef.current;
    if (!audio) return;

    const url = getAudioUrl(slideId);
    audio.src = url;
    audio.load();

    const playAudio = () => {
      audio.play().catch(() => {});
    };
    audio.addEventListener('canplay', playAudio, { once: true });
    return () => {
      audio.removeEventListener('canplay', playAudio);
    };
  }, [currentSlideIndex, loadedSlides, slideId]);

  // Слушатели событий audio элемента
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
    if (!audio || !loadedSlides.has(slideId)) return;

    const url = getAudioUrl(slideId);
    if (!audio.src.includes(`/audio`)) {
      audio.src = url;
      audio.load();
    }

    if (audio.paused) {
      audio.play().catch(() => {});
    } else {
      audio.pause();
    }
  }, [loadedSlides, slideId]);

  const seek = useCallback((time: number) => {
    const audio = audioRef.current;
    if (audio) audio.currentTime = time;
  }, []);

  const uploadAudio = useCallback(async (slideIndex: number, file: File) => {
    const id = slideIndex + 1;
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`${API_BASE}/${id}/audio`, {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) throw new Error('Ошибка загрузки');

      setLoadedSlides(prev => new Set([...prev, id]));

      // Если загружаем для текущего слайда — сразу применяем
      if (id === slideId) {
        const audio = audioRef.current;
        if (audio) {
          audio.src = getAudioUrl(id) + '?t=' + Date.now(); // cache-bust
          audio.load();
        }
      }
    } catch (e) {
      console.error('Ошибка загрузки аудио:', e);
    }
  }, [slideId]);

  const removeAudio = useCallback(async (slideIndex: number) => {
    const id = slideIndex + 1;
    try {
      await fetch(`${API_BASE}/${id}/audio`, { method: 'DELETE' });
      setLoadedSlides(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });

      const audio = audioRef.current;
      if (audio && id === slideId) {
        audio.pause();
        audio.src = '';
        setAudioState({ isPlaying: false, currentTime: 0, duration: 0 });
      }
    } catch (e) {
      console.error('Ошибка удаления аудио:', e);
    }
  }, [slideId]);

  const hasAudio = loadedSlides.has(slideId);

  // audioUrls — для SlideList (показываем иконку если есть аудио)
  const audioUrls: Record<number, string> = {};
  loadedSlides.forEach(id => {
    audioUrls[id - 1] = getAudioUrl(id);
  });

  return {
    audioRef,
    audioState,
    hasAudio,
    audioUrls,
    togglePlayPause,
    seek,
    uploadAudio,
    removeAudio,
  };
}
