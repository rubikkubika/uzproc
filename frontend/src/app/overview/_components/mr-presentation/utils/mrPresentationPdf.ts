import { renderMrSlide } from '../slides/renderMrSlide';
import { buildSlides } from './mrPresentationSlides';
import { MrPresentationStage } from './mrPresentationStage';
import {
  SLIDE_HEIGHT,
  SLIDE_JPEG_QUALITY,
  SLIDE_RASTER_SCALE,
  SLIDE_SETTLE_MS,
  SLIDE_WIDTH,
} from '../constants/mr-presentation.constants';
import type { MrPresentationData } from '../types/mr-presentation.types';

export { SLIDE_ATTR } from './mrPresentationStage';

/**
 * Собирает презентацию в многостраничный PDF 16:9 (1920×1080) и отдаёт файлом.
 * Слайды рендерятся и снимаются по одному в изолированной offscreen-сцене,
 * поэтому время растёт линейно от их количества.
 */
export async function exportPresentationToPdf(
  data: MrPresentationData,
  fileName: string,
  onProgress?: (done: number, total: number) => void
): Promise<void> {
  const slides = buildSlides(data);
  if (slides.length === 0) throw new Error('Нет слайдов для экспорта');

  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import('html2canvas'),
    import('jspdf'),
  ]);

  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'px',
    format: [SLIDE_WIDTH, SLIDE_HEIGHT],
    // Страницы — уже сжатые JPEG, повторное сжатие потока только тратит время.
    compress: false,
  });

  const stage = new MrPresentationStage();
  stage.mount();

  try {
    await stage.waitForFonts();

    for (let i = 0; i < slides.length; i++) {
      const element = renderMrSlide(slides[i], data, i + 1);
      if (!element) continue;

      const node = await stage.render(element, SLIDE_SETTLE_MS);
      const canvas = await html2canvas(node, {
        scale: SLIDE_RASTER_SCALE,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: '#ffffff',
        removeContainer: true,
        imageTimeout: 0,
      });

      if (i > 0) pdf.addPage([SLIDE_WIDTH, SLIDE_HEIGHT], 'landscape');
      pdf.addImage(
        canvas.toDataURL('image/jpeg', SLIDE_JPEG_QUALITY),
        'JPEG',
        0,
        0,
        SLIDE_WIDTH,
        SLIDE_HEIGHT,
        undefined,
        'FAST'
      );
      onProgress?.(i + 1, slides.length);
    }

    pdf.save(fileName);
  } finally {
    stage.unmount();
  }
}
