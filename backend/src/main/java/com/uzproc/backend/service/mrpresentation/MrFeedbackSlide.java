package com.uzproc.backend.service.mrpresentation;

import com.fasterxml.jackson.databind.JsonNode;

import java.util.ArrayList;
import java.util.List;

import static com.uzproc.backend.service.mrpresentation.MrTheme.*;

/** Слайд обратной связи инициаторов по одной группе ЦФО (сетка карточек 4×2). */
final class MrFeedbackSlide {

    private MrFeedbackSlide() {
    }

    private static final float GAP = 20;
    private static final float CARD_PAD_X = 26;
    private static final float CARD_PAD_Y = 18;
    private static final float BLOCK_GAP = 8;

    /** Предельные длины однострочных полей карточки, символов. */
    private static final int CFO_MAX_CHARS = 28;
    private static final int SUBJECT_MAX_CHARS = 38;
    private static final int PERSON_MAX_CHARS = 28;
    private static final int COMMENT_MAX_CHARS = 130;
    private static final int COMMENT_LINES = 4;
    private static final float COMMENT_LINE_HEIGHT = 26;
    private static final float COMMENT_HEIGHT = COMMENT_LINE_HEIGHT * COMMENT_LINES + 20;
    private static final float FOOTER_LINE_HEIGHT = 22;

    private static final MrText ID = MrText.of(21, 700, INK).lh(26).tracking(-0.01);
    private static final MrText DATE = MrText.of(18, 400, MUTED).lh(24);
    private static final MrText RATING = MrText.of(24, 800, INK);
    private static final MrText CFO = MrText.of(18, 600, PURPLE_DARK);
    private static final MrText SUBJECT = MrText.of(19, 500, INK).lh(26);
    private static final MrText FIELD_LABEL = MrText.of(19, 400, MUTED).lh(26);
    private static final MrText FIELD_VALUE = MrText.of(19, 500, INK).lh(26);
    private static final MrText COMMENT = MrText.of(19, 400, INK).lh(COMMENT_LINE_HEIGHT);
    private static final MrText NO_COMMENT = MrText.of(18, 400, FAINT).lh(COMMENT_LINE_HEIGHT);
    static final MrText SCORE_LABEL = MrText.of(17, 400, MUTED).lh(FOOTER_LINE_HEIGHT);
    static final MrText SCORE_VALUE = MrText.of(17, 700, INK).lh(FOOTER_LINE_HEIGHT);

    static void render(MrCanvas canvas, String group, String sub, List<JsonNode> cards, int pageIndex,
                       int pageCount, String footer) {
        canvas.newSlide(SLIDE_BG);
        float top = MrParts.heading(canvas, PAD_TOP + 6, "Обратная связь инициаторов", 44, group, sub,
                pageCount > 1 ? pageIndex + " / " + pageCount : null) + 24;

        float cardWidth = (CONTENT_WIDTH - 3 * GAP) / 4;
        float cardHeight = (CONTENT_BOTTOM - top - GAP) / 2;
        for (int i = 0; i < cards.size(); i++) {
            float x = PAD_X + (i % 4) * (cardWidth + GAP);
            float y = top + (i / 4) * (cardHeight + GAP);
            card(canvas, cards.get(i), x, y, cardWidth, cardHeight);
        }
        MrParts.footer(canvas, footer);
    }

    /** Средняя оценка карточки (учитывает Узпрок, если он проставлен). */
    static double average(JsonNode feedback) {
        List<Double> ratings = new ArrayList<>(List.of(
                MrFormat.numberOr(feedback, "speedRating", 0),
                MrFormat.numberOr(feedback, "qualityRating", 0),
                MrFormat.numberOr(feedback, "satisfactionRating", 0)));
        double uzproc = MrFormat.numberOr(feedback, "uzprocRating", 0);
        if (uzproc != 0) {
            ratings.add(uzproc);
        }
        return ratings.stream().mapToDouble(Double::doubleValue).sum() / ratings.size();
    }

