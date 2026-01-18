package com.uzproc.backend.repository.purchaseplan;

import com.uzproc.backend.entity.purchaseplan.PurchasePlanItemVersion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PurchasePlanItemVersionRepository extends JpaRepository<PurchasePlanItemVersion, Long> {
    List<PurchasePlanItemVersion> findByVersionId(Long versionId);
}







