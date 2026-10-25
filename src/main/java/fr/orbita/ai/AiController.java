package fr.orbita.ai;

import static fr.orbita.auth.Access.Permission.*;

import fr.orbita.ai.AiGateway.Proposal;
import fr.orbita.auth.Access;
import fr.orbita.work.Models.Task;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.List;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/spaces/{space}/ai")
public class AiController {
  public record Request(String projectId, @NotBlank @Size(min = 5, max = 4000) String prompt) {}

  public record Approval(
      @NotBlank String projectId, @NotNull @Size(min = 1, max = 12) List<@Valid Proposal> tasks) {}

  private final Access access;
  private final AiService ai;

  public AiController(Access access, AiService ai) {
    this.access = access;
    this.ai = ai;
  }

  @GetMapping("/runs")
  List<AiService.Run> history(@PathVariable String space, Authentication auth) {
    var actor = access.actor(auth);
    access.require(space, actor, READ);
    return ai.history(space, actor.id());
  }

  @PostMapping("/runs")
  AiService.Run generate(
      @PathVariable String space, @Valid @RequestBody Request input, Authentication auth) {
    var actor = access.actor(auth);
    access.require(space, actor, WRITE);
    return ai.generate(space, input.projectId(), input.prompt().trim(), actor);
  }

  @PostMapping("/runs/{id}/accept")
  List<Task> accept(
      @PathVariable String space,
      @PathVariable String id,
      @Valid @RequestBody Approval input,
      Authentication auth) {
    var actor = access.actor(auth);
    access.require(space, actor, WRITE);
    return ai.accept(space, id, input.projectId(), input.tasks(), actor);
  }
}
