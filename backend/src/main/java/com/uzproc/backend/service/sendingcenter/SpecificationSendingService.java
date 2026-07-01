package com.uzproc.backend.service.sendingcenter;

import com.uzproc.backend.dto.sendingcenter.CfoSpecificationSendingDto;
import com.uzproc.backend.entity.cfo.CfoLeader;
import com.uzproc.backend.entity.sendingcenter.SpecificationSendingRecipient;
import com.uzproc.backend.entity.specificationfeedback.SpecificationFeedbackInvitation;
import com.uzproc.backend.entity.specificationfeedback.SpecificationFeedbackItem;
import com.uzproc.backend.entity.user.User;
import com.uzproc.backend.repository.cfo.CfoLeaderRepository;
import com.uzproc.backend.repository.sendingcenter.SpecificationSendingRecipientRepository;
import com.uzproc.backend.repository.sendingcenter.SpecificationSendingRepository;
import com.uzproc.backend.repository.specificationfeedback.SpecificationFeedbackInvitationRepository;
import com.uzproc.backend.repository.user.UserRepository;
import com.uzproc.backend.service.email.EmailService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Центр отправки — вкладка «Спецификации».
 * Формирует список ЦФО с подписанными спецификациями за месяц (по дате синхронизации),
 * создаёт приглашение на оценку (снимок спецификаций) и отправляет письмо руководителю ЦФО.
 */
@Service
@Transactional(readOnly = true)
public class SpecificationSendingService {

    private static final Logger log = LoggerFactory.getLogger(SpecificationSendingService.class);

    private final SpecificationSendingRepository specificationSendingRepository;
    private final CfoLeaderRepository cfoLeaderRepository;
    private final SpecificationFeedbackInvitationRepository invitationRepository;
    private final SpecificationSendingRecipientRepository recipientRepository;
    private final UserRepository userRepository;
    private final SpecificationFeedbackEmailBuilder emailBuilder;
    private final EmailService emailService;

    /** База публичной ссылки на форму оценки (то же окружение, что и для CSI-оценки заявок). */
    @Value("${app.frontend.csi-link-base-url:http://10.123.48.62}")
    private String feedbackBaseUrl;

    /** Адреса в копии письма оценки (Рецко, Киреева, Осканов). */
    @Value("${app.spec-feedback.cc:a.retsko@uzum.com,o.kireeva@uzum.com,r.oskanov@uzum.com}")
    private String feedbackCc;

    public SpecificationSendingService(SpecificationSendingRepository specificationSendingRepository,
                                       CfoLeaderRepository cfoLeaderRepository,
                                       SpecificationFeedbackInvitationRepository invitationRepository,
                                       SpecificationSendingRecipientRepository recipientRepository,
                                       UserRepository userRepository,
                                       SpecificationFeedbackEmailBuilder emailBuilder,
                                       EmailService emailService) {
        this.specificationSendingRepository = specificationSendingRepository;
        this.cfoLeaderRepository = cfoLeaderRepository;
        this.invitationRepository = invitationRepository;
        this.recipientRepository = recipientRepository;
        this.userRepository = userRepository;
        this.emailBuilder = emailBuilder;
        this.emailService = emailService;
    }

    /**
     * Назначает получателя письма для ЦФО (переопределяет руководителя ЦФО).
     */
    @Transactional
    public void setRecipient(String cfoName, Long userId) {
        if (cfoName == null || cfoName.trim().isEmpty()) {
            throw new IllegalArgumentException("Не указан ЦФО");
        }
        if (userId == null) {
            throw new IllegalArgumentException("Не указан пользователь-получатель");
        }
        String cfo = cfoName.trim();
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Пользователь не найден: " + userId));

        SpecificationSendingRecipient recipient = recipientRepository.findByCfoNameIgnoreCase(cfo)
                .orElseGet(() -> new SpecificationSendingRecipient(cfo));
        recipient.setUser(user);
        recipient.setFullName(displayName(user));
        recipient.setEmail(user.getEmail());
        recipientRepository.save(recipient);
    }

    /**
     * Сбрасывает переопределение получателя для ЦФО (возврат к руководителю ЦФО).
     */
    @Transactional
    public void resetRecipient(String cfoName) {
        if (cfoName == null || cfoName.trim().isEmpty()) {
            return;
        }
        recipientRepository.findByCfoNameIgnoreCase(cfoName.trim())
                .ifPresent(recipientRepository::delete);
    }

    private String displayName(User user) {
        String surname = user.getSurname() != null ? user.getSurname().trim() : "";
        String name = user.getName() != null ? user.getName().trim() : "";
        String full = (surname + " " + name).trim();
        return !full.isEmpty() ? full : user.getUsername();
    }

