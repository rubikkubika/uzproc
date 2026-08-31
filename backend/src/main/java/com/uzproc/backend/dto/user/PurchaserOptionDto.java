package com.uzproc.backend.dto.user;

import com.uzproc.backend.entity.user.User;

/**
 * Закупщик для выпадающего списка в плане закупок: только идентификатор и ФИО.
 * Полный профиль пользователя (email, роль) для выбора закупщика не нужен и не отдаётся.
 */
public class PurchaserOptionDto {

    private Long id;
    private String name;

    public PurchaserOptionDto(User user) {
        this.id = user.getId();
        this.name = buildName(user);
    }

    /** ФИО в том же виде, в котором закупщик хранится в позиции плана: «Фамилия Имя». */
    private static String buildName(User user) {
        boolean hasSurname = user.getSurname() != null && !user.getSurname().trim().isEmpty();
        boolean hasName = user.getName() != null && !user.getName().trim().isEmpty();
        if (hasSurname && hasName) {
            return user.getSurname().trim() + " " + user.getName().trim();
        }
        return user.getUsername() != null ? user.getUsername() : "Пользователь";
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }
}
