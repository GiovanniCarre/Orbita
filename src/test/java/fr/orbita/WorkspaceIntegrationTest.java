package fr.orbita;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import fr.orbita.ai.AiGateway;
import fr.orbita.mail.MailGateway;
import fr.orbita.reports.ReportService;
import fr.orbita.work.Models.Priority;
import java.net.*;
import java.net.http.*;
import java.nio.charset.StandardCharsets;
import java.util.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

@SpringBootTest(
    webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
    properties = {
      "spring.datasource.url=jdbc:h2:mem:orbita-tests;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1",
      "orbita.ai.daily-limit=4"
    })
class WorkspaceIntegrationTest {
  @LocalServerPort int port;
  @Autowired ObjectMapper json;
  @Autowired JdbcTemplate jdbc;
  @Autowired ReportService reports;
  @Autowired fr.orbita.work.Recovery recovery;
  @MockitoBean AiGateway ai;
  @MockitoBean MailGateway mail;

  @BeforeEach
  void providers() {
    when(ai.configured()).thenReturn(true);
    when(ai.provider()).thenReturn("test");
    when(ai.model()).thenReturn("test-model");
    when(ai.generate(anyString(), anyString()))
        .thenReturn(
            new AiGateway.Plan(
                "Un plan à relire.",
                List.of(
                    new AiGateway.Proposal(
                        "Clarifier l'objectif",
                        "Rédiger le résultat attendu.",
                        Priority.HIGH,
                        "Un objectif vérifiable est enregistré."))));
    when(mail.configured(anyString())).thenReturn(true);
    when(mail.send(anyString(), anyString(), anyString(), anyString()))
        .thenReturn("<message@test.invalid>");
  }

  @Test
  void requiresAuthenticationAndCsrf() throws Exception {
    Client anonymous = new Client();
    assertEquals(401, anonymous.raw("GET", "/api/me", null, false).statusCode());
    assertEquals(403, anonymous.raw("POST", "/api/auth/register", "{}", false).statusCode());
    JsonNode weak =
        json.valueToTree(
            Map.of(
                "name", "Test", "email", email(), "password", "short", "spaceName", "Mon espace"));
    anonymous.call("POST", "/api/auth/register", weak, 400);
  }

  @Test
  void storesHashedPasswordsAndSupportsLogout() throws Exception {
    Client owner = registered();
    String hash =
        jdbc.queryForObject(
            "SELECT password_hash FROM app_users WHERE id = ?", String.class, owner.user);
    assertNotEquals("local-test-password", hash);
    assertTrue(hash.startsWith("$2"));
    owner.call("POST", "/api/auth/logout", null, 204);
    owner.call("GET", "/api/me", null, 401);
  }

  @Test
  void isolatesSpacesAndRejectsCrossSpaceRelations() throws Exception {
    Client alice = registered();
    Client bob = registered();
    JsonNode project = alice.project();
    bob.call("GET", alice.path("/projects"), null, 404);
    bob.call(
        "PUT",
        bob.path("/projects/" + project.get("id").asText()),
        projectInput("Intrusion", "ACTIVE", 0),
        404);
    bob.call(
        "POST",
        bob.path("/tasks"),
        taskInput(project.get("id").asText(), "Intrusion", "BACKLOG", 0),
        404);
    assertEquals(0, bob.call("GET", bob.path("/tasks"), null, 200).size());
  }

  @Test
  void enforcesViewerRoleAndImmediateRevocation() throws Exception {
    Client owner = registered();
    Client viewer = registered();
    owner.call(
        "POST", owner.path("/members"), Map.of("email", viewer.email, "role", "VIEWER"), 200);
    viewer.call("GET", owner.path("/projects"), null, 200);
    viewer.call("POST", owner.path("/projects"), projectInput("Interdit", "ACTIVE", 0), 403);
    owner.call("DELETE", owner.path("/members/" + viewer.user), null, 200);
    viewer.call("GET", owner.path("/projects"), null, 404);
  }

