package com.uzproc.backend.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "users")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "username", unique = true, nullable = false, length = 100)
    private String username;

    @Column(name = "password", nullable = false)
    private String password;

    @Column(name = "email")
    private String email;

    @Column(name = "surname", length = 255)
    private String surname;

    @Column(name = "name", length = 255)
    private String name;

    @Column(name = "department", length = 500)
    private String department;

    @Column(name = "position", length = 500)
    private String position;

    @Column(name = "role", length = 50, nullable = false)
    @Convert(converter = com.uzproc.backend.converter.UserRoleConverter.class)
    private UserRole role = UserRole.USER;

    @Column(name = "is_strategic_product")
    private Boolean isStrategicProduct;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public User() {
    }

    public User(Long id, String username, String password, String email, LocalDateTime createdAt, LocalDateTime updatedAt) {
        this.id = id;
        this.username = username;
        this.password = password;
        this.email = email;
        this.role = UserRole.USER;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    public User(String username, String password, String email, String surname, String name, String department, String position) {
        this.username = username;
        this.password = password;
        this.email = email;
        this.surname = surname;
        this.name = name;
        this.department = department;
        this.position = position;
        this.role = UserRole.USER;
    }

    public User(String username, String password, String email, String surname, String name, String department, String position, UserRole role) {
        this.username = username;
        this.password = password;
        this.email = email;
        this.surname = surname;
        this.name = name;
        this.department = department;
        this.position = position;
        this.role = role != null ? role : UserRole.USER;
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

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
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

    public UserRole getRole() {
        return role;
    }

    public void setRole(UserRole role) {
        this.role = role != null ? role : UserRole.USER;
    }

    public Boolean getIsStrategicProduct() {
        return isStrategicProduct;
    }

    public void setIsStrategicProduct(Boolean isStrategicProduct) {
        this.isStrategicProduct = isStrategicProduct;
    }
}
