package com.uzproc.backend.service.purchaseplan;

import com.uzproc.backend.dto.purchaseplan.PurchasePlanItemSupplierDto;
import com.uzproc.backend.dto.supplier.SupplierContactDto;
import com.uzproc.backend.entity.purchaseplan.PurchasePlanItemSupplier;
import com.uzproc.backend.entity.supplier.Supplier;
import com.uzproc.backend.entity.supplier.SupplierContact;
import com.uzproc.backend.repository.purchaseplan.PurchasePlanItemSupplierRepository;
import com.uzproc.backend.repository.supplier.SupplierContactRepository;
import com.uzproc.backend.repository.supplier.SupplierRepository;
import com.uzproc.backend.service.supplier.SupplierContactService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class PurchasePlanItemSupplierService {

    private static final Logger logger = LoggerFactory.getLogger(PurchasePlanItemSupplierService.class);

    private final PurchasePlanItemSupplierRepository linkRepository;
    private final SupplierRepository supplierRepository;
    private final SupplierContactRepository contactRepository;
    private final SupplierContactService contactService;

    public PurchasePlanItemSupplierService(
            PurchasePlanItemSupplierRepository linkRepository,
            SupplierRepository supplierRepository,
            SupplierContactRepository contactRepository,
            SupplierContactService contactService) {
        this.linkRepository = linkRepository;
        this.supplierRepository = supplierRepository;
        this.contactRepository = contactRepository;
        this.contactService = contactService;
    }

    /**
     * Получить список поставщиков (контрагентов), привязанных к позиции плана.
     */
    public List<PurchasePlanItemSupplierDto> findByPurchasePlanItemId(Long purchasePlanItemId) {
        List<PurchasePlanItemSupplier> links = linkRepository.findByPurchasePlanItemIdWithSupplier(purchasePlanItemId);

        // Батч-загрузка карточек контактов по всем поставщикам страницы
        List<Long> supplierIds = links.stream()
                .map(l -> l.getSupplier() != null ? l.getSupplier().getId() : null)
                .filter(java.util.Objects::nonNull)
                .distinct()
                .collect(Collectors.toList());
        Map<Long, List<SupplierContactDto>> contactsBySupplier = new HashMap<>();
        if (!supplierIds.isEmpty()) {
            for (SupplierContact c : contactRepository.findBySupplierIdInOrderByIdAsc(supplierIds)) {
                contactsBySupplier
                        .computeIfAbsent(c.getSupplierId(), k -> new ArrayList<>())
                        .add(contactService.toDto(c));
            }
        }

        return links.stream()
                .map(link -> {
                    Long sid = link.getSupplier() != null ? link.getSupplier().getId() : null;
                    return toDto(link, contactsBySupplier.getOrDefault(sid, new ArrayList<>()));
                })
                .collect(Collectors.toList());
    }

    /**
     * Привязать существующего поставщика к позиции плана.
     */
    @Transactional
    public PurchasePlanItemSupplierDto linkExistingSupplier(Long purchasePlanItemId, Long supplierId) {
        Supplier supplier = supplierRepository.findById(supplierId)
                .orElseThrow(() -> new IllegalArgumentException("Поставщик не найден: " + supplierId));

        if (linkRepository.existsByPurchasePlanItemIdAndSupplierId(purchasePlanItemId, supplierId)) {
            throw new IllegalArgumentException("Контрагент уже привязан к этой позиции плана");
        }

        PurchasePlanItemSupplier link = new PurchasePlanItemSupplier();
        link.setPurchasePlanItemId(purchasePlanItemId);
        link.setSupplier(supplier);
        PurchasePlanItemSupplier saved = linkRepository.save(link);
        logger.info("Linked supplier {} to purchase plan item {}", supplierId, purchasePlanItemId);
        return toDto(saved, loadContacts(supplierId));
    }

    /**
     * Создать нового поставщика и сразу привязать его к позиции плана.
     */
    @Transactional
    public PurchasePlanItemSupplierDto createAndLinkSupplier(
            Long purchasePlanItemId,
            String name,
            String inn,
            String kpp,
            String type,
            String code,
            List<Map<String, Object>> contacts) {
        if ((name == null || name.trim().isEmpty()) && (inn == null || inn.trim().isEmpty())) {
            throw new IllegalArgumentException("Укажите наименование или ИНН контрагента");
        }

        Supplier supplier = new Supplier();
        supplier.setName(name != null ? name.trim() : null);
        supplier.setInn(inn != null && !inn.trim().isEmpty() ? inn.trim() : null);
        supplier.setKpp(kpp != null && !kpp.trim().isEmpty() ? kpp.trim() : null);
        supplier.setType(type != null && !type.trim().isEmpty() ? type.trim() : null);

        // Код обязателен и уникален. Если не передан или занят — генерируем уникальный.
        String resolvedCode = code != null ? code.trim() : "";
        if (resolvedCode.isEmpty() || supplierRepository.findByCode(resolvedCode).isPresent()) {
            resolvedCode = "MANUAL-" + UUID.randomUUID().toString().substring(0, 12);
        }
        supplier.setCode(resolvedCode);

        Supplier savedSupplier = supplierRepository.save(supplier);

        // Карточки контактов нового контрагента
        List<SupplierContactDto> contactDtos = new ArrayList<>();
        if (contacts != null) {
            for (Map<String, Object> c : contacts) {
                if (c == null || isContactEmpty(c)) {
                    continue;
                }
                SupplierContact savedContact = contactService.createContactEntity(
                        savedSupplier.getId(),
                        asString(c.get("fullName")),
                        asString(c.get("position")),
                        asString(c.get("telegram")),
                        asString(c.get("email")),
                        asString(c.get("phone")),
                        asString(c.get("comment")));
                contactDtos.add(contactService.toDto(savedContact));
            }
        }

        PurchasePlanItemSupplier link = new PurchasePlanItemSupplier();
        link.setPurchasePlanItemId(purchasePlanItemId);
        link.setSupplier(savedSupplier);
        PurchasePlanItemSupplier saved = linkRepository.save(link);
        logger.info("Created supplier {} ({} contacts) and linked to purchase plan item {}",
                savedSupplier.getId(), contactDtos.size(), purchasePlanItemId);
        return toDto(saved, contactDtos);
    }

    /**
     * Удалить привязку поставщика к позиции плана (сам поставщик не удаляется).
     */
    @Transactional
    public void removeLink(Long linkId) {
        linkRepository.deleteById(linkId);
        logger.info("Removed purchase plan item supplier link {}", linkId);
    }

    private PurchasePlanItemSupplierDto toDto(PurchasePlanItemSupplier link, List<SupplierContactDto> contacts) {
        PurchasePlanItemSupplierDto dto = new PurchasePlanItemSupplierDto();
        dto.setId(link.getId());
        dto.setPurchasePlanItemId(link.getPurchasePlanItemId());
        dto.setCreatedAt(link.getCreatedAt());
        Supplier s = link.getSupplier();
        if (s != null) {
            dto.setSupplierId(s.getId());
            dto.setType(s.getType());
            dto.setKpp(s.getKpp());
            dto.setInn(s.getInn());
            dto.setCode(s.getCode());
            dto.setName(s.getName());
        }
        dto.setContacts(contacts != null ? contacts : new ArrayList<>());
        return dto;
    }

    private List<SupplierContactDto> loadContacts(Long supplierId) {
        if (supplierId == null) {
            return new ArrayList<>();
        }
        return contactRepository.findBySupplierIdOrderByIdAsc(supplierId).stream()
                .map(contactService::toDto)
                .collect(Collectors.toList());
    }

    private boolean isContactEmpty(Map<String, Object> c) {
        for (String key : new String[]{"fullName", "position", "telegram", "email", "phone", "comment"}) {
            String v = asString(c.get(key));
            if (v != null && !v.trim().isEmpty()) {
                return false;
            }
        }
        return true;
    }

    private String asString(Object obj) {
        return obj != null ? obj.toString() : null;
    }
}
