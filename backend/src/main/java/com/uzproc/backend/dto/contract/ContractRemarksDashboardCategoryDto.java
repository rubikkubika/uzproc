package com.uzproc.backend.dto.contract;

/**
 * DTO для одной категории в дашборде замечаний по договорам.
 */
public class ContractRemarksDashboardCategoryDto {

    private String category;
    private int count;

    public ContractRemarksDashboardCategoryDto() {}

    public ContractRemarksDashboardCategoryDto(String category, int count) {
        this.category = category;
        this.count = count;
    }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public int getCount() { return count; }
    public void setCount(int count) { this.count = count; }
}
