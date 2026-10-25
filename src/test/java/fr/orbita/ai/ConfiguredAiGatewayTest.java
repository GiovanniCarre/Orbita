package fr.orbita.ai;

import static org.junit.jupiter.api.Assertions.*;

import com.sun.net.httpserver.HttpServer;
import fr.orbita.api.ApiException;
import fr.orbita.work.Models.Priority;
import jakarta.validation.Validation;
import jakarta.validation.ValidatorFactory;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.json.JsonMapper;

class ConfiguredAiGatewayTest {
  private final ObjectMapper json = JsonMapper.builder().build();
  private final AtomicReference<String> requestBody = new AtomicReference<>();
  private HttpServer server;
  private ValidatorFactory validators;
  private String responseBody;
  private int responseStatus;
  private ConfiguredAiGateway gateway;

  @BeforeEach
  void start() throws Exception {
    validators = Validation.buildDefaultValidatorFactory();
    server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
    server.createContext(
        "/api/chat",
        exchange -> {
          requestBody.set(
              new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8));
          byte[] bytes = responseBody.getBytes(StandardCharsets.UTF_8);
          exchange.getResponseHeaders().set("Content-Type", "application/json");
          exchange.sendResponseHeaders(responseStatus, bytes.length);
          exchange.getResponseBody().write(bytes);
          exchange.close();
        });
    server.start();
    gateway =
        new ConfiguredAiGateway(
            "ollama",
            "test-model",
            "",
            "http://127.0.0.1:" + server.getAddress().getPort(),
            json,
            validators.getValidator());
  }

  @AfterEach
  void stop() {
    server.stop(0);
    validators.close();
  }

  @Test
  void sendsASchemaAndParsesARealHttpProviderResponse() {
    var plan =
        new AiGateway.Plan(
            "Un plan vérifiable.",
            List.of(
                new AiGateway.Proposal(
                    "Définir le résultat",
                    "Clarifier le besoin.",
                    Priority.HIGH,
                    "Un objectif validé.")));
    responseStatus = 200;
    responseBody =
        json.writeValueAsString(
            Map.of("done", true, "message", Map.of("content", json.writeValueAsString(plan))));
    assertEquals(plan, gateway.generate("Prépare un plan", "{\"project\":\"Exemple\"}"));
    var body = json.readTree(requestBody.get());
    assertFalse(body.get("stream").asBoolean());
    assertEquals("object", body.get("format").get("type").asText());
    assertEquals("test-model", body.get("model").asText());
    assertTrue(body.get("messages").get(1).get("content").asText().contains("Exemple"));
  }

  @Test
  void rejectsMalformedOrIncompleteProviderOutput() {
    responseStatus = 200;
    for (String output :
        List.of(
            "not-json", "{\"done\":false}", "{\"done\":true,\"message\":{\"content\":\"{}\"}}")) {
      responseBody = output;
      assertThrows(ApiException.class, () -> gateway.generate("Prépare un plan", "{}"));
    }
  }

  @Test
  void neverExposesAProviderErrorBodyOrCredential() {
    responseStatus = 500;
    responseBody = "secret-that-must-not-appear";
    var error = assertThrows(ApiException.class, () -> gateway.generate("Prépare un plan", "{}"));
    assertFalse(error.getMessage().contains(responseBody));
    assertTrue(error.getMessage().contains("HTTP 500"));
  }

  @Test
  void staysUnavailableWithoutExplicitProviderAndModelConfiguration() {
    var disabled = new ConfiguredAiGateway("disabled", "", "", "", json, validators.getValidator());
    assertFalse(disabled.configured());
    assertThrows(ApiException.class, () -> disabled.generate("Une demande", "{}"));
    assertNull(requestBody.get());
  }
}
