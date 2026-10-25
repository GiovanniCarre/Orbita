package fr.orbita.work;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
public class AuditLog {
  public record Entry(
      String id,
      String category,
      String title,
      String actorName,
      String entityId,
      Instant createdAt) {}

  private final JdbcTemplate jdbc;

  public AuditLog(JdbcTemplate jdbc) {
    this.jdbc = jdbc;
  }

  public void add(
      String space, String actor, String category, String title, String entity, String visibleTo) {
    jdbc.update(
        """
                INSERT INTO activity(id, space_id, actor_id, category, title, entity_id, visible_to)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
        UUID.randomUUID().toString(),
        space,
        actor,
        category,
        title,
        entity,
        visibleTo);
  }

  public List<Entry> recent(String space, String user) {
    return jdbc.query(
        """
                SELECT a.*, u.name AS actor_name FROM activity a LEFT JOIN app_users u ON u.id = a.actor_id
                WHERE a.space_id = ? AND (a.visible_to IS NULL OR a.visible_to = ?)
                ORDER BY a.created_at DESC LIMIT 40
                """,
        (row, n) ->
            new Entry(
                row.getString("id"),
                row.getString("category"),
                row.getString("title"),
                row.getString("actor_name"),
                row.getString("entity_id"),
                row.getTimestamp("created_at").toInstant()),
        space,
        user);
  }
}
