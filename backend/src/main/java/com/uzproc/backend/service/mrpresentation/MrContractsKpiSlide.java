package com.uzproc.backend.service.mrpresentation;

import com.fasterxml.jackson.databind.JsonNode;

import java.awt.Color;
import java.util.ArrayList;
import java.util.List;

import static com.uzproc.backend.service.mrpresentation.MrTheme.*;

/** Слайд «Основные показатели» по договорам: документы по договорникам, оценка инициаторов, сроки согласования. */
final class MrContractsKpiSlide {

    private MrContractsKpiSlide() {
    }

    private static final float GAP = 24;
    /** Максимум строк таблицы, помещающихся на слайде. */
    private static final int MAX_ROWS = 7;
    private static final float NAME_COLUMN = 260;
    private static final float TOTAL_COLUMN = 90;
    private static final float HEADER_ROW = 42;
    private static final float DATA_ROW = 42;
    private static final float TOTAL_ROW = 44;

    private static final MrText CARD_TITLE = MrText.of(26, 700, INK);
    private static final MrText HEAD_CELL = MrText.of(17, 600, MUTED);
    private static final MrText CELL = MrText.of(19, 600, INK);
    private static final MrText CELL_BOLD = MrText.of(19, 800, INK);

    static void render(MrCanvas canvas, MrPresentationData data, String footer) {
        canvas.newSlide(SLIDE_BG);
        float top = MrParts.heading(canvas, PAD_TOP + 6, "Основные показатели", 48, null, null, data.periodLabel()) + GAP;

        List<JsonNode> rows = new ArrayList<>();
        if (data.contractDocuments() != null && data.contractDocuments().has("rows")) {
            data.contractDocuments().get("rows").forEach(rows::add);
        }
        if (rows.size() > MAX_ROWS) {
            rows = rows.subList(0, MAX_ROWS);
        }
        float tableWidth = (CONTENT_WIDTH - GAP) * 1.9f / 2.9f;
        float tableHeight = rows.isEmpty()
                ? 56 + 49.2f + 106.4f
                : 56 + 49.2f + 1 + HEADER_ROW + DATA_ROW * rows.size() + TOTAL_ROW;
        float rowHeight = Math.max(tableHeight, 337.2f);

        documentsTable(canvas, data.contractDocuments(), rows, PAD_X, top, tableWidth, rowHeight);
        specificationCsi(canvas, data.specificationFeedback(), PAD_X + tableWidth + GAP, top,
                CONTENT_WIDTH - GAP - tableWidth, rowHeight);

        float chartsTop = top + rowHeight + GAP;
        float chartWidth = (CONTENT_WIDTH - GAP) / 2;
        String unit = "дней, " + data.dataYear();
        durationChart(canvas, PAD_X, chartsTop, chartWidth, CONTENT_BOTTOM - chartsTop,
                "Срок согласования: договор + ДС", unit, data.contractDurations(), "contractDsAvgDays", BRAND);
        durationChart(canvas, PAD_X + chartWidth + GAP, chartsTop, chartWidth, CONTENT_BOTTOM - chartsTop,
                "Срок согласования: спецификации", unit, data.contractDurations(), "specAvgDays", GREEN_LINE);
        MrParts.footer(canvas, footer);
    }

    /* ─── Таблица документов ────────────────────────────────────────────── */

