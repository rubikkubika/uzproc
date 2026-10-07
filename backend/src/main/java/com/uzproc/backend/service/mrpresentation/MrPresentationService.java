package com.uzproc.backend.service.mrpresentation;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.uzproc.backend.dto.csifeedback.CsiFeedbackDto;
import com.uzproc.backend.service.contract.ContractService;
import com.uzproc.backend.service.csifeedback.CsiFeedbackService;
import com.uzproc.backend.service.overview.OverviewService;
import com.uzproc.backend.service.specificationfeedback.SpecificationFeedbackService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

/**
 * Презентация управленческой отчётности (PDF 16:9): кнопка «Презентация PDF» на странице
 * управленческой отчётности и письмо из центра отправки.
 *
 * <p>Данные берутся из тех же сервисов, что отдают их странице управленческой отчётности,
 * и передаются в отрисовку в виде JSON с теми же именами полей — презентация показывает
 * те же цифры, что и страница.
 */
@Service
public class MrPresentationService {

    private static final Logger logger = LoggerFactory.getLogger(MrPresentationService.class);

    /** Размер страницы и предел страниц выгрузки оценок CSI. */
    private static final int CSI_PAGE_SIZE = 200;
    private static final int CSI_MAX_PAGES = 20;

    private final OverviewService overviewService;
    private final CsiFeedbackService csiFeedbackService;
    private final ContractService contractService;
    private final SpecificationFeedbackService specificationFeedbackService;
    private final ObjectMapper objectMapper;

    public MrPresentationService(OverviewService overviewService,
                                 CsiFeedbackService csiFeedbackService,
                                 ContractService contractService,
                                 SpecificationFeedbackService specificationFeedbackService,
                                 ObjectMapper objectMapper) {
        this.overviewService = overviewService;
        this.csiFeedbackService = csiFeedbackService;
        this.contractService = contractService;
        this.specificationFeedbackService = specificationFeedbackService;
        this.objectMapper = objectMapper;
    }

    /**
     * Собирает презентацию за отчётный период; годовые показатели считаются за год периода.
     *
     * @throws IllegalArgumentException некорректный период
     * @throws IllegalStateException    презентацию не удалось сформировать
     */
    public MrPresentationPdfRenderer.Result render(int year, int month) {
        if (month < 1 || month > 12 || year < 2000 || year > 2100) {
            throw new IllegalArgumentException("Некорректный отчётный период: " + year + "-" + month);
        }
        long startedAt = System.currentTimeMillis();
        MrPresentationData data = MrPresentationData.of(
                year,
                month,
                tree(overviewService.getSavingsData(year)),
                tree(csiFeedbackService.getStatsByYear(year, null, null)),
                loadCsiFeedbacks(year),
                tree(overviewService.getSlaData(year, null)),
                tree(contractService.getDocumentCountByPersonMonth(year, null)),
                tree(contractService.getApprovalDurationByMonthMarket(year)),
                tree(specificationFeedbackService.getDashboard())
        );
        try {
            MrPresentationPdfRenderer.Result result = MrPresentationPdfRenderer.render(data);
            logger.info("Management reporting presentation for {}-{} rendered: {} slides, {} bytes, {} ms",
                    year, month, result.slideCount(), result.pdf().length, System.currentTimeMillis() - startedAt);
            return result;
        } catch (IOException | RuntimeException e) {
            throw new IllegalStateException("Не удалось сформировать презентацию: " + e.getMessage(), e);
        }
    }

    /** Все оценки инициаторов за год, свежие сверху. */
    private List<JsonNode> loadCsiFeedbacks(int year) {
        List<JsonNode> feedbacks = new ArrayList<>();
        for (int page = 0; page < CSI_MAX_PAGES; page++) {
            Page<CsiFeedbackDto> result = csiFeedbackService.findAll(
                    page, CSI_PAGE_SIZE, "createdAt", "desc", null, year, null, null);
            result.getContent().forEach(dto -> feedbacks.add(tree(dto)));
            if (!result.hasNext()) {
                break;
            }
        }
        return feedbacks;
    }

    private JsonNode tree(Object value) {
        return value == null ? null : objectMapper.valueToTree(value);
    }
}
