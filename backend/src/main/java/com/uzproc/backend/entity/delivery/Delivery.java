package com.uzproc.backend.entity.delivery;

import com.uzproc.backend.entity.contract.Contract;
import com.uzproc.backend.entity.payment.Payment;
import com.uzproc.backend.entity.supplier.Supplier;
import com.uzproc.backend.entity.user.User;
import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "deliveries")
public class Delivery {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "inner_id", length = 255)
    private String innerId;

    @Column(name = "date")
    private LocalDate date;

    /** Дедлайн поставки. Вычисляется автоматически: базовая дата + срок поставки (рабочие дни). */
    @Column(name = "delivery_deadline")
    private LocalDate deliveryDeadline;

    /** Фактическая дата поставки. Задаётся при переводе статуса поставки в «Поставлено». */
    @Column(name = "actual_delivery_date")
    private LocalDate actualDeliveryDate;

    /** Срок поставки в рабочих днях. По умолчанию — из договора (Contract.deliveryTerm). */
    @Column(name = "delivery_term_working_days")
    private Integer deliveryTermWorkingDays;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "contract_id")
    private Contract contract;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "supplier_id")
    private Supplier supplier;

    @Column(name = "amount", precision = 18, scale = 2)
    private BigDecimal amount;

    @Column(name = "currency", length = 10)
    private String currency;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 50)
    private DeliveryStatus status;

    /** Статус поставки (фактическая отгрузка), задаётся вручную. */
    @Enumerated(EnumType.STRING)
    @Column(name = "shipment_status", length = 50)
    private ShipmentStatus shipmentStatus = ShipmentStatus.EXPECTED;

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_scheme", length = 20)
    private PaymentScheme paymentScheme;

    @Column(name = "comment", columnDefinition = "TEXT")
    private String comment;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "responsible_id")
    private User responsible;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
            name = "delivery_payments",
            joinColumns = @JoinColumn(name = "delivery_id"),
            inverseJoinColumns = @JoinColumn(name = "payment_id")
    )
    private Set<Payment> payments = new HashSet<>();

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public Delivery() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getInnerId() { return innerId; }
    public void setInnerId(String innerId) { this.innerId = innerId; }

    public LocalDate getDate() { return date; }
    public void setDate(LocalDate date) { this.date = date; }

    public LocalDate getDeliveryDeadline() { return deliveryDeadline; }
    public void setDeliveryDeadline(LocalDate deliveryDeadline) { this.deliveryDeadline = deliveryDeadline; }

    public LocalDate getActualDeliveryDate() { return actualDeliveryDate; }
    public void setActualDeliveryDate(LocalDate actualDeliveryDate) { this.actualDeliveryDate = actualDeliveryDate; }

    public Integer getDeliveryTermWorkingDays() { return deliveryTermWorkingDays; }
    public void setDeliveryTermWorkingDays(Integer deliveryTermWorkingDays) { this.deliveryTermWorkingDays = deliveryTermWorkingDays; }

    public Contract getContract() { return contract; }
    public void setContract(Contract contract) { this.contract = contract; }

    public Supplier getSupplier() { return supplier; }
    public void setSupplier(Supplier supplier) { this.supplier = supplier; }

    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }

    public String getCurrency() { return currency; }
    public void setCurrency(String currency) { this.currency = currency; }

    public DeliveryStatus getStatus() { return status; }
    public void setStatus(DeliveryStatus status) { this.status = status; }

    public ShipmentStatus getShipmentStatus() { return shipmentStatus; }
    public void setShipmentStatus(ShipmentStatus shipmentStatus) { this.shipmentStatus = shipmentStatus; }

    public PaymentScheme getPaymentScheme() { return paymentScheme; }
    public void setPaymentScheme(PaymentScheme paymentScheme) { this.paymentScheme = paymentScheme; }

    public String getComment() { return comment; }
    public void setComment(String comment) { this.comment = comment; }

    public User getResponsible() { return responsible; }
    public void setResponsible(User responsible) { this.responsible = responsible; }

    public Set<Payment> getPayments() { return payments; }
    public void setPayments(Set<Payment> payments) { this.payments = payments; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