  @Test
  void protectsPrivateNotesAndTheirActivityEvenFromTheSpaceOwner() throws Exception {
    Client owner = registered();
    Client member = registered();
    owner.call(
        "POST", owner.path("/members"), Map.of("email", member.email, "role", "MEMBER"), 200);
    String secret = "SECRET-" + UUID.randomUUID();
    member.call(
        "POST",
        owner.path("/notes"),
        Map.of("title", secret, "content", secret, "isPrivate", true),
        200);
    assertFalse(owner.call("GET", owner.path("/notes"), null, 200).toString().contains(secret));
    assertFalse(owner.call("GET", owner.path("/activity"), null, 200).toString().contains(secret));
    assertFalse(owner.call("GET", owner.path("/export"), null, 200).toString().contains(secret));
    assertTrue(member.call("GET", owner.path("/notes"), null, 200).toString().contains(secret));
  }

  @Test
  void preservesPrivateAuditHistoryAcrossVisibilityChanges() throws Exception {
    Client owner = registered();
    Client member = registered();
    owner.call(
        "POST", owner.path("/members"), Map.of("email", member.email, "role", "MEMBER"), 200);
    var note =
        member.call(
            "POST",
            owner.path("/notes"),
            Map.of("title", "Titre confidentiel", "content", "Contenu", "isPrivate", false),
            200);
    member.call(
        "PUT",
        owner.path("/notes/" + note.get("id").asText()),
        Map.of(
            "title", "Titre confidentiel", "content", "Contenu", "isPrivate", true, "version", 0),
        200);
    assertFalse(
        owner
            .call("GET", owner.path("/activity"), null, 200)
            .toString()
            .contains("Titre confidentiel"));
    member.call(
        "PUT",
        owner.path("/notes/" + note.get("id").asText()),
        Map.of(
            "title",
            "Version partagée",
            "content",
            "Contenu public",
            "isPrivate",
            false,
            "version",
            1),
        200);
    String sharedActivity = owner.call("GET", owner.path("/activity"), null, 200).toString();
    assertTrue(sharedActivity.contains("Version partagée"));
    assertFalse(sharedActivity.contains("Titre confidentiel"));
  }

  @Test
  void detectsConcurrentEditsAndArchivesWithoutLosingTasks() throws Exception {
    Client owner = registered();
    String project = owner.project().get("id").asText();
    var task =
        owner.call("POST", owner.path("/tasks"), taskInput(project, "Préparer", "BACKLOG", 0), 200);
    owner.call(
        "PUT",
        owner.path("/tasks/" + task.get("id").asText()),
        taskInput(project, "Préparer", "DONE", 0),
        200);
    owner.call(
        "PUT",
        owner.path("/tasks/" + task.get("id").asText()),
        taskInput(project, "Ancienne version", "READY", 0),
        409);
    owner.call(
        "PUT",
        owner.path("/projects/" + project),
        projectInput("Projet archivé", "ARCHIVED", 0),
        200);
    assertEquals(1, owner.call("GET", owner.path("/tasks"), null, 200).size());
    assertEquals(
        1, owner.call("GET", owner.path("/dashboard"), null, 200).get("doneTasks").asInt());
  }

  @Test
  void validatesAssigneesAndWebsiteSchemes() throws Exception {
    Client owner = registered();
    Client outsider = registered();
    String project = owner.project().get("id").asText();
    var task = new HashMap<>(taskInput(project, "Test", "BACKLOG", 0));
    task.put("assigneeId", outsider.user);
    owner.call("POST", owner.path("/tasks"), task, 400);
    var input = new HashMap<>(projectInput("Lien", "ACTIVE", 0));
    input.put("website", "javascript:alert(1)");
    owner.call("POST", owner.path("/projects"), input, 400);
    input.put("website", "https://example.org");
    input.put("githubRepository", "../other/repo");
    owner.call("POST", owner.path("/projects"), input, 400);
    input.put("githubRepository", "../issues");
    owner.call("POST", owner.path("/projects"), input, 400);
    input.put("githubRepository", "owner/..");
    owner.call("POST", owner.path("/projects"), input, 400);
    input.put("githubRepository", "owner/repository");
    input.put("website", "https://user:fixture-password@example.org");
    owner.call("POST", owner.path("/projects"), input, 400);
  }

  @Test
  void keepsExclusionsWhenAnEmailChangesAndIsImportedAgain() throws Exception {
    Client owner = registered();
    var contact =
        owner.call(
            "POST",
            owner.path("/contacts"),
            contactInput("Alice", "old@example.org", "DO_NOT_CONTACT", 0),
            200);
    owner.call(
        "PUT",
        owner.path("/contacts/" + contact.get("id").asText()),
        contactInput("Alice", "new@example.org", "QUALIFIED", 0),
        200);
    var imported =
        owner.call(
            "POST",
            owner.path("/contacts"),
            contactInput("Réimport", "old@example.org", "DISCOVERED", 0),
            200);
    assertTrue(imported.get("optedOut").asBoolean());
    assertEquals("DO_NOT_CONTACT", imported.get("stage").asText());
  }

