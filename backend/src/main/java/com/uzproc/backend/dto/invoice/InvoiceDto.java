package com.uzproc.backend.dto.invoice;

import java.time.LocalDateTime;

public class InvoiceDto {

    private Long id;
    private Long contractId;
    private String data;
    private String fileUrl;
    private boolean confirmed;
    private String arrivalNumber;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public InvoiceDto() {
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getContractId() {
        return contractId;
    }

    public void setContractId(Long contractId) {
        this.contractId = contractId;
    }

    public String getData() {
        return data;
    }

    public void setData(String data) {
        this.data = data;
    }

    public String getFileUrl() {
        return fileUrl;
    }

    public void setFileUrl(String fileUrl) {
        this.fileUrl = fileUrl;
    }

    public boolean isConfirmed() {
        return confirmed;
    }

    public void setConfirmed(boolean confirmed) {
        this.confirmed = confirmed;
    }

    public String getArrivalNumber() {
        return arrivalNumber;
    }

    public void setArrivalNumber(String arrivalNumber) {
        this.arrivalNumber = arrivalNumber;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
}
