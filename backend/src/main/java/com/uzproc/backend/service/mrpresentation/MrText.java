package com.uzproc.backend.service.mrpresentation;

import java.awt.Color;

/**
 * Стиль строки текста: кегль, насыщенность, цвет, высота строки, трекинг и прозрачность.
 *
 * @param size       кегль, px
 * @param weight     насыщенность 400–800
 * @param lineHeight высота строки, px
 * @param tracking   межбуквенный интервал, em
 * @param alpha      непрозрачность 0–1
 */
record MrText(float size, int weight, Color color, float lineHeight, float tracking, float alpha) {

    /** Высота строки по умолчанию — как у браузера для Golos Text (ascent 0.98 + descent 0.22). */
    private static final float NORMAL_LINE_HEIGHT = 1.2f;

    static MrText of(double size, int weight, Color color) {
        return new MrText((float) size, weight, color, (float) size * NORMAL_LINE_HEIGHT, 0, 1);
    }

    /** Высота строки в px. */
    MrText lh(double px) {
        return new MrText(size, weight, color, (float) px, tracking, alpha);
    }

    /** Высота строки множителем кегля. */
    MrText lhEm(double em) {
        return lh(size * em);
    }

    MrText tracking(double em) {
        return new MrText(size, weight, color, lineHeight, (float) em, alpha);
    }

    MrText alpha(double value) {
        return new MrText(size, weight, color, lineHeight, tracking, (float) value);
    }

    MrText color(Color value) {
        return new MrText(size, weight, value, lineHeight, tracking, alpha);
    }

    MrText weight(int value) {
        return new MrText(size, value, color, lineHeight, tracking, alpha);
    }
}
