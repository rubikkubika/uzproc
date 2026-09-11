package com.uzproc.backend.service.excel.dictionary;

import com.uzproc.backend.entity.user.User;
import com.uzproc.backend.repository.user.UserRepository;
import com.uzproc.backend.service.excel.dictionary.UserDictionary.UserRef;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

/**
 * Находит или создаёт пользователя по строке «Фамилия Имя (Отдел, Должность)» или «Фамилия Имя» при загрузке Excel
 * (как EntityExcelLoadService.parseAndSaveUser): сначала по справочнику, при промахе — в БД (пользователя мог
 * создать другой загрузчик), иначе создаёт. Отдел и должность обновляются, если изменились.
 * Вызывается внутри транзакции порции; созданные и изменённые пользователи попадают в справочник после её коммита.
 */
@Component
public class ImportUserResolver {

    private static final Logger logger = LoggerFactory.getLogger(ImportUserResolver.class);

    private final UserRepository userRepository;

    @PersistenceContext
    private EntityManager entityManager;

    public ImportUserResolver(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    /**
     * @return найденный (ссылка без загрузки из БД) или созданный пользователь; null при ошибке разбора
     */
    public User findOrCreate(String value, UserDictionary users) {
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

            UserRef existingUser = null;
            if (surname != null && name != null) {
                existingUser = users.byFullName(surname, name);
            }
            if (existingUser == null) {
                existingUser = users.byUsername(username);
            }
            if (existingUser == null) {
                User fromDb = null;
                if (surname != null && name != null) {
                    fromDb = userRepository.findBySurnameAndName(surname, name).orElse(null);
                }
                if (fromDb == null) {
                    fromDb = userRepository.findByUsername(username).orElse(null);
                }
                if (fromDb != null) {
                    existingUser = UserRef.of(fromDb);
                    users.putExisting(existingUser);
                }
            }

            if (existingUser != null) {
                boolean departmentChanged = department != null && !department.equals(existingUser.department());
                boolean positionChanged = position != null && !position.equals(existingUser.position());
                if (departmentChanged || positionChanged) {
                    User user = userRepository.findById(existingUser.id()).orElseThrow();
                    if (departmentChanged) user.setDepartment(department);
                    if (positionChanged) user.setPosition(position);
                    userRepository.save(user);
                    existingUser = UserRef.of(user);
                    users.stage(existingUser);
                }
                return entityManager.getReference(User.class, existingUser.id());
            }

            User newUser = new User();
            newUser.setUsername(username);
            newUser.setPassword("");
            newUser.setSurname(surname);
            newUser.setName(name);
            newUser.setDepartment(department);
            newUser.setPosition(position);
            newUser = userRepository.save(newUser);
            users.stage(UserRef.of(newUser));
            logger.debug("Import: created user {} {}", surname, name);
            return newUser;
        } catch (Exception e) {
            logger.warn("Import: error parsing user '{}': {}", value, e.getMessage());
            return null;
        }
    }
}
