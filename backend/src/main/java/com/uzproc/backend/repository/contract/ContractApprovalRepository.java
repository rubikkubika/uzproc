package com.uzproc.backend.repository.contract;

import com.uzproc.backend.entity.contract.ContractApproval;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ContractApprovalRepository extends JpaRepository<ContractApproval, Long> {

    List<ContractApproval> findByContractId(Long contractId);

    Optional<ContractApproval> findByContractIdAndStageAndRole(Long contractId, String stage, String role);
}