    /**
     * Список ЦФО с агрегатами подписанных спецификаций за месяц (по дате синхронизации),
     * с руководителем ЦФО и статусом приглашения (отправлено/оценено).
     */
    public List<CfoSpecificationSendingDto> getSpecificationSending(int year, int month) {
        YearMonth ym = YearMonth.of(year, month);
        LocalDateTime start = ym.atDay(1).atStartOfDay();
        LocalDateTime end = ym.plusMonths(1).atDay(1).atStartOfDay();

        List<Object[]> rows = specificationSendingRepository.aggregateByCfoForPeriod(start, end);

        // Приглашения за месяц: ключ — cfoName в нижнем регистре.
        Map<String, SpecificationFeedbackInvitation> invByCfo = new LinkedHashMap<>();
        for (SpecificationFeedbackInvitation inv : invitationRepository.findByPeriodYearAndPeriodMonth(year, month)) {
            if (inv.getCfoName() != null) {
                invByCfo.put(inv.getCfoName().trim().toLowerCase(), inv);
            }
        }

        // Переопределённые получатели: ключ — cfoName в нижнем регистре.
        Map<String, SpecificationSendingRecipient> overrideByCfo = new LinkedHashMap<>();
        for (SpecificationSendingRecipient r : recipientRepository.findAll()) {
            if (r.getCfoName() != null) {
                overrideByCfo.put(r.getCfoName().trim().toLowerCase(), r);
            }
        }

        List<CfoSpecificationSendingDto> result = new ArrayList<>();
        for (Object[] row : rows) {
            String cfoName = (String) row[0];
            long count = ((Number) row[1]).longValue();
            BigDecimal total = row[2] != null ? new BigDecimal(row[2].toString()) : BigDecimal.ZERO;

            CfoSpecificationSendingDto dto = new CfoSpecificationSendingDto(cfoName, count, total, null, null, null);
            if (cfoName != null) {
                CfoLeader leader = cfoLeaderRepository.findByCfoNameIgnoreCase(cfoName.trim()).orElse(null);
                if (leader != null) {
                    User user = leader.getUser();
                    if (user != null) {
                        dto.setLeaderUserId(user.getId());
                        dto.setLeaderFullName(leader.getLeaderFullName());
                        dto.setLeaderEmail(user.getEmail());
                    } else {
                        dto.setLeaderFullName(leader.getLeaderFullName());
                    }
                }

                // Эффективный получатель: переопределение или руководитель ЦФО по умолчанию.
                SpecificationSendingRecipient override = overrideByCfo.get(cfoName.trim().toLowerCase());
                if (override != null) {
                    dto.setRecipientOverridden(true);
                    dto.setRecipientUserId(override.getUser() != null ? override.getUser().getId() : null);
                    dto.setRecipientFullName(override.getFullName());
                    dto.setRecipientEmail(override.getEmail());
                } else {
                    dto.setRecipientOverridden(false);
                    dto.setRecipientUserId(dto.getLeaderUserId());
                    dto.setRecipientFullName(dto.getLeaderFullName());
                    dto.setRecipientEmail(dto.getLeaderEmail());
                }

                SpecificationFeedbackInvitation inv = invByCfo.get(cfoName.trim().toLowerCase());
                if (inv != null) {
                    dto.setSent(inv.getSentAt() != null);
                    dto.setRated(inv.getFeedback() != null);
                    dto.setToken(inv.getToken());
                    if (inv.getSentAt() != null) {
                        dto.setSentTo(inv.getRecipient());
                        dto.setSentAt(inv.getSentAt().toString());
                    }
                }
            }
            result.add(dto);
        }
        return result;
    }

    /**
     * Месяцы (YYYY-MM) с подписанными спецификациями по дате синхронизации и их количеством.
     */
    public List<Map<String, Object>> getAvailableMonths() {
        List<Object[]> rows = specificationSendingRepository.availableMonths();
        List<Map<String, Object>> result = new ArrayList<>();
        for (Object[] row : rows) {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("month", row[0]); // 'YYYY-MM'
            item.put("specificationCount", ((Number) row[1]).longValue());
            result.add(item);
        }
        return result;
    }

