package fr.orbita.ai;

import fr.orbita.api.ApiException;
import fr.orbita.auth.Access;
import fr.orbita.work.AuditLog;
import fr.orbita.work.Models.*;
import fr.orbita.work.WorkService;
import jakarta.validation.Validator;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;

@Service
public class AiService {
  public record Run(
      String id,
      String projectId,
      String prompt,
      String provider,
      String model,
      String status,
      AiGateway.Plan result,
      String errorMessage,
      Instant acceptedAt,
      Instant createdAt) {}

  private final JdbcTemplate jdbc;
  private final AiGateway gateway;
  private final WorkService work;
  private final AuditLog audit;
  private final ObjectMapper json;
  private final Validator validator;
  private final int dailyLimit;
  private final org.springframework.transaction.support.TransactionTemplate transactions;

  public AiService(
      JdbcTemplate jdbc,
      AiGateway gateway,
      WorkService work,
      AuditLog audit,
      ObjectMapper json,
      Validator validator,
      @Value("${orbita.ai.daily-limit}") int dailyLimit,
      org.springframework.transaction.PlatformTransactionManager transactionManager) {
    this.jdbc = jdbc;
    this.gateway = gateway;
    this.work = work;
    this.audit = audit;
    this.json = json;
    this.validator = validator;
    this.dailyLimit = dailyLimit;
    this.transactions =
        new org.springframework.transaction.support.TransactionTemplate(transactionManager);
  }

  public List<Run> history(String space, String user) {
    return jdbc.query(
        """
                SELECT * FROM ai_runs WHERE space_id = ? AND author_id = ? ORDER BY created_at DESC LIMIT 30
                """,
        (row, n) ->
            new Run(
                row.getString("id"),
                row.getString("project_id"),
                row.getString("prompt"),
                row.getString("provider"),
                row.getString("model"),
                row.getString("status"),
                row.getString("result") == null
                    ? null
                    : json.readValue(row.getString("result"), AiGateway.Plan.class),
                row.getString("error_message"),
                row.getTimestamp("accepted_at") == null
                    ? null
                    : row.getTimestamp("accepted_at").toInstant(),
                row.getTimestamp("created_at").toInstant()),
        space,
        user);
  }

  public Run generate(String space, String projectId, String prompt, Access.Actor actor) {
    String project = work.requireProject(space, projectId);
    if (!gateway.configured()) {
      throw new ApiException(
          HttpStatus.SERVICE_UNAVAILABLE,
          "L'IA n'est pas configurée. Choisissez OpenAI ou Ollama dans la configuration du serveur.");
    }
    // Serialize quota reservation in a short transaction, never during the provider call.
    String id = reserve(space, project, prompt, actor);
    try {
      String context =
          json.writeValueAsString(
              java.util.Map.of(
                  "projects",
                      work.projects(space).stream()
                          .filter(p -> project == null || p.id().equals(project))
                          .toList(),
                  "tasks",
                      work.tasks(space).stream()
                          .filter(t -> project == null || t.projectId().equals(project))
                          .limit(30)
                          .toList(),
                  "sharedNotes",
                      work.notes(space, actor.id()).stream()
                          .filter(note -> !note.isPrivate())
                          .filter(note -> project == null || project.equals(note.projectId()))
                          .limit(8)
                          .map(
                              note ->
                                  java.util.Map.of(
                                      "title",
                                      note.title(),
                                      "content",
                                      note.content()
                                          .substring(0, Math.min(note.content().length(), 2000))))
                          .toList()));
      AiGateway.Plan plan = gateway.generate(prompt, context);
      if (plan == null || !validator.validate(plan).isEmpty()) {
        throw new ApiException(
            HttpStatus.BAD_GATEWAY, "Le plan IA est invalide. Aucune tâche n'a été créée.");
      }
      jdbc.update(
          "UPDATE ai_runs SET status = 'COMPLETED', result = ? WHERE id = ?",
          json.writeValueAsString(plan),
          id);
      audit.add(space, actor.id(), "AI", "Plan IA prêt à relire", id, actor.id());
    } catch (RuntimeException exception) {
      String message =
          exception instanceof ApiException
              ? exception.getMessage()
              : "La génération a échoué. Aucune tâche n'a été créée.";
      jdbc.update(
          "UPDATE ai_runs SET status = 'FAILED', error_message = ? WHERE id = ?", message, id);
    }
    return history(space, actor.id()).stream()
        .filter(run -> run.id().equals(id))
        .findFirst()
        .orElseThrow();
  }

  private String reserve(String space, String project, String prompt, Access.Actor actor) {
    return transactions.execute(
        status -> {
          jdbc.queryForObject("SELECT id FROM spaces WHERE id = ? FOR UPDATE", String.class, space);
          Integer count =
              jdbc.queryForObject(
                  """
                    SELECT COUNT(*) FROM ai_runs WHERE space_id = ? AND created_at >= CURRENT_DATE
                    """,
                  Integer.class,
                  space);
          if (count >= dailyLimit) {
            throw new ApiException(
                HttpStatus.TOO_MANY_REQUESTS, "Le quota IA quotidien de cet espace est atteint.");
          }
          String id = UUID.randomUUID().toString();
          jdbc.update(
              """
                    INSERT INTO ai_runs(id, space_id, project_id, author_id, prompt, provider, model, status)
                    VALUES (?, ?, ?, ?, ?, ?, ?, 'RUNNING')
                    """,
              id,
              space,
              project,
              actor.id(),
              prompt,
              gateway.provider(),
              gateway.model());
          return id;
        });
  }

  @Transactional
  public List<Task> accept(
      String space,
      String id,
      String projectId,
      List<AiGateway.Proposal> selected,
      Access.Actor actor) {
    if (selected.isEmpty()) {
      throw ApiException.invalid("Sélectionnez au moins une proposition.");
    }
    if (projectId == null || projectId.isBlank()) {
      throw ApiException.invalid("Choisissez un projet.");
    }
    work.requireProject(space, projectId);
    Run run =
        history(space, actor.id()).stream()
            .filter(item -> item.id().equals(id))
            .findFirst()
            .orElseThrow(ApiException::missing);
    if (!run.status().equals("COMPLETED") || run.acceptedAt() != null) {
      throw ApiException.conflict();
    }
    WorkService.changed(
        jdbc.update(
            """
                UPDATE ai_runs SET accepted_at = CURRENT_TIMESTAMP, result = ? WHERE id = ? AND space_id = ?
                AND author_id = ? AND status = 'COMPLETED' AND accepted_at IS NULL
                """,
            json.writeValueAsString(new AiGateway.Plan(run.result().summary(), selected)),
            id,
            space,
            actor.id()));
    return selected.stream()
        .map(
            proposal ->
                work.saveTask(
                    space,
                    null,
                    new TaskInput(
                        projectId,
                        proposal.title(),
                        proposal.description(),
                        proposal.acceptance(),
                        TaskStatus.BACKLOG,
                        proposal.priority(),
                        false,
                        null,
                        null,
                        0),
                    actor))
        .toList();
  }
}
