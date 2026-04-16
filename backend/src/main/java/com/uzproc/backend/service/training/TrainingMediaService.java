package com.uzproc.backend.service.training;

import com.uzproc.backend.entity.training.TrainingMedia;
import com.uzproc.backend.repository.training.TrainingMediaRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
public class TrainingMediaService {

    private static final Logger log = LoggerFactory.getLogger(TrainingMediaService.class);

    @Value("${training.media.storage-path:/data/training/media}")
    private String storagePath;

    private final TrainingMediaRepository repository;

    public TrainingMediaService(TrainingMediaRepository repository) {
        this.repository = repository;
    }

    @Transactional(readOnly = true)
    public List<TrainingMedia> findAll() {
        return repository.findAll();
    }

    @Transactional
    public TrainingMedia upload(Integer slideId, String type, MultipartFile file) throws IOException {
        Path dir = Paths.get(storagePath);
        Files.createDirectories(dir);

        // Определяем расширение из оригинального имени
        String originalName = file.getOriginalFilename() != null ? file.getOriginalFilename() : "";
        String ext = "";
        int dotIdx = originalName.lastIndexOf('.');
        if (dotIdx >= 0) {
            ext = originalName.substring(dotIdx); // включая точку, напр. ".mp3"
        }

        String filename = type + "_slide_" + slideId + ext;
        Path dest = dir.resolve(filename);

        // Удаляем старый файл с любым расширением если есть запись в БД
        Optional<TrainingMedia> existing = repository.findBySlideIdAndType(slideId, type);
        existing.ifPresent(m -> {
            try {
                Path oldFile = dir.resolve(m.getFilename());
                Files.deleteIfExists(oldFile);
            } catch (IOException e) {
                log.warn("Не удалось удалить старый файл: {}", e.getMessage());
            }
        });

        // Сохраняем файл
        Files.copy(file.getInputStream(), dest, StandardCopyOption.REPLACE_EXISTING);
        log.info("Сохранён файл обучения: {}", dest);

        // Обновляем или создаём запись в БД
        TrainingMedia media = existing.orElse(new TrainingMedia());
        media.setSlideId(slideId);
        media.setType(type);
        media.setFilename(filename);
        media.setOriginalName(originalName);
        media.setContentType(file.getContentType());
        media.setFileSize(file.getSize());
        media.setUploadedAt(LocalDateTime.now());

        return repository.save(media);
    }

    public Resource getFile(Integer slideId, String type) throws IOException {
        TrainingMedia media = repository.findBySlideIdAndType(slideId, type)
                .orElseThrow(() -> new IllegalArgumentException("Файл не найден: slideId=" + slideId + ", type=" + type));

        Path file = Paths.get(storagePath).resolve(media.getFilename());
        Resource resource = new UrlResource(file.toUri());
        if (!resource.exists()) {
            throw new IllegalArgumentException("Файл не найден на диске: " + media.getFilename());
        }
        return resource;
    }

    public Optional<TrainingMedia> findBySlideAndType(Integer slideId, String type) {
        return repository.findBySlideIdAndType(slideId, type);
    }

    @Transactional
    public void delete(Integer slideId, String type) throws IOException {
        Optional<TrainingMedia> existing = repository.findBySlideIdAndType(slideId, type);
        if (existing.isEmpty()) return;

        TrainingMedia media = existing.get();
        Path file = Paths.get(storagePath).resolve(media.getFilename());
        Files.deleteIfExists(file);
        log.info("Удалён файл обучения: {}", file);

        repository.deleteBySlideIdAndType(slideId, type);
    }
}
