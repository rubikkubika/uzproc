'use client';

import type { ReactElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { FONT_HREF, FONT_STACK, SLIDE_HEIGHT, SLIDE_WIDTH } from '../constants/mr-presentation.constants';

/** Атрибут-маркер узла слайда. */
export const SLIDE_ATTR = 'data-mr-slide';

/** Сколько ждём загрузки шрифта презентации, мс (дальше рендерим на системном). */
const FONT_TIMEOUT_MS = 4000;

/**
 * Изолированная offscreen-«сцена» для съёмки слайдов.
 *
 * Слайды рендерятся по одному в отдельном документе (iframe): html2canvas
 * клонирует весь документ владельца на каждый снимок, поэтому держать в нём
 * страницу приложения или сразу все слайды — квадратичная по времени затея.
 * В том же документе подключается шрифт презентации, чтобы растр получал
 * фирменную типографику.
 */
export class MrPresentationStage {
  private frame: HTMLIFrameElement | null = null;
  private host: HTMLElement | null = null;
  private root: Root | null = null;

  /** Создаёт сцену: скрытый iframe нужного размера с подключённым шрифтом. */
  mount(): void {
    const frame = document.createElement('iframe');
    frame.setAttribute('aria-hidden', 'true');
    frame.style.position = 'absolute';
    frame.style.top = '0';
    frame.style.left = `-${SLIDE_WIDTH + 9999}px`;
    frame.style.width = `${SLIDE_WIDTH}px`;
    frame.style.height = `${SLIDE_HEIGHT}px`;
    frame.style.border = '0';
    frame.style.pointerEvents = 'none';
    document.body.appendChild(frame);

    const doc = frame.contentDocument;
    if (!doc) {
      frame.remove();
      throw new Error('Не удалось подготовить область рендера презентации');
    }

    doc.open();
    doc.write(
      '<!doctype html><html><head><meta charset="utf-8">' +
        '<link rel="preconnect" href="https://fonts.googleapis.com">' +
        '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>' +
        `<link rel="stylesheet" href="${FONT_HREF}">` +
        `</head><body style="margin:0;padding:0;background:#ffffff;font-family:${FONT_STACK}"></body></html>`
    );
    doc.close();

    const host = doc.createElement('div');
    host.style.width = `${SLIDE_WIDTH}px`;
    doc.body.appendChild(host);

    this.frame = frame;
    this.host = host;
    this.root = createRoot(host);
  }

  /**
   * Ждём шрифт презентации. Если он не подгрузился (нет доступа к Google Fonts),
   * слайды рендерятся системным шрифтом — это не повод срывать выгрузку.
   */
  async waitForFonts(): Promise<void> {
    const doc = this.frame?.contentDocument;
    if (!doc?.fonts) return;
    try {
      await Promise.race([
        doc.fonts.load("500 20px 'Golos Text'").then(() => doc.fonts.ready),
        new Promise<void>((resolve) => setTimeout(resolve, FONT_TIMEOUT_MS)),
      ]);
    } catch {
      /* шрифт не критичен */
    }
  }

  /** Рендерит один слайд и возвращает его DOM-узел, готовый к съёмке. */
  async render(element: ReactElement, settleMs: number): Promise<HTMLElement> {
    if (!this.root || !this.host) throw new Error('Область рендера презентации не создана');
    this.root.render(element);

    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    if (settleMs > 0) await new Promise<void>((resolve) => setTimeout(resolve, settleMs));

    const node = this.host.querySelector<HTMLElement>(`[${SLIDE_ATTR}]`);
    if (!node) throw new Error('Слайд не отрисовался');
    return node;
  }

  /** Убирает сцену из документа. */
  unmount(): void {
    this.root?.unmount();
    this.frame?.remove();
    this.root = null;
    this.host = null;
    this.frame = null;
  }
}
