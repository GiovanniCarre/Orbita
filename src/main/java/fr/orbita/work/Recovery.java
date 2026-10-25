package fr.orbita.work;

import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/** Recovery for the single-instance local pilot; uncertain external actions are never replayed. */
@Component
public class Recovery {
  private final JdbcTemplate jdbc;

  public Recovery(JdbcTemplate jdbc) {
    this.jdbc = jdbc;
  }

  @EventListener(ApplicationReadyEvent.class)
  @Transactional
  public void interruptedOperations() {
    jdbc.update(
        """
                UPDATE ai_runs SET status = 'FAILED',
                error_message = 'Le serveur a redémarré pendant la génération. Aucune tâche n’a été créée.'
                WHERE status = 'RUNNING'
                """);
    jdbc.update("UPDATE mail_drafts SET status = 'RECONCILE' WHERE status = 'SENDING'");
  }
}
