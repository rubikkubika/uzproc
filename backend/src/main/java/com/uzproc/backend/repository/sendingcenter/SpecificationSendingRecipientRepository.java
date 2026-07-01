package com.uzproc.backend.repository.sendingcenter;

import com.uzproc.backend.entity.sendingcenter.SpecificationSendingRecipient;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SpecificationSendingRecipientRepository
        extends JpaRepository<SpecificationSendingRecipient, Long> {

    Optional<SpecificationSendingRecipient> findByCfoNameIgnoreCase(String cfoName);

    /** Все переопределения (для массового проставления в списке). */
    @Override
    List<SpecificationSendingRecipient> findAll();
}
