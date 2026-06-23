package com.uzproc.backend.controller.supplier;

import com.uzproc.backend.dto.supplier.SupplierContactDto;
import com.uzproc.backend.service.supplier.SupplierContactService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/suppliers/{supplierId}/contacts")
public class SupplierContactController {

    private static final Logger logger = LoggerFactory.getLogger(SupplierContactController.class);

    private final SupplierContactService contactService;

    public SupplierContactController(SupplierContactService contactService) {
        this.contactService = contactService;
    }

    /** Получить карточки контактов поставщика. */
    @GetMapping
    public ResponseEntity<List<SupplierContactDto>> getContacts(@PathVariable Long supplierId) {
        return ResponseEntity.ok(contactService.findBySupplierId(supplierId));
    }

    /** Создать карточку контакта для поставщика. */
    @PostMapping
    public ResponseEntity<?> createContact(
            @PathVariable Long supplierId,
            @RequestBody Map<String, Object> body) {
        try {
            SupplierContactDto dto = contactService.createContact(
                    supplierId,
                    asString(body.get("fullName")),
                    asString(body.get("position")),
                    asString(body.get("telegram")),
                    asString(body.get("email")),
                    asString(body.get("phone")),
                    asString(body.get("comment")));
            return ResponseEntity.status(201).body(dto);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (Exception e) {
            logger.error("Error creating supplier contact for supplier {}", supplierId, e);
            return ResponseEntity.status(500).body("Ошибка сервера: " + e.getMessage());
        }
    }

    /** Удалить карточку контакта. */
    @DeleteMapping("/{contactId}")
    public ResponseEntity<?> deleteContact(@PathVariable Long supplierId, @PathVariable Long contactId) {
        try {
            contactService.deleteContact(contactId);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            logger.error("Error deleting supplier contact {}", contactId, e);
            return ResponseEntity.status(500).body("Ошибка сервера: " + e.getMessage());
        }
    }

    private String asString(Object obj) {
        return obj != null ? obj.toString() : null;
    }
}
