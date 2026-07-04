package com.uzproc.backend.repository.tracker;

import com.uzproc.backend.entity.tracker.ProcurementFavorite;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

/** Репозиторий избранных закупок пользователя (трекер закупок). */
public interface ProcurementFavoriteRepository extends JpaRepository<ProcurementFavorite, Long> {

    /** Избранное пользователя, свежие сверху. */
    List<ProcurementFavorite> findByUserIdOrderByCreatedAtDesc(Long userId);

    /** Номера заявок в избранном пользователя (для отметки «звёздочек»). */
    List<ProcurementFavorite> findByUserId(Long userId);

    boolean existsByUserIdAndIdPurchaseRequest(Long userId, Long idPurchaseRequest);

    void deleteByUserIdAndIdPurchaseRequest(Long userId, Long idPurchaseRequest);
}
