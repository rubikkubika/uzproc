package com.uzproc.backend.service.sendingcenter;

import com.uzproc.backend.dto.sendingcenter.ComplexityErrorPreviewDto;
import com.uzproc.backend.dto.sendingcenter.ComplexityErrorLinkedPurchaseDto;
import com.uzproc.backend.dto.sendingcenter.ComplexityErrorPurchaserDto;
import com.uzproc.backend.dto.sendingcenter.ComplexityErrorRequestDto;
import com.uzproc.backend.dto.sendingcenter.ComplexityErrorSendResultDto;
import com.uzproc.backend.dto.sendingcenter.ComplexityErrorTestSendResultDto;
import com.uzproc.backend.entity.purchase.Purchase;
import com.uzproc.backend.entity.purchaserequest.PurchaseRequest;
import com.uzproc.backend.entity.purchaserequest.PurchaseRequestStatus;
import com.uzproc.backend.entity.sendingcenter.ComplexityErrorNotification;
import com.uzproc.backend.entity.user.User;
import com.uzproc.backend.repository.sendingcenter.ComplexityErrorNotificationRepository;
import com.uzproc.backend.repository.sendingcenter.ComplexityErrorRequestRepository;
import com.uzproc.backend.repository.user.UserRepository;
import com.uzproc.backend.service.email.EmailService;
import com.uzproc.backend.service.user.CurrentUserService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ThreadLocalRandom;
import java.util.stream.Collectors;

/**
 * Центр отправки → «Закупки» → «Ошибка сложности».
 * <p>
 * Заявки текущего года (по дате создания заявки {@code purchase_requests.purchase_request_creation_date}),
 * требующие закупки ({@code requires_purchase = true}), без сложности ({@code complexity} пусто),
 * со статусом — любым, кроме пустого и «Проект», группируются по закупщику заявки
 * ({@code purchase_requests.purchaser}). Закупка по заявке может быть или не быть. Закупщику уходит письмо с просьбой создать запрос
 * в поддержку 1С на установку сложности; в копии — адреса из {@code app.complexity-error.cc}.
 * Отправка только ручная; каждое письмо фиксируется в {@code complexity_error_notifications}
 * (ID заявок — в {@code request_ids}, связанных закупок — в {@code purchase_ids}).
 */
@Service
public class ComplexityErrorService {

    private static final Logger logger = LoggerFactory.getLogger(ComplexityErrorService.class);

    /** Ссылка на создание запроса в поддержку 1С (Jira Service Desk). */
    public static final String SUPPORT_REQUEST_URL = "https://jsm.uzum.com/servicedesk/customer/portal/2/create/312";

    /** Подпись группы заявок, у которых закупщик не указан. */
    private static final String UNKNOWN_PURCHASER_NAME = "Закупщик не указан";

    private final ComplexityErrorRequestRepository requestRepository;
    private final ComplexityErrorNotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final CurrentUserService currentUserService;
    private final ComplexityErrorEmailBuilder emailBuilder;
    private final EmailService emailService;

    /** База ссылок на карточки заявок и закупок (то же окружение, что и для CSI-ссылок). */
    @Value("${app.frontend.csi-link-base-url:http://10.123.48.62}")
    private String linkBaseUrl;

    /** Адрес для тестовой отправки (письмо уходит только сюда, без копии). */
    @Value("${app.complexity-error.test-recipient:a.retsko@uzum.com}")
    private String testRecipient;

    /** Префикс темы тестового письма. */
    private static final String TEST_SUBJECT_PREFIX = "[ТЕСТ] ";

    /** Адреса в копии каждого письма (Осканов, Рецко). */
    @Value("${app.complexity-error.cc:r.oskanov@uzum.com,a.retsko@uzum.com}")
    private String ccSetting;

    public ComplexityErrorService(ComplexityErrorRequestRepository requestRepository,
                                  ComplexityErrorNotificationRepository notificationRepository,
                                  UserRepository userRepository,
                                  CurrentUserService currentUserService,
                                  ComplexityErrorEmailBuilder emailBuilder,
                                  EmailService emailService) {
        this.requestRepository = requestRepository;
        this.notificationRepository = notificationRepository;
        this.userRepository = userRepository;
        this.currentUserService = currentUserService;
        this.emailBuilder = emailBuilder;
        this.emailService = emailService;
    }

    /**
     * Заявки без сложности, созданные в текущем году, у пользователей с ролью «закупщик»:
     * сгруппированы по закупщику, с отметками об отправке.
     */
    @Transactional(readOnly = true)
    public ComplexityErrorPreviewDto getPreview() {
        int year = LocalDate.now().getYear();
        List<ComplexityErrorPurchaserDto> purchasers = buildPurchasers(year);
        int requestCount = purchasers.stream().mapToInt(ComplexityErrorPurchaserDto::requestCount).sum();
        int withoutEmail = (int) purchasers.stream().filter(p -> p.email() == null).count();
        return new ComplexityErrorPreviewDto(
                year,
                requestCount,
                purchasers.size(),
                withoutEmail,
                Arrays.asList(ccAddresses()),
                SUPPORT_REQUEST_URL,
                emailBuilder.buildSubject(year),
                purchasers
        );
    }

