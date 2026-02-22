package com.uzproc.backend.entity.contract;

import com.uzproc.backend.entity.Cfo;
import com.uzproc.backend.entity.user.User;
import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "contract_approvals",
       uniqueConstraints = {
           @UniqueConstraint(
               columnNames = {"contract_id", "stage", "role"},
               name = "unique_contract_approval_per_contract_stage_role"
           )
       })
public class ContractApproval {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "contract_id", nullable = false)
    private Long contractId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "contract_id", referencedColumnName = "id", insertable = false, updatable = false)
    private Contract contract;

    @Column(name = "guid")
    private UUID guid;

    @Column(name = "cfo_id")
    private Long cfoId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cfo_id", insertable = false, updatable = false)
    private Cfo cfo;

    @Column(name = "document_form", length = 255)
    private String documentForm;

    @Column(name = "stage", nullable = false, length = 255)
    private String stage;

    @Column(name = "role", nullable = false, length = 255)
    private String role;

    @Column(name = "executor_id")
    private Long executorId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "executor_id", insertable = false, updatable = false)
    private User executor;

    @Column(name = "assignment_date")
    private LocalDateTime assignmentDate;

    @Column(name = "planned_completion_date")
    private LocalDateTime plannedCompletionDate;

    @Column(name = "completion_date")
    private LocalDateTime completionDate;

    @Column(name = "completion_result", length = 1000)
    private String completionResult;

    @Column(name = "comment_text", length = 2000)
    private String commentText;

    @Column(name = "is_waiting")
    private Boolean isWaiting;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public ContractApproval() {
    }

    public ContractApproval(Long contractId, String stage, String role) {
        this.contractId = contractId;
        this.stage = stage;
        this.role = role;
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getContractId() { return contractId; }
    public void setContractId(Long contractId) { this.contractId = contractId; }

    public Contract getContract() { return contract; }
    public void setContract(Contract contract) {
        this.contract = contract;
        if (contract != null && contract.getId() != null) {
            this.contractId = contract.getId();
        }
    }

    public UUID getGuid() { return guid; }
    public void setGuid(UUID guid) { this.guid = guid; }

    public Long getCfoId() { return cfoId; }
    public void setCfoId(Long cfoId) { this.cfoId = cfoId; }

    public Cfo getCfo() { return cfo; }
    public void setCfo(Cfo cfo) {
        this.cfo = cfo;
        this.cfoId = cfo != null ? cfo.getId() : null;
    }

    public String getDocumentForm() { return documentForm; }
    public void setDocumentForm(String documentForm) { this.documentForm = documentForm; }

    public String getStage() { return stage; }
    public void setStage(String stage) { this.stage = stage; }

    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }

    public Long getExecutorId() { return executorId; }
    public void setExecutorId(Long executorId) { this.executorId = executorId; }

    public User getExecutor() { return executor; }
    public void setExecutor(User executor) {
        this.executor = executor;
        this.executorId = executor != null ? executor.getId() : null;
    }

    public LocalDateTime getAssignmentDate() { return assignmentDate; }
    public void setAssignmentDate(LocalDateTime assignmentDate) { this.assignmentDate = assignmentDate; }

    public LocalDateTime getPlannedCompletionDate() { return plannedCompletionDate; }
    public void setPlannedCompletionDate(LocalDateTime plannedCompletionDate) { this.plannedCompletionDate = plannedCompletionDate; }

    public LocalDateTime getCompletionDate() { return completionDate; }
    public void setCompletionDate(LocalDateTime completionDate) { this.completionDate = completionDate; }

    public String getCompletionResult() { return completionResult; }
    public void setCompletionResult(String completionResult) { this.completionResult = completionResult; }

    public String getCommentText() { return commentText; }
    public void setCommentText(String commentText) { this.commentText = commentText; }

    public Boolean getIsWaiting() { return isWaiting; }
    public void setIsWaiting(Boolean waiting) { isWaiting = waiting; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
