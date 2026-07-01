package com.uzproc.backend.repository.cfo;

import com.uzproc.backend.entity.cfo.CfoLeader;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface CfoLeaderRepository extends JpaRepository<CfoLeader, Long> {

    /**
     * Находит привязку руководителя по названию ЦФО (регистронезависимо).
     */
    Optional<CfoLeader> findByCfoNameIgnoreCase(String cfoName);
}
