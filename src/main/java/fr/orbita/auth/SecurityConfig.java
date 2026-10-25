package fr.orbita.auth;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
public class SecurityConfig {
  @Bean
  PasswordEncoder passwordEncoder() {
    return new BCryptPasswordEncoder(12);
  }

  @Bean
  UserDetailsService users(JdbcTemplate jdbc) {
    return email ->
        jdbc
            .query(
                "SELECT email, password_hash FROM app_users WHERE email = ?",
                (row, n) ->
                    User.withUsername(row.getString("email"))
                        .password(row.getString("password_hash"))
                        .roles("USER")
                        .build(),
                email.trim().toLowerCase(java.util.Locale.ROOT))
            .stream()
            .findFirst()
            .orElseThrow(() -> new UsernameNotFoundException("Compte inconnu"));
  }

  @Bean
  SecurityFilterChain security(HttpSecurity http) throws Exception {
    http.authorizeHttpRequests(
        auth ->
            auth.requestMatchers("/api/health", "/api/auth/csrf", "/api/auth/register")
                .permitAll()
                .requestMatchers("/api/**")
                .authenticated()
                .anyRequest()
                .permitAll());
    http.formLogin(
        form ->
            form.loginProcessingUrl("/api/auth/login")
                .usernameParameter("email")
                .successHandler(
                    (request, response, authentication) -> {
                      response.setContentType(MediaType.APPLICATION_JSON_VALUE);
                      response.getWriter().write("{\"ok\":true}");
                    })
                .failureHandler(
                    (request, response, exception) -> {
                      response.setStatus(401);
                      response.setContentType(MediaType.APPLICATION_JSON_VALUE);
                      response
                          .getWriter()
                          .write("{\"message\":\"Adresse ou mot de passe incorrect.\"}");
                    })
                .permitAll());
    http.logout(
        logout ->
            logout
                .logoutUrl("/api/auth/logout")
                .deleteCookies("JSESSIONID")
                .logoutSuccessHandler(
                    (request, response, authentication) -> response.setStatus(204)));
    http.exceptionHandling(
        errors ->
            errors
                .authenticationEntryPoint(
                    (request, response, exception) -> {
                      response.setStatus(401);
                      response.setContentType(MediaType.APPLICATION_JSON_VALUE);
                      response
                          .getWriter()
                          .write("{\"message\":\"Connectez-vous pour continuer.\"}");
                    })
                .accessDeniedHandler(
                    (request, response, exception) -> {
                      response.setStatus(403);
                      response.setContentType(MediaType.APPLICATION_JSON_VALUE);
                      response
                          .getWriter()
                          .write(
                              "{\"message\":\"Action non autorisée ou session expirée. Actualisez la page.\"}");
                    }));
    http.headers(
        headers ->
            headers.contentSecurityPolicy(
                policy ->
                    policy.policyDirectives(
                        "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; "
                            + "script-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'")));
    return http.build();
  }
}
