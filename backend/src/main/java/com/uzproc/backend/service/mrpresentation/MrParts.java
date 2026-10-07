package com.uzproc.backend.service.mrpresentation;

import java.awt.Color;

import static com.uzproc.backend.service.mrpresentation.MrTheme.*;

/** Повторяющиеся элементы слайдов: шапка, футер, чипы, звёзды, логотип. */
final class MrParts {

    private MrParts() {
    }

    /** Контур звезды в системе 24×24. */
    private static final double[][] STAR_POINTS = {
            {12, 2.5}, {14.9, 8.4}, {21.4, 9.35}, {16.7, 13.95}, {17.8, 20.4},
            {12, 17.4}, {6.2, 20.45}, {7.3, 14.0}, {2.6, 9.4}, {9.1, 8.45}};

    /** Фирменный знак Uzum в системе 41×40. */
    private static final String LOGO_MARK = "M40.5 19.9533C40.5085 23.9079 39.3417 27.7853 37.1538 31.0794C34.966 "
            + "34.3735 31.8429 36.947 28.1879 38.4654C24.533 39.9837 20.509 40.3869 16.631 39.6235C12.7443 38.86 "
            + "9.17513 36.9556 6.37812 34.1591C3.57252 31.3625 1.66781 27.8025 0.887049 23.9165C0.114868 20.0391 "
            + "0.500959 16.0159 2.01958 12.3529C3.52963 8.69854 6.09498 5.56745 9.38962 3.37139C12.6671 1.17534 "
            + "16.5366 0.00010549 20.4919 0.00010549C23.1173 -0.00847285 25.717 0.506228 28.1365 1.50989C30.5646 "
            + "2.51356 32.7696 3.98046 34.6228 5.83338C36.4846 7.6863 37.9518 9.89093 38.9642 12.31C39.9766 14.7291 "
            + "40.4914 17.3284 40.5 19.9533ZM22.7913 6.9314C22.0448 6.86278 21.2726 6.82846 20.4919 6.82846C19.7111 "
            + "6.82846 18.9561 6.8542 18.2097 6.9314V17.5685H22.7998L22.7913 6.9314ZM33.3701 13.125C31.6971 12.576 "
            + "29.9897 12.147 28.2566 11.8382V20.7683C28.2566 27.202 25.5196 30.5819 20.4919 30.5819C15.4641 30.5819 "
            + "12.7272 27.202 12.7272 20.7683V11.8468C10.994 12.1556 9.28667 12.5845 7.61361 13.1335V20.8283C7.72514 "
            + "24.1653 9.13223 27.3393 11.5346 29.664C13.9369 31.9887 17.1458 33.2841 20.4919 33.2841C23.838 33.2841 "
            + "27.0468 31.9887 29.4492 29.664C31.8515 27.3393 33.2586 24.1739 33.3701 20.8283V13.125Z";

    private static final MrText ASIDE = MrText.of(22, 500, MUTED);
    private static final MrText FOOTER = MrText.of(18, 500, FAINT);
    private static final MrText KPI_TITLE = MrText.of(28, 700, INK);
    private static final MrText KPI_CHIP = MrText.of(20, 600, PURPLE_DARK);

    /**
     * Шапка контентного слайда: акцент-бар, заголовок, чип, подстрока и подпись справа.
     *
     * @return нижняя граница шапки
     */
    static float heading(MrCanvas canvas, double top, String title, double size, String chip, String sub,
                         String aside) {
        float rowHeight = (float) Math.max(48, size * 1.3);
        float centerY = (float) top + rowHeight / 2;
        canvas.fillRoundRect(PAD_X, centerY - 24, 10, 48, 5, BRAND);

        MrText titleStyle = MrText.of(size, 800, INK).lhEm(1.3).tracking(-0.02);
        float x = PAD_X + 30;
        x += canvas.text(title, x, centerY - titleStyle.lineHeight() / 2, titleStyle);

        if (chip != null && !chip.isEmpty()) {
            x += 28;
            x += pill(canvas, x, centerY - 23, 46, 20, chip, MrText.of(26, 700, PURPLE_DARK), PURPLE_TINT, 999);
        }
        if (sub != null && !sub.isEmpty()) {
            canvas.text(sub, x + 20, centerY - ASIDE.lineHeight() / 2, ASIDE);
        }
        if (aside != null && !aside.isEmpty()) {
            canvas.textRight(aside, SLIDE_WIDTH - PAD_X, top + rowHeight - ASIDE.lineHeight(), ASIDE);
        }
        return (float) top + rowHeight;
    }

