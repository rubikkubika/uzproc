package com.uzproc.backend.repository;

import com.uzproc.backend.entity.Contract;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
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
}

