package com.uzproc.backend.dto.sendingcenter;

import java.time.LocalDate;

/** Результат отправки письма о предстоящих поставках. */
public class UpcomingDeliveriesSendResultDto {

    private boolean sent;
    /** Адрес, на который ушло письмо */
    private String recipient;
    /** Количество поставок в письме */
    private int deliveryCount;
    private LocalDate periodFrom;
    private LocalDate periodTo;
    private String subject;

    public UpcomingDeliveriesSendResultDto() {}

    public UpcomingDeliveriesSendResultDto(boolean sent, String recipient, int deliveryCount,
                                           LocalDate periodFrom, LocalDate periodTo, String subject) {
        this.sent = sent;
        this.recipient = recipient;
        this.deliveryCount = deliveryCount;
        this.periodFrom = periodFrom;
        this.periodTo = periodTo;
        this.subject = subject;
    }

    public boolean isSent() { return sent; }
    public void setSent(boolean sent) { this.sent = sent; }

    public String getRecipient() { return recipient; }
    public void setRecipient(String recipient) { this.recipient = recipient; }

    public int getDeliveryCount() { return deliveryCount; }
    public void setDeliveryCount(int deliveryCount) { this.deliveryCount = deliveryCount; }

    public LocalDate getPeriodFrom() { return periodFrom; }
    public void setPeriodFrom(LocalDate periodFrom) { this.periodFrom = periodFrom; }

    public LocalDate getPeriodTo() { return periodTo; }
    public void setPeriodTo(LocalDate periodTo) { this.periodTo = periodTo; }

    public String getSubject() { return subject; }
    public void setSubject(String subject) { this.subject = subject; }
}
