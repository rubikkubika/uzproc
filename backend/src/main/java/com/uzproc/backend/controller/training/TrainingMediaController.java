package com.uzproc.backend.controller.training;

import com.uzproc.backend.entity.training.TrainingMedia;
import com.uzproc.backend.service.training.TrainingMediaService;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/training/media")
public class TrainingMediaController {

    private final TrainingMediaService service;

    public TrainingMediaController(TrainingMediaService service) {
        this.service = service;
    }

    /**
     * GET /api/training/media
     * Возвращает список всех загруженных медиафайлов.
     * Формат: [{ slideId, type, originalName, uploadedAt }, ...]
     */
    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> listAll() {
        List<TrainingMedia> all = service.findAll();
        List<Map<String, Object>> result = all.stream().map(m -> Map.<String, Object>of(
                "slideId", m.getSlideId(),
                "type", m.getType(),
                "originalName", m.getOriginalName() != null ? m.getOriginalName() : "",
                "fileSize", m.getFileSize() != null ? m.getFileSize() : 0L,
                "uploadedAt", m.getUploadedAt() != null ? m.getUploadedAt().toString() : ""
        )).collect(Collectors.toList());
        return ResponseEntity.ok(result);
    }

    /**
     * POST /api/training/media/{slideId}/{type}
     * Загрузка файла (audio или video) для слайда.
     */
    @PostMapping("/{slideId}/{type}")
    public ResponseEntity<Map<String, Object>> upload(
            @PathVariable Integer slideId,
            @PathVariable String type,
            @RequestParam("file") MultipartFile file) throws IOException {

        if (!type.equals("audio") && !type.equals("video")) {
            return ResponseEntity.badRequest().body(Map.of("error", "type должен быть 'audio' или 'video'"));
        }

        TrainingMedia media = service.upload(slideId, type, file);
        return ResponseEntity.ok(Map.of(
                "slideId", media.getSlideId(),
                "type", media.getType(),
                "originalName", media.getOriginalName() != null ? media.getOriginalName() : "",
                "fileSize", media.getFileSize() != null ? media.getFileSize() : 0L,
                "uploadedAt", media.getUploadedAt().toString()
        ));
    }

    /**
     * GET /api/training/media/{slideId}/{type}
     * Отдаёт файл (audio или video) для слайда.
     */
    @GetMapping("/{slideId}/{type}")
    public ResponseEntity<Resource> getFile(
            @PathVariable Integer slideId,
            @PathVariable String type) throws IOException {

        Resource resource = service.getFile(slideId, type);

        String contentType = "application/octet-stream";
        if (type.equals("audio")) contentType = "audio/mpeg";
        else if (type.equals("video")) contentType = "video/mp4";

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(contentType))
                .header(HttpHeaders.ACCEPT_RANGES, "bytes")
                .body(resource);
    }

    /**
     * DELETE /api/training/media/{slideId}/{type}
     * Удаляет файл.
     */
    @DeleteMapping("/{slideId}/{type}")
    public ResponseEntity<Void> delete(
            @PathVariable Integer slideId,
            @PathVariable String type) throws IOException {

        service.delete(slideId, type);
        return ResponseEntity.noContent().build();
    }
}
