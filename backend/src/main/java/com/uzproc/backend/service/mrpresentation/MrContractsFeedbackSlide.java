package com.uzproc.backend.service.mrpresentation;

import com.fasterxml.jackson.databind.JsonNode;

import java.util.ArrayList;
import java.util.List;

import static com.uzproc.backend.service.mrpresentation.MrTheme.*;

/** Слайд «Обратная связь инициаторов — договора»: оценки по спецификациям, сгруппированные по месяцам. */
final class MrContractsFeedbackSlide {

    private MrContractsFeedbackSlide() {
    }

    /**
     * Группа карточек оценок за один месяц (на слайде может быть только её часть).
     *
     * @param totalInMonth всего оценок в месяце
     */
    record MonthGroup(int month, int year, int totalInMonth, List<JsonNode> cards) {
    }

    private static final float GAP = 20;
    private static final float GROUP_GAP = 28;
    private static final float CARD_PAD_X = 26;
    private static final float CARD_PAD_Y = 22;
    private static final float BLOCK_GAP = 12;
    private static final int CFO_MAX_CHARS = 16;
    private static final int RATED_BY_MAX_CHARS = 24;
    private static final int COMMENT_MAX_CHARS = 118;
    private static final int COMMENT_LINES = 5;
    private static final float COMMENT_LINE_HEIGHT = 24;
    private static final float COMMENT_HEIGHT = COMMENT_LINE_HEIGHT * COMMENT_LINES + 20;
    private static final float SCORE_LINE_HEIGHT = 20.4f;

    private static final MrText MONTH_TITLE = MrText.of(26, 700, INK);
    private static final MrText MONTH_COUNT = MrText.of(18, 600, MUTED);
    private static final MrText CFO = MrText.of(17, 600, PURPLE_DARK);
    private static final MrText RATING = MrText.of(22, 800, INK);
    private static final MrText LABEL = MrText.of(17, 400, MUTED);
    private static final MrText VALUE = MrText.of(17, 500, INK);
    private static final MrText COMMENT = MrText.of(19, 400, INK).lh(COMMENT_LINE_HEIGHT);
    private static final MrText NO_COMMENT = MrText.of(18, 400, FAINT).lh(COMMENT_LINE_HEIGHT);
    private static final MrText SUM_LABEL = MrText.of(15, 500, MUTED);
    private static final MrText SUM_VALUE = MrText.of(20, 700, INK);
    private static final MrText RATED_AT = MrText.of(16, 400, FAINT);

    static void render(MrCanvas canvas, List<MonthGroup> groups, int pageIndex, int pageCount, String footer) {
        canvas.newSlide(SLIDE_BG);
        float y = MrParts.heading(canvas, PAD_TOP + 6, "Обратная связь инициаторов", 44, "Договора", null,
                pageCount > 1 ? pageIndex + " / " + pageCount : null) + GROUP_GAP;

        float cardWidth = (CONTENT_WIDTH - (CONTRACT_FEEDBACK_CARDS_PER_ROW - 1) * GAP) / CONTRACT_FEEDBACK_CARDS_PER_ROW;
        for (MonthGroup group : groups) {
            // Заголовок месяца: название, число оценок и линия до правого края
            float centerY = y + MONTH_TITLE.lineHeight() / 2;
            float x = PAD_X + canvas.text(MrFormat.monthNameCapitalized(group.month()) + " " + group.year(), PAD_X, y,
                    MONTH_TITLE) + 16;
            x += MrParts.pill(canvas, x, centerY - 15, 30, 14, String.valueOf(group.totalInMonth()), MONTH_COUNT,
                    CARD_BG, 999) + 16;
            canvas.fillRect(x, centerY - 0.5, PAD_X + CONTENT_WIDTH - x, 1, LINE);
            y += MONTH_TITLE.lineHeight() + 14;

            List<JsonNode> cards = group.cards();
            for (int start = 0; start < cards.size(); start += CONTRACT_FEEDBACK_CARDS_PER_ROW) {
                List<JsonNode> row = cards.subList(start, Math.min(cards.size(), start + CONTRACT_FEEDBACK_CARDS_PER_ROW));
                // Карточки ряда одной высоты — по самой высокой
                float height = 0;
                for (JsonNode card : row) {
                    height = Math.max(height, cardHeight(canvas, card, cardWidth));
                }
                for (int i = 0; i < row.size(); i++) {
                    card(canvas, row.get(i), PAD_X + i * (cardWidth + GAP), y, cardWidth, height);
                }
                y += height + GAP;
            }
            y += GROUP_GAP - GAP;
        }
        MrParts.footer(canvas, footer);
    }

