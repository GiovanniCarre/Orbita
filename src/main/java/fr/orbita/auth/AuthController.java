package fr.orbita.auth;

import static fr.orbita.auth.Access.Permission.*;

import fr.orbita.api.ApiException;
import fr.orbita.work.AuditLog;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

@RestController
public class AuthController {
  public record Registration(
      @NotBlank @Size(max = 100) String name,
      @NotBlank @Email @Size(max = 254) String email,
      @NotNull @Size(min = 12, max = 72) String password,
      @NotBlank @Size(max = 100) String spaceName) {}

  public record SpaceInput(@NotBlank @Size(max = 100) String name) {}

  public record MemberInput(@NotBlank @Email String email, @NotNull Access.Role role) {}

  private final JdbcTemplate jdbc;
  private final PasswordEncoder encoder;
  private final Access access;
  private final AuditLog audit;

  public AuthController(JdbcTemplate jdbc, PasswordEncoder encoder, Access access, AuditLog audit) {
    this.jdbc = jdbc;
    this.encoder = encoder;
    this.access = access;
    this.audit = audit;
  }

  @GetMapping("/api/health")
  Map<String, String> health() {
    return Map.of("status", "UP", "application", "Orbita");
  }

  @GetMapping("/api/auth/csrf")
  Map<String, String> csrf(CsrfToken token) {
    return Map.of("token", token.getToken(), "headerName", token.getHeaderName());
  }

  @PostMapping("/api/auth/register")
  @Transactional
  Map<String, String> register(@Valid @RequestBody Registration input) {
    if (input.password().getBytes(StandardCharsets.UTF_8).length > 72) {
      throw ApiException.invalid(
          "Le mot de passe dépasse 72 octets. Utilisez au moins 12 caractères.");
    }
    String id = UUID.randomUUID().toString();
    jdbc.update(
        "INSERT INTO app_users(id, name, email, password_hash) VALUES (?, ?, ?, ?)",
        id,
        input.name().trim(),
        input.email().trim().toLowerCase(Locale.ROOT),
        encoder.encode(input.password()));
    String spaceId = createSpace(input.spaceName().trim(), id);
    audit.add(spaceId, id, "SPACE", "Espace de travail créé", spaceId, null);
    return Map.of("id", id);
  }

  @GetMapping("/api/me")
  Map<String, Object> me(Authentication authentication) {
    var actor = access.actor(authentication);
    return Map.of("user", actor, "spaces", access.spaces(actor));
  }

  @PostMapping("/api/spaces")
  @Transactional
  Map<String, String> newSpace(
      @Valid @RequestBody SpaceInput input, Authentication authentication) {
    var actor = access.actor(authentication);
    String id = createSpace(input.name().trim(), actor.id());
    audit.add(id, actor.id(), "SPACE", "Espace de travail créé", id, null);
    return Map.of("id", id);
  }

  @GetMapping("/api/spaces/{space}/members")
  List<Access.Member> members(@PathVariable String space, Authentication authentication) {
    access.require(space, access.actor(authentication), READ);
    return access.members(space);
  }

  @PostMapping("/api/spaces/{space}/members")
  @Transactional
  List<Access.Member> addMember(
      @PathVariable String space,
      @Valid @RequestBody MemberInput input,
      Authentication authentication) {
    var actor = access.actor(authentication);
    Access.Role ownRole = access.require(space, actor, ADMIN);
    if (input.role() == Access.Role.OWNER
        || ownRole != Access.Role.OWNER && input.role() == Access.Role.ADMIN) {
      throw ApiException.forbidden();
    }
    String userId =
        jdbc
            .query(
                "SELECT id FROM app_users WHERE email = ?",
                (row, n) -> row.getString("id"),
                input.email().trim().toLowerCase(Locale.ROOT))
            .stream()
            .findFirst()
            .orElseThrow(
                () ->
                    ApiException.invalid(
                        "Cette personne doit d'abord créer un compte Orbita sur cette installation."));
    jdbc.update(
        "INSERT INTO memberships(space_id, user_id, role) VALUES (?, ?, ?)",
        space,
        userId,
        input.role().name());
    audit.add(space, actor.id(), "MEMBER", "Un membre a rejoint l'espace", userId, null);
    return access.members(space);
  }

  @DeleteMapping("/api/spaces/{space}/members/{user}")
  @Transactional
  void removeMember(
      @PathVariable String space, @PathVariable String user, Authentication authentication) {
    var actor = access.actor(authentication);
    Access.Role ownRole = access.require(space, actor, ADMIN);
    Access.Role targetRole =
        access.members(space).stream()
            .filter(member -> member.id().equals(user))
            .map(Access.Member::role)
            .findFirst()
            .orElseThrow(ApiException::missing);
    if (targetRole == Access.Role.OWNER
        || ownRole != Access.Role.OWNER && targetRole == Access.Role.ADMIN) {
      throw ApiException.forbidden();
    }
    jdbc.update(
        "UPDATE tasks SET assignee_id = NULL, version = version + 1 WHERE space_id = ? AND assignee_id = ?",
        space,
        user);
    jdbc.update("DELETE FROM memberships WHERE space_id = ? AND user_id = ?", space, user);
    audit.add(space, actor.id(), "MEMBER", "Accès d'un membre révoqué", user, null);
  }

  private String createSpace(String name, String owner) {
    String id = UUID.randomUUID().toString();
    jdbc.update("INSERT INTO spaces(id, name) VALUES (?, ?)", id, name);
    jdbc.update(
        "INSERT INTO memberships(space_id, user_id, role) VALUES (?, ?, 'OWNER')", id, owner);
    return id;
  }
}
