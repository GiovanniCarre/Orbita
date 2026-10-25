package fr.orbita.work;

import jakarta.validation.constraints.*;
import java.time.Instant;
import java.time.LocalDate;

public final class Models {
  private Models() {}

  public enum ProjectStatus {
    ACTIVE,
    PAUSED,
    ARCHIVED
  }

  public enum TaskStatus {
    BACKLOG,
    READY,
    IN_PROGRESS,
    IN_REVIEW,
    DONE
  }

  public enum Priority {
    LOW,
    MEDIUM,
    HIGH,
    URGENT
  }

  public enum Stage {
    DISCOVERED,
    QUALIFIED,
    CONTACTED,
    NEGOTIATION,
    WON,
    LOST,
    DO_NOT_CONTACT
  }

  public record ProjectInput(
      @NotBlank @Size(max = 120) String name,
      @Size(max = 4000) String description,
      @Size(max = 2000) String goal,
      @NotNull @Pattern(regexp = "#[a-fA-F0-9]{6}") String color,
      @NotNull ProjectStatus status,
      @Size(max = 500) String website,
      @Size(max = 200) String githubRepository,
      @PositiveOrZero long version) {}

  public record Project(
      String id,
      String name,
      String description,
      String goal,
      String color,
      ProjectStatus status,
      String website,
      String githubRepository,
      long version,
      Instant createdAt) {}

  public record TaskInput(
      @NotBlank String projectId,
      @NotBlank @Size(max = 160) String title,
      @Size(max = 8000) String description,
      @Size(max = 4000) String acceptance,
      @NotNull TaskStatus status,
      @NotNull Priority priority,
      boolean blocked,
      LocalDate dueDate,
      String assigneeId,
      @PositiveOrZero long version) {}

  public record Task(
      String id,
      String projectId,
      String title,
      String description,
      String acceptance,
      TaskStatus status,
      Priority priority,
      boolean blocked,
      LocalDate dueDate,
      String assigneeId,
      long version,
      Instant createdAt,
      Instant updatedAt) {}

  public record ContactInput(
      String projectId,
      @NotBlank @Size(max = 120) String name,
      @Size(max = 160) String company,
      @Email @Size(max = 254) String email,
      @Size(max = 500) String website,
      @NotNull Stage stage,
      @Size(max = 8000) String notes,
      @PositiveOrZero long version) {}

  public record Contact(
      String id,
      String projectId,
      String name,
      String company,
      String email,
      String website,
      Stage stage,
      String notes,
      boolean optedOut,
      long version,
      Instant createdAt) {}

  public record NoteInput(
      String projectId,
      @NotBlank @Size(max = 160) String title,
      @Size(max = 30000) String content,
      boolean isPrivate,
      @PositiveOrZero long version) {}

  public record Note(
      String id,
      String projectId,
      String authorId,
      String title,
      String content,
      boolean isPrivate,
      long version,
      Instant createdAt,
      Instant updatedAt) {}
}
