package com.uzproc.backend.service.mrpresentation;

import com.fasterxml.jackson.databind.JsonNode;

import java.awt.Color;
import java.util.ArrayList;
import java.util.List;

import static com.uzproc.backend.service.mrpresentation.MrTheme.*;

/** Слайд «Основные KPI»: экономия, CSI и SLA. */
final class MrKpiSlide {

    private MrKpiSlide() {
    }

    private static final float TOP = 72;
    private static final float GAP = 28;
    /** Высота ряда «Экономия + CSI». */
    private static final float ROW_HEIGHT = 427.2f;
    private static final float CARD_PAD_X = 40;
    private static final float CARD_PAD_Y = 36;
    /** Высота заголовка блока с чипами вместе с отступом под ним. */
    private static final float HEADER_HEIGHT = 60;
    /** Ширина тёмной карточки средней оценки CSI (200 + поля 24×2). */
    private static final float DARK_CARD_WIDTH = 248;

    private static final MrText NO_DATA = MrText.of(22, 400, FAINT);
    private static final MrText TERM_LABEL = MrText.of(14, 600, MUTED).tracking(0.04);
    private static final MrText TERM_SUB = MrText.of(17, 400, MUTED);

    static void render(MrCanvas canvas, MrPresentationData data, String footer) {
        canvas.newSlide(SLIDE_BG);
        float y = MrParts.heading(canvas, TOP + 6, "Основные KPI", 48, null, null, data.periodLabel()) + GAP;

        float savingsWidth = (CONTENT_WIDTH - GAP) * 1.55f / 2.55f;
        savings(canvas, data.savings(), PAD_X, y, savingsWidth);
        csi(canvas, data.csiStats(), PAD_X + savingsWidth + GAP, y, CONTENT_WIDTH - GAP - savingsWidth);

        float slaTop = y + ROW_HEIGHT + GAP;
        sla(canvas, data.sla(), slaTop, CONTENT_BOTTOM - slaTop);
        MrParts.footer(canvas, footer);
    }

    /* ─── Экономия ──────────────────────────────────────────────────────── */

    private static void savings(MrCanvas canvas, JsonNode data, float x, float y, float width) {
        canvas.fillRoundRect(x, y, width, ROW_HEIGHT, 24, CARD_BG);
        float innerX = x + CARD_PAD_X;
        float innerWidth = width - 2 * CARD_PAD_X;
        float headerTop = y + CARD_PAD_Y;

        double budget = MrFormat.numberOr(data, "totalBudget", 0);
        Double percent = data != null && budget > 0 ? MrFormat.numberOr(data, "totalSavings", 0) / budget * 100 : null;
        MrParts.kpiHeader(canvas, innerX, headerTop, "Экономия",
                MrFormat.fixed(SAVINGS_TARGET_PERCENT, 0) + "% от бюджета закупок",
                percent != null ? MrFormat.fixed(percent, 1) + "%" : null,
                percent != null ? percent >= SAVINGS_TARGET_PERCENT : null);

        float top = headerTop + HEADER_HEIGHT;
        if (data == null) {
            canvas.text("Нет данных за период", innerX, top + 40, NO_DATA);
            return;
        }

        float cardWidth = (innerWidth - 20) / 2;
        bigCard(canvas, innerX, top, cardWidth, INK, "БЮДЖЕТ ЗАКУПОК", WHITE, 0.7,
                MrFormat.money(budget), WHITE,
                MrFormat.purchasesLabel((long) MrFormat.numberOr(data, "totalBudgetCount", 0)), WHITE, 0.7);
        bigCard(canvas, innerX + cardWidth + 20, top, cardWidth, PURPLE_TINT, "% ЭКОНОМИИ", PURPLE_DARK, 1,
                percent != null ? MrFormat.fixed(percent, 1) + "%" : "—", PURPLE_DARK,
                "от бюджета закупок", MUTED, 1);

        // Слагаемые: «Общая = От медианы + От сущ. договора + Комбинированный»
        float termsTop = top + 160.8f + 20;
        float fr = (innerWidth - 108) / 4.1f;
        float cursor = innerX;
        termCard(canvas, cursor, termsTop, fr * 1.1f, true, "ОБЩАЯ ЭКОНОМИЯ", data, "totalSavings", "totalCount");
        cursor += fr * 1.1f + 8;
        String[][] terms = {
                {"=", "ОТ МЕДИАНЫ", "savingsFromMedian", "fromMedianCount"},
                {"+", "ОТ СУЩ. ДОГОВОРА", "savingsFromExistingContract", "fromExistingContractCount"},
                {"+", "КОМБИНИРОВАННЫЙ", "savingsUntyped", "untypedCount"}};
        MrText sign = MrText.of(28, 600, FAINT);
        for (String[] term : terms) {
            canvas.textCenter(term[0], cursor, 20, termsTop + (114.4f - sign.lineHeight()) / 2, sign);
            cursor += 28;
            termCard(canvas, cursor, termsTop, fr, false, term[1], data, term[2], term[3]);
            cursor += fr + 8;
        }
    }

