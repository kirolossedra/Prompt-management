package com.eurekavault.api;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.core.env.Environment;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
class BackendConfigurationTests {

    @Autowired
    private Environment environment;

    @Test
    void applicationNameIsStable() {
        assertThat(environment.getProperty("spring.application.name"))
                .isEqualTo("eurekavault-backend");
    }

    @Test
    void onlyHealthActuatorEndpointIsConfiguredForExposure() {
        assertThat(environment.getProperty("management.endpoints.web.exposure.include"))
                .isEqualTo("health");
    }

    @Test
    void gracefulShutdownIsEnabled() {
        assertThat(environment.getProperty("server.shutdown"))
                .isEqualTo("graceful");
    }
}
