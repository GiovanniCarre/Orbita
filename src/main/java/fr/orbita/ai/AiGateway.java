package fr.orbita.ai;

import fr.orbita.work.Models.Priority;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.List;

public interface AiGateway {
  record Proposal(
      @NotBlank @Size(max = 160) String title,
      @NotBlank @Size(max = 8000) String description,
      @NotNull Priority priority,
      @NotBlank @Size(max = 4000) String acceptance) {}

  record Plan(
      @NotBlank @Size(max = 12000) String summary,
      @NotNull @Size(max = 12) List<@Valid Proposal> tasks) {}

  Plan generate(String request, String context);

  boolean configured();

  String provider();

  String model();
}
