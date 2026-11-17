package dev.harness.board;

import java.util.Locale;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import jakarta.servlet.http.HttpServletResponse;

@Configuration
public class SecurityConfig {
    @Bean PasswordEncoder passwordEncoder() { return new BCryptPasswordEncoder(); }

    @Bean UserDetailsService users(JdbcTemplate jdbc) {
        return email -> jdbc.query("SELECT email,password_hash FROM members WHERE email=?",
            (rs, row) -> User.withUsername(rs.getString("email"))
                .password(rs.getString("password_hash")).roles("MEMBER").build(),
            email.trim().toLowerCase(Locale.ROOT)).stream().findFirst()
                .orElseThrow(() -> new UsernameNotFoundException("Invalid credentials"));
    }

    @Bean SecurityFilterChain security(HttpSecurity http) throws Exception {
        return http
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/csrf", "/api/auth/register", "/api/health").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/posts", "/api/posts/*").permitAll()
                .anyRequest().authenticated())
            .requestCache(cache -> cache.disable())
            .formLogin(form -> form.loginProcessingUrl("/api/auth/login")
                .successHandler((req, res, auth) -> json(res, 200, "로그인되었습니다."))
                .failureHandler((req, res, ex) -> json(res, 401, "이메일과 비밀번호를 확인해 주세요."))
                .permitAll())
            .logout(logout -> logout.logoutUrl("/api/auth/logout")
                .deleteCookies("JSESSIONID")
                .logoutSuccessHandler((req, res, auth) -> res.setStatus(204)))
            .exceptionHandling(errors -> errors
                .authenticationEntryPoint((req, res, ex) -> json(res, 401, "로그인이 필요합니다."))
                .accessDeniedHandler((req, res, ex) -> json(res, 403, "요청 권한을 확인해 주세요.")))
            .build();
    }

    static void json(HttpServletResponse response, int status, String message) throws java.io.IOException {
        response.setStatus(status);
        response.setContentType("application/json;charset=UTF-8");
        response.getWriter().write("{\"message\":\"" + message + "\"}");
    }
}
