package com.uzproc.backend.service.user;

import com.uzproc.backend.entity.User;
import com.uzproc.backend.entity.UserRole;
import com.uzproc.backend.repository.UserRepository;
import jakarta.persistence.criteria.Predicate;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Service
@Transactional(readOnly = true)
public class UserService {

    private static final Logger logger = LoggerFactory.getLogger(UserService.class);
    
    private final UserRepository userRepository;

    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public Page<User> findAll(
            int page,
            int size,
            String sortBy,
            String sortDir,
            String username,
            String email,
            String surname,
            String name,
            String department,
            String position) {
        
        logger.info("=== FILTER REQUEST ===");
        logger.info("Filter parameters - username: '{}', email: '{}', surname: '{}', name: '{}', department: '{}', position: '{}'",
                username, email, surname, name, department, position);
        
        Specification<User> spec = buildSpecification(username, email, surname, name, department, position);
        
        Sort sort = buildSort(sortBy, sortDir);
        Pageable pageable = PageRequest.of(page, size, sort);
        
        Page<User> users = userRepository.findAll(spec, pageable);
        
        logger.info("Query result - Found {} users on page {} (size {}), total elements: {}",
                users.getContent().size(), page, size, users.getTotalElements());
        logger.info("=== END FILTER REQUEST ===\n");
        
        return users;
    }

    public User findById(Long id) {
        return userRepository.findById(id).orElse(null);
    }

    public User findByEmail(String email) {
        return userRepository.findByEmail(email).orElse(null);
    }

    public boolean authenticate(String email, String password) {
        User user = findByEmail(email);
        if (user == null) {
            return false;
        }
        // Простое сравнение паролей (в продакшене нужно использовать хеширование)
        return password != null && password.equals(user.getPassword());
    }

    @Transactional
    public User createUser(String username, String password, String email, String surname, String name, String department, String position, String role) {
        // Проверяем, что username не пустой
        if (username == null || username.trim().isEmpty()) {
            throw new IllegalArgumentException("Username is required");
        }
        
        // Проверяем, что password не пустой
        if (password == null || password.trim().isEmpty()) {
            throw new IllegalArgumentException("Password is required");
        }
        
        // Проверяем, что пользователь с таким username не существует
        if (userRepository.findByUsername(username.trim()).isPresent()) {
            throw new IllegalArgumentException("User with username '" + username.trim() + "' already exists");
        }
        
        User user = new User();
        user.setUsername(username.trim());
        user.setPassword(password);
        user.setEmail(email != null && !email.trim().isEmpty() ? email.trim() : null);
        user.setSurname(surname != null && !surname.trim().isEmpty() ? surname.trim() : null);
        user.setName(name != null && !name.trim().isEmpty() ? name.trim() : null);
        user.setDepartment(department != null && !department.trim().isEmpty() ? department.trim() : null);
        user.setPosition(position != null && !position.trim().isEmpty() ? position.trim() : null);
        user.setRole(role != null && !role.trim().isEmpty() ? UserRole.fromCode(role.trim()) : UserRole.USER);
        
        logger.info("Creating new user: username={}, email={}", username, email);
        return userRepository.save(user);
    }

    @Transactional
    public User updateUser(Long id, String email, String password, String role) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found with id: " + id));
        
        if (email != null) {
            user.setEmail(email);
        }
        
        if (password != null && !password.trim().isEmpty()) {
            user.setPassword(password);
        }
        
        if (role != null && !role.trim().isEmpty()) {
            user.setRole(UserRole.fromCode(role.trim()));
        }
        
        return userRepository.save(user);
    }

    private Specification<User> buildSpecification(
            String username,
            String email,
            String surname,
            String name,
            String department,
            String position) {
        
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            int predicateCount = 0;
            
            // Фильтр по логину (частичное совпадение, case-insensitive)
            if (username != null && !username.trim().isEmpty()) {
                predicates.add(cb.like(cb.lower(root.get("username")), "%" + username.toLowerCase() + "%"));
                predicateCount++;
                logger.info("Added username filter: '{}'", username);
            }
            
            // Фильтр по email (частичное совпадение, case-insensitive)
            if (email != null && !email.trim().isEmpty()) {
                predicates.add(cb.like(cb.lower(root.get("email")), "%" + email.toLowerCase() + "%"));
                predicateCount++;
                logger.info("Added email filter: '{}'", email);
            }
            
            // Фильтр по фамилии (частичное совпадение, case-insensitive)
            if (surname != null && !surname.trim().isEmpty()) {
                predicates.add(cb.like(cb.lower(root.get("surname")), "%" + surname.toLowerCase() + "%"));
                predicateCount++;
                logger.info("Added surname filter: '{}'", surname);
            }
            
            // Фильтр по имени (частичное совпадение, case-insensitive)
            if (name != null && !name.trim().isEmpty()) {
                predicates.add(cb.like(cb.lower(root.get("name")), "%" + name.toLowerCase() + "%"));
                predicateCount++;
                logger.info("Added name filter: '{}'", name);
            }
            
            // Фильтр по отделу (частичное совпадение, case-insensitive)
            if (department != null && !department.trim().isEmpty()) {
                predicates.add(cb.like(cb.lower(root.get("department")), "%" + department.toLowerCase() + "%"));
                predicateCount++;
                logger.info("Added department filter: '{}'", department);
            }
            
            // Фильтр по должности (частичное совпадение, case-insensitive)
            if (position != null && !position.trim().isEmpty()) {
                predicates.add(cb.like(cb.lower(root.get("position")), "%" + position.toLowerCase() + "%"));
                predicateCount++;
                logger.info("Added position filter: '{}'", position);
            }
            
            logger.info("Total predicates: {}", predicateCount);
            return predicates.isEmpty() ? cb.conjunction() : cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    private Sort buildSort(String sortBy, String sortDir) {
        if (sortBy == null || sortBy.trim().isEmpty()) {
            return Sort.by(Sort.Direction.ASC, "id");
        }
        
        Sort.Direction direction = "asc".equalsIgnoreCase(sortDir) 
            ? Sort.Direction.ASC 
            : Sort.Direction.DESC;
        
        return Sort.by(direction, sortBy);
    }
}

