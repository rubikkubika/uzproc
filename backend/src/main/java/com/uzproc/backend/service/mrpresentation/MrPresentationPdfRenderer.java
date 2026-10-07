package com.uzproc.backend.service.mrpresentation;

import com.fasterxml.jackson.databind.JsonNode;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDDocumentInformation;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.text.Collator;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.TreeMap;

import static com.uzproc.backend.service.mrpresentation.MrTheme.*;

/**
 * Сборка презентации управленческой отчётности в PDF 16:9.
 *
 * <p>Слайды: титул, раздел «Закупки» (основные KPI, обратная связь инициаторов по группам ЦФО),
 * раздел «Договора» (основные показатели, оценки по спецификациям) и «Спасибо».
 * Рисуются вектором, шрифт встроен в файл. Класс не зависит от Spring — ему достаточно готовых данных.
 */
public final class MrPresentationPdfRenderer {

    private MrPresentationPdfRenderer() {
    }

    /** Готовая презентация. */
    public record Result(byte[] pdf, String fileName, int slideCount) {
    }

    public static Result render(MrPresentationData data) throws IOException {
        try (PDDocument document = new PDDocument()) {
            PDDocumentInformation info = new PDDocumentInformation();
            info.setTitle("Управленческая отчётность: " + MrFormat.monthName(data.periodMonth()) + " " + data.periodYear());
            info.setCreator("uzProc");
            document.setDocumentInformation(info);

            MrFonts fonts = new MrFonts(document);
            try (MrCanvas canvas = new MrCanvas(document, fonts)) {
                renderSlides(canvas, data);
            }

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            document.save(out);
            return new Result(out.toByteArray(), MrFormat.fileName(data.periodYear(), data.periodMonth()),
                    document.getNumberOfPages());
        }
    }

    private static void renderSlides(MrCanvas canvas, MrPresentationData data) {
        // Нумерация сквозная: титульные слайды считаются, но номер на них не выводится
        int[] number = {0};
        MrTitleSlides.cover(canvas, data.periodYear(), data.periodMonth());
        number[0]++;
        MrTitleSlides.section(canvas, "01", "Закупки",
                "Ключевые показатели · экономия · SLA · удовлетворённость инициаторов");
        number[0]++;
        MrKpiSlide.render(canvas, data, footer(data, ++number[0]));

        for (FeedbackGroup group : FEEDBACK_GROUPS) {
            List<JsonNode> cards = data.csiFeedbacks().stream()
                    .filter(f -> group.label().equals(resolveGroup(MrFormat.text(f, "cfo"))))
                    .toList();
            int pageCount = (cards.size() + FEEDBACK_CARDS_PER_SLIDE - 1) / FEEDBACK_CARDS_PER_SLIDE;
            for (int page = 0; page < pageCount; page++) {
                List<JsonNode> pageCards = cards.subList(page * FEEDBACK_CARDS_PER_SLIDE,
                        Math.min(cards.size(), (page + 1) * FEEDBACK_CARDS_PER_SLIDE));
                MrFeedbackSlide.render(canvas, group.label(), group.sub(), pageCards, page + 1, pageCount,
                        footer(data, ++number[0]));
            }
        }

        MrTitleSlides.section(canvas, "02", "Договора",
                "Документооборот по договорникам · сроки согласования · оценка инициаторов");
        number[0]++;
        MrContractsKpiSlide.render(canvas, data, footer(data, ++number[0]));

        List<List<MrContractsFeedbackSlide.MonthGroup>> pages =
                paginate(groupSpecificationFeedback(data.specificationFeedback(), data.dataYear()));
        for (int page = 0; page < pages.size(); page++) {
            MrContractsFeedbackSlide.render(canvas, pages.get(page), page + 1, pages.size(), footer(data, ++number[0]));
        }

        MrTitleSlides.thanks(canvas);
    }

    private static String footer(MrPresentationData data, int slideNumber) {
        return data.footerLabel() + " · " + slideNumber;
    }

    /** Группа ЦФО, к которой относится оценка (по ключевым словам); null — не входит ни в одну. */
    static String resolveGroup(String cfo) {
        if (cfo == null || cfo.isEmpty()) {
            return null;
        }
        String lower = cfo.toLowerCase(Locale.ROOT);
        for (FeedbackGroup group : FEEDBACK_GROUPS) {
            for (String keyword : group.keywords()) {
                if (lower.contains(keyword.toLowerCase(Locale.ROOT))) {
                    return group.label();
                }
            }
        }
        return null;
    }

    /** Оценки по спецификациям за год, сгруппированные по месяцам (свежий месяц сверху, внутри — по ЦФО). */
    private static List<MrContractsFeedbackSlide.MonthGroup> groupSpecificationFeedback(JsonNode feedback, int year) {
        Map<Integer, List<JsonNode>> byMonth = new TreeMap<>(Comparator.reverseOrder());
        if (feedback != null && feedback.has("items")) {
            for (JsonNode item : feedback.get("items")) {
                Double itemYear = MrFormat.number(item, "periodYear");
                if (itemYear == null || itemYear.intValue() != year) {
                    continue;
                }
                byMonth.computeIfAbsent((int) MrFormat.numberOr(item, "periodMonth", 0), m -> new ArrayList<>()).add(item);
            }
        }
        Collator collator = Collator.getInstance(Locale.forLanguageTag("ru"));
        List<MrContractsFeedbackSlide.MonthGroup> groups = new ArrayList<>();
        byMonth.forEach((month, cards) -> {
            cards.sort(Comparator.comparing(c -> String.valueOf(MrFormat.text(c, "cfoName") == null
                    ? "" : MrFormat.text(c, "cfoName")), collator));
            groups.add(new MrContractsFeedbackSlide.MonthGroup(month, year, cards.size(), cards));
        });
        return groups;
    }

    /**
     * Разбивка месяцев на слайды по рядам карточек: каждый месяц начинает новый ряд и добавляет
     * заголовок, поэтому ёмкость слайда считается рядами. Месяц, не помещающийся целиком,
     * переносится на следующий слайд по границе ряда.
     */
    private static List<List<MrContractsFeedbackSlide.MonthGroup>> paginate(
            List<MrContractsFeedbackSlide.MonthGroup> months) {
        List<List<MrContractsFeedbackSlide.MonthGroup>> pages = new ArrayList<>();
        List<MrContractsFeedbackSlide.MonthGroup> current = new ArrayList<>();
        int usedRows = 0;
        for (MrContractsFeedbackSlide.MonthGroup month : months) {
            int offset = 0;
            while (offset < month.cards().size()) {
                int freeRows = CONTRACT_FEEDBACK_ROWS_PER_SLIDE - usedRows;
                if (freeRows <= 0) {
                    pages.add(current);
                    current = new ArrayList<>();
                    usedRows = 0;
                    continue;
                }
                int end = Math.min(month.cards().size(), offset + freeRows * CONTRACT_FEEDBACK_CARDS_PER_ROW);
                List<JsonNode> slice = month.cards().subList(offset, end);
                current.add(new MrContractsFeedbackSlide.MonthGroup(month.month(), month.year(), month.totalInMonth(), slice));
                usedRows += (slice.size() + CONTRACT_FEEDBACK_CARDS_PER_ROW - 1) / CONTRACT_FEEDBACK_CARDS_PER_ROW;
                offset = end;
            }
        }
        if (!current.isEmpty()) {
            pages.add(current);
        }
        return pages;
    }
}
