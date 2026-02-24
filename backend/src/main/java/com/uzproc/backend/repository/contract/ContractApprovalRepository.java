package com.uzproc.backend.repository.contract;

import com.uzproc.backend.entity.contract.ContractApproval;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ContractApprovalRepository extends JpaRepository<ContractApproval, Long> {

    @Query("SELECT a FROM ContractApproval a LEFT JOIN FETCH a.executor WHERE a.contractId = :contractId")
    List<ContractApproval> findByContractId(@Param("contractId") Long contractId);

    Optional<ContractApproval> findByContractIdAndStageAndRole(Long contractId, String stage, String role);
}
