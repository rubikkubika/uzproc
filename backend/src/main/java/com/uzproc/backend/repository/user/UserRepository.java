package com.uzproc.backend.repository.user;

import com.uzproc.backend.entity.user.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long>, JpaSpecificationExecutor<User> {
    Optional<User> findByUsername(String username);
    Optional<User> findByEmail(String email);
    /** Все пользователи с данным email (для случая дубликатов). */
    List<User> findAllByEmail(String email);
    boolean existsByUsername(String username);
    Optional<User> findBySurnameAndName(String surname, String name);
}

