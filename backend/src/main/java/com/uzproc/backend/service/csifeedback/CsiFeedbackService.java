package com.uzproc.backend.service.csifeedback;

import com.uzproc.backend.dto.csifeedback.CsiFeedbackCreateDto;
import com.uzproc.backend.dto.csifeedback.CsiFeedbackDto;
import com.uzproc.backend.dto.purchaserequest.PurchaseRequestInfoDto;
import com.uzproc.backend.entity.csifeedback.CsiFeedback;
import com.uzproc.backend.entity.csifeedback.CsiFeedbackInvitation;
import com.uzproc.backend.entity.purchaserequest.PurchaseRequest;
import com.uzproc.backend.repository.csifeedback.CsiFeedbackRepository;
import com.uzproc.backend.repository.purchaserequest.PurchaseRequestRepository;
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
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
@Transactional(readOnly = true)
public class CsiFeedbackService {

    private static final Logger logger = LoggerFactory.getLogger(CsiFeedbackService.class);

    private final CsiFeedbackRepository csiFeedbackRepository;
    private final PurchaseRequestRepository purchaseRequestRepository;
    private final CsiFeedbackInvitationService invitationService;

    public CsiFeedbackService(
            CsiFeedbackRepository csiFeedbackRepository,
            PurchaseRequestRepository purchaseRequestRepository,
            CsiFeedbackInvitationService invitationService) {
        this.csiFeedbackRepository = csiFeedbackRepository;
        this.purchaseRequestRepository = purchaseRequestRepository;
        this.invitationService = invitationService;
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
            Integer year) {

        logger.info("Finding CSI feedback - page: {}, size: {}, purchaseRequestId: {}, year: {}", page, size, purchaseRequestId, year);

        Specification<CsiFeedback> spec = buildSpecification(purchaseRequestId, year);
        Sort sort = buildSort(sortBy, sortDir);
        Pageable pageable = PageRequest.of(page, size, sort);

        Page<CsiFeedback> feedbacks = csiFeedbackRepository.findAll(spec, pageable);

        logger.info("Found {} CSI feedback entries on page {} (size {}), total elements: {}",
                feedbacks.getContent().size(), page, size, feedbacks.getTotalElements());

        return feedbacks.map(this::toDto);
    }

    /**
     * Средние показатели оценок CSI за год.
     */
    public Map<String, Object> getStatsByYear(int year) {
        Specification<CsiFeedback> spec = buildSpecification(null, year);
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

    private Specification<CsiFeedback> buildSpecification(Long purchaseRequestId, Integer year) {
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
        dto.setCreatedAt(feedback.getCreatedAt());
        dto.setUpdatedAt(feedback.getUpdatedAt());
        return dto;
    }
}
