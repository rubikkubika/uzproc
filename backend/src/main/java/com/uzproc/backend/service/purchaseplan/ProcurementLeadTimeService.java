package com.uzproc.backend.service.purchaseplan;

import com.uzproc.backend.service.calendar.WorkingDayService;
import org.springframework.stereotype.Service;

import java.time.LocalDate;

/**
 * Срок процедуры закупки: сколько рабочих дней проходит от даты заявки до завершения закупки
 * (заключения нового договора). Длительность определяется уровнем сложности закупки.
 *
 * Используется и при ручном изменении даты заявки в плане, и при генерации драфта,
 * чтобы обе даты считались по одной и той же формуле.
 */
@Service
public class ProcurementLeadTimeService {

    private final WorkingDayService workingDayService;

    public ProcurementLeadTimeService(WorkingDayService workingDayService) {
        this.workingDayService = workingDayService;
    }

    /**
     * Рабочих дней на процедуру закупки по уровню сложности.
     *
     * @return null, если сложность не заполнена или не входит в диапазон 1–4
     */
    public Integer getWorkingDaysByComplexity(String complexity) {
        if (complexity == null || complexity.trim().isEmpty()) {
            return null;
        }
        try {
            int complexityNum = Integer.parseInt(complexity.trim());
            switch (complexityNum) {
                case 1: return 7;
                case 2: return 14;
                case 3: return 22;
                case 4: return 50;
                default: return null;
            }
        } catch (NumberFormatException e) {
            return null;
        }
    }

    /**
     * Дата завершения закупки: дата заявки плюс рабочие дни по сложности.
     * Отсчёт начинается со следующего календарного дня, выходные и праздники пропускаются.
     *
     * @return null, если дата заявки или сложность не заданы
     */
    public LocalDate calculateNewContractDate(LocalDate requestDate, String complexity) {
        if (requestDate == null) {
            return null;
        }
        Integer workingDays = getWorkingDaysByComplexity(complexity);
        if (workingDays == null) {
            return null;
        }
        return workingDayService.addWorkingDaysAfterDate(requestDate, workingDays);
    }
}
