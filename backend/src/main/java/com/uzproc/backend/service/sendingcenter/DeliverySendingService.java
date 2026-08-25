package com.uzproc.backend.service.sendingcenter;

import com.uzproc.backend.dto.sendingcenter.UpcomingDeliveriesSendResultDto;
import com.uzproc.backend.entity.delivery.Delivery;
import com.uzproc.backend.entity.delivery.ShipmentStatus;
import com.uzproc.backend.repository.delivery.DeliveryRepository;
import com.uzproc.backend.service.email.EmailService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

/**
 * Отправка писем по поставкам из центра отправки.
 * Пока — тестовое письмо о предстоящих поставках: список поставок, срок которых
 * наступает в ближайшие дни и которые ещё не отмечены как «Поставлено».
 */
@Service
public class DeliverySendingService {

    private static final Logger logger = LoggerFactory.getLogger(DeliverySendingService.class);

    /** Получатель тестового письма по умолчанию. */
    public static final String DEFAULT_TEST_RECIPIENT = "a.retsko@uzum.com";

    /** Горизонт «предстоящих» поставок по умолчанию, дней. */
    public static final int DEFAULT_DAYS_AHEAD = 14;

    private final DeliveryRepository deliveryRepository;
    private final UpcomingDeliveriesEmailBuilder emailBuilder;
    private final EmailService emailService;

    public DeliverySendingService(DeliveryRepository deliveryRepository,
                                  UpcomingDeliveriesEmailBuilder emailBuilder,
                                  EmailService emailService) {
        this.deliveryRepository = deliveryRepository;
        this.emailBuilder = emailBuilder;
        this.emailService = emailService;
    }

    /** Предстоящие поставки: плановая дата от сегодня до +daysAhead, статус отгрузки не «Поставлено». */
    @Transactional(readOnly = true)
    public List<Delivery> findUpcoming(int daysAhead) {
        LocalDate from = LocalDate.now();
        LocalDate to = from.plusDays(normalizeDays(daysAhead));
        return deliveryRepository.findByDeliveryDeadlineBetweenAndShipmentStatusNotOrderByDeliveryDeadlineAsc(
                from, to, ShipmentStatus.DELIVERED);
    }

    /** Количество предстоящих поставок — для предпросмотра в центре отправки. */
    @Transactional(readOnly = true)
    public int countUpcoming(int daysAhead) {
        return findUpcoming(daysAhead).size();
    }

    /**
     * Отправляет тестовое письмо о предстоящих поставках.
     *
     * @param recipient адрес получателя; пустой — уходит на {@link #DEFAULT_TEST_RECIPIENT}
     * @param daysAhead горизонт в днях; null — {@link #DEFAULT_DAYS_AHEAD}
     */
    @Transactional(readOnly = true)
    public UpcomingDeliveriesSendResultDto sendTestUpcomingDeliveries(String recipient, Integer daysAhead) {
        int days = normalizeDays(daysAhead != null ? daysAhead : DEFAULT_DAYS_AHEAD);
        String to = (recipient != null && !recipient.trim().isEmpty())
                ? recipient.trim() : DEFAULT_TEST_RECIPIENT;

        LocalDate from = LocalDate.now();
        LocalDate until = from.plusDays(days);
        List<Delivery> deliveries = deliveryRepository
                .findByDeliveryDeadlineBetweenAndShipmentStatusNotOrderByDeliveryDeadlineAsc(
                        from, until, ShipmentStatus.DELIVERED);

        String subject = emailBuilder.buildSubject(from, until, deliveries.size());
        String content = emailBuilder.buildContent(deliveries, from, until);
        emailService.sendEmail(to, subject, emailService.wrapWithStandardTemplate(content));

        logger.info("Upcoming deliveries test email sent to {}: {} deliveries, period {}..{}",
                to, deliveries.size(), from, until);
        return new UpcomingDeliveriesSendResultDto(true, to, deliveries.size(), from, until, subject);
    }

    /** Горизонт ограничиваем разумными рамками: от 1 дня до года. */
    private int normalizeDays(int daysAhead) {
        return Math.max(1, Math.min(daysAhead, 365));
    }
}