    /**
     * Отправляет уведомления закупщикам (ручная отправка).
     *
     * @param purchaserKey ключ закупщика из предпросмотра; пусто — всем закупщикам с адресом
     */
    public ComplexityErrorSendResultDto send(String purchaserKey) {
        int year = LocalDate.now().getYear();
        List<ComplexityErrorPurchaserDto> purchasers = buildPurchasers(year);

        List<ComplexityErrorPurchaserDto> targets;
        if (notBlank(purchaserKey)) {
            String key = purchaserKey.trim();
            targets = purchasers.stream().filter(p -> key.equals(p.purchaserKey())).toList();
            if (targets.isEmpty()) {
                throw new IllegalArgumentException("У закупщика нет заявок без сложности за " + year + " год");
            }
        } else {
            targets = purchasers;
        }

        String[] cc = ccAddresses();
        String subject = emailBuilder.buildSubject(year);
        User sender = currentUserService.getCurrentUser().orElse(null);

        List<String> sentTo = new ArrayList<>();
        List<String> skipped = new ArrayList<>();
        List<String> errors = new ArrayList<>();
        int requestCount = 0;

        for (ComplexityErrorPurchaserDto purchaser : targets) {
            if (purchaser.email() == null) {
                skipped.add(purchaser.purchaserName());
                continue;
            }
            try {
                String content = emailBuilder.buildContent(
                        purchaser.purchaserKey().isEmpty() ? null : purchaser.purchaserName(),
                        year, purchaser.requests(), SUPPORT_REQUEST_URL);
                emailService.sendEmailWithCc(purchaser.email(), cc.length > 0 ? cc : null, subject,
                        emailService.wrapWithStandardTemplate(content));
                saveNotification(year, purchaser, cc, sender);
                sentTo.add(purchaser.purchaserName() + " <" + purchaser.email() + ">");
                requestCount += purchaser.requestCount();
                logger.info("Complexity error notification sent to {} ({}), cc {}: {} requests of {}",
                        purchaser.email(), purchaser.purchaserName(), String.join(", ", cc),
                        purchaser.requestCount(), year);
            } catch (RuntimeException e) {
                logger.error("Failed to send complexity error notification to {} ({})",
                        purchaser.email(), purchaser.purchaserName(), e);
                errors.add(purchaser.purchaserName() + ": " + e.getMessage());
            }
        }

        return new ComplexityErrorSendResultDto(sentTo.size(), requestCount, sentTo, skipped, errors);
    }

    /**
     * Тестовая отправка: письмо случайного закупщика из текущего списка (предпочтительно с адресом)
     * уходит только на {@code app.complexity-error.test-recipient}, без копии и без записи в журнал.
     */
    @Transactional(readOnly = true)
    public ComplexityErrorTestSendResultDto sendTest() {
        int year = LocalDate.now().getYear();
        List<ComplexityErrorPurchaserDto> purchasers = buildPurchasers(year);
        List<ComplexityErrorPurchaserDto> withEmail = purchasers.stream().filter(p -> p.email() != null).toList();
        List<ComplexityErrorPurchaserDto> pool = withEmail.isEmpty() ? purchasers : withEmail;
        if (pool.isEmpty()) {
            throw new IllegalArgumentException("Нет заявок без сложности за " + year + " год — тестовое письмо не из чего собрать");
        }
        if (!notBlank(testRecipient)) {
            throw new IllegalArgumentException("Не задан адрес тестовой отправки (app.complexity-error.test-recipient)");
        }
        ComplexityErrorPurchaserDto purchaser = pool.get(ThreadLocalRandom.current().nextInt(pool.size()));

        String to = testRecipient.trim();
        String subject = TEST_SUBJECT_PREFIX + emailBuilder.buildSubject(year);
        String content = emailBuilder.buildTestNotice(purchaser.purchaserName(), purchaser.email())
                + emailBuilder.buildContent(
                        purchaser.purchaserKey().isEmpty() ? null : purchaser.purchaserName(),
                        year, purchaser.requests(), SUPPORT_REQUEST_URL);
        emailService.sendEmailWithCc(to, null, subject, emailService.wrapWithStandardTemplate(content));
        logger.info("Complexity error TEST notification sent to {} (list of {} <{}>, {} requests)",
                to, purchaser.purchaserName(), purchaser.email(), purchaser.requestCount());

        return new ComplexityErrorTestSendResultDto(to, purchaser.purchaserName(), purchaser.email(),
                purchaser.requestCount(), subject);
    }

