package fr.orbita.reports;

import fr.orbita.work.Models.*;
import fr.orbita.work.WorkService;
import java.time.*;
import java.util.List;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;

@Service
public class ReportService {
  public record Day(String date, long count) {}

  public record Progress(String projectId, String name, String color, long total, long done) {}

  public record Dashboard(
      long projects,
      long openTasks,
      long doneTasks,
      long blockedTasks,
      long overdueTasks,
      long contacts,
      long activeContacts,
      long sharedNotes,
      List<Day> week,
      List<Progress> progress,
      String generatedAt,
      String timezone) {}

  public record Report(String id, String title, Dashboard snapshot, Instant createdAt) {}

  private final WorkService work;
  private final JdbcTemplate jdbc;
  private final ObjectMapper json;
  private final ZoneId zone;

  public ReportService(
      WorkService work,
      JdbcTemplate jdbc,
      ObjectMapper json,
      @Value("${orbita.timezone}") String timezone) {
    this.work = work;
    this.jdbc = jdbc;
    this.json = json;
    this.zone = ZoneId.of(timezone);
  }

  public Dashboard dashboard(String space) {
    var projects = work.projects(space);
    var tasks = work.tasks(space);
    var contacts = work.contacts(space);
    LocalDate today = LocalDate.now(zone);
    List<Day> week =
        java.util.stream.IntStream.rangeClosed(0, 6)
            .mapToObj(
                index -> {
                  LocalDate date = today.minusDays(6L - index);
                  long done =
                      tasks.stream()
                          .filter(
                              task ->
                                  task.status() == TaskStatus.DONE
                                      && task.updatedAt().atZone(zone).toLocalDate().equals(date))
                          .count();
                  return new Day(date.toString(), done);
                })
            .toList();
    List<Progress> progress =
        projects.stream()
            .filter(project -> project.status() != ProjectStatus.ARCHIVED)
            .map(
                project ->
                    new Progress(
                        project.id(),
                        project.name(),
                        project.color(),
                        tasks.stream()
                            .filter(task -> task.projectId().equals(project.id()))
                            .count(),
                        tasks.stream()
                            .filter(
                                task ->
                                    task.projectId().equals(project.id())
                                        && task.status() == TaskStatus.DONE)
                            .count()))
            .toList();
    return new Dashboard(
        projects.stream().filter(p -> p.status() == ProjectStatus.ACTIVE).count(),
        tasks.stream().filter(t -> t.status() != TaskStatus.DONE).count(),
        tasks.stream().filter(t -> t.status() == TaskStatus.DONE).count(),
        tasks.stream().filter(t -> t.blocked() && t.status() != TaskStatus.DONE).count(),
        tasks.stream()
            .filter(
                t ->
                    t.status() != TaskStatus.DONE
                        && t.dueDate() != null
                        && t.dueDate().isBefore(today))
            .count(),
        contacts.size(),
        contacts.stream()
            .filter(c -> c.stage() != Stage.WON && c.stage() != Stage.LOST && !c.optedOut())
            .count(),
        jdbc.queryForObject(
            "SELECT COUNT(*) FROM notes WHERE space_id = ? AND is_private = FALSE",
            Long.class,
            space),
        week,
        progress,
        Instant.now().toString(),
        zone.getId());
  }

  public List<Report> reports(String space) {
    return jdbc.query(
        "SELECT * FROM reports WHERE space_id = ? ORDER BY created_at DESC LIMIT 60",
        (row, n) ->
            new Report(
                row.getString("id"),
                row.getString("title"),
                json.readValue(row.getString("snapshot"), Dashboard.class),
                row.getTimestamp("created_at").toInstant()),
        space);
  }

  public Report create(String space) {
    String id = UUID.randomUUID().toString();
    jdbc.update(
        "INSERT INTO reports(id, space_id, period_key, title, snapshot) VALUES (?, ?, ?, ?, ?)",
        id,
        space,
        "manual:" + id,
        "Bilan du " + LocalDate.now(zone),
        json.writeValueAsString(dashboard(space)));
    return reports(space).stream()
        .filter(report -> report.id().equals(id))
        .findFirst()
        .orElseThrow();
  }

  @Scheduled(cron = "0 0 18 * * *", zone = "${orbita.timezone}")
  @Transactional
  public void dailyReports() {
    String period = "daily:" + LocalDate.now(zone);
    for (String space : jdbc.queryForList("SELECT id FROM spaces ORDER BY id", String.class)) {
      jdbc.queryForObject("SELECT id FROM spaces WHERE id = ? FOR UPDATE", String.class, space);
      if (jdbc.queryForObject(
              "SELECT COUNT(*) FROM reports WHERE space_id = ? AND period_key = ?",
              Integer.class,
              space,
              period)
          == 0) {
        jdbc.update(
            "INSERT INTO reports(id, space_id, period_key, title, snapshot) VALUES (?, ?, ?, ?, ?)",
            UUID.randomUUID().toString(),
            space,
            period,
            "Bilan quotidien du " + LocalDate.now(zone),
            json.writeValueAsString(dashboard(space)));
      }
    }
  }
}
