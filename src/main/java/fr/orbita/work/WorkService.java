package fr.orbita.work;

import static fr.orbita.work.Models.*;

import fr.orbita.api.ApiException;
import fr.orbita.auth.Access;
import java.net.URI;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDate;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class WorkService {
  private final JdbcTemplate jdbc;
  private final Access access;
  private final AuditLog audit;

  public WorkService(JdbcTemplate jdbc, Access access, AuditLog audit) {
    this.jdbc = jdbc;
    this.access = access;
    this.audit = audit;
  }

  public List<Project> projects(String space) {
    return jdbc.query(
        "SELECT * FROM projects WHERE space_id = ? ORDER BY created_at DESC",
        (row, n) -> project(row),
        space);
  }

  public Project project(String space, String id) {
    return jdbc
        .query(
            "SELECT * FROM projects WHERE space_id = ? AND id = ?",
            (row, n) -> project(row),
            space,
            id)
        .stream()
        .findFirst()
        .orElseThrow(ApiException::missing);
  }

  public String requireProject(String space, String id) {
    if (id == null || id.isBlank()) {
      return null;
    }
    return project(space, id).id();
  }

  @Transactional
  public Project saveProject(String space, String id, ProjectInput input, Access.Actor actor) {
    String repository = text(input.githubRepository());
    if (!repository.isEmpty()
        && (!repository.matches("[A-Za-z0-9][A-Za-z0-9-]{0,38}/[A-Za-z0-9_.-]{1,100}")
            || repository.endsWith("/.")
            || repository.endsWith("/.."))) {
      throw ApiException.invalid("Le dépôt GitHub doit suivre propriétaire/dépôt.");
    }
    String website = website(input.website());
    if (id == null) {
      id = UUID.randomUUID().toString();
      jdbc.update(
          """
                    INSERT INTO projects(id, space_id, name, description, goal, color, status, website, github_repository)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
          id,
          space,
          input.name().trim(),
          text(input.description()),
          text(input.goal()),
          input.color(),
          input.status().name(),
          website,
          repository);
      audit.add(space, actor.id(), "PROJECT", "Projet créé : " + input.name().trim(), id, null);
    } else {
      project(space, id);
      changed(
          jdbc.update(
              """
                    UPDATE projects SET name = ?, description = ?, goal = ?, color = ?, status = ?,
                    website = ?, github_repository = ?, version = version + 1
                    WHERE space_id = ? AND id = ? AND version = ?
                    """,
              input.name().trim(),
              text(input.description()),
              text(input.goal()),
              input.color(),
              input.status().name(),
              website,
              repository,
              space,
              id,
              input.version()));
      audit.add(
          space,
          actor.id(),
          "PROJECT",
          (input.status() == ProjectStatus.ARCHIVED ? "Projet archivé : " : "Projet modifié : ")
              + input.name().trim(),
          id,
          null);
    }
    return project(space, id);
  }

  public List<Task> tasks(String space) {
    return jdbc.query(
        "SELECT * FROM tasks WHERE space_id = ? ORDER BY created_at DESC",
        (row, n) -> task(row),
        space);
  }

  public Task task(String space, String id) {
    return jdbc
        .query(
            "SELECT * FROM tasks WHERE space_id = ? AND id = ?", (row, n) -> task(row), space, id)
        .stream()
        .findFirst()
        .orElseThrow(ApiException::missing);
  }

  @Transactional
  public Task saveTask(String space, String id, TaskInput input, Access.Actor actor) {
    requireProject(space, input.projectId());
    String assignee = nullable(input.assigneeId());
    access.validateAssignee(space, assignee);
    if (id == null) {
      id = UUID.randomUUID().toString();
      jdbc.update(
          """
                    INSERT INTO tasks(id, space_id, project_id, title, description, acceptance, status,
                    priority, blocked, due_date, assignee_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
          id,
          space,
          input.projectId(),
          input.title().trim(),
          text(input.description()),
          text(input.acceptance()),
          input.status().name(),
          input.priority().name(),
          input.blocked(),
          input.dueDate(),
          assignee);
      audit.add(space, actor.id(), "TASK", "Tâche créée : " + input.title().trim(), id, null);
    } else {
      Task previous = task(space, id);
      changed(
          jdbc.update(
              """
                    UPDATE tasks SET project_id = ?, title = ?, description = ?, acceptance = ?, status = ?,
                    priority = ?, blocked = ?, due_date = ?, assignee_id = ?, updated_at = CURRENT_TIMESTAMP,
                    version = version + 1 WHERE space_id = ? AND id = ? AND version = ?
                    """,
              input.projectId(),
              input.title().trim(),
              text(input.description()),
              text(input.acceptance()),
              input.status().name(),
              input.priority().name(),
              input.blocked(),
              input.dueDate(),
              assignee,
              space,
              id,
              input.version()));
      String category =
          previous.status() != TaskStatus.DONE && input.status() == TaskStatus.DONE
              ? "TASK_DONE"
              : "TASK";
      audit.add(
          space,
          actor.id(),
          category,
          (category.equals("TASK_DONE") ? "Tâche terminée : " : "Tâche modifiée : ")
              + input.title().trim(),
          id,
          null);
    }
    return task(space, id);
  }

  public List<Contact> contacts(String space) {
    return jdbc.query(
        "SELECT * FROM contacts WHERE space_id = ? ORDER BY created_at DESC",
        (row, n) -> contact(row),
        space);
  }

  public Contact contact(String space, String id) {
    return jdbc
        .query(
            "SELECT * FROM contacts WHERE space_id = ? AND id = ?",
            (row, n) -> contact(row),
            space,
            id)
        .stream()
        .findFirst()
        .orElseThrow(ApiException::missing);
  }

  @Transactional
  public Contact saveContact(String space, String id, ContactInput input, Access.Actor actor) {
    String projectId = requireProject(space, input.projectId());
    String email = nullable(input.email());
    if (email != null) {
      email = email.toLowerCase(Locale.ROOT);
    }
    String website = website(input.website());
    boolean optedOut = input.stage() == Stage.DO_NOT_CONTACT || excluded(space, email);
    if (id == null) {
      id = UUID.randomUUID().toString();
      jdbc.update(
          """
                    INSERT INTO contacts(id, space_id, project_id, name, company, email, website, stage, notes, opted_out)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
          id,
          space,
          projectId,
          input.name().trim(),
          text(input.company()),
          email,
          website,
          (optedOut ? Stage.DO_NOT_CONTACT : input.stage()).name(),
          text(input.notes()),
          optedOut);
      audit.add(space, actor.id(), "CONTACT", "Contact ajouté : " + input.name().trim(), id, null);
    } else {
      Contact previous = contact(space, id);
      optedOut = optedOut || previous.optedOut();
      if (optedOut) {
        exclude(space, previous.email());
      }
      Stage stage = optedOut ? Stage.DO_NOT_CONTACT : input.stage();
      changed(
          jdbc.update(
              """
                    UPDATE contacts SET project_id = ?, name = ?, company = ?, email = ?, website = ?, stage = ?,
                    notes = ?, opted_out = ?, version = version + 1 WHERE space_id = ? AND id = ? AND version = ?
                    """,
              projectId,
              input.name().trim(),
              text(input.company()),
              email,
              website,
              stage.name(),
              text(input.notes()),
              optedOut,
              space,
              id,
              input.version()));
      audit.add(
          space, actor.id(), "CONTACT", "Contact mis à jour : " + input.name().trim(), id, null);
    }
    if (optedOut) {
      exclude(space, email);
    }
    return contact(space, id);
  }

  public List<Note> notes(String space, String actor) {
    return jdbc.query(
        """
                SELECT * FROM notes WHERE space_id = ? AND (is_private = FALSE OR author_id = ?)
                ORDER BY updated_at DESC
                """,
        (row, n) -> note(row),
        space,
        actor);
  }

  public Note note(String space, String id, String actor) {
    return jdbc
        .query(
            """
                SELECT * FROM notes WHERE space_id = ? AND id = ? AND (is_private = FALSE OR author_id = ?)
                """,
            (row, n) -> note(row),
            space,
            id,
            actor)
        .stream()
        .findFirst()
        .orElseThrow(ApiException::missing);
  }

  @Transactional
  public Note saveNote(String space, String id, NoteInput input, Access.Actor actor) {
    String projectId = requireProject(space, input.projectId());
    if (id == null) {
      id = UUID.randomUUID().toString();
      jdbc.update(
          """
                    INSERT INTO notes(id, space_id, project_id, author_id, title, content, is_private)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                    """,
          id,
          space,
          projectId,
          actor.id(),
          input.title().trim(),
          text(input.content()),
          input.isPrivate());
    } else {
      Note previous = note(space, id, actor.id());
      if (input.isPrivate() != previous.isPrivate() && !previous.authorId().equals(actor.id())) {
        throw ApiException.forbidden();
      }
      changed(
          jdbc.update(
              """
                    UPDATE notes SET project_id = ?, title = ?, content = ?, is_private = ?,
                    updated_at = CURRENT_TIMESTAMP, version = version + 1
                    WHERE space_id = ? AND id = ? AND version = ?
                    """,
              projectId,
              input.title().trim(),
              text(input.content()),
              input.isPrivate(),
              space,
              id,
              input.version()));
    }
    // Hiding a note also hides its old public events. Sharing the current version
    // must never publish titles from older private versions.
    if (input.isPrivate()) {
      jdbc.update(
          "UPDATE activity SET visible_to = ? WHERE space_id = ? AND entity_id = ? AND category = 'NOTE'",
          actor.id(),
          space,
          id);
    }
    // Private note titles must not leak through the shared activity stream.
    audit.add(
        space,
        actor.id(),
        "NOTE",
        "Note enregistrée : " + input.title().trim(),
        id,
        input.isPrivate() ? actor.id() : null);
    return note(space, id, actor.id());
  }

  private static Project project(ResultSet row) throws SQLException {
    return new Project(
        row.getString("id"),
        row.getString("name"),
        row.getString("description"),
        row.getString("goal"),
        row.getString("color"),
        ProjectStatus.valueOf(row.getString("status")),
        row.getString("website"),
        row.getString("github_repository"),
        row.getLong("version"),
        row.getTimestamp("created_at").toInstant());
  }

  private static Task task(ResultSet row) throws SQLException {
    return new Task(
        row.getString("id"),
        row.getString("project_id"),
        row.getString("title"),
        row.getString("description"),
        row.getString("acceptance"),
        TaskStatus.valueOf(row.getString("status")),
        Priority.valueOf(row.getString("priority")),
        row.getBoolean("blocked"),
        row.getObject("due_date", LocalDate.class),
        row.getString("assignee_id"),
        row.getLong("version"),
        row.getTimestamp("created_at").toInstant(),
        row.getTimestamp("updated_at").toInstant());
  }

  private static Contact contact(ResultSet row) throws SQLException {
    return new Contact(
        row.getString("id"),
        row.getString("project_id"),
        row.getString("name"),
        row.getString("company"),
        row.getString("email"),
        row.getString("website"),
        Stage.valueOf(row.getString("stage")),
        row.getString("notes"),
        row.getBoolean("opted_out"),
        row.getLong("version"),
        row.getTimestamp("created_at").toInstant());
  }

  private static Note note(ResultSet row) throws SQLException {
    return new Note(
        row.getString("id"),
        row.getString("project_id"),
        row.getString("author_id"),
        row.getString("title"),
        row.getString("content"),
        row.getBoolean("is_private"),
        row.getLong("version"),
        row.getTimestamp("created_at").toInstant(),
        row.getTimestamp("updated_at").toInstant());
  }

  public static String text(String value) {
    return value == null ? "" : value.trim();
  }

  public boolean excluded(String space, String email) {
    return email != null
        && jdbc.queryForObject(
                "SELECT COUNT(*) FROM contact_exclusions WHERE space_id = ? AND email = ?",
                Integer.class,
                space,
                email.toLowerCase(Locale.ROOT))
            > 0;
  }

  private void exclude(String space, String email) {
    if (email != null && !excluded(space, email)) {
      jdbc.update("INSERT INTO contact_exclusions(space_id, email) VALUES (?, ?)", space, email);
    }
  }

  public static String nullable(String value) {
    return text(value).isEmpty() ? null : value.trim();
  }

  public static void changed(int count) {
    if (count != 1) {
      throw ApiException.conflict();
    }
  }

  private static String website(String value) {
    value = text(value);
    if (value.isEmpty()) {
      return value;
    }
    try {
      URI uri = URI.create(value);
      if (!List.of("http", "https").contains(uri.getScheme())
          || uri.getHost() == null
          || uri.getUserInfo() != null) {
        throw new IllegalArgumentException();
      }
      return uri.toASCIIString();
    } catch (IllegalArgumentException exception) {
      throw ApiException.invalid(
          "Indiquez une adresse http:// ou https:// sans identifiants intégrés.");
    }
  }
}
