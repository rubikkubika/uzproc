package com.uzproc.backend.service.handreport;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.time.Duration;

/**
 * Загрузка ручного отчёта по договорам прямо из Google Таблицы (вместо ручного скачивания в upload/handreport).
 * Таблица открыта по ссылке, поэтому используется экспорт в xlsx без авторизации; файл разбирается
 * тем же {@link HandReportExcelLoadService}, что и локальные файлы.
 */
@Service
public class HandReportGoogleSheetService {

    private static final Logger logger = LoggerFactory.getLogger(HandReportGoogleSheetService.class);

    private static final Duration CONNECT_TIMEOUT = Duration.ofSeconds(20);
    private static final Duration REQUEST_TIMEOUT = Duration.ofMinutes(2);

    private final HandReportExcelLoadService loadService;
    private final boolean enabled;
    private final String url;

    public HandReportGoogleSheetService(
            HandReportExcelLoadService loadService,
            @Value("${app.handreport.google-sheet.enabled:true}") boolean enabled,
            @Value("${app.handreport.google-sheet.url:}") String url) {
        this.loadService = loadService;
        this.enabled = enabled;
        this.url = url;
    }

    public boolean isEnabled() {
        return enabled && url != null && !url.isBlank();
    }

    /**
     * Скачивает отчёт и загружает его.
     *
     * @return число обработанных поставок
     * @throws IOException если скачать не удалось или вместо xlsx пришло что-то другое (напр. страница входа Google)
     */
    public int loadFromGoogleSheet() throws IOException, InterruptedException {
        long started = System.currentTimeMillis();
        Path file = download();
        try {
            logger.info("=== START handreport Google Sheet ({} bytes) ===", Files.size(file));
            int processed = loadService.loadHandReport(file.toFile());
            logger.info("=== END handreport Google Sheet — processed {} deliveries in {} ms ===",
                    processed, System.currentTimeMillis() - started);
            return processed;
        } finally {
            Files.deleteIfExists(file);
        }
    }

    private Path download() throws IOException, InterruptedException {
        HttpClient client = HttpClient.newBuilder()
                .connectTimeout(CONNECT_TIMEOUT)
                .followRedirects(HttpClient.Redirect.ALWAYS)
                .build();
        HttpRequest request = HttpRequest.newBuilder(URI.create(url)).timeout(REQUEST_TIMEOUT).GET().build();
        HttpResponse<InputStream> response = client.send(request, HttpResponse.BodyHandlers.ofInputStream());
        // Имя с .xlsx — по расширению загрузчик выбирает формат книги
        Path file = Files.createTempFile("handreport-google-", ".xlsx");
        try (InputStream body = response.body()) {
            if (response.statusCode() != 200) {
                throw new IOException("Google Sheet export returned HTTP " + response.statusCode());
            }
            Files.copy(body, file, StandardCopyOption.REPLACE_EXISTING);
            if (!isZip(file)) {
                // Закрыли доступ по ссылке — Google отдаёт HTML страницы входа
                throw new IOException("Google Sheet export is not an xlsx file (access by link may be revoked)");
            }
            return file;
        } catch (IOException e) {
            Files.deleteIfExists(file);
            throw e;
        }
    }

    /** xlsx — zip-архив, начинается с сигнатуры «PK» */
    private static boolean isZip(Path file) throws IOException {
        try (InputStream in = Files.newInputStream(file)) {
            byte[] head = in.readNBytes(2);
            return head.length == 2 && head[0] == 'P' && head[1] == 'K';
        }
    }
}
