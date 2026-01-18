package com.uzproc.backend.repository.purchaserequest;

import com.uzproc.backend.entity.purchaserequest.PurchaseRequestApproval;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PurchaseRequestApprovalRepository extends JpaRepository<PurchaseRequestApproval, Long> {
    
    // Найти все согласования для заявки по id_purchase_request
    List<PurchaseRequestApproval> findByIdPurchaseRequest(Long idPurchaseRequest);
    
    // Найти согласования по этапу
    List<PurchaseRequestApproval> findByIdPurchaseRequestAndStage(
        Long idPurchaseRequest, 
        String stage
    );
    
    // Найти согласования по роли
    List<PurchaseRequestApproval> findByIdPurchaseRequestAndRole(
        Long idPurchaseRequest, 
        String role
    );
    
    // Найти конкретное согласование
    Optional<PurchaseRequestApproval> findByIdPurchaseRequestAndStageAndRole(
        Long idPurchaseRequest, 
        String stage, 
        String role
    );
    
    // Удалить все согласования для заявки
    void deleteByIdPurchaseRequest(Long idPurchaseRequest);
}

