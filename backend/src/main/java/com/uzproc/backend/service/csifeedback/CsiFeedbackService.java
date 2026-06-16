package com.uzproc.backend.service.csifeedback;

import com.uzproc.backend.dto.csifeedback.CsiFeedbackCreateDto;
import com.uzproc.backend.dto.csifeedback.CsiFeedbackDto;
import com.uzproc.backend.dto.csifeedback.CsiFeedbackStatsByCfoDto;
import com.uzproc.backend.dto.csifeedback.CsiFeedbackStatsByPurchaserDto;
import com.uzproc.backend.dto.purchaserequest.PurchaseRequestInfoDto;
import com.uzproc.backend.entity.csifeedback.CsiFeedback;
import com.uzproc.backend.entity.csifeedback.CsiFeedbackInvitation;
import com.uzproc.backend.entity.purchaserequest.PurchaseRequest;
import com.uzproc.backend.entity.user.User;
import com.uzproc.backend.repository.csifeedback.CsiFeedbackRepository;
import com.uzproc.backend.repository.purchaserequest.PurchaseRequestRepository;
import com.uzproc.backend.repository.user.UserRepository;
import jakarta.persistence.criteria.Predicate;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class CsiFeedbackService {

    private static final Logger logger = LoggerFactory.getLogger(CsiFeedbackService.class);

    private final CsiFeedbackRepository csiFeedbackRepository;
    private final PurchaseRequestRepository purchaseRequestRepository;
    private final CsiFeedbackInvitationService invitationService;
    private final UserRepository userRepository;

    public CsiFeedbackService(
            CsiFeedbackRepository csiFeedbackRepository,
            PurchaseRequestRepository purchaseRequestRepository,
            CsiFeedbackInvitationService invitationService,
            UserRepository userRepository) {
        this.csiFeedbackRepository = csiFeedbackRepository;
        this.purchaseRequestRepository = purchaseRequestRepository;
        this.invitationService = invitationService;
        this.userRepository = userRepository;
    }

    @Transactional
    public CsiFeedbackDto create(CsiFeedbackCreateDto createDto) {
        logger.info("Creating CSI feedback for token: {}", createDto.getCsiToken());

        // Находим заявку по токену
        PurchaseRequest purchaseRequest = purchaseRequestRepository.findByCsiToken(createDto.getCsiToken())
                .orElseThrow(() -> new IllegalArgumentException("Заявка не найдена по CSI токену: " + createDto.getCsiToken()));

        // Проверяем, что отзыв еще не был оставлен (можно проголосовать только один раз)
        List<CsiFeedback> existingFeedbacks = csiFeedbackRepository.findByPurchaseRequestId(purchaseRequest.getId());
        if (!existingFeedbacks.isEmpty()) {
            throw new IllegalStateException("Отзыв для этой заявки уже был оставлен. Проголосовать можно только один раз.");
        }

        // Валидация обязательных рейтингов по заявке
        if (createDto.getSpeedRating() == null || createDto.getSpeedRating() <= 0) {
            throw new IllegalArgumentException("Оценка скорости проведения закупки обязательна");
        }
        if (createDto.getQualityRating() == null || createDto.getQualityRating() <= 0) {
            throw new IllegalArgumentException("Оценка качества результата обязательна");
        }
        if (createDto.getSatisfactionRating() == null || createDto.getSatisfactionRating() <= 0) {
            throw new IllegalArgumentException("Оценка работы закупщика обязательна");
        }

        // Валидация рейтинга узпрока (обязателен только если пользовались системой)
        if (Boolean.TRUE.equals(createDto.getUsedUzproc())) {
            if (createDto.getUzprocRating() == null || createDto.getUzprocRating() <= 0) {
                throw new IllegalArgumentException("Оценка узпрока обязательна, если вы пользовались системой");
            }
        }

        // Валидация диапазона рейтингов (0.5 - 5.0)
        validateRating(createDto.getSpeedRating(), "скорости проведения закупки");
        validateRating(createDto.getQualityRating(), "качества результата");
        validateRating(createDto.getSatisfactionRating(), "работы закупщика");
        if (createDto.getUzprocRating() != null && createDto.getUzprocRating() > 0) {
            validateRating(createDto.getUzprocRating(), "узпрока");
        }

        // Ищем приглашение по токену и получателю (если получатель указан)
        String recipient = null;
        if (createDto.getRecipient() != null && !createDto.getRecipient().trim().isEmpty()) {
            recipient = createDto.getRecipient().trim();
        } else {
            // Если получатель не указан, пытаемся найти приглашение только по токену
            Optional<CsiFeedbackInvitation> invitationOpt = invitationService.findByToken(createDto.getCsiToken());
            if (invitationOpt.isPresent()) {
                recipient = invitationOpt.get().getRecipient();
            }
        }

        // Создаем новую обратную связь
        CsiFeedback feedback = new CsiFeedback(purchaseRequest);
        feedback.setUsedUzproc(createDto.getUsedUzproc());
        feedback.setUzprocRating(createDto.getUzprocRating());
        feedback.setSpeedRating(createDto.getSpeedRating());
        feedback.setQualityRating(createDto.getQualityRating());
        feedback.setSatisfactionRating(createDto.getSatisfactionRating());
        feedback.setComment(createDto.getComment());
        feedback.setRecipient(recipient);

        CsiFeedback saved = csiFeedbackRepository.save(feedback);
        logger.info("CSI feedback created with ID: {} for purchase request ID: {}", saved.getId(), purchaseRequest.getId());

        // Связываем приглашение с обратной связью, если приглашение найдено
        if (recipient != null) {
            invitationService.findByTokenAndRecipient(createDto.getCsiToken(), recipient)
                    .ifPresent(invitation -> {
                        invitation.setCsiFeedback(saved);
                        invitationService.saveInvitation(invitation);
                        logger.info("Linked invitation ID: {} with CSI feedback ID: {}", invitation.getId(), saved.getId());
                    });
        }

        return toDto(saved);
    }

    /**
     * Получает информацию о заявке по токену для отображения формы
     */
    public PurchaseRequestInfoDto getPurchaseRequestByToken(String token) {
        PurchaseRequest purchaseRequest = purchaseRequestRepository.findByCsiToken(token)
                .orElseThrow(() -> new IllegalArgumentException("Заявка не найдена по CSI токену: " + token));

        // Проверяем, был ли уже оставлен отзыв
        List<CsiFeedback> existingFeedbacks = csiFeedbackRepository.findByPurchaseRequestId(purchaseRequest.getId());
        boolean alreadySubmitted = !existingFeedbacks.isEmpty();

        // Ищем приглашение по токену (берем первое найденное)
        String recipient = invitationService.findByToken(token)
                .map(inv -> inv.getRecipient())
                .orElse(null);

        PurchaseRequestInfoDto dto = new PurchaseRequestInfoDto();
        dto.setId(purchaseRequest.getId());
        dto.setIdPurchaseRequest(purchaseRequest.getIdPurchaseRequest());
        dto.setInnerId(purchaseRequest.getInnerId());
        // Используем purchaseRequestSubject, если пусто - name, если и оно пусто - title
        String subject = purchaseRequest.getPurchaseRequestSubject();
        if (subject == null || subject.trim().isEmpty()) {
            subject = purchaseRequest.getName();
            if (subject == null || subject.trim().isEmpty()) {
                subject = purchaseRequest.getTitle();
            }
        }
        dto.setPurchaseRequestSubject(subject);
        dto.setBudgetAmount(purchaseRequest.getBudgetAmount());
        dto.setCurrency(purchaseRequest.getCurrency());
        dto.setPurchaser(purchaseRequest.getPurchaser());
        dto.setAlreadySubmitted(alreadySubmitted);
        dto.setRecipient(recipient);
        return dto;
    }

    public Page<CsiFeedbackDto> findAll(
            int page,
            int size,
            String sortBy,
            String sortDir,
            Long purchaseRequestId,
            Integer year,
            String purchaser,
            String cfo) {

        logger.info("Finding CSI feedback - page: {}, size: {}, purchaseRequestId: {}, year: {}, purchaser: {}, cfo: {}", page, size, purchaseRequestId, year, purchaser, cfo);

        Specification<CsiFeedback> spec = buildSpecification(purchaseRequestId, year, purchaser, cfo);
        Sort sort = buildSort(sortBy, sortDir);
        Pageable pageable = PageRequest.of(page, size, sort);

        Page<CsiFeedback> feedbacks = csiFeedbackRepository.findAll(spec, pageable);

        logger.info("Found {} CSI feedback entries on page {} (size {}), total elements: {}",
                feedbacks.getContent().size(), page, size, feedbacks.getTotalElements());

        return feedbacks.map(this::toDto);
    }

    /**
     * Средние показатели оценок CSI за год (опционально по закупщику).
     */
    public Map<String, Object> getStatsByYear(int year, String purchaser, String cfo) {
        Specification<CsiFeedback> spec = buildSpecification(null, year, purchaser, cfo);
        List<CsiFeedback> all = csiFeedbackRepository.findAll(spec);
        int count = all.size();
        Map<String, Object> result = new HashMap<>();
        result.put("year", year);
        result.put("count", count);
        if (count == 0) {
            result.put("avgSpeed", null);
            result.put("avgQuality", null);
            result.put("avgSatisfaction", null);
            result.put("avgUzproc", null);
            result.put("avgOverall", null);
            return result;
        }
        double sumSpeed = 0, sumQuality = 0, sumSatisfaction = 0, sumUzproc = 0;
        int uzprocCount = 0;
        for (CsiFeedback f : all) {
            if (f.getSpeedRating() != null) sumSpeed += f.getSpeedRating();
            if (f.getQualityRating() != null) sumQuality += f.getQualityRating();
            if (f.getSatisfactionRating() != null) sumSatisfaction += f.getSatisfactionRating();
            if (f.getUzprocRating() != null) {
                sumUzproc += f.getUzprocRating();
                uzprocCount++;
            }
        }
        result.put("avgSpeed", sumSpeed / count);
        result.put("avgQuality", sumQuality / count);
        result.put("avgSatisfaction", sumSatisfaction / count);
        result.put("avgUzproc", uzprocCount > 0 ? sumUzproc / uzprocCount : null);
        int div = 0;
        double overallSum = 0;
        for (CsiFeedback f : all) {
            int n = 0;
            double s = 0;
            if (f.getSpeedRating() != null) { s += f.getSpeedRating(); n++; }
            if (f.getQualityRating() != null) { s += f.getQualityRating(); n++; }
            if (f.getSatisfactionRating() != null) { s += f.getSatisfactionRating(); n++; }
            if (f.getUzprocRating() != null) { s += f.getUzprocRating(); n++; }
            if (n > 0) {
                overallSum += s / n;
                div++;
            }
        }
        result.put("avgOverall", div > 0 ? overallSum / div : null);
        return result;
    }

    /**
     * Статистика оценок CSI по закупщикам за год (опционально только по одному закупщику).
     */
    public List<CsiFeedbackStatsByPurchaserDto> getStatsByPurchaserByYear(int year, String purchaser) {
        Specification<CsiFeedback> spec = buildSpecification(null, year, purchaser, null);
        List<CsiFeedback> all = csiFeedbackRepository.findAll(spec);
        if (all.isEmpty()) {
            return List.of();
        }
        // Группируем по закупщику (из заявки). purchaser может быть null — считаем как "—"
        Map<String, List<CsiFeedback>> byPurchaser = all.stream()
                .collect(Collectors.groupingBy(f -> {
                    String p = f.getPurchaseRequest().getPurchaser();
                    return (p != null && !p.trim().isEmpty()) ? p.trim() : "—";
                }));
        List<CsiFeedbackStatsByPurchaserDto> result = new ArrayList<>();
        for (Map.Entry<String, List<CsiFeedback>> e : byPurchaser.entrySet()) {
            List<CsiFeedback> list = e.getValue();
            int n = list.size();
            double sum = 0;
            int div = 0;
            for (CsiFeedback f : list) {
                int cnt = 0;
                double s = 0;
                if (f.getSpeedRating() != null) { s += f.getSpeedRating(); cnt++; }
                if (f.getQualityRating() != null) { s += f.getQualityRating(); cnt++; }
                if (f.getSatisfactionRating() != null) { s += f.getSatisfactionRating(); cnt++; }
                if (f.getUzprocRating() != null) { s += f.getUzprocRating(); cnt++; }
                if (cnt > 0) {
                    sum += s / cnt;
                    div++;
                }
            }
            Double avgRating = div > 0 ? sum / div : null;
            result.add(new CsiFeedbackStatsByPurchaserDto(e.getKey(), n, avgRating));
        }
        result.sort(Comparator.comparing(CsiFeedbackStatsByPurchaserDto::getPurchaser, Comparator.nullsLast(String::compareTo)));
        return result;
    }

    /**
     * Статистика оценок CSI по ЦФО за год. Отсортирована по убыванию средней оценки,
     * затем по убыванию количества оценок.
     */
    public List<CsiFeedbackStatsByCfoDto> getStatsByCfoByYear(int year, String purchaser) {
        Specification<CsiFeedback> spec = buildSpecification(null, year, purchaser, null);
        List<CsiFeedback> all = csiFeedbackRepository.findAll(spec);
        if (all.isEmpty()) {
            return List.of();
        }
        // Группируем по ЦФО (из заявки). cfo может быть null — считаем как "—"
        Map<String, List<CsiFeedback>> byCfo = all.stream()
                .collect(Collectors.groupingBy(f -> {
                    String c = f.getPurchaseRequest().getCfo() != null
                            ? f.getPurchaseRequest().getCfo().getName() : null;
                    return (c != null && !c.trim().isEmpty()) ? c.trim() : "—";
                }));
        List<CsiFeedbackStatsByCfoDto> result = new ArrayList<>();
        for (Map.Entry<String, List<CsiFeedback>> e : byCfo.entrySet()) {
            List<CsiFeedback> list = e.getValue();
            int n = list.size();
            double sum = 0;
            int div = 0;
            for (CsiFeedback f : list) {
                int cnt = 0;
                double s = 0;
                if (f.getSpeedRating() != null) { s += f.getSpeedRating(); cnt++; }
                if (f.getQualityRating() != null) { s += f.getQualityRating(); cnt++; }
                if (f.getSatisfactionRating() != null) { s += f.getSatisfactionRating(); cnt++; }
                if (f.getUzprocRating() != null) { s += f.getUzprocRating(); cnt++; }
                if (cnt > 0) {
                    sum += s / cnt;
                    div++;
                }
            }
            Double avgRating = div > 0 ? sum / div : null;
            result.add(new CsiFeedbackStatsByCfoDto(e.getKey(), n, avgRating));
        }
        // Сортировка по убыванию оценки, затем по убыванию количества
        result.sort((a, b) -> {
            double ra = a.getAvgRating() != null ? a.getAvgRating() : 0;
            double rb = b.getAvgRating() != null ? b.getAvgRating() : 0;
            if (Double.compare(rb, ra) != 0) return Double.compare(rb, ra);
            return Integer.compare(b.getCount(), a.getCount());
        });
        return result;
    }

    /**
     * KPI оценки CSI по закупщикам за конкретный месяц года (нарастающим итогом: январь–месяц).
     * Считаем средний overall rating и количество отзывов.
     */
    public List<CsiFeedbackStatsByPurchaserDto> getKpiStatsByPurchaserCumulative(int year, int month) {
        LocalDateTime startOfYear = LocalDateTime.of(year, 1, 1, 0, 0);
        // Конец указанного месяца включительно
        int safeMonth = Math.max(1, Math.min(12, month));
        java.time.LocalDate lastDayOfMonth = java.time.LocalDate.of(year, safeMonth, 1)
                .withDayOfMonth(java.time.LocalDate.of(year, safeMonth, 1).lengthOfMonth());
        LocalDateTime endOfMonth = lastDayOfMonth.atTime(23, 59, 59, 999_999_999);

        Specification<CsiFeedback> spec = (root, query, cb) -> cb.between(root.get("createdAt"), startOfYear, endOfMonth);
        List<CsiFeedback> all = csiFeedbackRepository.findAll(spec);
        if (all.isEmpty()) {
            return List.of();
        }
        Map<String, List<CsiFeedback>> byPurchaser = all.stream()
                .collect(Collectors.groupingBy(f -> {
                    String p = f.getPurchaseRequest().getPurchaser();
                    return (p != null && !p.trim().isEmpty()) ? p.trim() : "—";
                }));
        List<CsiFeedbackStatsByPurchaserDto> result = new ArrayList<>();
        for (Map.Entry<String, List<CsiFeedback>> e : byPurchaser.entrySet()) {
            List<CsiFeedback> list = e.getValue();
            int n = list.size();
            double sum = 0;
            int div = 0;
            for (CsiFeedback f : list) {
                int cnt = 0;
                double s = 0;
                if (f.getSpeedRating() != null) { s += f.getSpeedRating(); cnt++; }
                if (f.getQualityRating() != null) { s += f.getQualityRating(); cnt++; }
                if (f.getSatisfactionRating() != null) { s += f.getSatisfactionRating(); cnt++; }
                if (f.getUzprocRating() != null) { s += f.getUzprocRating(); cnt++; }
                if (cnt > 0) {
                    sum += s / cnt;
                    div++;
                }
            }
            Double avgRating = div > 0 ? sum / div : null;
            result.add(new CsiFeedbackStatsByPurchaserDto(e.getKey(), n, avgRating));
        }
        result.sort(Comparator.comparing(CsiFeedbackStatsByPurchaserDto::getPurchaser, Comparator.nullsLast(String::compareTo)));
        return result;
    }

    /**
     * Список отзывов CSI для конкретного закупщика за период (нарастающим итогом январь–месяц).
     */
    public List<CsiFeedback> getKpiDetailsForPurchaser(int year, int month, String purchaser) {
        if (purchaser == null || purchaser.isBlank()) return List.of();
        LocalDateTime startOfYear = LocalDateTime.of(year, 1, 1, 0, 0);
        int safeMonth = Math.max(1, Math.min(12, month));
        java.time.LocalDate lastDayOfMonth = java.time.LocalDate.of(year, safeMonth, 1)
                .withDayOfMonth(java.time.LocalDate.of(year, safeMonth, 1).lengthOfMonth());
        LocalDateTime endOfMonth = lastDayOfMonth.atTime(23, 59, 59, 999_999_999);
        String purchaserKey = purchaser.trim();

        Specification<CsiFeedback> spec = (root, query, cb) -> cb.and(
                cb.between(root.get("createdAt"), startOfYear, endOfMonth),
                cb.equal(root.get("purchaseRequest").get("purchaser"), purchaserKey)
        );
        List<CsiFeedback> all = csiFeedbackRepository.findAll(spec);
        all.sort((a, b) -> {
            if (a.getCreatedAt() == null && b.getCreatedAt() == null) return 0;
            if (a.getCreatedAt() == null) return 1;
            if (b.getCreatedAt() == null) return -1;
            return b.getCreatedAt().compareTo(a.getCreatedAt());
        });
        return all;
    }

    public CsiFeedbackDto findById(Long id) {
        CsiFeedback feedback = csiFeedbackRepository.findById(id)
                .orElse(null);
        if (feedback == null) {
            return null;
        }
        return toDto(feedback);
    }

    public List<CsiFeedbackDto> findByPurchaseRequestId(Long purchaseRequestId) {
        List<CsiFeedback> feedbacks = csiFeedbackRepository.findByPurchaseRequestId(purchaseRequestId);
        return feedbacks.stream()
                .map(this::toDto)
                .toList();
    }

    private Specification<CsiFeedback> buildSpecification(Long purchaseRequestId, Integer year, String purchaser, String cfo) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (purchaseRequestId != null) {
                predicates.add(cb.equal(root.get("purchaseRequest").get("id"), purchaseRequestId));
            }
            if (year != null) {
                LocalDateTime startOfYear = LocalDateTime.of(year, 1, 1, 0, 0);
                LocalDateTime endOfYear = LocalDateTime.of(year, 12, 31, 23, 59, 59, 999_999_999);
                predicates.add(cb.between(root.get("createdAt"), startOfYear, endOfYear));
            }
            if (purchaser != null && !purchaser.isBlank()) {
                predicates.add(cb.equal(root.get("purchaseRequest").get("purchaser"), purchaser.trim()));
            }
            if (cfo != null && !cfo.isBlank()) {
                predicates.add(cb.equal(root.get("purchaseRequest").get("cfo").get("name"), cfo.trim()));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    private Sort buildSort(String sortBy, String sortDir) {
        if (sortBy == null || sortBy.isEmpty()) {
            sortBy = "createdAt";
        }
        if (sortDir == null || sortDir.isEmpty()) {
            sortDir = "desc";
        }

        Sort.Direction direction = sortDir.equalsIgnoreCase("asc") ? Sort.Direction.ASC : Sort.Direction.DESC;
        return Sort.by(direction, sortBy);
    }

    private void validateRating(Double rating, String fieldName) {
        if (rating != null && (rating < 0.5 || rating > 5.0)) {
            throw new IllegalArgumentException(
                    String.format("Оценка %s должна быть от 0.5 до 5.0, получено: %s", fieldName, rating));
        }
    }

    private CsiFeedbackDto toDto(CsiFeedback feedback) {
        CsiFeedbackDto dto = new CsiFeedbackDto();
        dto.setId(feedback.getId());
        dto.setPurchaseRequestId(feedback.getPurchaseRequest().getId());
        dto.setIdPurchaseRequest(feedback.getPurchaseRequest().getIdPurchaseRequest());
        dto.setPurchaseRequestInnerId(feedback.getPurchaseRequest().getInnerId());
        // Определяем наименование заявки по тому же правилу, что и в PurchaseRequestInfoDto:
        // сначала purchaseRequestSubject, затем name, затем title
        String subject = feedback.getPurchaseRequest().getPurchaseRequestSubject();
        if (subject == null || subject.trim().isEmpty()) {
            subject = feedback.getPurchaseRequest().getName();
            if (subject == null || subject.trim().isEmpty()) {
                subject = feedback.getPurchaseRequest().getTitle();
            }
        }
        dto.setPurchaseRequestSubject(subject);
        // Закупщик из заявки
        dto.setPurchaser(feedback.getPurchaseRequest().getPurchaser());
        if (feedback.getPurchaseRequest().getCfo() != null) {
            dto.setCfo(feedback.getPurchaseRequest().getCfo().getName());
        }
        dto.setUsedUzproc(feedback.getUsedUzproc());
        dto.setUzprocRating(feedback.getUzprocRating());
        dto.setSpeedRating(feedback.getSpeedRating());
        dto.setQualityRating(feedback.getQualityRating());
        dto.setSatisfactionRating(feedback.getSatisfactionRating());
        dto.setComment(feedback.getComment());
        dto.setRecipient(feedback.getRecipient());
        // Резолвим имя получателя по email
        if (feedback.getRecipient() != null && !feedback.getRecipient().isBlank()) {
            try {
                userRepository.findFirstByEmail(feedback.getRecipient()).ifPresent(user -> {
                    String name = ((user.getSurname() != null ? user.getSurname() : "") + " " +
                            (user.getName() != null ? user.getName() : "")).trim();
                    if (!name.isEmpty()) {
                        dto.setRecipientName(name);
                    }
                });
            } catch (Exception e) {
                logger.debug("Could not resolve recipient name for email: {}", feedback.getRecipient());
            }
        }
        dto.setCreatedAt(feedback.getCreatedAt());
        dto.setUpdatedAt(feedback.getUpdatedAt());
        return dto;
    }
}
