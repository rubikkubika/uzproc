package com.uzproc.backend.repository.purchase;

import com.uzproc.backend.entity.purchase.PurchaseApproval;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PurchaseApprovalRepository extends JpaRepository<PurchaseApproval, Long> {
    
    /**
     * Находит все согласования для закупки по purchaseRequestId
     */
    List<PurchaseApproval> findByPurchaseRequestId(Long purchaseRequestId);
    
    /**
     * Находит согласование по purchaseRequestId, этапу и роли
     */
    Optional<PurchaseApproval> findByPurchaseRequestIdAndStageAndRole(
        Long purchaseRequestId, 
        String stage, 
        String role
    );
    
    /**
     * Находит все согласования для определенного этапа
     */
    List<PurchaseApproval> findByStage(String stage);
    
    /**
     * Находит все согласования для определенной роли
     */
    List<PurchaseApproval> findByRole(String role);
    
    /**
     * Находит все согласования для закупки по purchaseRequestId и этапу
     */
    List<PurchaseApproval> findByPurchaseRequestIdAndStage(Long purchaseRequestId, String stage);
}


