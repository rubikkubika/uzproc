'use client';

import { useTraining } from '../../training/_components/hooks/useTraining';
import SlideList from '../../training/_components/ui/SlideList';
import SlideViewer from '../../training/_components/ui/SlideViewer';
import AudioPlayer from '../../training/_components/ui/AudioPlayer';
import VideoPlayer from '../../training/_components/ui/VideoPlayer';

/**
 * Публичная версия страницы обучения.
 * Доступна без авторизации, без сайдбара.
 * Только просмотр слайдов и прослушивание/просмотр медиа.
 * Загрузка и удаление медиа недоступны (заглушки).
 */
export default function TrainingPublicPage() {
  const {
    slides,
    currentSlide,
    currentSlideIndex,
    totalSlides,
    goToSlide,
    goNext,
    goPrev,
    canGoNext,
    canGoPrev,
    audio,
    video,
  } = useTraining();

  // Заглушки — публичный режим запрещает загрузку и удаление
  const noOp = async () => {};

  return (
    <div className="flex gap-6 h-full">
      {/* Левая панель — список слайдов */}
      <div className="w-64 flex-shrink-0 overflow-y-auto">
        <SlideList
          slides={slides}
          currentSlideIndex={currentSlideIndex}
          onSlideSelect={goToSlide}
          audioUrls={audio.audioUrls}
          videoUrls={video.videoUrls}
        />
      </div>

      {/* Правая панель — просмотр слайда + аудио + видео */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <SlideViewer
          slide={currentSlide}
          currentIndex={currentSlideIndex}
          totalSlides={totalSlides}
          canGoNext={canGoNext}
          canGoPrev={canGoPrev}
          onNext={goNext}
          onPrev={goPrev}
        />
        <AudioPlayer
          slideIndex={currentSlideIndex}
          hasAudio={audio.hasAudio}
          isPlaying={audio.audioState.isPlaying}
          currentTime={audio.audioState.currentTime}
          duration={audio.audioState.duration}
          onTogglePlayPause={audio.togglePlayPause}
          onSeek={audio.seek}
          onUpload={noOp}
          onRemove={noOp}
          readOnly
        />
        <VideoPlayer
          slideIndex={currentSlideIndex}
          videoRef={video.videoRef}
          hasVideo={video.hasVideo}
          isPlaying={video.videoState.isPlaying}
          currentTime={video.videoState.currentTime}
          duration={video.videoState.duration}
          onTogglePlayPause={video.togglePlayPause}
          onSeek={video.seek}
          onUpload={noOp}
          onRemove={noOp}
          readOnly
        />
      </div>

      {/* Скрытый audio-элемент */}
      <audio ref={audio.audioRef} />
    </div>
  );
}
