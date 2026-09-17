package com.uzproc.backend.repository.delivery;

import com.uzproc.backend.entity.delivery.DeliveryComment;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface DeliveryCommentRepository extends JpaRepository<DeliveryComment, Long> {

    /** Комментарии поставки от старых к новым, с автором (без N+1). */
    @EntityGraph(attributePaths = "createdBy")
    List<DeliveryComment> findByDelivery_IdOrderByCreatedAtAscIdAsc(Long deliveryId);

    boolean existsByDelivery_IdAndText(Long deliveryId, String text);

    long countByDelivery_Id(Long deliveryId);
}
