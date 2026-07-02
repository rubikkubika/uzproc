package com.uzproc.backend.repository.user;

import com.uzproc.backend.entity.user.User;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long>, JpaSpecificationExecutor<User> {
    Optional<User> findByUsername(String username);
    Optional<User> findByEmail(String email);
    Optional<User> findFirstByEmail(String email);
    /** Все пользователи с данным email (для случая дубликатов). */
    List<User> findAllByEmail(String email);
    /** Пользователи по списку email одним запросом (батч-резолв имени получателя, устранение N+1). */
    List<User> findByEmailIn(Collection<String> emails);
    boolean existsByUsername(String username);
    Optional<User> findBySurnameAndName(String surname, String name);

    /**
     * Нечёткий поиск пользователя по частичному совпадению ФИО (для fuzzy-match при импорте плана).
     * Фильтрация — в SQL с ограничением через Pageable, вместо загрузки всей таблицы users в память.
     */
    @Query("SELECT u FROM User u WHERE " +
           "LOWER(CONCAT(COALESCE(u.surname, ''), ' ', COALESCE(u.name, ''))) LIKE LOWER(CONCAT('%', :q, '%')) " +
           "OR LOWER(COALESCE(u.surname, '')) LIKE LOWER(CONCAT('%', :q, '%')) " +
           "OR LOWER(COALESCE(u.name, '')) LIKE LOWER(CONCAT('%', :q, '%'))")
    List<User> searchByFuzzyName(@Param("q") String q, Pageable pageable);
}

