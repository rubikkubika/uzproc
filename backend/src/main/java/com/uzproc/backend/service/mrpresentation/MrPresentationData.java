package com.uzproc.backend.service.mrpresentation;

import com.fasterxml.jackson.databind.JsonNode;

import java.util.ArrayList;
import java.util.List;

/**
 * Полный набор данных презентации управленческой отчётности.
 *
 * <p>Блоки данных — JSON в том же виде, в каком их отдают эндпоинты страницы управленческой
 * отчётности, поэтому презентация показывает те же данные, что и страница.
 *
 * @param periodYear            год отчётного периода (титульный лист и футер)
 * @param periodMonth           месяц отчётного периода
 * @param dataYear              год, за который считаются годовые показатели
 * @param periodLabel           подпись периода данных («2026 · январь — август»)
 * @param footerLabel           подпись футера контентных слайдов
 * @param savings               экономия за год ({@code /overview/savings}); может быть null
 * @param csiStats              сводная статистика CSI ({@code /csi-feedback/stats}); может быть null
 * @param csiFeedbacks          оценки инициаторов за год, свежие сверху
 * @param sla                   показатели SLA по месяцам
 * @param contractDocuments     документы по договорникам и месяцам; может быть null
 * @param contractDurations     средний срок согласования по месяцам (сегмент Маркет)
 * @param specificationFeedback оценки по спецификациям; может быть null
 */
public record MrPresentationData(
        int periodYear,
        int periodMonth,
        int dataYear,
        String periodLabel,
        String footerLabel,
        JsonNode savings,
        JsonNode csiStats,
        List<JsonNode> csiFeedbacks,
        Sla sla,
        JsonNode contractDocuments,
        List<JsonNode> contractDurations,
        JsonNode specificationFeedback
) {

    /**
     * Показатели SLA.
     *
     * @param averagePercentage взвешенный средний % за год (сумма metSla / сумма totalCompleted); null — нет данных
     * @param completedByMonth  завершённые закупки по месяцам (индекс 0 — январь)
     * @param percentByMonth    % уложившихся в SLA по месяцам; null — нет данных
     */
    public record Sla(Double averagePercentage, int[] completedByMonth, Double[] percentByMonth) {
    }

    /**
     * Собирает данные презентации из ответов эндпоинтов.
     *
     * @param slaResponse       ответ {@code /overview/sla} (берётся {@code slaPercentageByMonth})
     * @param durationsResponse ответ {@code /overview/contract-approvals-duration-by-month-market}
     */
    public static MrPresentationData of(int periodYear, int periodMonth, JsonNode savings, JsonNode csiStats,
                                        List<JsonNode> csiFeedbacks, JsonNode slaResponse,
                                        JsonNode contractDocuments, JsonNode durationsResponse,
                                        JsonNode specificationFeedback) {
        Sla sla = buildSla(slaResponse);
        Integer from = null;
        Integer to = null;
        for (int i = 0; i < 12; i++) {
            if (sla.completedByMonth()[i] > 0) {
                from = from == null ? i + 1 : from;
                to = i + 1;
            }
        }
        List<JsonNode> durations = new ArrayList<>();
        if (durationsResponse != null && durationsResponse.has("months")) {
            durationsResponse.get("months").forEach(durations::add);
        }
        return new MrPresentationData(
                periodYear,
                periodMonth,
                periodYear,
                MrFormat.dataPeriodLabel(periodYear, from, to),
                MrFormat.footerLabel(periodMonth, periodYear),
                nullIfMissing(savings),
                nullIfMissing(csiStats),
                csiFeedbacks != null ? csiFeedbacks : List.of(),
                sla,
                nullIfMissing(contractDocuments),
                durations,
                nullIfMissing(specificationFeedback)
        );
    }

    private static Sla buildSla(JsonNode slaResponse) {
        int[] completed = new int[12];
        Double[] percent = new Double[12];
        double totalCompleted = 0;
        double metSla = 0;
        JsonNode months = slaResponse == null ? null : slaResponse.get("slaPercentageByMonth");
        if (months != null) {
            for (JsonNode m : months) {
                int month = (int) MrFormat.numberOr(m, "month", 0);
                double total = MrFormat.numberOr(m, "totalCompleted", 0);
                totalCompleted += total;
                metSla += MrFormat.numberOr(m, "metSla", 0);
                if (month >= 1 && month <= 12) {
                    completed[month - 1] = (int) total;
                    percent[month - 1] = MrFormat.number(m, "percentage");
                }
            }
        }
        return new Sla(totalCompleted > 0 ? metSla / totalCompleted * 100 : null, completed, percent);
    }

    private static JsonNode nullIfMissing(JsonNode node) {
        return node == null || node.isNull() || node.isMissingNode() ? null : node;
    }
}
