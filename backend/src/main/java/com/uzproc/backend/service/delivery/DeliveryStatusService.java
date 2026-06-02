package com.uzproc.backend.service.delivery;

import com.uzproc.backend.dto.delivery.DeliveryStatusDto;
import com.uzproc.backend.dto.delivery.DeliveryDto;
import com.uzproc.backend.entity.delivery.Delivery;
import com.uzproc.backend.entity.delivery.DeliveryStatus;
import com.uzproc.backend.repository.delivery.DeliveryRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Сервис управления статусами поставок: список доступных значений + смена статуса конкретной поставки.
 */
@Service
@Transactional(readOnly = true)
public class DeliveryStatusService {

    private static final Logger logger = LoggerFactory.getLogger(DeliveryStatusService.class);

    private final DeliveryRepository deliveryRepository;
    private final DeliveryService deliveryService;

    public DeliveryStatusService(DeliveryRepository deliveryRepository, DeliveryService deliveryService) {
        this.deliveryRepository = deliveryRepository;
        this.deliveryService = deliveryService;
    }

    /** Список всех вариантов статуса поставки (для селектора на фронте). */
    public List<DeliveryStatusDto> getAvailableStatuses() {
        return Arrays.stream(DeliveryStatus.values())
                .map(s -> new DeliveryStatusDto(s.name(), s.getDisplayName(), s.getColor()))
                .collect(Collectors.toList());
    }

    /** Inline-смена статуса поставки. Принимает name() или displayName, либо null (сброс). */
    @Transactional
    public DeliveryDto updateStatus(Long deliveryId, String value) {
        Delivery delivery = deliveryRepository.findById(deliveryId)
                .orElseThrow(() -> new IllegalArgumentException("Поставка не найдена: id=" + deliveryId));
        if (value == null || value.trim().isEmpty()) {
            delivery.setStatus(null);
        } else {
            DeliveryStatus status = DeliveryStatus.fromDisplayName(value);
            if (status == null) {
                throw new IllegalArgumentException("Некорректный статус: " + value);
            }
            delivery.setStatus(status);
        }
        Delivery saved = deliveryRepository.save(delivery);
        logger.info("Updated delivery id={} status={}", saved.getId(), saved.getStatus());
        return deliveryService.toDto(saved);
    }
}
