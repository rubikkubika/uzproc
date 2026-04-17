package com.uzproc.backend.config;

import com.uzproc.backend.security.JwtAuthFilter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
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
                    // Аутентификация
                    .requestMatchers("/auth/**").permitAll()
                    // Здоровье и мониторинг
                    .requestMatchers("/health").permitAll()
                    .requestMatchers("/actuator/**").permitAll()
                    // Публичные данные (страница public-plan, CSI, обучение)
                    .requestMatchers("/purchase-plan-versions/**").permitAll()
                    .requestMatchers("/purchase-plan-items/**").permitAll()
                    .requestMatchers("/csi-feedback/**").permitAll()
                    .requestMatchers("/training/**").permitAll()
                    .requestMatchers("/cfos/names").permitAll()
                    // Управление пользователями — только ADMIN
                    .requestMatchers("/users/**").hasRole("ADMIN")
                    // Всё остальное — любой аутентифицированный пользователь
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
