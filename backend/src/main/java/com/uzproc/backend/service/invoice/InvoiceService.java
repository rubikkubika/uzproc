package com.uzproc.backend.service.invoice;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.uzproc.backend.dto.invoice.InvoiceDto;
import com.uzproc.backend.entity.invoice.Invoice;
import com.uzproc.backend.repository.arrival.ArrivalRepository;
import com.uzproc.backend.repository.invoice.InvoiceRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
@Transactional(readOnly = true)
public class InvoiceService {

    private static final Logger log = LoggerFactory.getLogger(InvoiceService.class);
    private static final ObjectMapper objectMapper = new ObjectMapper();
    private static final DateTimeFormatter DATE_FORMAT_DOT = DateTimeFormatter.ofPattern("dd.MM.yyyy");
    private static final DateTimeFormatter DATE_FORMAT_ISO = DateTimeFormatter.ofPattern("yyyy-MM-dd");

    private final InvoiceRepository invoiceRepository;
    private final ArrivalRepository arrivalRepository;

    public InvoiceService(InvoiceRepository invoiceRepository, ArrivalRepository arrivalRepository) {
        this.invoiceRepository = invoiceRepository;
        this.arrivalRepository = arrivalRepository;
    }

    public List<InvoiceDto> findByContractId(Long contractId) {
        return invoiceRepository.findByContractId(contractId).stream()
                .map(this::toDto)
                .toList();
    }

    @Transactional
    public InvoiceDto create(Long contractId, String data, String fileUrl) {
        Invoice invoice = new Invoice();
        invoice.setContractId(contractId);
        invoice.setData(data);
        invoice.setFileUrl(fileUrl);
        Invoice saved = invoiceRepository.save(invoice);
        return toDto(saved);
    }

    @Transactional
    public void delete(Long id) {
        invoiceRepository.deleteById(id);
    }

    private InvoiceDto toDto(Invoice invoice) {
        InvoiceDto dto = new InvoiceDto();
        dto.setId(invoice.getId());
        dto.setContractId(invoice.getContractId());
        dto.setData(invoice.getData());
        dto.setFileUrl(invoice.getFileUrl());
        fillArrivalInfo(dto, invoice.getData());
        dto.setCreatedAt(invoice.getCreatedAt());
        dto.setUpdatedAt(invoice.getUpdatedAt());
        return dto;
    }

    private void fillArrivalInfo(InvoiceDto dto, String jsonData) {
        try {
            JsonNode root = objectMapper.readTree(jsonData);

            String number = getTextValue(root, "number");
            String dateStr = getTextValue(root, "date");
            String supplierInn = null;

            JsonNode supplierNode = root.get("supplier");
            if (supplierNode != null && !supplierNode.isNull()) {
                supplierInn = getTextValue(supplierNode, "inn");
            }

            if (number == null || dateStr == null || supplierInn == null) {
                dto.setConfirmed(false);
                return;
            }

            LocalDate date;
            if (dateStr.contains("-")) {
                date = LocalDate.parse(dateStr, DATE_FORMAT_ISO);
            } else {
                date = LocalDate.parse(dateStr, DATE_FORMAT_DOT);
            }
            var arrival = arrivalRepository.findFirstByIncomingNumberAndIncomingDateAndSupplierInn(
                    number, date, supplierInn);
            dto.setConfirmed(arrival.isPresent());
            arrival.ifPresent(a -> dto.setArrivalNumber(a.getNumber()));
        } catch (Exception e) {
            log.debug("Error checking invoice confirmation: {}", e.getMessage());
            dto.setConfirmed(false);
        }
    }

    private String getTextValue(JsonNode node, String field) {
        JsonNode value = node.get(field);
        if (value == null || value.isNull() || value.asText().isEmpty()) {
            return null;
        }
        return value.asText();
    }
}
