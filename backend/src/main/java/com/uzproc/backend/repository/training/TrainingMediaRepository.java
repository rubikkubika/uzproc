package com.uzproc.backend.repository.training;

import com.uzproc.backend.entity.training.TrainingMedia;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TrainingMediaRepository extends JpaRepository<TrainingMedia, Long> {

    List<TrainingMedia> findAll();

    Optional<TrainingMedia> findBySlideIdAndType(Integer slideId, String type);

    void deleteBySlideIdAndType(Integer slideId, String type);
}
