package com.uzproc.backend.dto;

import com.uzproc.backend.entity.User;
import com.uzproc.backend.entity.UserRole;

import java.time.LocalDateTime;

public class UserDTO {
    private Long id;
    private String username;
    private String email;
    private String password;
    private String surname;
    private String name;
    private String department;
    private String position;
    private String role;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public UserDTO() {
    }

    public UserDTO(User user) {
        if (user == null) {
            return;
        }
        try {
            this.id = user.getId();
            this.username = user.getUsername();
            this.email = user.getEmail();
            this.password = user.getPassword();
            this.surname = user.getSurname();
            this.name = user.getName();
            this.department = user.getDepartment();
            this.position = user.getPosition();
            
            // Безопасное получение роли
            try {
                UserRole userRole = user.getRole();
                if (userRole != null) {
                    this.role = userRole.getCode();
                } else {
                    this.role = UserRole.USER.getCode();
                }
            } catch (Exception e) {
                // Fallback если роль не может быть прочитана (например, неправильное значение в БД)
                this.role = UserRole.USER.getCode();
            }
            
            this.createdAt = user.getCreatedAt();
            this.updatedAt = user.getUpdatedAt();
        } catch (Exception e) {
            // Логируем ошибку, но не выбрасываем исключение
            System.err.println("Error creating UserDTO: " + e.getMessage());
            e.printStackTrace();
            // Устанавливаем значения по умолчанию
            this.role = UserRole.USER.getCode();
        }
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public String getSurname() {
        return surname;
    }

    public void setSurname(String surname) {
        this.surname = surname;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getDepartment() {
        return department;
    }

    public void setDepartment(String department) {
        this.department = department;
    }

    public String getPosition() {
        return position;
    }

    public void setPosition(String position) {
        this.position = position;
    }

    public String getRole() {
        return role;
    }

    public void setRole(String role) {
        this.role = role;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
}

