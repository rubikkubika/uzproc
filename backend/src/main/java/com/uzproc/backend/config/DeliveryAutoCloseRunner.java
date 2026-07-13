package com.uzproc.backend.config;

import com.uzproc.backend.service.delivery.DeliveryService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;

/**
 * Стартовая проверка авто-закрытия поставок.
 * При запуске приложения помечает «Поставлено» поставки с постоплатой (POSTPAYMENT),
 * статусом оплаты «Оплачено» (PAID) и суммой оплат, равной сумме поставки.
 * Выполняется после загрузки Excel-данных (порядок > 100).
 */
@Configuration
public class DeliveryAutoCloseRunner {

    private static final Logger logger = LoggerFactory.getLogger(DeliveryAutoCloseRunner.class);

    @Bean
    @Order(200)
    public CommandLineRunner autoCloseFullyPaidDeliveries(DeliveryService deliveryService) {
        return args -> {
            try {
                int updated = deliveryService.autoCloseFullyPaidDeliveries();
                logger.info("Delivery auto-close on startup completed: {} deliveries marked DELIVERED", updated);
            } catch (Exception e) {
                logger.error("Delivery auto-close on startup failed", e);
            }
        };
    }
}
