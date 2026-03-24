export interface Slide {
  id: number;
  title: string;
  htmlContent: string;
  voiceoverText: string;
}

export interface Lesson {
  id: string;
  title: string;
  description: string;
  slides: Slide[];
}
