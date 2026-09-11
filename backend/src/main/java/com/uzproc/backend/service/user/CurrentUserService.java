package com.uzproc.backend.service.user;

import com.uzproc.backend.entity.user.User;
import com.uzproc.backend.entity.user.UserRole;
import com.uzproc.backend.repository.user.UserRepository;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.util.Optional;

/**
 * Текущий пользователь запроса: email берётся из JWT (principal), пользователь — из БД.
 */
@Service
public class CurrentUserService {

    private final UserRepository userRepository;

    public CurrentUserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    /**
     * @return текущий пользователь; пусто для анонимного запроса и для фоновых задач (импорт, синхронизация)
     */
    public Optional<User> getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof String email) || email.isBlank()) {
            return Optional.empty();
        }
        return userRepository.findByEmail(email);
    }

    /** Закупщик или администратор */
    public static boolean isPurchaserOrAdmin(User user) {
        return user != null && (user.getRole() == UserRole.ADMIN || Boolean.TRUE.equals(user.getIsPurchaser()));
    }

    /** Фамилия и имя пользователя, а если они не заполнены — логин */
    public static String displayName(User user) {
        if (user == null) {
            return null;
        }
        return user.getSurname() != null && user.getName() != null
                ? user.getSurname() + " " + user.getName()
                : user.getUsername();
    }
}
