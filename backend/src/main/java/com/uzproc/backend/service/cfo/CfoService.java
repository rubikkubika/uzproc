package com.uzproc.backend.service.cfo;

import com.uzproc.backend.repository.CfoRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class CfoService {

    private final CfoRepository cfoRepository;

    public CfoService(CfoRepository cfoRepository) {
        this.cfoRepository = cfoRepository;
    }

    /**
     * Возвращает список всех названий ЦФО, отсортированный по имени.
     * Используется для заполнения фильтров на фронтенде.
     */
    public List<String> getAllNames() {
        return cfoRepository.findAll().stream()
                .map(cfo -> cfo.getName() != null ? cfo.getName().trim() : null)
                .filter(name -> name != null && !name.isEmpty())
                .sorted(String::compareToIgnoreCase)
                .collect(Collectors.toList());
    }
}
