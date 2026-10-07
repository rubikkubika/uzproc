package com.uzproc.backend.service.mrpresentation;

import java.awt.Color;

/**
 * Дизайн-токены презентации управленческой отчётности: цвета, размеры, целевые показатели, группы ЦФО.
 */
final class MrTheme {

    private MrTheme() {
    }

    /** Размер слайда 16:9, единицы PDF = px макета. */
    static final float SLIDE_WIDTH = 1920;
    static final float SLIDE_HEIGHT = 1080;

    static final Color WHITE = Color.WHITE;
    /** Фирменный фиолетовый: фон титула/разделителей, акцент-бар, линия графика договоров. */
    static final Color BRAND = Color.decode("#7000FF");
    static final Color PURPLE_DARK = Color.decode("#5400C2");
    static final Color PURPLE_TINT = Color.decode("#EFE6FF");
    static final Color PURPLE_MID = Color.decode("#C9B3FF");
    static final Color HEAT_MID = Color.decode("#E6DBFF");
    static final Color HEAT_LOW = Color.decode("#F3EEFF");
    /** Основной текст, тёмные карточки, линия SLA. */
    static final Color INK = Color.decode("#17122B");
    static final Color MUTED = Color.decode("#7A7490");
    static final Color FAINT = Color.decode("#B5AECB");
    static final Color LINE = Color.decode("#E4E0EE");
    static final Color ROW_DIVIDER = Color.decode("#EEEBF5");
    static final Color SLIDE_BG = Color.decode("#F5F3FA");
    static final Color CARD_BG = Color.WHITE;
    static final Color SUCCESS_TEXT = Color.decode("#0B7A3E");
    static final Color SUCCESS_BG = Color.decode("#DDF5E6");
    static final Color DANGER_TEXT = Color.decode("#B42318");
    static final Color DANGER_BG = Color.decode("#FEE4E2");
    static final Color GREEN_LINE = Color.decode("#0B9F5B");
    static final Color STAR = Color.decode("#F5B800");
    private static final Color RATING_AMBER = Color.decode("#B7791F");
    private static final Color RATING_RED = Color.decode("#C0392B");

    /** Целевые показатели. */
    static final double SLA_TARGET_PERCENT = 80;
    static final double SAVINGS_TARGET_PERCENT = 10;
    static final double CSI_TARGET_RATING = 4;

    /** Поля контентных слайдов. */
    static final float PAD_X = 80;
    static final float PAD_TOP = 64;
    static final float PAD_BOTTOM = 56;
    static final float CONTENT_WIDTH = SLIDE_WIDTH - 2 * PAD_X;
    static final float CONTENT_BOTTOM = SLIDE_HEIGHT - PAD_BOTTOM;

    /** Карточек обратной связи на слайде (сетка 4×2). */
    static final int FEEDBACK_CARDS_PER_SLIDE = 8;
    /** Карточек оценок по спецификациям в одном ряду и рядов на слайде. */
    static final int CONTRACT_FEEDBACK_CARDS_PER_ROW = 5;
    static final int CONTRACT_FEEDBACK_ROWS_PER_SLIDE = 2;

    static final String COMPANY_TITLE = "Uzum E-com";
    static final String DEPARTMENT_TITLE = "Отдел закупок";

    static final String[] MONTH_SHORT =
            {"Янв", "Фев", "Мар", "Апр", "Май", "Июн", "Июл", "Авг", "Сен", "Окт", "Ноя", "Дек"};
    static final String[] MONTH_FULL = {
            "январь", "февраль", "март", "апрель", "май", "июнь",
            "июль", "август", "сентябрь", "октябрь", "ноябрь", "декабрь"};

    /** Группа ЦФО для слайдов обратной связи. */
    record FeedbackGroup(String label, String sub, String[] keywords) {
    }

    /** Группы ЦФО — порядок как в презентации. */
    static final FeedbackGroup[] FEEDBACK_GROUPS = {
            new FeedbackGroup("Operations", "Warehouse · Logistics · Construction · Maintenance · PVZ",
                    new String[]{"Warehouse", "Logistics", "Construction", "Maintenance", "PVZ"}),
            new FeedbackGroup("Marketing", "", new String[]{"Marketing", "Маркет"}),
            new FeedbackGroup("HR", "Facilities · HR · Labor Safety",
                    new String[]{"Facilities", "HR", "Labor Safety", "Labor"}),
            new FeedbackGroup("IT", "", new String[]{"IT"}),
    };

    /** Цвет рейтинга карточки: ≥4.5 — тёмный, 3.5–4.4 — янтарный, ниже — красный. */
    static Color ratingColor(double rating) {
        if (rating >= 4.5) {
            return INK;
        }
        return rating >= 3.5 ? RATING_AMBER : RATING_RED;
    }
}
