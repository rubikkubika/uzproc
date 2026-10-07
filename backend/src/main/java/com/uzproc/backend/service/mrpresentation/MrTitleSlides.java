package com.uzproc.backend.service.mrpresentation;

import java.util.List;

import static com.uzproc.backend.service.mrpresentation.MrTheme.*;

/** Слайды без данных: титульный, разделители разделов и финальный «Спасибо». */
final class MrTitleSlides {

    private MrTitleSlides() {
    }

    /** Поля титульных слайдов. */
    private static final float PAD_Y = 96;
    private static final float PAD_SIDE = 120;
    private static final float RIGHT = SLIDE_WIDTH - PAD_SIDE;
    private static final float BOTTOM = SLIDE_HEIGHT - PAD_Y;

    /** Титульный слайд. */
    static void cover(MrCanvas canvas, int year, int month) {
        canvas.newSlide(BRAND);
        // Декоративное кольцо в правом нижнем углу
        canvas.circle(1720, 1020, 320, null, WHITE, 120, 0.08);

        MrText caption = MrText.of(22, 500, WHITE).tracking(0.18).alpha(0.8);
        canvas.text("УПРАВЛЕНЧЕСКАЯ ОТЧЕТНОСТЬ", PAD_SIDE, PAD_Y + (56 - caption.lineHeight()) / 2, caption);
        MrParts.logo(canvas, RIGHT, PAD_Y, 52, 56, WHITE);

        MrText bottom = MrText.of(24, 500, WHITE).alpha(0.75);
        float bottomTop = BOTTOM - bottom.lineHeight();
        canvas.text(DEPARTMENT_TITLE, PAD_SIDE, bottomTop, bottom);
        canvas.textRight(MrFormat.monthNameCapitalized(month) + " " + year, RIGHT, bottomTop, bottom);

        MrText title = MrText.of(88, 800, WHITE).lhEm(1.14).tracking(-0.025);
        MrText subtitle = MrText.of(40, 500, WHITE).alpha(0.85);
        List<String> lines = canvas.wrap("Закупки и договора " + COMPANY_TITLE, title, 1380);
        float blockHeight = lines.size() * title.lineHeight() + 28 + subtitle.lineHeight();
        // Средний блок стоит по центру между верхней и нижней строками
        float freeTop = PAD_Y + 56;
        float y = freeTop + (bottomTop - freeTop - blockHeight) / 2;
        for (String line : lines) {
            canvas.text(line, PAD_SIDE, y, title);
            y += title.lineHeight();
        }
        canvas.text("Отчет за " + MrFormat.monthName(month) + " " + year, PAD_SIDE, y + 28, subtitle);
    }

    /** Разделительный слайд («Закупки», «Договора»). */
    static void section(MrCanvas canvas, String index, String title, String subtitle) {
        canvas.newSlide(BRAND);
        MrParts.logo(canvas, RIGHT, PAD_Y, 0, 40, WHITE);

        MrText subtitleStyle = MrText.of(28, 500, WHITE).lhEm(1.3).alpha(0.8);
        MrText titleStyle = MrText.of(140, 800, WHITE).lhEm(1.25).tracking(-0.03);
        MrText labelStyle = MrText.of(26, 600, WHITE).tracking(0.18).alpha(0.7);

        // Блок прижат к низу слайда — раскладываем снизу вверх
        List<String> lines = canvas.wrap(subtitle, subtitleStyle, 1400);
        float y = BOTTOM - lines.size() * subtitleStyle.lineHeight();
        float subtitleTop = y;
        for (String line : lines) {
            canvas.text(line, PAD_SIDE, y, subtitleStyle);
            y += subtitleStyle.lineHeight();
        }
        float titleTop = subtitleTop - 40 - titleStyle.lineHeight();
        canvas.text(title, PAD_SIDE, titleTop, titleStyle);
        canvas.text(("Раздел " + index).toUpperCase(), PAD_SIDE, titleTop - 24 - labelStyle.lineHeight(), labelStyle);
    }

    /** Финальный слайд «Спасибо». */
    static void thanks(MrCanvas canvas) {
        canvas.newSlide(WHITE);
        MrParts.logo(canvas, RIGHT, PAD_Y, 0, 40, PURPLE_TINT);

        MrText title = MrText.of(160, 800, BRAND).lhEm(1.25).tracking(-0.03);
        MrText sub = MrText.of(28, 500, MUTED);
        float top = (SLIDE_HEIGHT - (title.lineHeight() + 40 + sub.lineHeight())) / 2;
        canvas.textCenter("Спасибо", 0, SLIDE_WIDTH, top, title);
        canvas.textCenter("Отдел закупок и договорной отдел " + COMPANY_TITLE, 0, SLIDE_WIDTH,
                top + title.lineHeight() + 40, sub);
    }
}
