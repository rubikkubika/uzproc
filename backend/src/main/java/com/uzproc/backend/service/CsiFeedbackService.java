package com.uzproc.backend.service;

import com.uzproc.backend.dto.CsiFeedbackCreateDto;
import com.uzproc.backend.dto.CsiFeedbackDto;
import com.uzproc.backend.dto.PurchaseRequestInfoDto;
import com.uzproc.backend.entity.CsiFeedback;
import com.uzproc.backend.entity.PurchaseRequest;
import com.uzproc.backend.repository.CsiFeedbackRepository;
import com.uzproc.backend.repository.PurchaseRequestRepository;
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

import java.util.ArrayList;
import java.util.List;

@Service
@Transactional(readOnly = true)
public class CsiFeedbackService {

    private static final Logger logger = LoggerFactory.getLogger(CsiFeedbackService.class);

    private final CsiFeedbackRepository csiFeedbackRepository;
    private final PurchaseRequestRepository purchaseRequestRepository;

    public CsiFeedbackService(
            CsiFeedbackRepository csiFeedbackRepository,
            PurchaseRequestRepository purchaseRequestRepository) {
        this.csiFeedbackRepository = csiFeedbackRepository;
        this.purchaseRequestRepository = purchaseRequestRepository;
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

        // Создаем новую обратную связь
        CsiFeedback feedback = new CsiFeedback(purchaseRequest);
        feedback.setUsedUzproc(createDto.getUsedUzproc());
        feedback.setUzprocRating(createDto.getUzprocRating());
        feedback.setSpeedRating(createDto.getSpeedRating());
        feedback.setQualityRating(createDto.getQualityRating());
        feedback.setSatisfactionRating(createDto.getSatisfactionRating());
        feedback.setComment(createDto.getComment());

        CsiFeedback saved = csiFeedbackRepository.save(feedback);
        logger.info("CSI feedback created with ID: {} for purchase request ID: {}", saved.getId(), purchaseRequest.getId());

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
        return dto;
    }

    public Page<CsiFeedbackDto> findAll(
            int page,
            int size,
            String sortBy,
            String sortDir,
            Long purchaseRequestId) {

        logger.info("Finding CSI feedback - page: {}, size: {}, purchaseRequestId: {}", page, size, purchaseRequestId);

        Specification<CsiFeedback> spec = buildSpecification(purchaseRequestId);
        Sort sort = buildSort(sortBy, sortDir);
        Pageable pageable = PageRequest.of(page, size, sort);

        Page<CsiFeedback> feedbacks = csiFeedbackRepository.findAll(spec, pageable);

        logger.info("Found {} CSI feedback entries on page {} (size {}), total elements: {}",
                feedbacks.getContent().size(), page, size, feedbacks.getTotalElements());

        return feedbacks.map(this::toDto);
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

    private Specification<CsiFeedback> buildSpecification(Long purchaseRequestId) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (purchaseRequestId != null) {
                predicates.add(cb.equal(root.get("purchaseRequest").get("id"), purchaseRequestId));
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
        dto.setPurchaseRequestInnerId(feedback.getPurchaseRequest().getInnerId());
        dto.setUsedUzproc(feedback.getUsedUzproc());
        dto.setUzprocRating(feedback.getUzprocRating());
        dto.setSpeedRating(feedback.getSpeedRating());
        dto.setQualityRating(feedback.getQualityRating());
        dto.setSatisfactionRating(feedback.getSatisfactionRating());
        dto.setComment(feedback.getComment());
        dto.setCreatedAt(feedback.getCreatedAt());
        dto.setUpdatedAt(feedback.getUpdatedAt());
        return dto;
    }
}