    private static void bigCard(MrCanvas canvas, float x, float y, float width, Color background, String label,
                                Color labelColor, double labelAlpha, String value, Color valueColor, String sub,
                                Color subColor, double subAlpha) {
        canvas.fillRoundRect(x, y, width, 160.8, 18, background);
        MrText labelStyle = MrText.of(18, 600, labelColor).tracking(0.08).alpha(labelAlpha);
        MrText valueStyle = MrText.of(52, 800, valueColor).lhEm(1.1).tracking(-0.02);
        canvas.text(label, x + 26, y + 22, labelStyle);
        canvas.text(value, x + 26, y + 51.6, valueStyle);
        canvas.text(sub, x + 26, y + 114.8, MrText.of(20, 400, subColor).alpha(subAlpha));
    }

    private static void termCard(MrCanvas canvas, float x, float y, float width, boolean accent, String label,
                                 JsonNode data, String valueField, String countField) {
        float height = 114.4f;
        float padX = 18;
        float padY = 14;
        if (accent) {
            canvas.fillRoundRect(x, y, width, height, 16, CARD_BG);
            canvas.strokeRoundRect(x, y, width, height, 16, BRAND, 2, 0);
            padX += 2;
            padY += 2;
        } else {
            canvas.fillRoundRect(x, y, width, height, 16, SLIDE_BG);
        }
        MrText value = MrText.of(accent ? 32 : 30, 800, INK).lhEm(1.1).tracking(-0.02);
        canvas.text(label, x + padX, y + padY, accent ? TERM_LABEL.color(PURPLE_DARK) : TERM_LABEL);
        canvas.text(MrFormat.money(MrFormat.numberOr(data, valueField, 0)), x + padX, y + padY + 22.8, value);
        canvas.text(MrFormat.purchasesLabel((long) MrFormat.numberOr(data, countField, 0)), x + padX,
                y + padY + 22.8 + value.lineHeight() + 4, TERM_SUB);
    }

    /* ─── CSI ───────────────────────────────────────────────────────────── */

