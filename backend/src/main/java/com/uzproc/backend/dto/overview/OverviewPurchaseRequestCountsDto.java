package com.uzproc.backend.dto.overview;

/**
 * Счётчики заявок (закупка) по категориям для обзора по месяцу.
 */
public class OverviewPurchaseRequestCountsDto {
    private int planned;
    private int nonPlanned;
    private int unapproved;
    private int excluded;

    public int getPlanned() {
        return planned;
    }

    public void setPlanned(int planned) {
        this.planned = planned;
    }

    public int getNonPlanned() {
        return nonPlanned;
    }

    public void setNonPlanned(int nonPlanned) {
        this.nonPlanned = nonPlanned;
    }

    public int getUnapproved() {
        return unapproved;
    }

    public void setUnapproved(int unapproved) {
        this.unapproved = unapproved;
    }

    public int getExcluded() {
        return excluded;
    }

    public void setExcluded(int excluded) {
        this.excluded = excluded;
    }
}
