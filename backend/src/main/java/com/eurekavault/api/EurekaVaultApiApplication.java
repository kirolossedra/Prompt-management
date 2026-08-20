package com.eurekavault.api;

import com.eurekavault.api.config.FirebaseAdminProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;

@SpringBootApplication
@EnableConfigurationProperties(FirebaseAdminProperties.class)
public class EurekaVaultApiApplication {

    public static void main(String[] args) {
        SpringApplication.run(EurekaVaultApiApplication.class, args);
    }
}
