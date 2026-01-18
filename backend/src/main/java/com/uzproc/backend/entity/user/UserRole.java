package com.uzproc.backend.entity.user;

import com.fasterxml.jackson.annotation.JsonValue;

public enum UserRole {
    USER("user", "Пользователь"),
    ADMIN("admin", "Администратор");

    private final String code;
    private final String displayName;

    UserRole(String code, String displayName) {
        this.code = code;
        this.displayName = displayName;
    }

    @JsonValue
    public String getCode() {
        return code;
    }

    public String getDisplayName() {
        return displayName;
    }

    public static UserRole fromCode(String code) {
        if (code == null) {
            return USER;
        }
        for (UserRole role : UserRole.values()) {
            if (role.code.equalsIgnoreCase(code.trim())) {
                return role;
            }
        }
        return USER; // По умолчанию USER
    }

    public static UserRole fromString(String value) {
        if (value == null) {
            return USER;
        }
        try {
            return UserRole.valueOf(value.toUpperCase());
        } catch (IllegalArgumentException e) {
            return fromCode(value);
        }
    }
}