  @Test
  void sendsAMailAtMostOnceAndConfirmsProviderAcceptance() throws Exception {
    Client owner = registered();
    String contact =
        owner
            .call(
                "POST",
                owner.path("/contacts"),
                contactInput("Alice", "alice@example.org", "QUALIFIED", 0),
                200)
            .get("id")
            .asText();
    var draft =
        owner.call(
            "POST",
            owner.path("/mails"),
            Map.of("contactId", contact, "subject", "Partenariat", "body", "Bonjour Alice"),
            200);
    String path = owner.path("/mails/" + draft.get("id").asText() + "/send");
    assertEquals(
        "ACCEPTED", owner.call("POST", path, Map.of("version", 0), 200).get("status").asText());
    owner.call("POST", path, Map.of("version", 0), 409);
    verify(mail, times(1)).send(owner.space, "alice@example.org", "Partenariat", "Bonjour Alice");
  }

  @Test
  void blocksMailAfterAnOptOutAndDoesNotContactTheProvider() throws Exception {
    Client owner = registered();
    var contact =
        owner.call(
            "POST",
            owner.path("/contacts"),
            contactInput("Alice", "blocked@example.org", "QUALIFIED", 0),
            200);
    var draft =
        owner.call(
            "POST",
            owner.path("/mails"),
            Map.of(
                "contactId", contact.get("id").asText(), "subject", "Bonjour", "body", "Message"),
            200);
    owner.call(
        "PUT",
        owner.path("/contacts/" + contact.get("id").asText()),
        contactInput("Alice", "blocked@example.org", "DO_NOT_CONTACT", 0),
        200);
    owner.call(
        "POST",
        owner.path("/mails/" + draft.get("id").asText() + "/send"),
        Map.of("version", 0),
        400);
    verify(mail, never()).send(anyString(), anyString(), anyString(), anyString());
  }

  @Test
  void neverAutomaticallyRetriesAnUncertainMailResult() throws Exception {
    when(mail.send(anyString(), anyString(), anyString(), anyString()))
        .thenThrow(new IllegalStateException("uncertain"));
    Client owner = registered();
    String contact =
        owner
            .call(
                "POST",
                owner.path("/contacts"),
                contactInput("Alice", "uncertain@example.org", "QUALIFIED", 0),
                200)
            .get("id")
            .asText();
    var draft =
        owner.call(
            "POST",
            owner.path("/mails"),
            Map.of("contactId", contact, "subject", "Bonjour", "body", "Message"),
            200);
    String path = owner.path("/mails/" + draft.get("id").asText() + "/send");
    assertEquals(
        "RECONCILE", owner.call("POST", path, Map.of("version", 0), 200).get("status").asText());
    owner.call("POST", path, Map.of("version", 0), 409);
    verify(mail, times(1)).send(anyString(), anyString(), anyString(), anyString());
  }

  @Test
  void createsAiTasksOnlyAfterApprovalAndRejectsRepeatedApproval() throws Exception {
    Client owner = registered();
    String project = owner.project().get("id").asText();
    var run =
        owner.call(
            "POST",
            owner.path("/ai/runs"),
            Map.of("projectId", project, "prompt", "Prépare un plan de lancement"),
            200);
    assertEquals("COMPLETED", run.get("status").asText());
    assertEquals(0, owner.call("GET", owner.path("/tasks"), null, 200).size());
    Map<String, Object> approval =
        Map.of(
            "projectId",
            project,
            "tasks",
            List.of(
                Map.of(
                    "title",
                    "Titre relu par l’utilisateur",
                    "description",
                    "Description relue",
                    "priority",
                    "HIGH",
                    "acceptance",
                    "Critères relus")));
    String path = owner.path("/ai/runs/" + run.get("id").asText() + "/accept");
    assertEquals(1, owner.call("POST", path, approval, 200).size());
    owner.call("POST", path, approval, 409);
    assertEquals(1, owner.call("GET", owner.path("/tasks"), null, 200).size());
    assertEquals(
        "Titre relu par l’utilisateur",
        owner
            .call("GET", owner.path("/ai/runs"), null, 200)
            .get(0)
            .get("result")
            .get("tasks")
            .get(0)
            .get("title")
            .asText());
  }