    private static List<String[]> scores(JsonNode card) {
        List<String[]> scores = new ArrayList<>();
        scores.add(new String[]{"Скорость", MrFormat.rating(MrFormat.number(card, "speedRating"))});
        scores.add(new String[]{"Исполнитель", MrFormat.rating(MrFormat.number(card, "businessRating"))});
        Double count = MrFormat.number(card, "specificationCount");
        scores.add(new String[]{"Спец.", count != null ? String.valueOf(count.longValue()) : "—"});
        return scores;
    }

    private static float scoresBlockHeight(MrCanvas canvas, JsonNode card, float cardWidth) {
        return 1 + 12 + MrFeedbackSlide.scoresHeight(canvas, scores(card), cardWidth - 2 * CARD_PAD_X, SCORE_LINE_HEIGHT);
    }

    private static float cardHeight(MrCanvas canvas, JsonNode card, float cardWidth) {
        return 2 * CARD_PAD_Y + 33 + BLOCK_GAP + LABEL.lineHeight() + BLOCK_GAP + COMMENT_HEIGHT + BLOCK_GAP
                + scoresBlockHeight(canvas, card, cardWidth) + BLOCK_GAP + SUM_VALUE.lineHeight();
    }

    private static void card(MrCanvas canvas, JsonNode card, float x, float y, float width, float height) {
        canvas.fillRoundRect(x, y, width, height, 20, CARD_BG);
        float innerX = x + CARD_PAD_X;
        float innerWidth = width - 2 * CARD_PAD_X;
        float right = innerX + innerWidth;
        float cursor = y + CARD_PAD_Y;

        // ЦФО и общая оценка
        String cfo = MrFormat.truncate(MrFormat.cfoDisplayName(MrFormat.text(card, "cfoName")), CFO_MAX_CHARS);
        MrParts.pill(canvas, innerX, cursor, 33, 12, cfo.isEmpty() ? "—" : cfo, CFO, PURPLE_TINT, 8);
        Double overall = MrFormat.number(card, "overall");
        float ratingWidth = canvas.textMiddleRight(MrFormat.rating(overall), right, cursor + 16.5, RATING);
        MrParts.stars(canvas, right - ratingWidth - 6 - MrParts.starsWidth(16, 1), cursor + 8.5, 16, 1, overall);
        cursor += 33 + BLOCK_GAP;

        String ratedBy = MrFormat.truncate(MrFormat.personDisplayName(MrFormat.text(card, "ratedBy")), RATED_BY_MAX_CHARS);
        float labelWidth = canvas.text("Оценил", innerX, cursor, LABEL);
        canvas.text(canvas.fit(ratedBy.isEmpty() ? "—" : ratedBy, VALUE, innerWidth - labelWidth - 10),
                innerX + labelWidth + 10, cursor, VALUE);
        cursor += LABEL.lineHeight() + BLOCK_GAP;

        MrFeedbackSlide.commentBox(canvas, MrFormat.text(card, "comment"), innerX, cursor, innerWidth, COMMENT_HEIGHT,
                COMMENT, NO_COMMENT, COMMENT_MAX_CHARS, COMMENT_LINES);
        cursor += COMMENT_HEIGHT + BLOCK_GAP;

        canvas.fillRect(innerX, cursor, innerWidth, 1, ROW_DIVIDER);
        MrFeedbackSlide.scores(canvas, scores(card), innerX, cursor + 13, innerWidth, SCORE_LINE_HEIGHT);

        // Сумма и дата оценки прижаты к низу карточки, выровнены по базовой линии
        float sumTop = y + height - CARD_PAD_Y - SUM_VALUE.lineHeight();
        float baseline = MrCanvas.baselineOf(sumTop, SUM_VALUE);
        float sumLabelWidth = canvas.textBaseline("Сумма ", innerX, baseline, SUM_LABEL);
        float sumWidth = sumLabelWidth + canvas.textBaseline(
                MrFormat.amountShort(MrFormat.number(card, "totalAmount")), innerX + sumLabelWidth, baseline, SUM_VALUE);
        String ratedAt = MrFormat.date(MrFormat.text(card, "ratedAt"));
        if (!ratedAt.isEmpty()) {
            // Рядом с суммой остаётся мало места: если подпись «оценено» не помещается, выводим только дату
            String text = "оценено " + ratedAt;
            if (sumWidth + 12 + canvas.textWidth(text, RATED_AT) > innerWidth) {
                text = ratedAt;
            }
            canvas.textBaseline(text, right - canvas.textWidth(text, RATED_AT), baseline, RATED_AT);
        }
    }
}
