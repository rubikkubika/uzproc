export type SlideBlock = 'intro' | 'roadmap' | '1c';

export interface Slide {
  id: number;
  title: string;
  htmlContent: string;
  voiceoverText: string;
  block: SlideBlock;
}

export interface Lesson {
  id: string;
  title: string;
  description: string;
  slides: Slide[];
}
