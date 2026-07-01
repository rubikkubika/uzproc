package com.uzproc.backend.service.cfo;

import com.uzproc.backend.dto.cfo.CfoLeaderDto;
import com.uzproc.backend.entity.cfo.CfoLeader;
import com.uzproc.backend.entity.user.User;
import com.uzproc.backend.repository.CfoRepository;
import com.uzproc.backend.repository.cfo.CfoLeaderRepository;
import com.uzproc.backend.repository.user.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.TreeSet;
import java.util.stream.Collectors;

/**
 * Справочник руководителей ЦФО.
 * Список ЦФО формируется из существующих сущностей (заявки, закупки, договоры),
 * руководитель — это пользователь из таблицы {@code users}, привязка хранится в {@code cfo_leaders}.
 */
@Service
@Transactional(readOnly = true)
public class CfoLeaderService {

    private final CfoLeaderRepository cfoLeaderRepository;
    private final CfoRepository cfoRepository;
    private final UserRepository userRepository;

    public CfoLeaderService(CfoLeaderRepository cfoLeaderRepository,
                            CfoRepository cfoRepository,
                            UserRepository userRepository) {
        this.cfoLeaderRepository = cfoLeaderRepository;
        this.cfoRepository = cfoRepository;
        this.userRepository = userRepository;
    }

    /**
     * Возвращает строки справочника: все ЦФО из заявок/закупок/договоров,
     * с проставленным руководителем (если задан).
     */
    public List<CfoLeaderDto> getAll() {
        // Названия ЦФО из существующих сущностей (регистронезависимое объединение).
        TreeSet<String> cfoNames = new TreeSet<>(String.CASE_INSENSITIVE_ORDER);
        addNonBlank(cfoNames, cfoRepository.findNamesUsedInPurchaseRequests());
        addNonBlank(cfoNames, cfoRepository.findNamesUsedInPurchases());
        addNonBlank(cfoNames, cfoRepository.findNamesUsedInContracts());

        // Сохранённые привязки: ключ — название ЦФО в нижнем регистре.
        Map<String, CfoLeader> leaderByCfo = cfoLeaderRepository.findAll().stream()
                .filter(l -> l.getCfoName() != null && !l.getCfoName().trim().isEmpty())
                .collect(Collectors.toMap(
                        l -> l.getCfoName().trim().toLowerCase(),
                        l -> l,
                        (a, b) -> a));

        List<CfoLeaderDto> result = new ArrayList<>();
        for (String cfoName : cfoNames) {
            CfoLeader leader = leaderByCfo.get(cfoName.toLowerCase());
            result.add(toDto(cfoName, leader));
        }
        result.sort(Comparator.comparing(CfoLeaderDto::getCfoName, String.CASE_INSENSITIVE_ORDER));
        return result;
    }

    /**
     * Назначает руководителем ЦФО указанного пользователя (создаёт/обновляет привязку).
     */
    @Transactional
    public CfoLeaderDto upsertLeader(String cfoName, Long userId) {
        if (cfoName == null || cfoName.trim().isEmpty()) {
            throw new IllegalArgumentException("Название ЦФО не может быть пустым");
        }
        if (userId == null) {
            throw new IllegalArgumentException("Не указан пользователь-руководитель");
        }
        String cfo = cfoName.trim();
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Пользователь не найден: " + userId));

        CfoLeader entity = cfoLeaderRepository.findByCfoNameIgnoreCase(cfo)
                .orElseGet(() -> new CfoLeader(cfo, null));
        entity.setUser(user);
        entity.setLeaderFullName(displayName(user)); // снимок ФИО на момент выбора
        CfoLeader saved = cfoLeaderRepository.save(entity);
        return toDto(saved.getCfoName(), saved);
    }

    /**
     * Убирает руководителя у ЦФО (сам ЦФО остаётся в списке из сущностей).
     */
    @Transactional
    public void deleteLeader(String cfoName) {
        if (cfoName == null || cfoName.trim().isEmpty()) {
            return;
        }
        cfoLeaderRepository.findByCfoNameIgnoreCase(cfoName.trim())
                .ifPresent(cfoLeaderRepository::delete);
    }

    private CfoLeaderDto toDto(String cfoName, CfoLeader leader) {
        if (leader == null) {
            return new CfoLeaderDto(cfoName, null, null, null);
        }
        User user = leader.getUser();
        if (user != null) {
            return new CfoLeaderDto(cfoName, user.getId(), displayName(user), user.getEmail());
        }
        // Пользователь был удалён — показываем сохранённый снимок ФИО без привязки.
        return new CfoLeaderDto(cfoName, null, leader.getLeaderFullName(), null);
    }

    /**
     * Формирует ФИО пользователя для отображения: "Фамилия Имя",
     * с откатом на username при отсутствии ФИО.
     */
    private String displayName(User user) {
        String surname = user.getSurname() != null ? user.getSurname().trim() : "";
        String name = user.getName() != null ? user.getName().trim() : "";
        String full = (surname + " " + name).trim();
        if (!full.isEmpty()) {
            return full;
        }
        return user.getUsername();
    }

    private void addNonBlank(TreeSet<String> target, List<String> names) {
        if (names == null) {
            return;
        }
        for (String name : names) {
            if (name != null && !name.trim().isEmpty()) {
                target.add(name.trim());
            }
        }
    }
}
