package com.uzproc.backend.entity.purchaserequest;

import com.fasterxml.jackson.annotation.JsonValue;

public enum PurchaseRequestStatus {
    ON_APPROVAL("Заявка на согласовании", PurchaseRequestStatusGroup.ON_COORDINATION),
    ON_APPROVAL_FINAL("Заявка у закупщика", PurchaseRequestStatusGroup.AT_BUYER),
    APPROVED("Заявка утверждена", PurchaseRequestStatusGroup.AT_BUYER),
    COORDINATED("Согласована", PurchaseRequestStatusGroup.AT_BUYER),
    NOT_COORDINATED("Заявка не согласована", PurchaseRequestStatusGroup.NOT_COORDINATED),
    NOT_APPROVED("Заявка не утверждена", PurchaseRequestStatusGroup.NOT_APPROVED),
    PROJECT("Проект", PurchaseRequestStatusGroup.PROJECT),
    SPECIFICATION_CREATED("Спецификация создана", PurchaseRequestStatusGroup.SPECIFICATION_IN_PROGRESS),
    SPECIFICATION_CREATED_ARCHIVE("Спецификация создана - Архив", PurchaseRequestStatusGroup.SPECIFICATION_CREATED_ARCHIVE),
    SPECIFICATION_ON_COORDINATION("Спецификация на согласовании", PurchaseRequestStatusGroup.SPECIFICATION_IN_PROGRESS),
    SPECIFICATION_SIGNED("Спецификация подписана", PurchaseRequestStatusGroup.SPECIFICATION_SIGNED),
    SPECIFICATION_NOT_COORDINATED("Спецификация не согласована", PurchaseRequestStatusGroup.SPECIFICATION_NOT_COORDINATED),
    PURCHASE_CREATED("Закупка создана", PurchaseRequestStatusGroup.AT_BUYER),
    PURCHASE_NOT_COORDINATED("Закупка не согласована", PurchaseRequestStatusGroup.PURCHASE_NOT_COORDINATED),
    PURCHASE_COMPLETED("Закупка завершена", PurchaseRequestStatusGroup.CONTRACT_IN_PROGRESS),
    CONTRACT_CREATED("Договор создан", PurchaseRequestStatusGroup.CONTRACT_IN_PROGRESS),
    CONTRACT_SIGNED("Договор подписан", PurchaseRequestStatusGroup.CONTRACT_SIGNED);

    private final String displayName;
    private final PurchaseRequestStatusGroup group;

    PurchaseRequestStatus(String displayName, PurchaseRequestStatusGroup group) {
        this.displayName = displayName;
        this.group = group;
    }

    @JsonValue
    public String getDisplayName() {
        return displayName;
    }

    public PurchaseRequestStatusGroup getGroup() {
        return group;
    }

    public String getGroupDisplayName() {
        return group.getDisplayName();
    }

    @Override
    public String toString() {
        return displayName;
    }
}
