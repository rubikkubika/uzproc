package com.uzproc.backend.repository;

import com.uzproc.backend.entity.Cfo;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface CfoRepository extends JpaRepository<Cfo, Long> {
    
    /**
     * Находит ЦФО по названию (регистронезависимо)
     */
    Optional<Cfo> findByNameIgnoreCase(String name);
    
    /**
     * Проверяет существование ЦФО по названию (регистронезависимо)
     */
    boolean existsByNameIgnoreCase(String name);
}

