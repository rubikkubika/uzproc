package com.uzproc.backend.config;

import com.uzproc.backend.entity.User;
import com.uzproc.backend.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class TestDataLoader {

    private static final Logger logger = LoggerFactory.getLogger(TestDataLoader.class);
    private static final int TEST_DATA_COUNT = 10;

    @Bean
    public CommandLineRunner loadTestData(
            UserRepository userRepository) {
        return args -> {
            logger.info("Loading test data...");

            // Загрузка тестовых пользователей
            if (userRepository.count() == 0) {
                logger.info("Creating {} test users...", TEST_DATA_COUNT);
                for (int i = 1; i <= TEST_DATA_COUNT; i++) {
                    User user = new User();
                    user.setUsername("user" + i);
                    user.setPassword("password" + i);
                    user.setEmail("user" + i + "@example.com");
                    userRepository.save(user);
                }
                logger.info("Created {} test users", TEST_DATA_COUNT);
            } else {
                logger.info("Users already exist, skipping user creation");
            }

            logger.info("Test data loading completed");
        };
    }

}

