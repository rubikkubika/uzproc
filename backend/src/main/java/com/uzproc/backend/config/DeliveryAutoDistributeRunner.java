package com.uzproc.backend.config;

import com.uzproc.backend.service.delivery.DeliveryService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;

/**
 * Разовая синхронизация и авто-распределение оплат при запуске приложения.
 * Сначала привязывает к поставкам оплаты их договоров, появившиеся после создания поставок
 * (оплаты грузятся из Excel с порядком 300 — позже handreport-поставок с порядком 150),
 * затем проставляет типы (Аванс / По факту) только тем поставкам, где оплаты ещё не размечены;
 * уже распределённые (в т.ч. вручную) не трогает. Черновики заявок в авто-разметке не участвуют.
 * В конце — финальный пересчёт статусов всех поставок по фактическому состоянию оплат:
 * статус, посчитанный при создании поставки (150), устаревает после появления оплат и типов.
 * Выполняется после загрузки оплат из Excel (порядок 300, arrivals 350) и до авто-закрытия (450),
 * чтобы авто-закрытие видело уже привязанные оплаты, типы и актуальные статусы.
 */
@Configuration
public class DeliveryAutoDistributeRunner {

    private static final Logger logger = LoggerFactory.getLogger(DeliveryAutoDistributeRunner.class);

    @Bean
    @Order(400)
    public CommandLineRunner autoDistributeDeliveryPayments(DeliveryService deliveryService) {
        return args -> {
            try {
                int synced = deliveryService.syncContractPaymentsToDeliveries();
                logger.info("Delivery payments sync on startup completed: {} deliveries updated", synced);
                int updated = deliveryService.autoDistributeUndistributedDeliveries();
                logger.info("Delivery auto-distribute on startup completed: {} deliveries distributed", updated);
                int recalculated = deliveryService.recalculateAllDeliveryStatuses();
                logger.info("Delivery statuses recalculation on startup completed: {} deliveries updated", recalculated);
            } catch (Exception e) {
                logger.error("Delivery payments sync/auto-distribute on startup failed", e);
            }
        };
    }
}