  @Test
  void excludesPrivateNotesFromTheAiContext() throws Exception {
    Client owner = registered();
    owner.call(
        "POST",
        owner.path("/notes"),
        Map.of("title", "Privée", "content", "NEVER-SHARE-THIS", "isPrivate", true),
        200);
    owner.call(
        "POST",
        owner.path("/notes"),
        Map.of("title", "Offre", "content", "SHARED-CONTEXT", "isPrivate", false),
        200);
    owner.call("POST", owner.path("/ai/runs"), Map.of("prompt", "Analyse mon activité"), 200);
    verify(ai)
        .generate(
            eq("Analyse mon activité"),
            argThat(
                context ->
                    context.contains("SHARED-CONTEXT") && !context.contains("NEVER-SHARE-THIS")));
  }

  @Test
  void refusesInvalidAiPlansAndShowsProviderAbsenceHonestly() throws Exception {
    Client owner = registered();
    when(ai.generate(anyString(), anyString()))
        .thenReturn(
            new AiGateway.Plan(
                "Résumé",
                List.of(new AiGateway.Proposal("", "Description", Priority.MEDIUM, "Critère"))));
    var run =
        owner.call("POST", owner.path("/ai/runs"), Map.of("prompt", "Plan invalide de test"), 200);
    assertEquals("FAILED", run.get("status").asText());
    assertEquals(0, owner.call("GET", owner.path("/tasks"), null, 200).size());
    when(ai.configured()).thenReturn(false);
    owner.call("POST", owner.path("/ai/runs"), Map.of("prompt", "Pas de fournisseur"), 503);
  }

  @Test
  void enforcesTheDailyAiQuota() throws Exception {
    Client owner = registered();
    for (int n = 0; n < 4; n++) {
      owner.call("POST", owner.path("/ai/runs"), Map.of("prompt", "Plan de test numéro " + n), 200);
    }
    owner.call("POST", owner.path("/ai/runs"), Map.of("prompt", "Demande au-delà du quota"), 429);
    verify(ai, times(4)).generate(anyString(), anyString());
  }

  @Test
  void generatesOneDailyReportPerSpaceAndProtectsCsvCells() throws Exception {
    Client owner = registered();
    owner.call(
        "POST",
        owner.path("/contacts"),
        contactInput("=2+2", "formula@example.org", "QUALIFIED", 0),
        200);
    reports.dailyReports();
    reports.dailyReports();
    assertEquals(1, owner.call("GET", owner.path("/reports"), null, 200).size());
    String csv = owner.raw("GET", owner.path("/exports/contacts.csv"), null, false).body();
    assertTrue(csv.contains("\"'=2+2\""));
    assertTrue(csv.contains("formula@example.org"));
  }

  @Test
  void refusesAnUnreviewedMailVersion() throws Exception {
    Client owner = registered();
    String contact =
        owner
            .call(
                "POST",
                owner.path("/contacts"),
                contactInput("Alice", "version@example.org", "QUALIFIED", 0),
                200)
            .get("id")
            .asText();
    var draft =
        owner.call(
            "POST",
            owner.path("/mails"),
            Map.of("contactId", contact, "subject", "Version initiale", "body", "Bonjour"),
            200);
    String id = draft.get("id").asText();
    owner.call(
        "PUT",
        owner.path("/mails/" + id),
        Map.of(
            "contactId",
            contact,
            "subject",
            "Version modifiée",
            "body",
            "Nouveau contenu",
            "version",
            0),
        200);
    owner.call("POST", owner.path("/mails/" + id + "/send"), Map.of("version", 0), 409);
    verify(mail, never()).send(anyString(), anyString(), anyString(), anyString());
  }

