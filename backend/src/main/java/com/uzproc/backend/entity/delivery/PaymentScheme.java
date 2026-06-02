package com.uzproc.backend.entity.delivery;

/**
 * Схема оплаты поставки.
 */
public enum PaymentScheme {
    /** Постоплата: оплата после поставки. */
    POSTPAYMENT,
    /** Предоплата: оплата до поставки. */
    PREPAYMENT
}
