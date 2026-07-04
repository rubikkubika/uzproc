package com.uzproc.backend.service.tracker;

import com.uzproc.backend.dto.tracker.ProcurementTrackerDto;
import com.uzproc.backend.entity.tracker.ProcurementFavorite;
import com.uzproc.backend.repository.tracker.ProcurementFavoriteRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Избранные закупки пользователя на странице «Трекер закупок».
 * Хранит связку (userId, idPurchaseRequest); детальные модели собирает через {@link ProcurementTrackerService}.
 */
@Service
public class ProcurementFavoriteService {

    private final ProcurementFavoriteRepository favoriteRepository;
    private final ProcurementTrackerService trackerService;

    public ProcurementFavoriteService(ProcurementFavoriteRepository favoriteRepository,
                                      ProcurementTrackerService trackerService) {
        this.favoriteRepository = favoriteRepository;
        this.trackerService = trackerService;
    }

    /** Избранные закупки пользователя как полные модели трекера (свежие сверху). */
    @Transactional(readOnly = true)
    public List<ProcurementTrackerDto> listFavorites(Long userId) {
        List<Long> ids = favoriteRepository.findByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(ProcurementFavorite::getIdPurchaseRequest)
                .collect(Collectors.toList());
        return trackerService.getByIdPurchaseRequestIn(ids);
    }

    /** Номера заявок в избранном пользователя (для отметки «звёздочек» в поиске). */
    @Transactional(readOnly = true)
    public Set<Long> favoriteIds(Long userId) {
        return favoriteRepository.findByUserId(userId).stream()
                .map(ProcurementFavorite::getIdPurchaseRequest)
                .collect(Collectors.toSet());
    }

    /** Добавить закупку в избранное (идемпотентно). */
    @Transactional
    public void addFavorite(Long userId, Long idPurchaseRequest) {
        if (!favoriteRepository.existsByUserIdAndIdPurchaseRequest(userId, idPurchaseRequest)) {
            favoriteRepository.save(new ProcurementFavorite(userId, idPurchaseRequest));
        }
    }

    /** Убрать закупку из избранного (идемпотентно). */
    @Transactional
    public void removeFavorite(Long userId, Long idPurchaseRequest) {
        favoriteRepository.deleteByUserIdAndIdPurchaseRequest(userId, idPurchaseRequest);
    }
}
