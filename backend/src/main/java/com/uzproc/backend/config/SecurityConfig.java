package com.uzproc.backend.config;

import com.uzproc.backend.security.JwtAuthFilter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private final JwtAuthFilter jwtAuthFilter;

    @Value("${security.auth.enabled:true}")
    private boolean authEnabled;

    public SecurityConfig(JwtAuthFilter jwtAuthFilter) {
        this.jwtAuthFilter = jwtAuthFilter;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .csrf(AbstractHttpConfigurer::disable)
            .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS));

        if (!authEnabled) {
            // Локальная разработка: все endpoint'ы открыты
            http.authorizeHttpRequests(auth -> auth.anyRequest().permitAll());
        } else {
            // Production: JWT-аутентификация для всех endpoint'ов
            http
                .authorizeHttpRequests(auth -> auth
                    // Аутентификация: открыт только вход. /auth/change-password требует
                    // валидного JWT (смена только своего пароля) — см. AuthController (T1 fix)
                    .requestMatchers("/auth/login").permitAll()
                    // Здоровье и мониторинг
                    .requestMatchers("/health").permitAll()
                    // Actuator: наружу открыт только health (без деталей, см. application.yml).
                    // Остальные endpoint'ы — только ADMIN (T3 fix)
                    .requestMatchers("/actuator/health").permitAll()
                    .requestMatchers("/actuator/**").hasRole("ADMIN")
                    // --- Публичные данные: ТОЛЬКО чтение и только то, что нужно публичным
                    // страницам. Раньше широкие "/**" открывали анонимам и мутации, и
                    // выгрузку чувствительных данных (CWE-862 Missing Authorization).

                    // public-plan: только GET позиций плана (страница read-only, disabled=true)
                    .requestMatchers(HttpMethod.GET, "/purchase-plan-items/**").permitAll()
                    .requestMatchers(HttpMethod.GET, "/cfos/names").permitAll()
                    // Публичный курс обучения: только просмотр медиа (GET). Загрузка/удаление — auth
                    .requestMatchers(HttpMethod.GET, "/training/**").permitAll()
                    // Публичная форма CSI: загрузка формы по токену (GET) и отправка отзыва (POST).
                    // Список/статистика/приглашения CSI — только для аутентифицированных
                    .requestMatchers(HttpMethod.GET, "/csi-feedback/form/**").permitAll()
                    .requestMatchers(HttpMethod.POST, "/csi-feedback").permitAll()
                    // Управление пользователями — только ADMIN
                    .requestMatchers("/users/**").hasRole("ADMIN")
                    // Всё остальное (включая мутации плана, версии плана, change-password,
                    // CSI-список/статистику, загрузку медиа) — только аутентифицированные
                    .anyRequest().authenticated()
                )
                .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);
        }

        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
