package com.uzproc.backend.config;

import com.uzproc.backend.service.delivery.DeliveryService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;

/**
 * Стартовая сверка поставок с подписанными спецификациями.
 * Сначала удаляет поставки по договорам не-маркета (поставки ведутся только по спецификациям Uzum Market),
 * затем досоздаёт поставки для спецификаций договорников со статусом «Подписан», у которых поставки нет.
 * Нужна дополнительно к авто-созданию при смене статуса (ContractStatusUpdateService):
 * статус «Подписан» может быть проставлен сразу при парсинге Excel, без смены статуса,
 * а также так подхватываются спецификации, подписанные до появления авто-создания.
 * Выполняется после обновления статусов договоров (порядок 1000), чтобы видеть актуальные статусы.
 * Затем — бэкфилл «Даты» поставки (дата регистрации договора, иначе синхронизации) для поставок,
 * созданных до того, как дата начала заполняться при создании: по ней работает фильтр по годам.
 * В конце — авто-закрытие: ранер на 450 отработал раньше и новых поставок не видел.
 */
@Configuration
public class DeliverySignedSpecificationRunner {

    private static final Logger logger = LoggerFactory.getLogger(DeliverySignedSpecificationRunner.class);

    @Bean
    @Order(1100)
    public CommandLineRunner createDeliveriesForSignedSpecifications(DeliveryService deliveryService) {
        return args -> {
            try {
                int removed = deliveryService.removeNonMarketDeliveries();
                logger.info("Non-market deliveries cleanup on startup completed: {} deliveries removed", removed);
                int created = deliveryService.createMissingDeliveriesForSignedSpecifications();
                logger.info("Signed specifications sync on startup completed: {} deliveries created", created);
                int schemesPicked = deliveryService.applyMissingPaymentSchemes();
                logger.info("Payment scheme auto-pick on startup completed: {} deliveries updated", schemesPicked);
                int datesFilled = deliveryService.backfillDeliveryDates();
                logger.info("Delivery dates backfill on startup completed: {} deliveries updated", datesFilled);
                if (created > 0) {
                    int closed = deliveryService.autoCloseFullyPaidDeliveries();
                    logger.info("Auto-close after signed specifications sync: {} deliveries marked DELIVERED", closed);
                }
            } catch (Exception e) {
                logger.error("Signed specifications sync on startup failed", e);
            }
        };
    }
}