    /**
     * Отправляет спецификации ЦФО на оценку руководителю за месяц:
     * создаёт/обновляет приглашение (со снимком спецификаций), формирует письмо
     * по образцу оценки заявок и отправляет его.
     *
     * @param recipientOverride если задан — письмо уходит на этот адрес (для теста/ручной отправки),
     *                          иначе — на email руководителя ЦФО из справочника.
     */
    @Transactional
    public Map<String, Object> send(int year, int month, String cfoName, String recipientOverride) {
        if (cfoName == null || cfoName.trim().isEmpty()) {
            throw new IllegalArgumentException("Не указан ЦФО");
        }
        String cfo = cfoName.trim();

        SpecificationFeedbackInvitation invitation = buildOrUpdateInvitation(year, month, cfo);
        if (invitation.getSpecificationCount() == 0) {
            throw new IllegalArgumentException(
                    "Нет подписанных спецификаций для ЦФО «" + cfo + "» за " + year + "-" + month);
        }

        String recipient = recipientOverride != null && !recipientOverride.trim().isEmpty()
                ? recipientOverride.trim()
                : invitation.getRecipient();
        if (recipient == null || recipient.trim().isEmpty()) {
            throw new IllegalStateException(
                    "У ЦФО «" + cfo + "» не назначен руководитель с email в справочнике");
        }

        String formUrl = feedbackBaseUrl + "/specification-feedback/" + invitation.getToken();
        String subject = emailBuilder.buildSubject(invitation);
        String content = emailBuilder.buildContent(invitation, formUrl);
        String[] cc = buildCc(recipient);
        emailService.sendEmailWithCc(recipient, cc, subject, emailService.wrapWithStandardTemplate(content));

        // Фиксируем фактического получателя (в т.ч. override) и время отправки.
        invitation.setRecipient(recipient);
        invitation.setSentAt(LocalDateTime.now());
        invitationRepository.save(invitation);
        log.info("[SendingCenter] Письмо отправлено: ЦФО={}, период={}-{}, получатель={}, спецификаций={}, сумма={}",
                cfo, year, month, recipient, invitation.getSpecificationCount(), invitation.getTotalAmount());

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("sent", true);
        response.put("cfoName", cfo);
        response.put("recipient", recipient);
        response.put("leaderFullName", invitation.getLeaderFullName());
        response.put("specificationCount", invitation.getSpecificationCount());
        response.put("totalAmount", invitation.getTotalAmount());
        response.put("token", invitation.getToken());
        response.put("formUrl", formUrl);
        return response;
    }

    /**
     * Создаёт (или обновляет) приглашение на оценку для связки ЦФО+месяц,
     * пересобирая снимок спецификаций и агрегаты по текущим данным.
     */
    @Transactional
    public SpecificationFeedbackInvitation buildOrUpdateInvitation(int year, int month, String cfoName) {
        String cfo = cfoName.trim();
        YearMonth ym = YearMonth.of(year, month);
        LocalDateTime start = ym.atDay(1).atStartOfDay();
        LocalDateTime end = ym.plusMonths(1).atDay(1).atStartOfDay();

        SpecificationFeedbackInvitation invitation = invitationRepository
                .findByCfoNameIgnoreCaseAndPeriodYearAndPeriodMonth(cfo, year, month)
                .orElseGet(() -> {
                    SpecificationFeedbackInvitation inv = new SpecificationFeedbackInvitation();
                    inv.setCfoName(cfo);
                    inv.setPeriodYear(year);
                    inv.setPeriodMonth(month);
                    return inv;
                });

        // Получатель по умолчанию — руководитель ЦФО; при наличии переопределения — оно.
        CfoLeader leader = cfoLeaderRepository.findByCfoNameIgnoreCase(cfo).orElse(null);
        SpecificationSendingRecipient override = recipientRepository.findByCfoNameIgnoreCase(cfo).orElse(null);
        if (override != null) {
            invitation.setLeaderFullName(override.getFullName());
            invitation.setRecipient(override.getEmail());
        } else if (leader != null) {
            User user = leader.getUser();
            invitation.setLeaderFullName(leader.getLeaderFullName());
            invitation.setRecipient(user != null ? user.getEmail() : null);
        }

        // Снимок спецификаций за период.
        List<Object[]> specRows = specificationSendingRepository
                .findSpecificationsForCfoAndPeriod(cfo, start, end);
        List<SpecificationFeedbackItem> items = new ArrayList<>();
        BigDecimal total = BigDecimal.ZERO;
        for (Object[] r : specRows) {
            SpecificationFeedbackItem item = new SpecificationFeedbackItem();
            item.setContractId(r[0] != null ? ((Number) r[0]).longValue() : null);
            item.setInnerId((String) r[1]);
            item.setTitle((String) r[2]);
            item.setPreparedBy((String) r[3]);
            BigDecimal amount = r[4] != null ? new BigDecimal(r[4].toString()) : null;
            item.setBudgetAmount(amount);
            item.setCurrency((String) r[5]);
            item.setSynchronizationDate(toLocalDateTime(r[6]));
            items.add(item);
            if (amount != null) {
                total = total.add(amount);
            }
        }
        invitation.replaceItems(items);
        invitation.setSpecificationCount(items.size());
        invitation.setTotalAmount(total);

        return invitationRepository.save(invitation);
    }

    /** Список CC из конфигурации, без пустых значений и без дубля основного получателя. */
    private String[] buildCc(String recipient) {
        if (feedbackCc == null || feedbackCc.trim().isEmpty()) {
            return new String[0];
        }
        return java.util.Arrays.stream(feedbackCc.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .filter(s -> recipient == null || !s.equalsIgnoreCase(recipient.trim()))
                .distinct()
                .toArray(String[]::new);
    }

    private LocalDateTime toLocalDateTime(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof Timestamp ts) {
            return ts.toLocalDateTime();
        }
        if (value instanceof LocalDateTime ldt) {
            return ldt;
        }
        return null;
    }
}