    /** Группы закупщиков года: заявки, адрес закупщика и последняя отправка. */
    private List<ComplexityErrorPurchaserDto> buildPurchasers(int year) {
        LocalDateTime start = LocalDate.of(year, 1, 1).atStartOfDay();
        LocalDateTime end = start.plusYears(1);
        List<PurchaseRequest> requests = requestRepository.findWithoutComplexity(start, end, PurchaseRequestStatus.PROJECT);
        Map<Long, List<Purchase>> purchasesByRequestNumber = purchasesByRequestNumber(requests);

        // Группировка по нормализованному ФИО закупщика заявки (порядок — по первой заявке)
        Map<String, List<PurchaseRequest>> byKey = new LinkedHashMap<>();
        Map<String, String> names = new HashMap<>();
        for (PurchaseRequest request : requests) {
            String rawName = purchaserName(request);
            String key = normalize(rawName);
            byKey.computeIfAbsent(key, k -> new ArrayList<>()).add(request);
            names.putIfAbsent(key, rawName);
        }

        Map<String, User> usersByName = usersByName();
        Map<String, List<ComplexityErrorNotification>> sentByKey = notificationRepository
                .findByYearOrderBySentAtDesc(year).stream()
                .collect(Collectors.groupingBy(ComplexityErrorNotification::getPurchaserKey,
                        LinkedHashMap::new, Collectors.toList()));

        List<ComplexityErrorPurchaserDto> result = new ArrayList<>();
        for (Map.Entry<String, List<PurchaseRequest>> entry : byKey.entrySet()) {
            String key = entry.getKey();
            // Уведомляем только закупщиков: заявки без закупщика и заявки, где в поле «закупщик»
            // стоит пользователь без роли «закупщик» (или его нет в справочнике), в список не попадают
            User purchaserUser = key.isEmpty() ? null : findUser(key, usersByName);
            if (purchaserUser == null || !Boolean.TRUE.equals(purchaserUser.getIsPurchaser())) {
                continue;
            }
            List<ComplexityErrorNotification> sent = sentByKey.getOrDefault(key, List.of());
            Set<Long> sentIds = sentRequestIds(sent);
            List<ComplexityErrorRequestDto> items = entry.getValue().stream()
                    .map(r -> toRequestDto(r,
                            purchasesByRequestNumber.getOrDefault(r.getIdPurchaseRequest(), List.of()),
                            sentIds.contains(r.getId())))
                    .toList();
            int notSent = (int) items.stream().filter(i -> !i.alreadySent()).count();
            ComplexityErrorNotification last = sent.isEmpty() ? null : sent.get(0);
            String displayName = key.isEmpty() ? UNKNOWN_PURCHASER_NAME : names.get(key);

            result.add(new ComplexityErrorPurchaserDto(
                    key,
                    displayName,
                    notBlank(purchaserUser.getEmail()) ? purchaserUser.getEmail().trim() : null,
                    items.size(),
                    notSent,
                    items,
                    last != null ? last.getSentAt() : null,
                    last != null ? last.getRecipientEmail() : null,
                    last != null ? last.getSentByName() : null
            ));
        }
        // Сначала закупщики с наибольшим числом заявок, «Закупщик не указан» — в конце
        result.sort(Comparator
                .comparing((ComplexityErrorPurchaserDto p) -> p.purchaserKey().isEmpty())
                .thenComparing(ComplexityErrorPurchaserDto::requestCount, Comparator.reverseOrder())
                .thenComparing(ComplexityErrorPurchaserDto::purchaserName));
        return result;
    }

    /** Связанные закупки по номеру заявки (id_purchase_request). */
    private Map<Long, List<Purchase>> purchasesByRequestNumber(List<PurchaseRequest> requests) {
        List<Long> numbers = requests.stream()
                .map(PurchaseRequest::getIdPurchaseRequest)
                .filter(java.util.Objects::nonNull)
                .distinct()
                .toList();
        if (numbers.isEmpty()) return Map.of();
        return requestRepository.findPurchasesByRequestNumbers(numbers).stream()
                .collect(Collectors.groupingBy(Purchase::getPurchaseRequestId));
    }

    private ComplexityErrorRequestDto toRequestDto(PurchaseRequest request, List<Purchase> purchases,
                                                   boolean alreadySent) {
        return new ComplexityErrorRequestDto(
                request.getId(),
                request.getInnerId(),
                request.getIdPurchaseRequest(),
                requestTitle(request),
                request.getCfo() != null ? request.getCfo().getName() : null,
                request.getStatus() != null ? request.getStatus().getDisplayName() : null,
                request.getPurchaseRequestCreationDate() != null
                        ? request.getPurchaseRequestCreationDate().toLocalDate() : null,
                link("/purchase-request/", request.getId()),
                purchases.stream()
                        .map(p -> new ComplexityErrorLinkedPurchaseDto(p.getId(), p.getInnerId(),
                                link("/purchase/", p.getId())))
                        .toList(),
                alreadySent
        );
    }