    private static void card(MrCanvas canvas, JsonNode feedback, float x, float y, float width, float height) {
        canvas.fillRoundRect(x, y, width, height, 20, CARD_BG);
        float innerX = x + CARD_PAD_X;
        float innerWidth = width - 2 * CARD_PAD_X;
        float right = innerX + innerWidth;
        float cursor = y + CARD_PAD_Y;

        // Номер заявки, дата и средняя оценка
        double rating = average(feedback);
        String id = MrFormat.text(feedback, "purchaseRequestInnerId");
        if (id == null || id.isBlank()) {
            id = MrFormat.text(feedback, "idPurchaseRequest");
        }
        canvas.text(id == null || id.isBlank() ? "—" : id, innerX, cursor, ID);
        canvas.text(MrFormat.dateTime(MrFormat.text(feedback, "createdAt")), innerX, cursor + 26, DATE);
        MrText ratingStyle = RATING.color(ratingColor(rating));
        float ratingWidth = canvas.textRight(MrFormat.rating(rating), right, cursor, ratingStyle);
        MrParts.stars(canvas, right - ratingWidth - 8 - MrParts.starsWidth(20, 2),
                cursor + (ratingStyle.lineHeight() - 20) / 2, 20, 2, rating);
        cursor += 50 + BLOCK_GAP;

        String cfo = MrFormat.text(feedback, "cfo");
        if (cfo != null && !cfo.isEmpty()) {
            MrParts.pill(canvas, innerX, cursor, 34, 12, MrFormat.truncate(MrFormat.cfoDisplayName(cfo), CFO_MAX_CHARS),
                    CFO, PURPLE_TINT, 8);
            cursor += 34 + BLOCK_GAP;
        }

        String subject = MrFormat.text(feedback, "purchaseRequestSubject");
        if (subject != null && !subject.isEmpty()) {
            canvas.text(canvas.fit(MrFormat.truncate(subject, SUBJECT_MAX_CHARS), SUBJECT, innerWidth), innerX, cursor,
                    SUBJECT);
            cursor += 26 + BLOCK_GAP;
        }

        // Закупщик и оценивший: подписи в общей колонке по ширине самой длинной
        float labelWidth = Math.max(canvas.textWidth("Закупщик", FIELD_LABEL), canvas.textWidth("Оценил", FIELD_LABEL));
        float valueX = innerX + labelWidth + 12;
        String recipient = MrFormat.text(feedback, "recipientName");
        if (recipient == null || recipient.isBlank()) {
            recipient = MrFormat.text(feedback, "recipient");
        }
        String ratedBy = MrFormat.truncate(MrFormat.personDisplayName(recipient), PERSON_MAX_CHARS);
        canvas.text("Закупщик", innerX, cursor, FIELD_LABEL);
        canvas.text(canvas.fit(MrFormat.truncate(MrFormat.purchaserDisplayName(MrFormat.text(feedback, "purchaser")),
                PERSON_MAX_CHARS), FIELD_VALUE, right - valueX), valueX, cursor, FIELD_VALUE);
        canvas.text("Оценил", innerX, cursor + 28, FIELD_LABEL);
        canvas.text(canvas.fit(ratedBy.isEmpty() ? "—" : ratedBy, FIELD_VALUE, right - valueX), valueX, cursor + 28,
                FIELD_VALUE);
        cursor += 54 + BLOCK_GAP;

        commentBox(canvas, MrFormat.text(feedback, "comment"), innerX, cursor, innerWidth, COMMENT_HEIGHT, COMMENT,
                NO_COMMENT, COMMENT_MAX_CHARS, COMMENT_LINES);
        cursor += COMMENT_HEIGHT + BLOCK_GAP;

        // Оценки по критериям прижаты к низу карточки
        List<String[]> scores = new ArrayList<>();
        scores.add(new String[]{"Скорость", MrFormat.rating(MrFormat.number(feedback, "speedRating"))});
        scores.add(new String[]{"Качество", MrFormat.rating(MrFormat.number(feedback, "qualityRating"))});
        scores.add(new String[]{"Закупщик", MrFormat.rating(MrFormat.number(feedback, "satisfactionRating"))});
        if (MrFormat.number(feedback, "uzprocRating") != null) {
            scores.add(new String[]{"Узпрок", MrFormat.rating(MrFormat.number(feedback, "uzprocRating"))});
        }
        float scoresHeight = scoresHeight(canvas, scores, innerWidth, FOOTER_LINE_HEIGHT);
        float footerHeight = Math.max(FOOTER_LINE_HEIGHT * 2 + 10, 1 + 10 + scoresHeight);
        float footerTop = Math.max(cursor, y + height - CARD_PAD_Y - footerHeight);
        float finalFooterTop = footerTop;
        canvas.clipped(x, y, width, height, () -> {
            canvas.fillRect(innerX, finalFooterTop, innerWidth, 1, ROW_DIVIDER);
            scores(canvas, scores, innerX, finalFooterTop + 11, innerWidth, FOOTER_LINE_HEIGHT);
        });
    }

