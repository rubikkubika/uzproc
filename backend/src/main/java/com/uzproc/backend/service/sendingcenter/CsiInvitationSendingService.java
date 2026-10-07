package com.uzproc.backend.service.sendingcenter;

import com.uzproc.backend.dto.sendingcenter.CsiInvitationPreviewDto;
import com.uzproc.backend.dto.sendingcenter.CsiInvitationTestSendResultDto;
import com.uzproc.backend.dto.sendingcenter.CsiInvitationTextDto;
import com.uzproc.backend.entity.contract.Contract;
import com.uzproc.backend.entity.contract.ContractStatus;
import com.uzproc.backend.entity.purchaserequest.PurchaseRequest;
import com.uzproc.backend.repository.contract.ContractRepository;
import com.uzproc.backend.repository.purchaserequest.PurchaseRequestRepository;
import com.uzproc.backend.service.email.EmailService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Arrays;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;

/**
 * Центр отправки → «Закупки» → «Оценка закупки»: письмо инициатору с просьбой оценить работу закупок (CSI).
 *
 * <p>Само письмо отправляет закупщик из таблицы заявок (колонка «Оценка»); здесь — единый источник
 * текста письма (со списком подписанных договоров по закупке и датами их регистрации),
 * предпросмотр и тестовая отправка.
 */
@Service
@Transactional(readOnly = true)
public class CsiInvitationSendingService {

    private static final Logger logger = LoggerFactory.getLogger(CsiInvitationSendingService.class);

    private static final String TEST_SUBJECT_PREFIX = "[ТЕСТ] ";
    private static final String SUBJECT_PREFIX = "[uzProc] ";
    /** Сколько последних заявок с подписанными договорами просматриваем в поисках примера. */
    private static final int SAMPLE_LOOKUP_LIMIT = 50;

    private final PurchaseRequestRepository purchaseRequestRepository;
    private final ContractRepository contractRepository;
    private final CsiInvitationEmailBuilder emailBuilder;
    private final EmailService emailService;

    /** База ссылок на форму оценки (всегда сервер деплоя). */
    @Value("${app.frontend.csi-link-base-url:http://10.123.48.62}")
    private String csiLinkBaseUrl;

    /** Адреса, которые по умолчанию ставятся в копию письма помимо закупщика (Осканов, Рецко). */
    @Value("${app.csi-invitation.cc:r.oskanov@uzum.com,a.retsko@uzum.com}")
    private String defaultCc;

    /** Адрес тестовой отправки (письмо уходит только сюда, без копии). */
    @Value("${app.csi-invitation.test-recipient:a.retsko@uzum.com}")
    private String testRecipient;

    public CsiInvitationSendingService(PurchaseRequestRepository purchaseRequestRepository,
                                       ContractRepository contractRepository,
                                       CsiInvitationEmailBuilder emailBuilder,
                                       EmailService emailService) {
        this.purchaseRequestRepository = purchaseRequestRepository;
        this.contractRepository = contractRepository;
        this.emailBuilder = emailBuilder;
        this.emailService = emailService;
    }

    /** Текст письма по заявке (ID заявки в системе) — для окна отправки в таблице заявок. */
    public CsiInvitationTextDto getText(Long purchaseRequestId) {
        PurchaseRequest request = purchaseRequestRepository.findById(purchaseRequestId)
                .orElseThrow(() -> new IllegalArgumentException("Заявка не найдена: " + purchaseRequestId));
        return toTextDto(request);
    }

    /** Предпросмотр для центра отправки: письмо по последней заявке с подписанными договорами. */
    public CsiInvitationPreviewDto getPreview() {
        Optional<CsiInvitationTextDto> sample = findSampleRequest().map(this::toTextDto);
        Long sampleNumber = sample
                .flatMap(s -> purchaseRequestRepository.findById(s.purchaseRequestId()))
                .map(PurchaseRequest::getIdPurchaseRequest)
                .orElse(null);
        return new CsiInvitationPreviewDto(
                sampleNumber,
                sample.map(CsiInvitationTextDto::subject).orElse(null),
                sample.map(CsiInvitationTextDto::text).orElse(null),
                sample.map(CsiInvitationTextDto::contractCount).orElse(0),
                Arrays.asList(parseAddresses(defaultCc)),
                testRecipient != null ? testRecipient.trim() : ""
        );
    }

