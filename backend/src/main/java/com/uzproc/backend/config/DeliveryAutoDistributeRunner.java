package com.uzproc.backend.config;

import com.uzproc.backend.service.delivery.DeliveryService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;

/**
 * Разовое авто-распределение оплат при запуске приложения.
 * Проставляет типы (Аванс / По факту) только тем поставкам, где оплаты ещё не размечены;
 * уже распределённые (в т.ч. вручную) не трогает. Черновики заявок в авто-разметке не участвуют.
 * Выполняется после загрузки Excel-данных (порядок > 100) и до авто-закрытия (200),
 * чтобы авто-закрытие видело уже проставленные типы.
 */
@Configuration
public class DeliveryAutoDistributeRunner {

    private static final Logger logger = LoggerFactory.getLogger(DeliveryAutoDistributeRunner.class);

    @Bean
    @Order(150)
    public CommandLineRunner autoDistributeDeliveryPayments(DeliveryService deliveryService) {
        return args -> {
            try {
                int updated = deliveryService.autoDistributeUndistributedDeliveries();
                logger.info("Delivery auto-distribute on startup completed: {} deliveries distributed", updated);
            } catch (Exception e) {
                logger.error("Delivery auto-distribute on startup failed", e);
            }
        };
    }
}
