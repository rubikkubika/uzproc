package com.uzproc.backend.service.overview;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.uzproc.backend.dto.overview.ApprovalPresentationDto;
import com.uzproc.backend.entity.ApprovalPresentation;
import com.uzproc.backend.repository.ApprovalPresentationRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;
import java.util.List;

@Service
public class ApprovalPresentationService {

    private static final Logger logger = LoggerFactory.getLogger(ApprovalPresentationService.class);
    private static final Long SINGLETON_ID = 1L;

    private final ApprovalPresentationRepository repository;
    private final ObjectMapper objectMapper;

    public ApprovalPresentationService(ApprovalPresentationRepository repository, ObjectMapper objectMapper) {
        this.repository = repository;
        this.objectMapper = objectMapper;
    }

    @Transactional(readOnly = true)
    public ApprovalPresentationDto get() {
        return repository.findById(SINGLETON_ID)
                .map(e -> new ApprovalPresentationDto(parseConclusions(e.getConclusions())))
                .orElse(new ApprovalPresentationDto(Collections.emptyList()));
    }

    @Transactional
    public ApprovalPresentationDto save(ApprovalPresentationDto dto) {
        ApprovalPresentation entity = repository.findById(SINGLETON_ID)
                .orElseGet(ApprovalPresentation::new);
        entity.setConclusions(serializeConclusions(dto.getConclusions()));
        ApprovalPresentation saved = repository.save(entity);
        return new ApprovalPresentationDto(parseConclusions(saved.getConclusions()));
    }

    private List<String> parseConclusions(String json) {
        try {
            return objectMapper.readValue(json, new TypeReference<List<String>>() {});
        } catch (Exception e) {
            logger.warn("Failed to parse conclusions JSON: {}", e.getMessage());
            return Collections.emptyList();
        }
    }

    private String serializeConclusions(List<String> conclusions) {
        try {
            return objectMapper.writeValueAsString(conclusions != null ? conclusions : Collections.emptyList());
        } catch (Exception e) {
            logger.warn("Failed to serialize conclusions: {}", e.getMessage());
            return "[]";
        }
    }
}
