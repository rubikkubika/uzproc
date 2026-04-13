package com.uzproc.backend.dto.contract;

import java.util.List;

/**
 * DTO ответа дашборда замечаний по договорам.
 */
public class ContractRemarksDashboardResponseDto {

    private List<ContractRemarksDashboardCategoryDto> categories;
    private int totalCount;

    public ContractRemarksDashboardResponseDto() {}

    public List<ContractRemarksDashboardCategoryDto> getCategories() { return categories; }
    public void setCategories(List<ContractRemarksDashboardCategoryDto> categories) { this.categories = categories; }

    public int getTotalCount() { return totalCount; }
    public void setTotalCount(int totalCount) { this.totalCount = totalCount; }
}
