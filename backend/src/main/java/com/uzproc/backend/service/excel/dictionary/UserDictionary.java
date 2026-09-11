package com.uzproc.backend.service.excel.dictionary;

import com.uzproc.backend.entity.user.User;

/**
 * Справочник пользователей для «найти или создать» при загрузке Excel. Пользователей пополняют несколько
 * загрузчиков, поэтому при промахе загрузчик проверяет БД, а созданные в порции записи попадают
 * в справочник после её коммита.
 */
public final class UserDictionary {

    /** Пользователь: id, ключи поиска и поля, которые загрузка обновляет. */
    public record UserRef(long id, String surname, String name, String username, String department, String position) {
        public static UserRef of(User user) {
            return new UserRef(user.getId(), user.getSurname(), user.getName(), user.getUsername(),
                    user.getDepartment(), user.getPosition());
        }
    }

    private final StagedIndex<UserRef> byFullName;
    private final StagedIndex<UserRef> byUsername;

    UserDictionary(int expectedSize) {
        this.byFullName = new StagedIndex<>(expectedSize, UserRef::id);
        this.byUsername = new StagedIndex<>(expectedSize, UserRef::id);
    }

    void load(UserRef ref) {
        byFullName.loadCommitted(fullNameKey(ref.surname(), ref.name()), ref);
        byUsername.loadCommitted(ref.username(), ref);
    }

    /** Как findBySurnameAndName. */
    public UserRef byFullName(String surname, String name) {
        return byFullName.get(fullNameKey(surname, name));
    }

    /** Как findByUsername. */
    public UserRef byUsername(String username) {
        return byUsername.get(username);
    }

    /** Пользователь уже есть в БД (найден запросом при промахе справочника). */
    public void putExisting(UserRef ref) {
        byFullName.putCommitted(fullNameKey(ref.surname(), ref.name()), ref);
        byUsername.putCommitted(ref.username(), ref);
    }

    /** Пользователь создан или изменён в текущей порции. */
    public void stage(UserRef ref) {
        byFullName.stage(fullNameKey(ref.surname(), ref.name()), ref);
        byUsername.stage(ref.username(), ref);
    }

    void commit() {
        byFullName.commit();
        byUsername.commit();
    }

    void discard() {
        byFullName.discard();
        byUsername.discard();
    }

    public int size() {
        return byUsername.size();
    }

    /** Ключ «фамилия + имя»; табуляция в ФИО не встречается, поэтому годится как разделитель. */
    private static String fullNameKey(String surname, String name) {
        return surname == null || name == null ? null : surname + "\t" + name;
    }
}
