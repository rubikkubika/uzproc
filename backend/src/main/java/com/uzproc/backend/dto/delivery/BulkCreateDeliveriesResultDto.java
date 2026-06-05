package com.uzproc.backend.dto.delivery;

/**
 * Результат массового создания поставок по подписанным спецификациям.
 */
public class BulkCreateDeliveriesResultDto {
    /** Сколько поставок создано. */
    private int created;
    /** Сколько спецификаций пропущено (поставка уже существовала). */
    private int skipped;
    /** Сколько подписанных спецификаций найдено всего за период. */
    private int totalSpecifications;

    public BulkCreateDeliveriesResultDto() {}

    public BulkCreateDeliveriesResultDto(int created, int skipped, int totalSpecifications) {
        this.created = created;
        this.skipped = skipped;
        this.totalSpecifications = totalSpecifications;
    }

    public int getCreated() { return created; }
    public void setCreated(int created) { this.created = created; }

    public int getSkipped() { return skipped; }
    public void setSkipped(int skipped) { this.skipped = skipped; }

    public int getTotalSpecifications() { return totalSpecifications; }
    public void setTotalSpecifications(int totalSpecifications) { this.totalSpecifications = totalSpecifications; }
}
