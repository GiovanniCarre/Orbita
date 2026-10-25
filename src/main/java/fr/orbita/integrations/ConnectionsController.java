package fr.orbita.integrations;

import static fr.orbita.auth.Access.Permission.READ;

import fr.orbita.ai.AiGateway;
import fr.orbita.api.ApiException;
import fr.orbita.auth.Access;
import fr.orbita.mail.MailGateway;
import fr.orbita.work.WorkService;
import java.net.URI;
import java.net.http.*;
import java.time.Duration;
import java.util.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

@RestController
@RequestMapping("/api/spaces/{space}")
public class ConnectionsController {
  private final Access access;
  private final WorkService work;
  private final AiGateway ai;
  private final MailGateway mail;
  private final ObjectMapper json;
  private final String githubToken;
  private final String githubSpace;
  private final HttpClient http =
      HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();

  public ConnectionsController(
      Access access,
      WorkService work,
      AiGateway ai,
      MailGateway mail,
      ObjectMapper json,
      @Value("${orbita.github-token}") String token,
      @Value("${orbita.github-space-id}") String githubSpace) {
    this.access = access;
    this.work = work;
    this.ai = ai;
    this.mail = mail;
    this.json = json;
    this.githubToken = token;
    this.githubSpace = githubSpace;
  }

  @GetMapping("/connections")
  Map<String, Object> connections(@PathVariable String space, Authentication auth) {
    access.require(space, access.actor(auth), READ);
    return Map.of(
        "ai",
        Map.of("configured", ai.configured(), "provider", ai.provider(), "model", ai.model()),
        "smtp",
        Map.of("configured", mail.configured(space)),
        "github",
        Map.of(
            "authenticated",
            !githubToken.isBlank() && githubSpace.equals(space),
            "publicReadAvailable",
            true));
  }

  @GetMapping("/projects/{id}/github")
  Map<String, Object> github(
      @PathVariable String space, @PathVariable String id, Authentication auth) {
    access.require(space, access.actor(auth), READ);
    String repository = work.project(space, id).githubRepository();
    if (repository.isBlank()) {
      throw ApiException.invalid("Associez un dépôt GitHub au projet.");
    }
    try {
      var builder =
          HttpRequest.newBuilder(
                  URI.create(
                      "https://api.github.com/repos/"
                          + repository
                          + "/issues?state=all&per_page=20"))
              .timeout(Duration.ofSeconds(20))
              .header("Accept", "application/vnd.github+json")
              .header("User-Agent", "orbita");
      // A server token can only grant private access to its explicitly assigned workspace.
      if (!githubToken.isBlank() && githubSpace.equals(space)) {
        builder.header("Authorization", "Bearer " + githubToken);
      }
      var response = http.send(builder.GET().build(), HttpResponse.BodyHandlers.ofString());
      if (response.statusCode() != 200) {
        throw new ApiException(
            HttpStatus.BAD_GATEWAY,
            "GitHub est indisponible ou ce dépôt n'est pas accessible (HTTP "
                + response.statusCode()
                + ").");
      }
      JsonNode data = json.readTree(response.body());
      List<Map<String, Object>> items = new ArrayList<>();
      for (JsonNode item : data) {
        long number = item.path("number").asLong();
        boolean pr = item.has("pull_request");
        items.add(
            Map.of(
                "number",
                number,
                "title",
                item.path("title").asText(),
                "state",
                item.path("state").asText(),
                "pullRequest",
                pr,
                "url",
                "https://github.com/" + repository + (pr ? "/pull/" : "/issues/") + number));
      }
      return Map.of(
          "repository",
          repository,
          "items",
          items,
          "fetchedAt",
          java.time.Instant.now().toString());
    } catch (ApiException exception) {
      throw exception;
    } catch (InterruptedException exception) {
      Thread.currentThread().interrupt();
      throw new ApiException(HttpStatus.BAD_GATEWAY, "La lecture GitHub a été interrompue.");
    } catch (Exception exception) {
      throw new ApiException(HttpStatus.BAD_GATEWAY, "Impossible de lire GitHub pour le moment.");
    }
  }
}
