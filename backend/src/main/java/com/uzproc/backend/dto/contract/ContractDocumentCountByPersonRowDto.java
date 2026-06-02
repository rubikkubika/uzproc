package com.uzproc.backend.dto.contract;

import java.util.ArrayList;
import java.util.List;

/**
 * Строка дашборда «Кол-во документов» по договорам:
 * договорник × 12 месяцев года (контрактная дата создания).
 */
public class ContractDocumentCountByPersonRowDto {
    private String preparedByName;
    private List<Long> monthlyCounts;
    private long total;

    public ContractDocumentCountByPersonRowDto() {
        this.monthlyCounts = new ArrayList<>();
        for (int i = 0; i < 12; i++) this.monthlyCounts.add(0L);
    }

    public ContractDocumentCountByPersonRowDto(String preparedByName) {
        this();
        this.preparedByName = preparedByName;
    }

    public String getPreparedByName() { return preparedByName; }
    public void setPreparedByName(String preparedByName) { this.preparedByName = preparedByName; }

    public List<Long> getMonthlyCounts() { return monthlyCounts; }
    public void setMonthlyCounts(List<Long> monthlyCounts) { this.monthlyCounts = monthlyCounts; }

    public long getTotal() { return total; }
    public void setTotal(long total) { this.total = total; }
}
