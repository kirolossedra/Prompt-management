package com.eurekavault.api.security;

public class FirebaseTokenVerificationException extends Exception {

    public FirebaseTokenVerificationException(String message) {
        super(message);
    }

    public FirebaseTokenVerificationException(String message, Throwable cause) {
        super(message, cause);
    }
}
