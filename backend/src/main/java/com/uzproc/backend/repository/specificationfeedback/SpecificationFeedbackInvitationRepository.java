package com.uzproc.backend.repository.specificationfeedback;

import com.uzproc.backend.entity.specificationfeedback.SpecificationFeedbackInvitation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SpecificationFeedbackInvitationRepository
        extends JpaRepository<SpecificationFeedbackInvitation, Long> {

    /** Приглашение по токену публичной ссылки. */
    Optional<SpecificationFeedbackInvitation> findByToken(String token);

    /** Приглашение по связке ЦФО + месяц (одно на связку). */
    Optional<SpecificationFeedbackInvitation> findByCfoNameIgnoreCaseAndPeriodYearAndPeriodMonth(
            String cfoName, Integer periodYear, Integer periodMonth);

    /** Все приглашения за месяц (для проставления статуса «отправлено/оценено» в списке). */
    List<SpecificationFeedbackInvitation> findByPeriodYearAndPeriodMonth(Integer periodYear, Integer periodMonth);
}