    /**
     * Тестовая отправка: письмо по последней заявке с подписанными договорами уходит только
     * на тестовый адрес, без копии; приглашение не создаётся и отметка «отправлено» не ставится.
     */
    public CsiInvitationTestSendResultDto sendTest() {
        if (testRecipient == null || testRecipient.isBlank()) {
            throw new IllegalArgumentException("Не задан адрес тестовой отправки (app.csi-invitation.test-recipient)");
        }
        PurchaseRequest request = findSampleRequest().orElseThrow(() -> new IllegalArgumentException(
                "Нет заявок с подписанными договорами — тестовое письмо не из чего собрать"));
        CsiInvitationTextDto text = toTextDto(request);

        String to = testRecipient.trim();
        String subject = TEST_SUBJECT_PREFIX + SUBJECT_PREFIX + text.subject();
        String note = "Тестовая отправка: письмо собрано по заявке № " + request.getIdPurchaseRequest()
                + ". Инициатору оно не отправлялось, приглашение на оценку не создано.\n\n";
        emailService.sendEmailWithCc(to, null, subject,
                emailService.wrapWithStandardTemplate(emailService.plainTextToHtml(note + text.text())));
        logger.info("CSI invitation TEST email sent to {} (request {}, {} signed contracts)",
                to, request.getIdPurchaseRequest(), text.contractCount());

        return new CsiInvitationTestSendResultDto(to, request.getIdPurchaseRequest(), text.contractCount(), subject);
    }

    private CsiInvitationTextDto toTextDto(PurchaseRequest request) {
        List<Contract> contracts = findSignedContracts(request);
        return new CsiInvitationTextDto(
                request.getId(),
                emailBuilder.buildSubject(request),
                emailBuilder.buildText(request, contracts, csiLink(request)),
                contracts.size()
        );
    }

    /** Подписанные договоры по закупке (договоры, спецификации, доп. соглашения) — по дате регистрации. */
    private List<Contract> findSignedContracts(PurchaseRequest request) {
        if (request.getIdPurchaseRequest() == null) {
            return List.of();
        }
        return contractRepository.findWithSuppliersByPurchaseRequestIdIn(List.of(request.getIdPurchaseRequest()))
                .stream()
                .filter(c -> c.getStatus() == ContractStatus.SIGNED)
                .sorted(Comparator
                        .comparing(Contract::getRegistrationDate, Comparator.nullsLast(Comparator.naturalOrder()))
                        .thenComparing(Contract::getInnerId, Comparator.nullsLast(Comparator.naturalOrder())))
                .toList();
    }

    /** Последняя заявка с подписанными договорами (по дате регистрации договора). */
    private Optional<PurchaseRequest> findSampleRequest() {
        return contractRepository
                .findPurchaseRequestIdsWithSignedContractsLatestFirst(PageRequest.of(0, SAMPLE_LOOKUP_LIMIT))
                .stream()
                .distinct()
                .map(purchaseRequestRepository::findByIdPurchaseRequest)
                .flatMap(Optional::stream)
                .filter(r -> r.getCsiToken() != null && !r.getCsiToken().isBlank())
                .findFirst();
    }

    private String csiLink(PurchaseRequest request) {
        String baseUrl = csiLinkBaseUrl != null && !csiLinkBaseUrl.isBlank()
                ? csiLinkBaseUrl.trim().replaceAll("/$", "")
                : "http://10.123.48.62";
        return baseUrl + "/csi/feedback/" + request.getCsiToken();
    }

    private static String[] parseAddresses(String raw) {
        if (raw == null || raw.isBlank()) {
            return new String[0];
        }
        return Arrays.stream(raw.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .toArray(String[]::new);
    }
}
