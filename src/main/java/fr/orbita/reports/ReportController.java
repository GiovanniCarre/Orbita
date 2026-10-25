package fr.orbita.reports;

import static fr.orbita.auth.Access.Permission.*;

import fr.orbita.api.ApiException;
import fr.orbita.auth.Access;
import fr.orbita.work.WorkService;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.http.*;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/spaces/{space}")
public class ReportController {
  private final Access access;
  private final WorkService work;
  private final ReportService reports;

  public ReportController(Access access, WorkService work, ReportService reports) {
    this.access = access;
    this.work = work;
    this.reports = reports;
  }

  @GetMapping("/dashboard")
  ReportService.Dashboard dashboard(@PathVariable String space, Authentication auth) {
    access.require(space, access.actor(auth), READ);
    return reports.dashboard(space);
  }

  @GetMapping("/reports")
  List<ReportService.Report> list(@PathVariable String space, Authentication auth) {
    access.require(space, access.actor(auth), READ);
    return reports.reports(space);
  }

  @PostMapping("/reports")
  ReportService.Report create(@PathVariable String space, Authentication auth) {
    access.require(space, access.actor(auth), WRITE);
    return reports.create(space);
  }

  @GetMapping("/export")
  Map<String, Object> export(@PathVariable String space, Authentication auth) {
    var actor = access.actor(auth);
    access.require(space, actor, ADMIN);
    return Map.of(
        "schemaVersion",
        1,
        "projects",
        work.projects(space),
        "tasks",
        work.tasks(space),
        "contacts",
        work.contacts(space),
        "notes",
        work.notes(space, actor.id()),
        "reports",
        reports.reports(space));
  }

  @GetMapping("/exports/{kind}.csv")
  ResponseEntity<String> csv(
      @PathVariable String space, @PathVariable String kind, Authentication auth) {
    access.require(space, access.actor(auth), ADMIN);
    List<List<String>> rows;
    String header;
    if (kind.equals("contacts")) {
      header = "Nom;Entreprise;Email;Étape;Opposition";
      rows =
          work.contacts(space).stream()
              .map(
                  contact ->
                      List.of(
                          contact.name(),
                          contact.company(),
                          contact.email() == null ? "" : contact.email(),
                          contact.stage().name(),
                          Boolean.toString(contact.optedOut())))
              .toList();
    } else if (kind.equals("tasks")) {
      header = "Titre;Projet;État;Priorité;Échéance";
      rows =
          work.tasks(space).stream()
              .map(
                  task ->
                      List.of(
                          task.title(),
                          task.projectId(),
                          task.status().name(),
                          task.priority().name(),
                          task.dueDate() == null ? "" : task.dueDate().toString()))
              .toList();
    } else {
      throw ApiException.invalid("Export inconnu.");
    }
    String content =
        "\uFEFF"
            + header
            + "\r\n"
            + rows.stream()
                .map(
                    row ->
                        row.stream()
                            .map(ReportController::csvCell)
                            .collect(Collectors.joining(";")))
                .collect(Collectors.joining("\r\n"));
    return ResponseEntity.ok()
        .contentType(new MediaType("text", "csv", java.nio.charset.StandardCharsets.UTF_8))
        .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + kind + ".csv\"")
        .body(content);
  }

  static String csvCell(String value) {
    if (!value.isEmpty() && "=+-@\t\r".indexOf(value.charAt(0)) >= 0) {
      value = "'" + value;
    }
    return "\"" + value.replace("\"", "\"\"") + "\"";
  }
}
