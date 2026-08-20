package com.eurekavault.api.config;

import com.eurekavault.api.security.FirebaseAuthTokenVerifier;
import com.eurekavault.api.security.FirebaseTokenVerifier;
import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import com.google.firebase.auth.FirebaseAuth;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.util.StringUtils;

@Configuration
@ConditionalOnProperty(prefix = "firebase.admin", name = "enabled", havingValue = "true")
public class FirebaseAdminConfiguration {

    @Bean
    FirebaseApp firebaseApp(FirebaseAdminProperties properties) throws IOException {
        if (!StringUtils.hasText(properties.serviceAccountJson())) {
            throw new IllegalStateException(
                    "FIREBASE_SERVICE_ACCOUNT_JSON must be set when Firebase Admin is enabled."
            );
        }

        GoogleCredentials credentials = GoogleCredentials.fromStream(
                new ByteArrayInputStream(
                        properties.serviceAccountJson().getBytes(StandardCharsets.UTF_8)
                )
        );

        FirebaseOptions options = FirebaseOptions.builder()
                .setCredentials(credentials)
                .build();

        return FirebaseApp.getApps().stream()
                .filter(app -> FirebaseApp.DEFAULT_APP_NAME.equals(app.getName()))
                .findFirst()
                .orElseGet(() -> FirebaseApp.initializeApp(options));
    }

    @Bean
    FirebaseAuth firebaseAuth(FirebaseApp firebaseApp) {
        return FirebaseAuth.getInstance(firebaseApp);
    }

    @Bean
    FirebaseTokenVerifier firebaseTokenVerifier(FirebaseAuth firebaseAuth) {
        return new FirebaseAuthTokenVerifier(firebaseAuth);
    }
}
