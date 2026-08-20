package com.eurekavault.api.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "firebase.admin")
public record FirebaseAdminProperties(
        boolean enabled,
        String serviceAccountJson
) {
}
