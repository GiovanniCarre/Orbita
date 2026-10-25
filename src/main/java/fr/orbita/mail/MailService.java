package fr.orbita.mail;

import fr.orbita.api.ApiException;
import fr.orbita.auth.Access;
import fr.orbita.work.AuditLog;
import fr.orbita.work.WorkService;
import jakarta.validation.constraints.*;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class MailService {
  public record Input(
      String projectId,
      @NotBlank String contactId,
      @NotBlank @Size(max = 300) @Pattern(regexp = "[^\\r\\n]+") String subject,
      @NotBlank @Size(max = 30000) String body,
      @PositiveOrZero long version) {}

  public record Draft(
      String id,
      String projectId,
      String contactId,
      String recipient,
      String subject,
      String body,
      String status,
      String providerId,
      long version,
      Instant createdAt) {}

  private final JdbcTemplate jdbc;
  private final WorkService work;
  private final AuditLog audit;
  private final MailGateway gateway;

  public MailService(JdbcTemplate jdbc, WorkService work, AuditLog audit, MailGateway gateway) {
    this.jdbc = jdbc;
    this.work = work;
    this.audit = audit;
    this.gateway = gateway;
  }

  public List<Draft> list(String space) {
    return jdbc.query(
        "SELECT * FROM mail_drafts WHERE space_id = ? ORDER BY created_at DESC",
        (row, n) ->
            new Draft(
                row.getString("id"),
                row.getString("project_id"),
                row.getString("contact_id"),
                row.getString("recipient"),
                row.getString("subject"),
                row.getString("body"),
                row.getString("status"),
                row.getString("provider_id"),
                row.getLong("version"),
                row.getTimestamp("created_at").toInstant()),
        space);
  }

  private Draft get(String space, String id) {
    return list(space).stream()
        .filter(draft -> draft.id().equals(id))
        .findFirst()
        .orElseThrow(ApiException::missing);
  }

  @Transactional
  public Draft save(String space, String id, Input input, Access.Actor actor) {
    String project = work.requireProject(space, input.projectId());
    var contact = work.contact(space, input.contactId());
    if (contact.email() == null || contact.optedOut() || work.excluded(space, contact.email())) {
      throw ApiException.invalid(
          "Ce contact n'a pas d'adresse utilisable ou s'est opposé aux envois.");
    }
    if (id == null) {
      id = UUID.randomUUID().toString();
      jdbc.update(
          """
                    INSERT INTO mail_drafts(id, space_id, project_id, contact_id, author_id, recipient, subject, body)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    """,
          id,
          space,
          project,
          contact.id(),
          actor.id(),
          contact.email(),
          input.subject().trim(),
          input.body().trim());
    } else {
      Draft previous = get(space, id);
      if (!previous.status().equals("DRAFT")) {
        throw ApiException.conflict();
      }
      WorkService.changed(
          jdbc.update(
              """
                    UPDATE mail_drafts SET project_id = ?, contact_id = ?, recipient = ?, subject = ?, body = ?,
                    version = version + 1 WHERE id = ? AND space_id = ? AND version = ? AND status = 'DRAFT'
                    """,
              project,
              contact.id(),
              contact.email(),
              input.subject().trim(),
              input.body().trim(),
              id,
              space,
              input.version()));
    }
    audit.add(space, actor.id(), "MAIL", "Brouillon enregistré", id, null);
    return get(space, id);
  }

  public Draft send(String space, String id, long version, Access.Actor actor) {
    Draft draft = get(space, id);
    if (draft.version() != version || !draft.status().equals("DRAFT")) {
      throw ApiException.conflict();
    }
    var contact = work.contact(space, draft.contactId());
    if (contact.optedOut()
        || work.excluded(space, draft.recipient())
        || !draft.recipient().equals(contact.email())) {
      throw ApiException.invalid(
          "L'adresse a changé ou le contact s'est opposé aux envois. Aucun envoi effectué.");
    }
    if (!gateway.configured(space)) {
      throw new ApiException(
          HttpStatus.SERVICE_UNAVAILABLE, "Configurez le serveur SMTP avant d'envoyer un mail.");
    }
    WorkService.changed(
        jdbc.update(
            """
                UPDATE mail_drafts SET status = 'SENDING', version = version + 1
                WHERE id = ? AND space_id = ? AND status = 'DRAFT' AND version = ?
                """,
            id,
            space,
            version));
    try {
      String providerId = gateway.send(space, draft.recipient(), draft.subject(), draft.body());
      jdbc.update(
          "UPDATE mail_drafts SET status = 'ACCEPTED', provider_id = ? WHERE id = ? AND space_id = ?",
          providerId,
          id,
          space);
      audit.add(space, actor.id(), "MAIL", "Message accepté par le serveur SMTP", id, null);
    } catch (RuntimeException exception) {
      jdbc.update(
          "UPDATE mail_drafts SET status = 'RECONCILE' WHERE id = ? AND space_id = ?", id, space);
      audit.add(space, actor.id(), "MAIL", "Envoi à vérifier auprès du fournisseur", id, null);
      // An uncertain provider response must never lead to an automatic second send.
    }
    return get(space, id);
  }
}
