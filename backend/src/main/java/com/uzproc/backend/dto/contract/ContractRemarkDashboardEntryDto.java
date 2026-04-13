package com.uzproc.backend.dto.contract;

import java.time.LocalDateTime;

/**
 * DTO для одного замечания в дашборде замечаний по договорам.
 */
public class ContractRemarkDashboardEntryDto {

    private Long contractId;
    private String contractInnerId;
    private String contractName;
    private String preparedByName;
    private String executorName;
    private String stage;
    private String role;
    private String commentText;
    private LocalDateTime createdAt;

    public ContractRemarkDashboardEntryDto() {}

    public Long getContractId() { return contractId; }
    public void setContractId(Long contractId) { this.contractId = contractId; }

    public String getContractInnerId() { return contractInnerId; }
    public void setContractInnerId(String contractInnerId) { this.contractInnerId = contractInnerId; }

    public String getContractName() { return contractName; }
    public void setContractName(String contractName) { this.contractName = contractName; }

    public String getPreparedByName() { return preparedByName; }
    public void setPreparedByName(String preparedByName) { this.preparedByName = preparedByName; }

    public String getExecutorName() { return executorName; }
    public void setExecutorName(String executorName) { this.executorName = executorName; }

    public String getStage() { return stage; }
    public void setStage(String stage) { this.stage = stage; }

    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }

    public String getCommentText() { return commentText; }
    public void setCommentText(String commentText) { this.commentText = commentText; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
