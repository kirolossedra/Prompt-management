package com.eurekavault.api.security;

public interface FirebaseTokenVerifier {

    FirebaseUserPrincipal verify(String idToken) throws FirebaseTokenVerificationException;
}
