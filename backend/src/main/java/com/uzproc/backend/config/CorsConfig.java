package com.uzproc.backend.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.CorsFilter;

@Configuration
public class CorsConfig {

    @Bean
    public CorsFilter corsFilter() {
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        CorsConfiguration config = new CorsConfiguration();
        
        // Разрешить запросы с фронтенда
        config.addAllowedOrigin("http://localhost:3000");
        config.addAllowedOrigin("http://127.0.0.1:3000");
        
        // Разрешить все методы HTTP
        config.addAllowedMethod("*");
        
        // Разрешить все заголовки
        config.addAllowedHeader("*");
        
        // Разрешить отправку credentials (cookies, authorization headers)
        config.setAllowCredentials(true);
        
        // Применить конфигурацию ко всем путям
        source.registerCorsConfiguration("/**", config);
        
        return new CorsFilter(source);
    }
}

