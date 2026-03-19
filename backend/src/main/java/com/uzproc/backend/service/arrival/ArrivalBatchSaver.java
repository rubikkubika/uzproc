package com.uzproc.backend.service.arrival;

import com.uzproc.backend.entity.arrival.Arrival;
import com.uzproc.backend.entity.arrival.ArrivalCurrency;
import com.uzproc.backend.entity.supplier.Supplier;
import com.uzproc.backend.entity.user.User;
import com.uzproc.backend.repository.arrival.ArrivalRepository;
import com.uzproc.backend.repository.supplier.SupplierRepository;
import com.uzproc.backend.repository.user.UserRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

/**
 * Сохраняет батч arrival-строк в отдельной транзакции.
 * Если батч падает — остальные батчи продолжают обрабатываться.
 */
@Service
public class ArrivalBatchSaver {

    private static final Logger logger = LoggerFactory.getLogger(ArrivalBatchSaver.class);

    private final ArrivalRepository arrivalRepository;
    private final SupplierRepository supplierRepository;
    private final UserRepository userRepository;

    @PersistenceContext
    private EntityManager entityManager;

    public ArrivalBatchSaver(ArrivalRepository arrivalRepository,
                             SupplierRepository supplierRepository,
                             UserRepository userRepository) {
        this.arrivalRepository = arrivalRepository;
        this.supplierRepository = supplierRepository;
        this.userRepository = userRepository;
    }

