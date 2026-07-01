package com.uzproc.backend.service.specificationfeedback;

import com.uzproc.backend.dto.specificationfeedback.SpecificationFeedbackDashboardDto;
import com.uzproc.backend.dto.specificationfeedback.SpecificationFeedbackFormDto;
import com.uzproc.backend.dto.specificationfeedback.SpecificationFeedbackSubmitDto;
import com.uzproc.backend.entity.specificationfeedback.SpecificationFeedback;
import com.uzproc.backend.entity.specificationfeedback.SpecificationFeedbackInvitation;
import com.uzproc.backend.entity.specificationfeedback.SpecificationFeedbackItem;
import com.uzproc.backend.repository.specificationfeedback.SpecificationFeedbackInvitationRepository;
import com.uzproc.backend.repository.specificationfeedback.SpecificationFeedbackRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

/**
 * Публичный сбор и хранение оценок по спецификациям (по токену приглашения),
 * по образцу CSI-оценки на заявках.
 */
@Service
@Transactional(readOnly = true)
public class SpecificationFeedbackService {

    private final SpecificationFeedbackInvitationRepository invitationRepository;
    private final SpecificationFeedbackRepository feedbackRepository;

    public SpecificationFeedbackService(SpecificationFeedbackInvitationRepository invitationRepository,
                                        SpecificationFeedbackRepository feedbackRepository) {
        this.invitationRepository = invitationRepository;
        this.feedbackRepository = feedbackRepository;
    }

    /**
     * Сводка реальных оценок по спецификациям для управленческой отчётности:
     * средние показатели и список оценённых ЦФО (кто оценил).
     */
    public SpecificationFeedbackDashboardDto getDashboard() {
        List<SpecificationFeedback> feedbacks = feedbackRepository.findAllByOrderByUpdatedAtDesc();

        SpecificationFeedbackDashboardDto dto = new SpecificationFeedbackDashboardDto();
        List<SpecificationFeedbackDashboardDto.Item> items = new ArrayList<>();
        double sumSpeed = 0, sumBusiness = 0, sumOverall = 0;
        int nSpeed = 0, nBusiness = 0, nOverall = 0;

        for (SpecificationFeedback fb : feedbacks) {
            SpecificationFeedbackInvitation inv = fb.getInvitation();
            SpecificationFeedbackDashboardDto.Item item = new SpecificationFeedbackDashboardDto.Item();
            if (inv != null) {
                item.setCfoName(inv.getCfoName());
                item.setPeriodYear(inv.getPeriodYear());
                item.setPeriodMonth(inv.getPeriodMonth());
                item.setRatedBy(inv.getLeaderFullName());
                item.setRecipient(inv.getRecipient());
                item.setSpecificationCount(inv.getSpecificationCount());
                item.setTotalAmount(inv.getTotalAmount());
            }
            item.setSpeedRating(fb.getSpeedRating());
            item.setBusinessRating(fb.getBusinessRating());
            Double overall = average(fb.getSpeedRating(), fb.getBusinessRating());
            item.setOverall(overall);
            item.setComment(fb.getComment());
            item.setRatedAt(fb.getUpdatedAt());
            items.add(item);

            if (fb.getSpeedRating() != null) { sumSpeed += fb.getSpeedRating(); nSpeed++; }
            if (fb.getBusinessRating() != null) { sumBusiness += fb.getBusinessRating(); nBusiness++; }
            if (overall != null) { sumOverall += overall; nOverall++; }
        }

        dto.setItems(items);
        dto.setCount(feedbacks.size());
        dto.setAvgSpeed(nSpeed > 0 ? round1(sumSpeed / nSpeed) : null);
        dto.setAvgBusiness(nBusiness > 0 ? round1(sumBusiness / nBusiness) : null);
        dto.setAvgOverall(nOverall > 0 ? round1(sumOverall / nOverall) : null);
        return dto;
    }

    private Double average(Double a, Double b) {
        if (a == null && b == null) return null;
        if (a == null) return b;
        if (b == null) return a;
        return (a + b) / 2.0;
    }

    private Double round1(double v) {
        return Math.round(v * 10.0) / 10.0;
    }

    /**
     * Данные формы оценки по токену: ЦФО, месяц, снимок спецификаций и статус заполнения.
     */
    public SpecificationFeedbackFormDto getByToken(String token) {
        SpecificationFeedbackInvitation inv = invitationRepository.findByToken(token)
                .orElseThrow(() -> new IllegalArgumentException("Приглашение не найдено"));
        return toFormDto(inv);
    }

    /**
     * Сохраняет оценку по токену. Одна оценка на приглашение (ЦФО+месяц) — повторная перезаписывает.
     */
    @Transactional
    public SpecificationFeedbackFormDto submit(String token, SpecificationFeedbackSubmitDto body) {
        SpecificationFeedbackInvitation inv = invitationRepository.findByToken(token)
                .orElseThrow(() -> new IllegalArgumentException("Приглашение не найдено"));

        // Оценку можно оставить только один раз (как для заявок/CSI) — ссылка одноразовая.
        if (inv.getFeedback() != null) {
            throw new IllegalStateException(
                    "Оценка по этой ссылке уже была оставлена. Оценить можно только один раз.");
        }

        validateRating("Оценка скорости", body.getSpeedRating());
        validateRating("Оценка работы исполнителя", body.getBusinessRating());

        SpecificationFeedback feedback = new SpecificationFeedback();
        inv.setFeedback(feedback);
        feedback.setSpeedRating(body.getSpeedRating());
        feedback.setBusinessRating(body.getBusinessRating());
        feedback.setComment(body.getComment());

        invitationRepository.save(inv); // каскадно сохраняет feedback
        return toFormDto(inv);
    }

    private void validateRating(String label, Double value) {
        if (value == null) {
            throw new IllegalArgumentException(label + " обязательна");
        }
        if (value < 0.5 || value > 5.0) {
            throw new IllegalArgumentException(label + " должна быть от 0.5 до 5.0");
        }
    }

    private SpecificationFeedbackFormDto toFormDto(SpecificationFeedbackInvitation inv) {
        SpecificationFeedbackFormDto dto = new SpecificationFeedbackFormDto();
        dto.setToken(inv.getToken());
        dto.setCfoName(inv.getCfoName());
        dto.setPeriodYear(inv.getPeriodYear());
        dto.setPeriodMonth(inv.getPeriodMonth());
        dto.setSpecificationCount(inv.getSpecificationCount() != null ? inv.getSpecificationCount() : 0);
        dto.setTotalAmount(inv.getTotalAmount());

        SpecificationFeedback feedback = inv.getFeedback();
        if (feedback != null) {
            dto.setSubmitted(true);
            dto.setSpeedRating(feedback.getSpeedRating());
            dto.setBusinessRating(feedback.getBusinessRating());
            dto.setComment(feedback.getComment());
        }

        List<SpecificationFeedbackFormDto.Item> items = new ArrayList<>();
        for (SpecificationFeedbackItem src : inv.getItems()) {
            SpecificationFeedbackFormDto.Item item = new SpecificationFeedbackFormDto.Item();
            item.setContractId(src.getContractId());
            item.setInnerId(src.getInnerId());
            item.setPurchaseRequestNumber(src.getPurchaseRequestNumber());
            item.setTitle(src.getTitle());
            item.setPreparedBy(src.getPreparedBy());
            item.setBudgetAmount(src.getBudgetAmount());
            item.setCurrency(src.getCurrency());
            item.setSynchronizationDate(src.getSynchronizationDate());
            items.add(item);
        }
        dto.setItems(items);
        return dto;
    }
}
