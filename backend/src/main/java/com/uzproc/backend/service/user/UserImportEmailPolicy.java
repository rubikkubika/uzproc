package com.uzproc.backend.service.user;

/**
 * Исключения для импорта email из Excel: для отдельных ФИО адрес из файла не подставляется и не перезаписывается.
 */
public final class UserImportEmailPolicy {

    private static final String TASTANBEKOV = "Tastanbekov";
    private static final String ASAN = "Asan";

    private UserImportEmailPolicy() {
    }

    /**
     * @return true, если email из импорта не следует применять (ни при создании, ни при обновлении).
     */
    public static boolean shouldSkipEmailFromImport(String surname, String name) {
        if (surname == null || name == null) {
            return false;
        }
        return TASTANBEKOV.equalsIgnoreCase(surname.trim()) && ASAN.equalsIgnoreCase(name.trim());
    }
}