    private static void csi(MrCanvas canvas, JsonNode stats, float x, float y, float width) {
        canvas.fillRoundRect(x, y, width, ROW_HEIGHT, 24, CARD_BG);
        float innerX = x + CARD_PAD_X;
        float innerWidth = width - 2 * CARD_PAD_X;
        float headerTop = y + CARD_PAD_Y;

        Double overall = MrFormat.number(stats, "avgOverall");
        MrParts.kpiHeader(canvas, innerX, headerTop, "CSI", MrFormat.fixed(CSI_TARGET_RATING, 1),
                overall != null ? MrFormat.rating(overall) : null,
                overall != null ? overall >= CSI_TARGET_RATING : null);

        float top = headerTop + HEADER_HEIGHT;
        if (stats == null) {
            canvas.text("Нет данных за период", innerX, top + 40, NO_DATA);
            return;
        }
        float height = y + ROW_HEIGHT - CARD_PAD_Y - top;

        // Тёмная карточка со средней оценкой и числом оценок
        MrText label = MrText.of(16, 600, WHITE).tracking(0.08).alpha(0.7);
        MrText big = MrText.of(64, 800, WHITE).lhEm(1.25).tracking(-0.03);
        MrText count = MrText.of(36, 800, WHITE);
        canvas.fillRoundRect(innerX, top, DARK_CARD_WIDTH, height, 18, INK);
        canvas.text("СРЕДНЯЯ", innerX + 24, top + 22, label);
        canvas.text(MrFormat.rating(overall), innerX + 24, top + 22 + label.lineHeight() + 4, big);
        MrParts.stars(canvas, innerX + 24, top + 22 + label.lineHeight() + 4 + big.lineHeight() + 12, 24, 2, overall);
        float countTop = top + height - 22 - count.lineHeight();
        canvas.text("ОЦЕНОК", innerX + 24, countTop - label.lineHeight(), label);
        canvas.text(String.valueOf((long) MrFormat.numberOr(stats, "count", 0)), innerX + 24, countTop, count);

        List<Object[]> rows = new ArrayList<>();
        rows.add(new Object[]{"Скорость", MrFormat.number(stats, "avgSpeed")});
        rows.add(new Object[]{"Качество", MrFormat.number(stats, "avgQuality")});
        rows.add(new Object[]{"Закупщик", MrFormat.number(stats, "avgSatisfaction")});
        if (MrFormat.number(stats, "avgUzproc") != null) {
            rows.add(new Object[]{"Узпрок", MrFormat.number(stats, "avgUzproc")});
        }
        float rowsX = innerX + DARK_CARD_WIDTH + 20;
        float rowHeight = (height - 10 * (rows.size() - 1)) / rows.size();
        for (int i = 0; i < rows.size(); i++) {
            metricRow(canvas, rowsX, top + i * (rowHeight + 10), innerWidth - DARK_CARD_WIDTH - 20, rowHeight,
                    (String) rows.get(i)[0], (Double) rows.get(i)[1], SLIDE_BG, 1, INK);
        }
    }

    /** Строка показателя: название, звёзды и значение. Используется и на слайде договоров. */
    static void metricRow(MrCanvas canvas, float x, float y, float width, float height, String label, Double value,
                          Color background, double backgroundAlpha, Color textColor) {
        canvas.fillRoundRect(x, y, width, height, 14, background, backgroundAlpha);
        float centerY = y + height / 2;
        canvas.textMiddle(label, x + 20, centerY, MrText.of(22, 500, textColor));
        canvas.textMiddleRight(MrFormat.rating(value), x + width - 20, centerY, MrText.of(24, 700, textColor));
        MrParts.stars(canvas, x + width - 20 - 44 - 12 - MrParts.starsWidth(18, 2), centerY - 9, 18, 2, value);
    }

    /* ─── SLA ───────────────────────────────────────────────────────────── */

    private static final float CHART_WIDTH = 1760;
    private static final float BASE_Y = 236;
    private static final float MAX_BAR_HEIGHT = 110;
    private static final float COLUMN_WIDTH = CHART_WIDTH / 12;
    private static final float BAR_WIDTH = 96;

    private static void sla(MrCanvas canvas, MrPresentationData.Sla sla, float y, float height) {
        canvas.fillRoundRect(PAD_X, y, CONTENT_WIDTH, height, 24, CARD_BG);
        float innerX = PAD_X + CARD_PAD_X;
        float headerTop = y + 32;
        Double average = sla.averagePercentage();
        MrParts.kpiHeader(canvas, innerX, headerTop, "SLA", MrFormat.fixed(SLA_TARGET_PERCENT, 0) + "%",
                average != null ? MrFormat.percent(average) : null,
                average != null ? average >= SLA_TARGET_PERCENT : null);
        legend(canvas, PAD_X + CONTENT_WIDTH - CARD_PAD_X, headerTop + 18, average);
        chart(canvas, innerX, headerTop + HEADER_HEIGHT + 28, sla);
    }

