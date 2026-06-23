package com.uzproc.backend.service.supplier;

import com.uzproc.backend.dto.supplier.SupplierContactDto;
import com.uzproc.backend.entity.supplier.SupplierContact;
import com.uzproc.backend.repository.supplier.SupplierContactRepository;
import com.uzproc.backend.repository.supplier.SupplierRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class SupplierContactService {

    private static final Logger logger = LoggerFactory.getLogger(SupplierContactService.class);

    private final SupplierContactRepository contactRepository;
    private final SupplierRepository supplierRepository;

    public SupplierContactService(
            SupplierContactRepository contactRepository,
            SupplierRepository supplierRepository) {
        this.contactRepository = contactRepository;
        this.supplierRepository = supplierRepository;
    }

    public List<SupplierContactDto> findBySupplierId(Long supplierId) {
        return contactRepository.findBySupplierIdOrderByIdAsc(supplierId).stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    @Transactional
    public SupplierContactDto createContact(
            Long supplierId,
            String fullName,
            String position,
            String telegram,
            String email,
            String phone,
            String comment) {
        if (!supplierRepository.existsById(supplierId)) {
            throw new IllegalArgumentException("Поставщик не найден: " + supplierId);
        }
        SupplierContact contact = buildContact(supplierId, fullName, position, telegram, email, phone, comment);
        SupplierContact saved = contactRepository.save(contact);
        logger.info("Created supplier contact {} for supplier {}", saved.getId(), supplierId);
        return toDto(saved);
    }

    /**
     * Создать карточку контакта в рамках общей транзакции (используется при создании КА).
     * Не выполняет проверку существования поставщика — вызывается сразу после его сохранения.
     */
    @Transactional
    public SupplierContact createContactEntity(
            Long supplierId,
            String fullName,
            String position,
            String telegram,
            String email,
            String phone,
            String comment) {
        SupplierContact contact = buildContact(supplierId, fullName, position, telegram, email, phone, comment);
        return contactRepository.save(contact);
    }

    @Transactional
    public void deleteContact(Long contactId) {
        contactRepository.deleteById(contactId);
        logger.info("Deleted supplier contact {}", contactId);
    }

    private SupplierContact buildContact(
            Long supplierId,
            String fullName,
            String position,
            String telegram,
            String email,
            String phone,
            String comment) {
        SupplierContact contact = new SupplierContact();
        contact.setSupplierId(supplierId);
        contact.setFullName(trimToNull(fullName));
        contact.setPosition(trimToNull(position));
        contact.setTelegram(trimToNull(telegram));
        contact.setEmail(trimToNull(email));
        contact.setPhone(trimToNull(phone));
        contact.setComment(trimToNull(comment));
        return contact;
    }

    public SupplierContactDto toDto(SupplierContact c) {
        SupplierContactDto dto = new SupplierContactDto();
        dto.setId(c.getId());
        dto.setSupplierId(c.getSupplierId());
        dto.setFullName(c.getFullName());
        dto.setPosition(c.getPosition());
        dto.setTelegram(c.getTelegram());
        dto.setEmail(c.getEmail());
        dto.setPhone(c.getPhone());
        dto.setComment(c.getComment());
        dto.setCreatedAt(c.getCreatedAt());
        dto.setUpdatedAt(c.getUpdatedAt());
        return dto;
    }

    private String trimToNull(String s) {
        if (s == null) return null;
        String t = s.trim();
        return t.isEmpty() ? null : t;
    }
}
