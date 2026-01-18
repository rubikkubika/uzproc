package com.uzproc.backend.repository.purchaseplan;

import com.uzproc.backend.entity.purchaseplan.PurchasePlanVersion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PurchasePlanVersionRepository extends JpaRepository<PurchasePlanVersion, Long> {
    
    List<PurchasePlanVersion> findByYearOrderByVersionNumberDesc(Integer year);
    
    Optional<PurchasePlanVersion> findByYearAndVersionNumber(Integer year, Integer versionNumber);
    
    Optional<PurchasePlanVersion> findByYearAndIsCurrentTrue(Integer year);
    
    @Query("SELECT COALESCE(MAX(v.versionNumber), 0) FROM PurchasePlanVersion v WHERE v.year = :year")
    Optional<Integer> findMaxVersionNumberByYear(@Param("year") Integer year);
}







