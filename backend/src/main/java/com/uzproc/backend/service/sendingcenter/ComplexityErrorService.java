package com.uzproc.backend.service.sendingcenter;

import com.uzproc.backend.dto.sendingcenter.ComplexityErrorPreviewDto;
import com.uzproc.backend.dto.sendingcenter.ComplexityErrorPurchaseDto;
import com.uzproc.backend.dto.sendingcenter.ComplexityErrorPurchaserDto;
import com.uzproc.backend.dto.sendingcenter.ComplexityErrorSendResultDto;
import com.uzproc.backend.entity.Cfo;
import com.uzproc.backend.entity.purchase.Purchase;
import com.uzproc.backend.entity.purchaserequest.PurchaseRequest;
import com.uzproc.backend.entity.sendingcenter.ComplexityErrorNotification;
import com.uzproc.backend.entity.user.User;
import com.uzproc.backend.repository.sendingcenter.ComplexityErrorNotificationRepository;
import com.uzproc.backend.repository.sendingcenter.ComplexityErrorPurchaseRepository;
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
import java.util.stream.Collectors;

/**
 * Центр отправки → «Закупки» → «Ошибка сложности».
 * <p>
 * Закупки текущего года (по дате создания закупки {@code purchases.purchase_creation_date}), у заявки
 * которых не заполнена сложность ({@code purchase_requests.complexity}), группируются по закупщику
 * заявки ({@code purchase_requests.purchaser}). Закупщику уходит письмо с просьбой создать запрос
 * в поддержку 1С на установку сложности; в копии — адреса из {@code app.complexity-error.cc}.
 * Отправка только ручная; каждое письмо фиксируется в {@code complexity_error_notifications}.
 */
@Service
public class ComplexityErrorService {

    private static final Logger logger = LoggerFactory.getLogger(ComplexityErrorService.class);

    /** Ссылка на создание запроса в поддержку 1С (Jira Service Desk). */
    public static final String SUPPORT_REQUEST_URL = "https://jsm.uzum.com/servicedesk/customer/portal/2/create/312";

    /** Подпись группы закупок, у заявки которых закупщик не указан (или заявки нет). */
    private static final String UNKNOWN_PURCHASER_NAME = "Закупщик не указан";

    private final ComplexityErrorPurchaseRepository purchaseRepository;
    private final ComplexityErrorNotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final CurrentUserService currentUserService;
    private final ComplexityErrorEmailBuilder emailBuilder;
    private final EmailService emailService;

    /** База ссылок на карточки закупок (то же окружение, что и для CSI-ссылок). */
    @Value("${app.frontend.csi-link-base-url:http://10.123.48.62}")
    private String linkBaseUrl;

    /** Адреса в копии каждого письма (Осканов, Рецко). */
    @Value("${app.complexity-error.cc:r.oskanov@uzum.com,a.retsko@uzum.com}")
    private String ccSetting;

    public ComplexityErrorService(ComplexityErrorPurchaseRepository purchaseRepository,
                                  ComplexityErrorNotificationRepository notificationRepository,
                                  UserRepository userRepository,
                                  CurrentUserService currentUserService,
                                  ComplexityErrorEmailBuilder emailBuilder,
                                  EmailService emailService) {
        this.purchaseRepository = purchaseRepository;
        this.notificationRepository = notificationRepository;
        this.userRepository = userRepository;
        this.currentUserService = currentUserService;
        this.emailBuilder = emailBuilder;
        this.emailService = emailService;
    }

