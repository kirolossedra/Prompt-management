package com.eurekavault.api.auth;

import com.eurekavault.api.security.FirebaseUserPrincipal;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @GetMapping("/me")
    AuthenticatedUserResponse me(
            @AuthenticationPrincipal FirebaseUserPrincipal principal
    ) {
        return new AuthenticatedUserResponse(
                principal.uid(),
                principal.email(),
                principal.emailVerified()
        );
    }

    public record AuthenticatedUserResponse(
            String uid,
            String email,
            boolean emailVerified
    ) {
    }
}