  @Test
  void recoversInterruptedOperationsWithoutRepeatingAnExternalAction() throws Exception {
    Client owner = registered();
    String contact =
        owner
            .call(
                "POST",
                owner.path("/contacts"),
                contactInput("Alice", "restart@example.org", "QUALIFIED", 0),
                200)
            .get("id")
            .asText();
    var draft =
        owner.call(
            "POST",
            owner.path("/mails"),
            Map.of("contactId", contact, "subject", "Test", "body", "Message"),
            200);
    jdbc.update("UPDATE mail_drafts SET status = 'SENDING' WHERE id = ?", draft.get("id").asText());
    jdbc.update(
        "INSERT INTO ai_runs(id, space_id, author_id, prompt, provider, model, status) VALUES (?, ?, ?, ?, ?, ?, 'RUNNING')",
        UUID.randomUUID().toString(),
        owner.space,
        owner.user,
        "Demande interrompue",
        "test",
        "test-model");
    recovery.interruptedOperations();
    assertEquals(
        "RECONCILE",
        owner.call("GET", owner.path("/mails"), null, 200).get(0).get("status").asText());
    assertEquals(
        "FAILED",
        owner.call("GET", owner.path("/ai/runs"), null, 200).get(0).get("status").asText());
    verify(mail, never()).send(anyString(), anyString(), anyString(), anyString());
    verify(ai, never()).generate(anyString(), anyString());
  }

  static Map<String, Object> projectInput(String name, String status, int version) {
    return Map.of(
        "name",
        name,
        "description",
        "Description",
        "goal",
        "Un objectif vérifiable",
        "color",
        "#47876A",
        "status",
        status,
        "version",
        version);
  }

  static Map<String, Object> taskInput(String project, String title, String status, int version) {
    return Map.of(
        "projectId",
        project,
        "title",
        title,
        "description",
        "Description",
        "acceptance",
        "Résultat attendu",
        "status",
        status,
        "priority",
        "HIGH",
        "version",
        version);
  }

  static Map<String, Object> contactInput(String name, String email, String stage, int version) {
    return Map.of(
        "name", name, "company", "Exemple", "email", email, "stage", stage, "version", version);
  }

  String email() {
    return "test-" + UUID.randomUUID() + "@example.org";
  }

  Client registered() throws Exception {
    Client client = new Client();
    client.email = email();
    var result =
        client.call(
            "POST",
            "/api/auth/register",
            Map.of(
                "name",
                "Test",
                "email",
                client.email,
                "password",
                "local-test-password",
                "spaceName",
                "Espace test"),
            200);
    client.user = result.get("id").asText();
    client.refreshCsrf();
    String form =
        "email="
            + URLEncoder.encode(client.email, StandardCharsets.UTF_8)
            + "&password=local-test-password";
    var response =
        client.http.send(
            HttpRequest.newBuilder(URI.create("http://localhost:" + port + "/api/auth/login"))
                .header("Content-Type", "application/x-www-form-urlencoded")
                .header("X-CSRF-TOKEN", client.csrf)
                .POST(HttpRequest.BodyPublishers.ofString(form))
                .build(),
            HttpResponse.BodyHandlers.ofString());
    assertEquals(200, response.statusCode(), response.body());
    client.refreshCsrf();
    client.space = client.call("GET", "/api/me", null, 200).get("spaces").get(0).get("id").asText();
    return client;
  }

  class Client {
    final HttpClient http =
        HttpClient.newBuilder()
            .cookieHandler(new CookieManager(null, CookiePolicy.ACCEPT_ALL))
            .build();
    String csrf;
    String space;
    String user;
    String email;

    String path(String suffix) {
      return "/api/spaces/" + space + suffix;
    }

    void refreshCsrf() throws Exception {
      var response = raw("GET", "/api/auth/csrf", null, false);
      csrf = json.readTree(response.body()).get("token").asText();
    }

    JsonNode call(String method, String path, Object body, int expected) throws Exception {
      if (!method.equals("GET") && csrf == null) {
        refreshCsrf();
      }
      var response =
          raw(
              method,
              path,
              body == null ? null : json.writeValueAsString(body),
              !method.equals("GET"));
      assertEquals(expected, response.statusCode(), response.body());
      return response.body().isBlank() ? json.createObjectNode() : json.readTree(response.body());
    }

    HttpResponse<String> raw(String method, String path, String body, boolean withCsrf)
        throws Exception {
      var request =
          HttpRequest.newBuilder(URI.create("http://localhost:" + port + path))
              .header("Content-Type", "application/json");
      if (withCsrf && csrf != null) {
        request.header("X-CSRF-TOKEN", csrf);
      }
      request.method(
          method,
          body == null
              ? HttpRequest.BodyPublishers.noBody()
              : HttpRequest.BodyPublishers.ofString(body));
      return http.send(request.build(), HttpResponse.BodyHandlers.ofString());
    }

    JsonNode project() throws Exception {
      return call("POST", path("/projects"), projectInput("Sportcooks test", "ACTIVE", 0), 200);
    }
  }
}
