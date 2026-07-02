package com.uzproc.backend.repository.cfo;

import com.uzproc.backend.entity.cfo.CfoLeader;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CfoLeaderRepository extends JpaRepository<CfoLeader, Long> {

    /**
     * Находит привязку руководителя по названию ЦФО (регистронезависимо).
     */
    Optional<CfoLeader> findByCfoNameIgnoreCase(String cfoName);

    /**
     * Все привязки руководителей с сразу подгруженным user — для построения Map по ЦФО
     * без N+1 (устранение per-CFO findByCfoNameIgnoreCase + lazy getUser в Центре отправки).
     */
    @Query("SELECT l FROM CfoLeader l LEFT JOIN FETCH l.user")
    List<CfoLeader> findAllWithUser();
}
