package com.uzproc.backend.repository.contract;

import com.uzproc.backend.entity.contract.Contract;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ContractRepository extends JpaRepository<Contract, Long>, JpaSpecificationExecutor<Contract> {
    Optional<Contract> findByGuid(UUID guid);
    boolean existsByGuid(UUID guid);
    Optional<Contract> findByInnerId(String innerId);
    boolean existsByInnerId(String innerId);
    List<Contract> findByPurchaseRequestId(Long purchaseRequestId);
    Optional<Contract> findByName(String name);
    List<Contract> findByParentContractId(Long parentContractId);

    @Query("SELECT DISTINCT EXTRACT(YEAR FROM c.contractCreationDate) FROM Contract c WHERE c.contractCreationDate IS NOT NULL ORDER BY EXTRACT(YEAR FROM c.contractCreationDate) DESC")
    List<Integer> findDistinctYears();
}