    /** Закупки текущего года без сложности, сгруппированные по закупщику, с отметками об отправке. */
    @Transactional(readOnly = true)
    public ComplexityErrorPreviewDto getPreview() {
        int year = LocalDate.now().getYear();
        List<ComplexityErrorPurchaserDto> purchasers = buildPurchasers(year);
        int purchaseCount = purchasers.stream().mapToInt(ComplexityErrorPurchaserDto::purchaseCount).sum();
        int withoutEmail = (int) purchasers.stream().filter(p -> p.email() == null).count();
        return new ComplexityErrorPreviewDto(
                year,
                purchaseCount,
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
                throw new IllegalArgumentException("У закупщика нет закупок без сложности за " + year + " год");
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
        int purchaseCount = 0;

        for (ComplexityErrorPurchaserDto purchaser : targets) {
            if (purchaser.email() == null) {
                skipped.add(purchaser.purchaserName());
                continue;
            }
            try {
                String content = emailBuilder.buildContent(
                        purchaser.purchaserKey().isEmpty() ? null : purchaser.purchaserName(),
                        year, purchaser.purchases(), SUPPORT_REQUEST_URL);
                emailService.sendEmailWithCc(purchaser.email(), cc.length > 0 ? cc : null, subject,
                        emailService.wrapWithStandardTemplate(content));
                saveNotification(year, purchaser, cc, sender);
                sentTo.add(purchaser.purchaserName() + " <" + purchaser.email() + ">");
                purchaseCount += purchaser.purchaseCount();
                logger.info("Complexity error notification sent to {} ({}), cc {}: {} purchases of {}",
                        purchaser.email(), purchaser.purchaserName(), String.join(", ", cc),
                        purchaser.purchaseCount(), year);
            } catch (RuntimeException e) {
                logger.error("Failed to send complexity error notification to {} ({})",
                        purchaser.email(), purchaser.purchaserName(), e);
                errors.add(purchaser.purchaserName() + ": " + e.getMessage());
            }
        }

        return new ComplexityErrorSendResultDto(sentTo.size(), purchaseCount, sentTo, skipped, errors);
    }

    /** Группы закупщиков года: закупки, адрес закупщика и последняя отправка. */
    private List<ComplexityErrorPurchaserDto> buildPurchasers(int year) {
        LocalDateTime start = LocalDate.of(year, 1, 1).atStartOfDay();
        LocalDateTime end = start.plusYears(1);
        List<Purchase> purchases = purchaseRepository.findWithoutComplexity(start, end);

        // Группировка по нормализованному ФИО закупщика заявки (порядок — по первой закупке)
        Map<String, List<Purchase>> byKey = new LinkedHashMap<>();
        Map<String, String> names = new HashMap<>();
        for (Purchase purchase : purchases) {
            String rawName = purchaserName(purchase.getPurchaseRequest());
            String key = normalize(rawName);
            byKey.computeIfAbsent(key, k -> new ArrayList<>()).add(purchase);
            names.putIfAbsent(key, rawName);
        }

        Map<String, User> usersByName = usersByName();
        Map<String, List<ComplexityErrorNotification>> sentByKey = notificationRepository
                .findByYearOrderBySentAtDesc(year).stream()
                .collect(Collectors.groupingBy(ComplexityErrorNotification::getPurchaserKey,
                        LinkedHashMap::new, Collectors.toList()));

        List<ComplexityErrorPurchaserDto> result = new ArrayList<>();
        for (Map.Entry<String, List<Purchase>> entry : byKey.entrySet()) {
            String key = entry.getKey();
            List<ComplexityErrorNotification> sent = sentByKey.getOrDefault(key, List.of());
            Set<Long> sentIds = sentPurchaseIds(sent);
            List<ComplexityErrorPurchaseDto> items = entry.getValue().stream()
                    .map(p -> toPurchaseDto(p, sentIds.contains(p.getId())))
                    .toList();
            int notSent = (int) items.stream().filter(i -> !i.alreadySent()).count();
            ComplexityErrorNotification last = sent.isEmpty() ? null : sent.get(0);
            String displayName = key.isEmpty() ? UNKNOWN_PURCHASER_NAME : names.get(key);

            result.add(new ComplexityErrorPurchaserDto(
                    key,
                    displayName,
                    key.isEmpty() ? null : findEmail(key, usersByName),
                    items.size(),
                    notSent,
                    items,
                    last != null ? last.getSentAt() : null,
                    last != null ? last.getRecipientEmail() : null,
                    last != null ? last.getSentByName() : null
            ));
        }
        // Сначала закупщики с наибольшим числом закупок, «Закупщик не указан» — в конце
        result.sort(Comparator
                .comparing((ComplexityErrorPurchaserDto p) -> p.purchaserKey().isEmpty())
                .thenComparing(ComplexityErrorPurchaserDto::purchaseCount, Comparator.reverseOrder())
                .thenComparing(ComplexityErrorPurchaserDto::purchaserName));
        return result;
    }

    private ComplexityErrorPurchaseDto toPurchaseDto(Purchase purchase, boolean alreadySent) {
        PurchaseRequest request = purchase.getPurchaseRequest();
        return new ComplexityErrorPurchaseDto(
                purchase.getId(),
                purchase.getInnerId(),
                request != null ? request.getInnerId() : null,
                purchaseTitle(purchase, request),
                cfoName(purchase, request),
                purchase.getPurchaseCreationDate() != null ? purchase.getPurchaseCreationDate().toLocalDate() : null,
                purchase.getStatus() != null ? purchase.getStatus().getDisplayName() : null,
                purchaseLink(purchase),
                alreadySent
        );
    }

    /** Наименование: закупки, а если у неё не заполнено — заявки. */
    private String purchaseTitle(Purchase purchase, PurchaseRequest request) {
        if (notBlank(purchase.getName())) return purchase.getName().trim();
        if (notBlank(purchase.getTitle())) return purchase.getTitle().trim();
        if (request != null && notBlank(request.getName())) return request.getName().trim();
        if (request != null && notBlank(request.getTitle())) return request.getTitle().trim();
        return null;
    }

    /** ЦФО закупки, а если не заполнен — ЦФО заявки. */
    private String cfoName(Purchase purchase, PurchaseRequest request) {
        Cfo cfo = purchase.getCfo() != null ? purchase.getCfo() : (request != null ? request.getCfo() : null);
        return cfo != null ? cfo.getName() : null;
    }

    private String purchaseLink(Purchase purchase) {
        String base = linkBaseUrl != null ? linkBaseUrl.replaceAll("/+$", "") : "";
        return base + "/purchase/" + purchase.getId();
    }

    private void saveNotification(int year, ComplexityErrorPurchaserDto purchaser, String[] cc, User sender) {
        ComplexityErrorNotification notification = new ComplexityErrorNotification();
        notification.setYear(year);
        notification.setPurchaserKey(purchaser.purchaserKey());
        notification.setPurchaserName(purchaser.purchaserName());
        notification.setRecipientEmail(purchaser.email());
        notification.setCcEmails(cc.length > 0 ? String.join(",", cc) : null);
        notification.setPurchaseIds(purchaser.purchases().stream()
                .map(p -> String.valueOf(p.id()))
                .collect(Collectors.joining(",")));
        notification.setPurchaseCount(purchaser.purchaseCount());
        if (sender != null) {
            notification.setSentByUserId(sender.getId());
            notification.setSentByName(CurrentUserService.displayName(sender));
        }
        notificationRepository.save(notification);
    }

    /** ID закупок, уже попадавших в отправленные письма. */
    private Set<Long> sentPurchaseIds(List<ComplexityErrorNotification> notifications) {
        Set<Long> ids = new HashSet<>();
        for (ComplexityErrorNotification notification : notifications) {
            if (notification.getPurchaseIds() == null) continue;
            for (String id : notification.getPurchaseIds().split(",")) {
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
        if (request == null || !notBlank(request.getPurchaser())) return "";
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
     * Справочник пользователей с адресом по ФИО в обоих порядках («фамилия имя» и «имя фамилия»).
     * Сопоставление строгое — без частичных совпадений, чтобы письмо не ушло не тому человеку.
     */
    private Map<String, User> usersByName() {
        Map<String, User> map = new HashMap<>();
        for (User user : userRepository.findAll()) {
            if (!notBlank(user.getEmail()) || !notBlank(user.getSurname()) || !notBlank(user.getName())) continue;
            map.putIfAbsent(normalize(user.getSurname() + " " + user.getName()), user);
            map.putIfAbsent(normalize(user.getName() + " " + user.getSurname()), user);
        }
        return map;
    }

    /** Адрес закупщика: по полному ФИО, затем по первым двум словам (без отчества). */
    private String findEmail(String key, Map<String, User> usersByName) {
        User user = usersByName.get(key);
        if (user == null) {
            String[] parts = key.split(" ");
            if (parts.length > 2) user = usersByName.get(parts[0] + " " + parts[1]);
        }
        return user != null ? user.getEmail().trim() : null;
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