    /** Легенда графика, прижатая правым краем: раскладывается справа налево. */
    private static void legend(MrCanvas canvas, float right, float centerY, Double average) {
        MrText item = MrText.of(19, 500, MUTED);
        MrText pill = MrText.of(19, 600, INK);
        String averageText = "Средний SLA: " + MrFormat.percent(average);
        float x = right - canvas.textWidth(averageText, pill) - 32;
        MrParts.pill(canvas, x, centerY - 17.5, 35, 16, averageText, pill, SLIDE_BG, 999);

        String lineLabel = "Уложились в SLA, %";
        x -= 28 + canvas.textWidth(lineLabel, item);
        canvas.textMiddle(lineLabel, x, centerY, item);
        x -= 10 + 26;
        canvas.fillRoundRect(x, centerY - 2, 26, 4, 2, INK);

        String barLabel = "Завершённые закупки";
        x -= 28 + canvas.textWidth(barLabel, item);
        canvas.textMiddle(barLabel, x, centerY, item);
        canvas.fillRoundRect(x - 10 - 18, centerY - 9, 18, 18, 5, PURPLE_MID);
    }

    /** Позиция точки линии SLA: шкала 80–100% укладывается в 60px над y=100. */
    private static double percentToY(double percent) {
        return Math.max(28, Math.min(200, 100 - (percent - 80) / 20 * 60));
    }

    /** Столбцы завершённых закупок и линия процента уложившихся в срок. */
    private static void chart(MrCanvas canvas, float ox, float oy, MrPresentationData.Sla sla) {
        int[] counts = sla.completedByMonth();
        int maxCount = 1;
        for (int count : counts) {
            maxCount = Math.max(maxCount, count);
        }
        MrText countStyle = MrText.of(22, 700, INK).lh(22);
        MrText monthStyle = MrText.of(20, 500, MUTED).lh(20);
        MrText percentStyle = MrText.of(19, 700, WHITE);

        List<double[]> points = new ArrayList<>();
        List<String> labels = new ArrayList<>();
        for (int i = 0; i < 12; i++) {
            float cx = COLUMN_WIDTH * i + COLUMN_WIDTH / 2;
            float barX = ox + cx - BAR_WIDTH / 2;
            if (counts[i] > 0) {
                float barHeight = Math.max(6, (float) counts[i] / maxCount * MAX_BAR_HEIGHT);
                canvas.fillRoundRect(barX, oy + BASE_Y - barHeight, BAR_WIDTH, barHeight, 8, PURPLE_MID);
                canvas.textCenter(String.valueOf(counts[i]), barX, BAR_WIDTH, oy + BASE_Y - barHeight - 30, countStyle);
                if (sla.percentByMonth()[i] != null) {
                    points.add(new double[]{ox + cx, oy + percentToY(sla.percentByMonth()[i])});
                    labels.add(Math.round(sla.percentByMonth()[i]) + "%");
                }
            }
            canvas.textCenter(MONTH_SHORT[i], barX, BAR_WIDTH, oy + 246, monthStyle);
        }
        canvas.line(ox, oy + BASE_Y, ox + CHART_WIDTH, oy + BASE_Y, LINE, 2);
        canvas.polyline(points, INK, 4);
        for (int i = 0; i < points.size(); i++) {
            double[] point = points.get(i);
            canvas.circle(point[0], point[1], 7, WHITE, INK, 4, 1);
            canvas.fillRoundRect(point[0] - 33, point[1] - 50, 66, 30, 8, INK);
            canvas.textMiddleCenter(labels.get(i), point[0] - 33, 66, point[1] - 35, percentStyle);
        }
    }
}