    /**
     * Сохраняет батч распаршенных строк в отдельной транзакции.
     * @return количество сохранённых/обновлённых записей
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public int saveBatch(List<ArrivalRowData> batch) {
        int saved = 0;
        for (ArrivalRowData data : batch) {
            try {
                if (saveRow(data)) {
                    saved++;
                }
            } catch (Exception e) {
                logger.warn("Error saving arrival number={}: {}", data.number, e.getMessage());
            }
        }
        entityManager.flush();
        entityManager.clear();
        return saved;
    }

    private boolean saveRow(ArrivalRowData data) {
        Arrival arrival = new Arrival();

        if (data.date != null) arrival.setDate(data.date);
        arrival.setNumber(data.number);
        if (data.invoice != null) arrival.setInvoice(data.invoice);
        if (data.warehouse != null) arrival.setWarehouse(data.warehouse);
        if (data.operationType != null) arrival.setOperationType(data.operationType);
        if (data.department != null) arrival.setDepartment(data.department);
        if (data.incomingDate != null) arrival.setIncomingDate(data.incomingDate);
        if (data.incomingNumber != null) arrival.setIncomingNumber(data.incomingNumber);
        if (data.amount != null) arrival.setAmount(data.amount);
        if (data.currency != null) {
            ArrivalCurrency cur = ArrivalCurrency.fromString(data.currency);
            if (cur != null) arrival.setCurrency(cur);
        }
        if (data.comment != null) arrival.setComment(data.comment);

        // Поставщик по ИНН
        if (data.inn != null && !data.inn.isEmpty()) {
            Supplier supplier = supplierRepository.findFirstByInn(data.inn).orElse(null);
            if (supplier == null) {
                supplier = new Supplier(data.inn);
                supplier.setInn(data.inn);
                supplier.setName(data.inn);
                supplier = supplierRepository.save(supplier);
                logger.debug("Created supplier with INN={}", data.inn);
            }
            arrival.setSupplier(supplier);
        }

        // Ответственный
        if (data.responsible != null && !data.responsible.isEmpty()) {
            User user = findOrCreateUser(data.responsible);
            if (user != null) arrival.setResponsible(user);
        }

        // Дедупликация по номеру
        Optional<Arrival> existingOpt = arrivalRepository.findFirstByNumber(data.number);
        if (existingOpt.isPresent()) {
            Arrival existing = existingOpt.get();
            boolean updated = updateArrivalFields(existing, arrival);
            if (updated) {
                arrivalRepository.save(existing);
                return true;
            }
            return false;
        } else {
            arrivalRepository.save(arrival);
            return true;
        }
    }

    private boolean updateArrivalFields(Arrival existing, Arrival newData) {
        boolean updated = false;
        if (newData.getDate() != null && !newData.getDate().equals(existing.getDate())) {
            existing.setDate(newData.getDate()); updated = true;
        }
        if (newData.getSupplier() != null && (existing.getSupplier() == null || !newData.getSupplier().getId().equals(existing.getSupplier().getId()))) {
            existing.setSupplier(newData.getSupplier()); updated = true;
        }
        if (newData.getInvoice() != null && !newData.getInvoice().equals(existing.getInvoice())) {
            existing.setInvoice(newData.getInvoice()); updated = true;
        }
        if (newData.getWarehouse() != null && !newData.getWarehouse().equals(existing.getWarehouse())) {
            existing.setWarehouse(newData.getWarehouse()); updated = true;
        }
        if (newData.getOperationType() != null && !newData.getOperationType().equals(existing.getOperationType())) {
            existing.setOperationType(newData.getOperationType()); updated = true;
        }
        if (newData.getDepartment() != null && !newData.getDepartment().equals(existing.getDepartment())) {
            existing.setDepartment(newData.getDepartment()); updated = true;
        }
        if (newData.getIncomingDate() != null && !newData.getIncomingDate().equals(existing.getIncomingDate())) {
            existing.setIncomingDate(newData.getIncomingDate()); updated = true;
        }
        if (newData.getIncomingNumber() != null && !newData.getIncomingNumber().equals(existing.getIncomingNumber())) {
            existing.setIncomingNumber(newData.getIncomingNumber()); updated = true;
        }
        if (newData.getAmount() != null && (existing.getAmount() == null || newData.getAmount().compareTo(existing.getAmount()) != 0)) {
            existing.setAmount(newData.getAmount()); updated = true;
        }
        if (newData.getCurrency() != null && !newData.getCurrency().equals(existing.getCurrency())) {
            existing.setCurrency(newData.getCurrency()); updated = true;
        }
        if (newData.getComment() != null && !newData.getComment().equals(existing.getComment())) {
            existing.setComment(newData.getComment()); updated = true;
        }
        if (newData.getResponsible() != null && (existing.getResponsible() == null || !newData.getResponsible().getId().equals(existing.getResponsible().getId()))) {
            existing.setResponsible(newData.getResponsible()); updated = true;
        }
        return updated;
    }

    private User findOrCreateUser(String value) {
        try {
            String surname = null;
            String name = null;
            String department = null;
            String position = null;

            int openBracketIndex = value.indexOf('(');
            int closeBracketIndex = value.indexOf(')');

            if (openBracketIndex > 0 && closeBracketIndex > openBracketIndex) {
                String namePart = value.substring(0, openBracketIndex).trim();
                String departmentPart = value.substring(openBracketIndex + 1, closeBracketIndex).trim();
                String[] nameParts = namePart.split("\\s+", 2);
                if (nameParts.length >= 1) surname = nameParts[0].trim();
                if (nameParts.length >= 2) name = nameParts[1].trim();
                String[] deptParts = departmentPart.split(",", 2);
                if (deptParts.length >= 1) department = deptParts[0].trim();
                if (deptParts.length >= 2) position = deptParts[1].trim();
            } else {
                String[] nameParts = value.split("\\s+", 2);
                if (nameParts.length >= 1) surname = nameParts[0].trim();
                if (nameParts.length >= 2) name = nameParts[1].trim();
            }

            String username = (surname != null ? surname : "") + (name != null ? "_" + name : "");
            if (username.isEmpty() || username.equals("_")) {
                username = "user_" + System.currentTimeMillis();
            }

            User existingUser = null;
            if (surname != null && name != null) {
                existingUser = userRepository.findBySurnameAndName(surname, name).orElse(null);
            }
            if (existingUser == null) {
                existingUser = userRepository.findByUsername(username).orElse(null);
            }

            if (existingUser != null) {
                boolean userUpdated = false;
                if (department != null && !department.equals(existingUser.getDepartment())) {
                    existingUser.setDepartment(department); userUpdated = true;
                }
                if (position != null && !position.equals(existingUser.getPosition())) {
                    existingUser.setPosition(position); userUpdated = true;
                }
                if (userUpdated) userRepository.save(existingUser);
                return existingUser;
            }

            User newUser = new User();
            newUser.setUsername(username);
            newUser.setPassword("");
            newUser.setSurname(surname);
            newUser.setName(name);
            newUser.setDepartment(department);
            newUser.setPosition(position);
            newUser = userRepository.save(newUser);
            logger.debug("Created user for arrival responsible: {} {}", surname, name);
            return newUser;
        } catch (Exception e) {
            logger.warn("Error parsing responsible '{}': {}", value, e.getMessage());
            return null;
        }
    }
}