    /** Блок комментария: текст на подложке или пунктирная рамка «Комментария нет». */
    static void commentBox(MrCanvas canvas, String comment, float x, float y, float width, float height,
                           MrText textStyle, MrText emptyStyle, int maxChars, int maxLines) {
        if (comment == null || comment.isBlank()) {
            canvas.strokeRoundRect(x, y, width, height, 12, LINE, 1.5, 5);
            canvas.text("Комментария нет", x + 16, y + 10, emptyStyle);
            return;
        }
        canvas.fillRoundRect(x, y, width, height, 12, SLIDE_BG);
        List<String> lines = canvas.wrap(MrFormat.truncate(comment, maxChars), textStyle, width - 32);
        for (int i = 0; i < Math.min(lines.size(), maxLines); i++) {
            // Текст длиннее блока — последняя видимая строка заканчивается многоточием
            String line = i == maxLines - 1 && lines.size() > maxLines
                    ? canvas.fit(lines.get(i) + " " + lines.get(i + 1), textStyle, width - 32)
                    : lines.get(i);
            canvas.text(line, x + 16, y + 10 + i * textStyle.lineHeight(), textStyle);
        }
    }

    /** Отступы между оценками в строке и между строками при переносе. */
    private static final float SCORE_GAP = 16;

    /** Высота блока оценок с учётом переноса на новые строки. */
    static float scoresHeight(MrCanvas canvas, List<String[]> scores, float width, float lineHeight) {
        int lines = 1;
        float cursor = 0;
        for (String[] score : scores) {
            float itemWidth = scoreWidth(canvas, score);
            if (cursor > 0 && cursor + itemWidth > width) {
                lines++;
                cursor = 0;
            }
            cursor += itemWidth + SCORE_GAP;
        }
        return lines * lineHeight + (lines - 1) * SCORE_GAP;
    }

    /** Оценки по критериям в строку с переносом: «Скорость 5.0  Качество 4.5 …». */
    static void scores(MrCanvas canvas, List<String[]> scores, float x, float y, float width, float lineHeight) {
        float cursorX = x;
        float cursorY = y;
        MrText label = SCORE_LABEL.lh(lineHeight);
        MrText value = SCORE_VALUE.lh(lineHeight);
        for (String[] score : scores) {
            float itemWidth = scoreWidth(canvas, score);
            if (cursorX > x && cursorX + itemWidth > x + width) {
                cursorX = x;
                cursorY += lineHeight + SCORE_GAP;
            }
            float labelWidth = canvas.text(score[0] + " ", cursorX, cursorY, label);
            canvas.text(score[1], cursorX + labelWidth, cursorY, value);
            cursorX += itemWidth + SCORE_GAP;
        }
    }

    private static float scoreWidth(MrCanvas canvas, String[] score) {
        return canvas.textWidth(score[0] + " ", SCORE_LABEL) + canvas.textWidth(score[1], SCORE_VALUE);
    }
}
