'use client';

import { useTraining } from './hooks/useTraining';
import SlideList from './ui/SlideList';
import SlideViewer from './ui/SlideViewer';
import VoiceoverPanel from './ui/VoiceoverPanel';
import AudioPlayer from './ui/AudioPlayer';

export default function TrainingPage() {
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
  } = useTraining();

  return (
    <div className="flex gap-6 h-full">
      {/* Left panel — slide list */}
      <div className="w-64 flex-shrink-0">
        <SlideList
          slides={slides}
          currentSlideIndex={currentSlideIndex}
          onSlideSelect={goToSlide}
          audioUrls={audio.audioUrls}
        />
      </div>

      {/* Right panel — slide viewer + audio + voiceover */}
      <div className="flex-1 flex flex-col min-w-0">
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
          onUpload={audio.uploadAudio}
          onRemove={audio.removeAudio}
        />
        <VoiceoverPanel
          text={currentSlide.voiceoverText}
          slideTitle={currentSlide.title}
        />
      </div>

      {/* Hidden audio element */}
      <audio ref={audio.audioRef} />
    </div>
  );
}
