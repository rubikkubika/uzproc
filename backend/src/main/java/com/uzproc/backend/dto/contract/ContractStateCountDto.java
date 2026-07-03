package com.uzproc.backend.dto.contract;

/**
 * Состояние договора (поле «Состояние») и количество договоров с этим состоянием.
 * Используется для списка состояний договоров из вкладки «В работе» на дашборде.
 */
public class ContractStateCountDto {

    private String state;
    private String status;
    private long count;

    public ContractStateCountDto() {
    }

    public ContractStateCountDto(String state, String status, long count) {
        this.state = state;
        this.status = status;
        this.count = count;
    }

    public String getState() {
        return state;
    }

    public void setState(String state) {
        this.state = state;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public long getCount() {
        return count;
    }

    public void setCount(long count) {
        this.count = count;
    }
}
