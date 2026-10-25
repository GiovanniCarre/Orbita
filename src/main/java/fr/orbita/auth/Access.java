package fr.orbita.auth;

import fr.orbita.api.ApiException;
import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;

@Service
public class Access {
  public enum Role {
    OWNER,
    ADMIN,
    MEMBER,
    VIEWER
  }

  public enum Permission {
    READ,
    WRITE,
    ADMIN
  }

  public record Actor(String id, String name, String email) {}

  public record Space(String id, String name, Role role) {}

  public record Member(String id, String name, String email, Role role) {}

  private final JdbcTemplate jdbc;

  public Access(JdbcTemplate jdbc) {
    this.jdbc = jdbc;
  }

  public Actor actor(Authentication authentication) {
    if (authentication == null || !authentication.isAuthenticated()) {
      throw ApiException.forbidden();
    }
    return jdbc
        .query(
            "SELECT id, name, email FROM app_users WHERE email = ?",
            (row, n) ->
                new Actor(row.getString("id"), row.getString("name"), row.getString("email")),
            authentication.getName())
        .stream()
        .findFirst()
        .orElseThrow(ApiException::missing);
  }

  public List<Space> spaces(Actor actor) {
    return jdbc.query(
        """
                SELECT s.id, s.name, m.role FROM spaces s
                JOIN memberships m ON m.space_id = s.id WHERE m.user_id = ? ORDER BY s.created_at
                """,
        (row, n) ->
            new Space(
                row.getString("id"), row.getString("name"), Role.valueOf(row.getString("role"))),
        actor.id());
  }

  public Role require(String space, Actor actor, Permission permission) {
    Role role =
        jdbc
            .query(
                "SELECT role FROM memberships WHERE space_id = ? AND user_id = ?",
                (row, n) -> Role.valueOf(row.getString("role")),
                space,
                actor.id())
            .stream()
            .findFirst()
            .orElseThrow(ApiException::missing);
    if (permission == Permission.WRITE && role == Role.VIEWER
        || permission == Permission.ADMIN && role != Role.OWNER && role != Role.ADMIN) {
      throw ApiException.forbidden();
    }
    return role;
  }

  public List<Member> members(String space) {
    return jdbc.query(
        """
                SELECT u.id, u.name, u.email, m.role FROM app_users u
                JOIN memberships m ON m.user_id = u.id WHERE m.space_id = ? ORDER BY u.name
                """,
        (row, n) ->
            new Member(
                row.getString("id"),
                row.getString("name"),
                row.getString("email"),
                Role.valueOf(row.getString("role"))),
        space);
  }

  public void validateAssignee(String space, String userId) {
    if (userId != null
        && !userId.isBlank()
        && jdbc.queryForObject(
                "SELECT COUNT(*) FROM memberships WHERE space_id = ? AND user_id = ?",
                Integer.class,
                space,
                userId)
            == 0) {
      throw ApiException.invalid("Le responsable doit appartenir à cet espace.");
    }
  }
}
