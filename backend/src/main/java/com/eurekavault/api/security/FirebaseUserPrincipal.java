package com.eurekavault.api.security;

public record FirebaseUserPrincipal(
        String uid,
        String email,
        boolean emailVerified
) {
}
