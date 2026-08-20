package com.eurekavault.api.security;

import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseAuthException;
import com.google.firebase.auth.FirebaseToken;

public class FirebaseAuthTokenVerifier implements FirebaseTokenVerifier {

    private final FirebaseAuth firebaseAuth;

    public FirebaseAuthTokenVerifier(FirebaseAuth firebaseAuth) {
        this.firebaseAuth = firebaseAuth;
    }

    @Override
    public FirebaseUserPrincipal verify(String idToken) throws FirebaseTokenVerificationException {
        try {
            FirebaseToken token = firebaseAuth.verifyIdToken(idToken, true);
            return new FirebaseUserPrincipal(
                    token.getUid(),
                    token.getEmail(),
                    token.isEmailVerified()
            );
        } catch (FirebaseAuthException exception) {
            throw new FirebaseTokenVerificationException("Invalid Firebase ID token.", exception);
        }
    }
}
