'use client';

import { useTraining } from './hooks/useTraining';
import SlideList from './ui/SlideList';
import SlideViewer from './ui/SlideViewer';
import VoiceoverPanel from './ui/VoiceoverPanel';
import AudioPlayer from './ui/AudioPlayer';
import VideoPlayer from './ui/VideoPlayer';

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
    video,
  } = useTraining();

  return (
    <div className="flex gap-6 h-full">
      {/* Left panel — slide list */}
      <div className="w-64 flex-shrink-0 overflow-y-auto">
        <SlideList
          slides={slides}
          currentSlideIndex={currentSlideIndex}
          onSlideSelect={goToSlide}
          audioUrls={audio.audioUrls}
          videoUrls={video.videoUrls}
        />
      </div>

      {/* Right panel — slide viewer + audio + video + voiceover */}
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
          onUpload={audio.uploadAudio}
          onRemove={audio.removeAudio}
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
          onUpload={video.uploadVideo}
          onRemove={video.removeVideo}
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