    /** Наименование заявки: name, а если не заполнено — title. */
    private String requestTitle(PurchaseRequest request) {
        if (notBlank(request.getName())) return request.getName().trim();
        if (notBlank(request.getTitle())) return request.getTitle().trim();
        return null;
    }

    /** Ссылка на карточку во фронтенде: {@code /purchase-request/{id}} или {@code /purchase/{id}} (id — PK). */
    private String link(String path, Long id) {
        String base = linkBaseUrl != null ? linkBaseUrl.replaceAll("/+$", "") : "";
        return base + path + id;
    }

    private void saveNotification(int year, ComplexityErrorPurchaserDto purchaser, String[] cc, User sender) {
        ComplexityErrorNotification notification = new ComplexityErrorNotification();
        notification.setYear(year);
        notification.setPurchaserKey(purchaser.purchaserKey());
        notification.setPurchaserName(purchaser.purchaserName());
        notification.setRecipientEmail(purchaser.email());
        notification.setCcEmails(cc.length > 0 ? String.join(",", cc) : null);
        notification.setRequestIds(purchaser.requests().stream()
                .map(r -> String.valueOf(r.id()))
                .collect(Collectors.joining(",")));
        String purchaseIds = purchaser.requests().stream()
                .flatMap(r -> r.purchases().stream())
                .map(p -> String.valueOf(p.id()))
                .collect(Collectors.joining(","));
        notification.setPurchaseIds(purchaseIds.isEmpty() ? null : purchaseIds);
        notification.setPurchaseCount(purchaser.requestCount());
        if (sender != null) {
            notification.setSentByUserId(sender.getId());
            notification.setSentByName(CurrentUserService.displayName(sender));
        }
        notificationRepository.save(notification);
    }

    /** ID заявок, уже попадавших в отправленные письма (request_ids). */
    private Set<Long> sentRequestIds(List<ComplexityErrorNotification> notifications) {
        Set<Long> ids = new HashSet<>();
        for (ComplexityErrorNotification notification : notifications) {
            if (notification.getRequestIds() == null || notification.getRequestIds().isBlank()) continue;
            for (String id : notification.getRequestIds().split(",")) {
                try {
                    ids.add(Long.parseLong(id.trim()));
                } catch (NumberFormatException ignored) {
                    // пропускаем повреждённое значение
                }
            }
        }
        return ids;
    }

    /** ФИО закупщика из заявки без должности в скобках: «Kireeva Olga (Отдел закупок, …)» → «Kireeva Olga». */
    private String purchaserName(PurchaseRequest request) {
        if (!notBlank(request.getPurchaser())) return "";
        String name = request.getPurchaser().trim();
        int bracket = name.indexOf('(');
        if (bracket >= 0) name = name.substring(0, bracket).trim();
        return name.replaceAll("\\s+", " ");
    }

    /** Ключ сравнения ФИО: нижний регистр, одинарные пробелы. */
    private String normalize(String value) {
        if (value == null) return "";
        return value.trim().replaceAll("\\s+", " ").toLowerCase(Locale.ROOT);
    }

    /**
     * Справочник пользователей по ФИО в обоих порядках («фамилия имя» и «имя фамилия»).
     * Сопоставление строгое — без частичных совпадений, чтобы письмо не ушло не тому человеку.
     */
    private Map<String, User> usersByName() {
        Map<String, User> map = new HashMap<>();
        for (User user : userRepository.findAll()) {
            if (!notBlank(user.getSurname()) || !notBlank(user.getName())) continue;
            map.putIfAbsent(normalize(user.getSurname() + " " + user.getName()), user);
            map.putIfAbsent(normalize(user.getName() + " " + user.getSurname()), user);
        }
        return map;
    }

    /** Пользователь-закупщик заявки: по полному ФИО, затем по первым двум словам (без отчества). */
    private User findUser(String key, Map<String, User> usersByName) {
        User user = usersByName.get(key);
        if (user == null) {
            String[] parts = key.split(" ");
            if (parts.length > 2) user = usersByName.get(parts[0] + " " + parts[1]);
        }
        return user;
    }

    /** Адреса копии из настройки: список через запятую; пустые значения отбрасываются. */
    private String[] ccAddresses() {
        if (!notBlank(ccSetting)) return new String[0];
        return Arrays.stream(ccSetting.split(","))
                .map(String::trim)
                .filter(address -> !address.isEmpty())
                .toArray(String[]::new);
    }

    private boolean notBlank(String value) {
        return value != null && !value.trim().isEmpty();
    }
}
