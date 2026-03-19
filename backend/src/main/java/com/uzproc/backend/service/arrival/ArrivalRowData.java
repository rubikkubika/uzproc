package com.uzproc.backend.service.arrival;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * DTO для передачи распаршенных данных строки arrival между парсером и сохранялкой.
 */
public class ArrivalRowData {
    public LocalDate date;
    public String number;
    public String inn;
    public String invoice;
    public String warehouse;
    public String operationType;
    public String department;
    public LocalDate incomingDate;
    public String incomingNumber;
    public BigDecimal amount;
    public String currency;
    public String comment;
    public String responsible;
}