    /** Подпись в правом нижнем углу контентного слайда. */
    static void footer(MrCanvas canvas, String footer) {
        canvas.textRight(footer, SLIDE_WIDTH - PAD_X, SLIDE_HEIGHT - 24 - FOOTER.lineHeight(), FOOTER);
    }

    /**
     * Плашка с текстом, растущая по содержимому.
     *
     * @return ширина плашки
     */
    static float pill(MrCanvas canvas, double x, double y, double height, double padX, String text, MrText style,
                      Color background, double radius) {
        float width = canvas.textWidth(text, style) + (float) padX * 2;
        canvas.fillRoundRect(x, y, width, height, radius, background);
        canvas.textMiddle(text, x + padX, y + height / 2, style);
        return width;
    }

    /**
     * Заголовок блока KPI с чипами «Цель» и «Факт» (факт зелёный при достижении цели).
     *
     * @param factOk null — чип факта не выводится
     */
    static void kpiHeader(MrCanvas canvas, double x, double top, String title, String target, String fact,
                          Boolean factOk) {
        float centerY = (float) top + 18;
        float cursor = (float) x + canvas.textMiddle(title, x, centerY, KPI_TITLE) + 16;
        cursor += pill(canvas, cursor, top, 36, 16, "Цель: " + target, KPI_CHIP, PURPLE_TINT, 999) + 16;
        if (fact != null && factOk != null) {
            pill(canvas, cursor, top, 36, 16, "Факт: " + fact,
                    KPI_CHIP.color(factOk ? SUCCESS_TEXT : DANGER_TEXT), factOk ? SUCCESS_BG : DANGER_BG, 999);
        }
    }

    /** Ширина ряда из пяти звёзд. */
    static float starsWidth(double size, double gap) {
        return (float) (size * 5 + gap * 4);
    }

    /** Ряд из пяти звёзд с дробной заливкой: серая подложка и золотая часть шириной {@code value / 5}. */
    static void stars(MrCanvas canvas, double x, double top, double size, double gap, Double value) {
        double rating = Math.max(0, Math.min(5, value != null ? value : 0));
        double rowWidth = starsWidth(size, gap);
        starRow(canvas, x, top, size, gap, LINE);
        canvas.clipped(x, top, rating / 5 * rowWidth, size, () -> starRow(canvas, x, top, size, gap, STAR));
    }

    private static void starRow(MrCanvas canvas, double x, double top, double size, double gap, Color color) {
        for (int i = 0; i < 5; i++) {
            canvas.fillPolygon(x + i * (size + gap), top, size, 24, STAR_POINTS, color);
        }
    }

    /**
     * Логотип Uzum, прижатый правым краем: знак (если нужен) и слово «uzum».
     *
     * @param markSize размер знака; 0 — только слово
     */
    static void logo(MrCanvas canvas, double right, double top, double markSize, double wordSize, Color color) {
        MrText word = MrText.of(wordSize, 800, color).lh(wordSize).tracking(-0.02);
        float wordWidth = canvas.textWidth("uzum", word);
        double height = Math.max(markSize, wordSize);
        canvas.text("uzum", right - wordWidth, top + (height - wordSize) / 2, word);
        if (markSize > 0) {
            canvas.fillSvgPath(right - wordWidth - 16 - markSize, top + (height - markSize) / 2, markSize, 41,
                    LOGO_MARK, color);
        }
    }
}
