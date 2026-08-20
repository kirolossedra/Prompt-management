package com.eurekavault.api;

import com.eurekavault.api.security.FirebaseTokenVerificationException;
import com.eurekavault.api.security.FirebaseTokenVerifier;
import com.eurekavault.api.security.FirebaseUserPrincipal;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = "firebase.admin.enabled=false")
@AutoConfigureMockMvc
@Import(FirebaseSecurityIT.TestVerifierConfiguration.class)
class FirebaseSecurityIT {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void protectedApiRejectsMissingToken() throws Exception {
        mockMvc.perform(get("/api/auth/me"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void protectedApiRejectsInvalidToken() throws Exception {
        mockMvc.perform(get("/api/auth/me")
                        .header("Authorization", "Bearer invalid-token"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void verifiedTokenDefinesServerSideIdentity() throws Exception {
        mockMvc.perform(get("/api/auth/me")
                        .header("Authorization", "Bearer valid-token"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.uid").value("verified-user-123"))
                .andExpect(jsonPath("$.email").value("verified@example.com"))
                .andExpect(jsonPath("$.emailVerified").value(true));
    }

    @TestConfiguration
    static class TestVerifierConfiguration {

        @Bean
        FirebaseTokenVerifier firebaseTokenVerifier() {
            return idToken -> {
                if (!"valid-token".equals(idToken)) {
                    throw new FirebaseTokenVerificationException("Invalid test token.");
                }
                return new FirebaseUserPrincipal(
                        "verified-user-123",
                        "verified@example.com",
                        true
                );
            };
        }
    }
}
