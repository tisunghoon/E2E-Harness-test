package dev.harness.board;

import java.security.Principal;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api")
public class AuthController {
    private final JdbcTemplate jdbc;
    private final PasswordEncoder encoder;
    public AuthController(JdbcTemplate jdbc, PasswordEncoder encoder) {
        this.jdbc = jdbc; this.encoder = encoder;
    }
    public record Credentials(@NotBlank @Email @Size(max=254) String email,
                              @NotBlank @Size(min=8, max=72) String password) {}
    public record Member(String id, String email) {}

    @GetMapping("/csrf") Map<String, String> csrf(CsrfToken token) {
        return Map.of("token", token.getToken(), "headerName", token.getHeaderName());
    }
    @GetMapping("/health") Map<String, String> health() {
        jdbc.queryForObject("SELECT 1", Integer.class);
        return Map.of("status", "UP");
    }
    @PostMapping("/auth/register") @ResponseStatus(HttpStatus.CREATED)
    Member register(@Valid @RequestBody Credentials input) {
        // BCrypt's bound is bytes; enforce it before hashing non-ASCII passwords.
        if (input.password().getBytes(java.nio.charset.StandardCharsets.UTF_8).length > 72)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "비밀번호는 UTF-8 72바이트 이내로 입력해 주세요.");
        String id = UUID.randomUUID().toString();
        String email = input.email().trim().toLowerCase(Locale.ROOT);
        jdbc.update("INSERT INTO members(id,email,password_hash) VALUES (?,?,?)", id, email, encoder.encode(input.password()));
        return new Member(id, email);
    }
    @GetMapping("/auth/me") Member me(Principal principal) { return member(principal.getName()); }
    Member member(String email) {
        return jdbc.queryForObject("SELECT id,email FROM members WHERE email=?",
            (rs, row) -> new Member(rs.getString("id"), rs.getString("email")), email);
    }
}
