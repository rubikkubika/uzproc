package com.uzproc.backend.service.contract;

import com.uzproc.backend.entity.contract.ContractApproval;
import com.uzproc.backend.entity.user.User;
import com.uzproc.backend.repository.contract.ContractApprovalRepository;
import com.uzproc.backend.repository.user.UserRepository;
import com.uzproc.backend.service.user.UserImportEmailPolicy;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Сохраняет согласования договоров батчами в отдельных транзакциях (REQUIRES_NEW),
 * с flush()/clear() в конце каждого батча — чтобы persistence-context Hibernate не разрастался
 * (иначе авто-flush dirty-checking деградирует до O(n²) на десятках тысяч строк).
 *
 * Разделено на две фазы, обе устойчивы к сбою батча (откат только этого батча, затем построчный fallback):
 *  1) {@link #resolveUsersBatch} — резолв/создание исполнителей, возвращает закоммиченные (key → userId);
 *  2) {@link #saveApprovalsBatch} — upsert согласований по уже резолвнутым id (contractId/cfoId/executorId).
 *
 * Кэш «человек → userId» наполняется ТОЛЬКО возвращаемыми (закоммиченными) id — поэтому откат батча
 * не оставляет в кэше ссылок на несуществующих пользователей.
 *
 * Образец паттерна — {@link com.uzproc.backend.service.arrival.ArrivalBatchSaver}.
 */
@Service
public class ContractApprovalBatchSaver {

    private static final Logger logger = LoggerFactory.getLogger(ContractApprovalBatchSaver.class);

    private final ContractApprovalRepository contractApprovalRepository;
    private final UserRepository userRepository;

    @PersistenceContext
    private EntityManager entityManager;

    public ContractApprovalBatchSaver(ContractApprovalRepository contractApprovalRepository,
                                      UserRepository userRepository) {
        this.contractApprovalRepository = contractApprovalRepository;
        this.userRepository = userRepository;
    }

    // ============================ ФАЗА 1: пользователи ============================

    /**
     * Резолвит/создаёт пользователей для пачки персон в одной транзакции (REQUIRES_NEW).
     * Каждый элемент — массив {key, fullName, email}. Возвращает Map(key → userId).
     * При ошибке транзакция откатывается целиком — вызывающий код повторяет построчно через
     * {@link #resolveUserIsolated}.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public Map<String, Long> resolveUsersBatch(List<String[]> persons) {
        Map<String, Long> result = new HashMap<>(persons.size() * 2);
        for (String[] p : persons) {
            Long id = findOrCreateUserId(p[1], p[2]);
            if (id != null) {
                result.put(p[0], id);
            }
        }
        entityManager.flush();
        entityManager.clear();
        return result;
    }

    /**
     * Медленный путь (fallback): один пользователь в собственной транзакции (REQUIRES_NEW).
     * @return userId или null
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public Long resolveUserIsolated(String fullName, String email) {
        Long id = findOrCreateUserId(fullName, email);
        entityManager.flush();
        entityManager.clear();
        return id;
    }

    // ============================ ФАЗА 2: согласования ============================

    /**
     * Upsert пачки согласований в одной транзакции (REQUIRES_NEW) + flush/clear.
     * Все справочные id (contractId/cfoId/executorId) уже резолвнуты в DTO — обращений к users/cfo/contracts нет.
     * @return количество сохранённых/обновлённых записей
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public int saveApprovalsBatch(List<ContractApprovalRowData> batch) {
        int saved = 0;
        for (ContractApprovalRowData data : batch) {
            if (upsertApproval(data)) {
                saved++;
            }
        }
        entityManager.flush();
        entityManager.clear();
        return saved;
    }

    /**
     * Медленный путь (fallback): одно согласование в собственной транзакции (REQUIRES_NEW).
     * @return 1 если сохранено/обновлено, иначе 0
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public int saveApprovalRowIsolated(ContractApprovalRowData data) {
        int saved = upsertApproval(data) ? 1 : 0;
        entityManager.flush();
        entityManager.clear();
        return saved;
    }

    // ============================ внутренняя логика ============================

    private boolean upsertApproval(ContractApprovalRowData data) {
        Optional<ContractApproval> existingOpt =
                contractApprovalRepository.findByContractIdAndStageAndRole(data.contractId, data.stage, data.role);

        ContractApproval approval = existingOpt.orElseGet(
                () -> new ContractApproval(data.contractId, data.stage, data.role));

        approval.setGuid(data.guid);
        approval.setCfoId(data.cfoId);
        approval.setDocumentForm(data.documentForm);
        approval.setExecutorId(data.executorId);
        approval.setAssignmentDate(data.assignmentDate);
        approval.setPlannedCompletionDate(data.plannedCompletionDate);
        approval.setCompletionDate(data.completionDate);
        approval.setCompletionResult(data.completionResult);
        approval.setCommentText(data.commentText);
        approval.setIsWaiting(data.isWaiting);

        contractApprovalRepository.save(approval);
        return true;
    }

    /**
     * Находит пользователя по фамилии/имени (как в согласовании), при отсутствии — по email,
     * при необходимости корректирует email/ФИО; если не найден — создаёт. Возвращает userId.
     * Логика идентична прежней findOrCreateUserByFullNameAndEmail, но возвращает только id.
     */
    private Long findOrCreateUserId(String fullName, String email) {
        if ((fullName == null || fullName.trim().isEmpty()) && (email == null || email.trim().isEmpty())) {
            return null;
        }
        try {
            String surname = null;
            String name = null;
            if (fullName != null && !fullName.trim().isEmpty()) {
                String[] parts = fullName.trim().split("\\s+", 2);
                if (parts.length >= 1) surname = parts[0].trim();
                if (parts.length >= 2) name = parts[1].trim();
            }

            if (UserImportEmailPolicy.shouldSkipEmailFromImport(surname, name)) {
                email = null;
            }

            // 1. Приоритет: поиск по фамилии и имени (как в согласовании)
            User existingUser = null;
            if (surname != null && name != null) {
                existingUser = userRepository.findBySurnameAndName(surname, name).orElse(null);
                if (existingUser == null) {
                    existingUser = userRepository.findBySurnameAndName(name, surname).orElse(null);
                }
            }

            // 2. Если не найден по ФИО — ищем по email
            if (existingUser == null && email != null && !email.isEmpty()) {
                List<User> byEmail = userRepository.findAllByEmail(email);
                if (!byEmail.isEmpty()) {
                    User matchByName = null;
                    for (User u : byEmail) {
                        boolean sameSurname = (surname == null && u.getSurname() == null) || (surname != null && surname.equals(u.getSurname()));
                        boolean sameName = (name == null && u.getName() == null) || (name != null && name.equals(u.getName()));
                        if (sameSurname && sameName) {
                            matchByName = u;
                            break;
                        }
                    }
                    existingUser = matchByName != null ? matchByName : byEmail.get(0);
                }
            }

            if (existingUser != null) {
                boolean updated = false;
                if (email != null && !email.isEmpty() && !email.equals(existingUser.getEmail())) {
                    existingUser.setEmail(email);
                    updated = true;
                }
                if (surname != null && !surname.equals(existingUser.getSurname())) {
                    existingUser.setSurname(surname);
                    updated = true;
                }
                if (name != null && !name.equals(existingUser.getName())) {
                    existingUser.setName(name);
                    updated = true;
                }
                if (updated) {
                    existingUser = userRepository.save(existingUser);
                }
                return existingUser.getId();
            }

            // 3. Создаём нового пользователя
            String username = (email != null && email.contains("@"))
                    ? email.substring(0, email.indexOf('@')).replaceAll("[^a-zA-Z0-9_.-]", "_")
                    : (surname != null ? surname : "") + (name != null ? "_" + name : "");
            if (username.isEmpty() || username.equals("_")) {
                username = "user_" + System.nanoTime();
            }
            if (userRepository.existsByUsername(username)) {
                username = username + "_" + System.nanoTime();
            }

            User newUser = new User();
            newUser.setUsername(username);
            newUser.setPassword("");
            newUser.setSurname(surname);
            newUser.setName(name);
            if (email != null && !email.isEmpty()) {
                newUser.setEmail(email);
            }
            newUser = userRepository.save(newUser);
            logger.debug("Created user for contract approval executor: {} {}, email: {}", surname, name, email);
            return newUser.getId();
        } catch (Exception e) {
            logger.warn("Error findOrCreateUserId fullName='{}' email='{}': {}", fullName, email, e.getMessage());
            return null;
        }
    }
}
