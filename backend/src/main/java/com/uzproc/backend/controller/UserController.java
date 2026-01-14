package com.uzproc.backend.controller;

import com.uzproc.backend.dto.UserDTO;
import com.uzproc.backend.entity.User;
import com.uzproc.backend.service.UserService;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/users")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping
    public ResponseEntity<Page<UserDTO>> getAllUsers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String sort,
            @RequestParam(required = false) String username,
            @RequestParam(required = false) String email,
            @RequestParam(required = false) String surname,
            @RequestParam(required = false) String name,
            @RequestParam(required = false) String department,
            @RequestParam(required = false) String position) {
        
        // Парсим параметр sort (формат: "field,direction")
        String sortBy = null;
        String sortDir = null;
        if (sort != null && !sort.trim().isEmpty()) {
            String[] sortParts = sort.split(",");
            if (sortParts.length > 0) {
                sortBy = sortParts[0].trim();
            }
            if (sortParts.length > 1) {
                sortDir = sortParts[1].trim();
            }
        }
        
        Page<User> users = userService.findAll(page, size, sortBy, sortDir, username, email, surname, name, department, position);
        Page<UserDTO> userDTOs = users.map(UserDTO::new);
        return ResponseEntity.ok(userDTOs);
    }

    @GetMapping("/{id}")
    public ResponseEntity<UserDTO> getUserById(@PathVariable Long id) {
        User user = userService.findById(id);
        if (user != null) {
            return ResponseEntity.ok(new UserDTO(user));
        }
        return ResponseEntity.notFound().build();
    }

    @PostMapping
    public ResponseEntity<?> createUser(@RequestBody Map<String, String> requestBody) {
        try {
            String username = requestBody.get("username");
            String password = requestBody.get("password");
            String email = requestBody.get("email");
            String surname = requestBody.get("surname");
            String name = requestBody.get("name");
            String department = requestBody.get("department");
            String position = requestBody.get("position");
            String role = requestBody.get("role");
            
            User createdUser = userService.createUser(username, password, email, surname, name, department, position, role);
            return ResponseEntity.ok(new UserDTO(createdUser));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", "Ошибка создания пользователя: " + e.getMessage()));
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<UserDTO> updateUser(
            @PathVariable Long id,
            @RequestParam(required = false) String email,
            @RequestParam(required = false) String password,
            @RequestParam(required = false) String role) {
        try {
            User updatedUser = userService.updateUser(id, email, password, role);
            return ResponseEntity.ok(new UserDTO(updatedUser));
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }
}