    private static void documentsTable(MrCanvas canvas, JsonNode data, List<JsonNode> rows, float x, float y,
                                       float width, float height) {
        canvas.fillRoundRect(x, y, width, height, 24, CARD_BG);
        float innerX = x + 32;
        float innerWidth = width - 64;
        canvas.text("Кол-во документов по договорникам и месяцам", innerX, y + 28, CARD_TITLE);
        float top = y + 28 + CARD_TITLE.lineHeight() + 18;

        if (rows.isEmpty()) {
            MrText noData = MrText.of(22, 400, FAINT);
            canvas.textCenter("Нет данных за период", innerX, innerWidth, top + 40, noData);
            return;
        }

        float monthColumn = (innerWidth - NAME_COLUMN - TOTAL_COLUMN) / 12;
        float monthsX = innerX + NAME_COLUMN;
        float right = innerX + innerWidth;

        canvas.fillRect(innerX, top, innerWidth, 1, ROW_DIVIDER);
        float rowTop = top + 1;

        // Шапка
        float center = rowTop + (HEADER_ROW - 1) / 2;
        canvas.textMiddle("Договорник", innerX + 8, center, HEAD_CELL);
        for (int m = 0; m < 12; m++) {
            canvas.textMiddleCenter(MONTH_SHORT[m], monthsX + m * monthColumn, monthColumn, center, HEAD_CELL);
        }
        canvas.textMiddleRight("Итого", right - 8, center, HEAD_CELL);
        canvas.fillRect(innerX, rowTop + HEADER_ROW - 1, innerWidth, 1, ROW_DIVIDER);
        rowTop += HEADER_ROW;

        // Договорники с тепловой заливкой ячеек
        for (JsonNode row : rows) {
            center = rowTop + (DATA_ROW - 1) / 2;
            canvas.textMiddle(canvas.fit(String.valueOf(MrFormat.text(row, "preparedByName")), CELL, NAME_COLUMN - 16),
                    innerX + 8, center, CELL);
            JsonNode counts = row.get("monthlyCounts");
            for (int m = 0; m < 12; m++) {
                int value = counts != null && counts.has(m) ? counts.get(m).asInt() : 0;
                Color background = heatBackground(value);
                if (background != null) {
                    canvas.fillRect(monthsX + m * monthColumn, rowTop, monthColumn, DATA_ROW - 1, background);
                }
                canvas.textMiddleCenter(value == 0 ? "—" : String.valueOf(value), monthsX + m * monthColumn,
                        monthColumn, center, CELL.color(value == 0 ? FAINT : value >= 60 ? WHITE : INK));
            }
            canvas.textMiddleRight(String.valueOf((long) MrFormat.numberOr(row, "total", 0)), right - 8, center,
                    CELL_BOLD);
            canvas.fillRect(innerX, rowTop + DATA_ROW - 1, innerWidth, 1, ROW_DIVIDER);
            rowTop += DATA_ROW;
        }

        // Итоговая строка: общая подложка со скруглением и акцентная ячейка общего итога
        float totalHeight = TOTAL_ROW - 1;
        center = rowTop + totalHeight / 2;
        canvas.fillRoundRect(innerX, rowTop, innerWidth - TOTAL_COLUMN + 10, totalHeight, 10, SLIDE_BG);
        canvas.fillRoundRect(right - TOTAL_COLUMN - 10, rowTop, TOTAL_COLUMN + 10, totalHeight, 10, PURPLE_TINT);
        canvas.fillRect(right - TOTAL_COLUMN - 10, rowTop, 10, totalHeight, SLIDE_BG);
        canvas.textMiddle("Итого", innerX + 8, center, CELL_BOLD);
        JsonNode totals = data.get("monthlyTotals");
        for (int m = 0; m < 12; m++) {
            int value = totals != null && totals.has(m) ? totals.get(m).asInt() : 0;
            canvas.textMiddleCenter(value == 0 ? "—" : String.valueOf(value), monthsX + m * monthColumn, monthColumn,
                    center, CELL_BOLD.color(value == 0 ? FAINT : INK));
        }
        canvas.textMiddleRight(String.valueOf((long) MrFormat.numberOr(data, "total", 0)), right - 8, center,
                CELL_BOLD.color(PURPLE_DARK));
    }

    /** Заливка ячейки по количеству документов; null — без заливки. */
    private static Color heatBackground(int value) {
        if (value == 0) {
            return null;
        }
        if (value >= 60) {
            return BRAND;
        }
        if (value >= 40) {
            return PURPLE_MID;
        }
        return value >= 20 ? HEAT_MID : HEAT_LOW;
    }

    /* ─── Оценка инициаторов по спецификациям ───────────────────────────── */

