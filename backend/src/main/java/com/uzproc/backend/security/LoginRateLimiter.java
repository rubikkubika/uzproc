package com.uzproc.backend.security;

import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * In-memory rate limiter для эндпоинта логина (T4 fix, CWE-307).
 *
 * Защищает от онлайн-перебора и credential-stuffing: после {@link #MAX_ATTEMPTS}
 * неудачных попыток по ключу (email + IP) вход блокируется на {@link #LOCKOUT_MS}.
 * Счётчик сбрасывается при успешном входе или по истечении окна.
 *
 * Реализация рассчитана на single-instance деплой (как сейчас в production).
 * При горизонтальном масштабировании заменить на распределённое хранилище (Redis).
 */
@Component
public class LoginRateLimiter {

    /** Максимум неудачных попыток в пределах окна до блокировки. */
    private static final int MAX_ATTEMPTS = 5;
    /** Окно подсчёта неудачных попыток. */
    private static final long WINDOW_MS = 15 * 60 * 1000L;
    /** Длительность блокировки после превышения лимита. */
    private static final long LOCKOUT_MS = 15 * 60 * 1000L;

    private final Map<String, Attempt> attempts = new ConcurrentHashMap<>();

    private static final class Attempt {
        int count;
        long windowStart;
        long lockedUntil;
    }

    /** Возвращает количество секунд до снятия блокировки, либо 0 если ключ не заблокирован. */
    public long retryAfterSeconds(String key) {
        Attempt a = attempts.get(key);
        if (a == null) {
            return 0;
        }
        long now = System.currentTimeMillis();
        synchronized (a) {
            if (a.lockedUntil > now) {
                return (a.lockedUntil - now + 999) / 1000;
            }
            return 0;
        }
    }

    public boolean isLocked(String key) {
        return retryAfterSeconds(key) > 0;
    }

    /** Регистрирует неудачную попытку входа; при превышении лимита выставляет блокировку. */
    public void recordFailure(String key) {
        long now = System.currentTimeMillis();
        Attempt a = attempts.computeIfAbsent(key, k -> new Attempt());
        synchronized (a) {
            if (now - a.windowStart > WINDOW_MS) {
                a.windowStart = now;
                a.count = 0;
            }
            a.count++;
            if (a.count >= MAX_ATTEMPTS) {
                a.lockedUntil = now + LOCKOUT_MS;
            }
        }
    }

    /** Сбрасывает счётчик после успешного входа. */
    public void reset(String key) {
        attempts.remove(key);
    }
}
