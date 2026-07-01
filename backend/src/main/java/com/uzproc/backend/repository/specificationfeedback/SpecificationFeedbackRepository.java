package com.uzproc.backend.repository.specificationfeedback;

import com.uzproc.backend.entity.specificationfeedback.SpecificationFeedback;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SpecificationFeedbackRepository extends JpaRepository<SpecificationFeedback, Long> {

    /** Все заполненные оценки, свежие сверху. */
    List<SpecificationFeedback> findAllByOrderByUpdatedAtDesc();
}