    private static void specificationCsi(MrCanvas canvas, JsonNode data, float x, float y, float width, float height) {
        canvas.fillRoundRect(x, y, width, height, 24, INK);
        float innerX = x + 36;
        float innerWidth = width - 72;
        boolean hasData = data != null && MrFormat.numberOr(data, "count", 0) > 0;

        MrText label = MrText.of(16, 600, WHITE).tracking(0.08).alpha(0.7);
        MrText big = MrText.of(72, 800, WHITE).lh(72).tracking(-0.03);
        MrText side = MrText.of(22, 400, WHITE).alpha(0.7);
        canvas.text("ОЦЕНКА ИНИЦИАТОРОВ", innerX, y + 32, label);
        float bigTop = y + 32 + label.lineHeight() + 6;
        float bigWidth = canvas.text(hasData ? MrFormat.rating(MrFormat.number(data, "avgOverall")) : "—", innerX,
                bigTop, big);
        canvas.textBaseline(hasData ? MrFormat.ratingsLabel((long) MrFormat.numberOr(data, "count", 0)) : "нет оценок",
                innerX + bigWidth + 14, MrCanvas.baselineOf(bigTop, big), side);

        String[][] rows = {{"Скорость", "avgSpeed"}, {"Работа исполнителя", "avgBusiness"}, {"Общая оценка", "avgOverall"}};
        float rowTop = y + height - 32 - (52 * 3 + 10 * 2);
        for (String[] row : rows) {
            MrKpiSlide.metricRow(canvas, innerX, rowTop, innerWidth, 52, row[0], MrFormat.number(data, row[1]), WHITE,
                    0.08, WHITE);
            rowTop += 62;
        }
    }

    /* ─── Срок согласования ─────────────────────────────────────────────── */

    private static final float CHART_WIDTH = 800;
    private static final float BASE_Y = 262;
    private static final float COLUMN_WIDTH = CHART_WIDTH / 12;

    /** Средний срок согласования по месяцам: линия со значениями в плашках. */
    private static void durationChart(MrCanvas canvas, float x, float y, float width, float height, String title,
                                      String unit, List<JsonNode> months, String field, Color color) {
        canvas.fillRoundRect(x, y, width, height, 24, CARD_BG);
        canvas.text(title, x + 32, y + 28, CARD_TITLE);
        canvas.textBaseline(unit, x + width - 32 - canvas.textWidth(unit, MrText.of(19, 400, MUTED)),
                MrCanvas.baselineOf(y + 28, CARD_TITLE), MrText.of(19, 400, MUTED));

        float ox = x + (width - CHART_WIDTH) / 2;
        float oy = y + 28 + CARD_TITLE.lineHeight() + 10;

        Double[] byMonth = new Double[12];
        double min = Double.MAX_VALUE;
        double max = -Double.MAX_VALUE;
        for (JsonNode month : months) {
            int index = (int) MrFormat.numberOr(month, "month", 0) - 1;
            Double value = MrFormat.number(month, field);
            if (index >= 0 && index < 12 && value != null) {
                byMonth[index] = value;
                min = Math.min(min, value);
                max = Math.max(max, value);
            }
        }
        // Границы шкалы: данные с запасом 25%, чтобы линия занимала всю высоту
        double lo = 0;
        double hi = 1;
        if (max >= min) {
            double pad = (max - min) * 0.25;
            lo = min == max ? min - 1 : min - pad;
            hi = min == max ? max + 1 : max + pad;
        }

        List<double[]> points = new ArrayList<>();
        List<String> labels = new ArrayList<>();
        MrText monthStyle = MrText.of(18, 500, MUTED).lh(18);
        for (int i = 0; i < 12; i++) {
            float cx = ox + COLUMN_WIDTH * i + COLUMN_WIDTH / 2;
            canvas.textCenter(MONTH_SHORT[i], cx - 33, 66, oy + 276, monthStyle);
            if (byMonth[i] != null) {
                points.add(new double[]{cx, oy + 240 - (byMonth[i] - lo) / (hi - lo) * 170});
                labels.add(MrFormat.fixed(byMonth[i], 1));
            }
        }
        canvas.line(ox, oy + BASE_Y, ox + CHART_WIDTH, oy + BASE_Y, LINE, 2);
        canvas.polyline(points, color, 4);
        MrText valueStyle = MrText.of(18, 700, WHITE);
        for (int i = 0; i < points.size(); i++) {
            double[] point = points.get(i);
            canvas.circle(point[0], point[1], 6, WHITE, color, 4, 1);
            canvas.fillRoundRect(point[0] - 24, point[1] - 48, 48, 28, 7, color);
            canvas.textMiddleCenter(labels.get(i), point[0] - 24, 48, point[1] - 34, valueStyle);
        }
    }
}
