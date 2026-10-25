package fr.orbita.work;

import static fr.orbita.auth.Access.Permission.*;
import static fr.orbita.work.Models.*;

import fr.orbita.auth.Access;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/spaces/{space}")
public class WorkController {
  private final Access access;
  private final WorkService work;
  private final AuditLog audit;

  public WorkController(Access access, WorkService work, AuditLog audit) {
    this.access = access;
    this.work = work;
    this.audit = audit;
  }

  @GetMapping("/projects")
  List<Project> projects(@PathVariable String space, Authentication auth) {
    access.require(space, access.actor(auth), READ);
    return work.projects(space);
  }

  @PostMapping("/projects")
  Project createProject(
      @PathVariable String space, @Valid @RequestBody ProjectInput input, Authentication auth) {
    var actor = writer(space, auth);
    return work.saveProject(space, null, input, actor);
  }

  @PutMapping("/projects/{id}")
  Project updateProject(
      @PathVariable String space,
      @PathVariable String id,
      @Valid @RequestBody ProjectInput input,
      Authentication auth) {
    var actor = writer(space, auth);
    return work.saveProject(space, id, input, actor);
  }

  @GetMapping("/tasks")
  List<Task> tasks(@PathVariable String space, Authentication auth) {
    access.require(space, access.actor(auth), READ);
    return work.tasks(space);
  }

  @PostMapping("/tasks")
  Task createTask(
      @PathVariable String space, @Valid @RequestBody TaskInput input, Authentication auth) {
    var actor = writer(space, auth);
    return work.saveTask(space, null, input, actor);
  }

  @PutMapping("/tasks/{id}")
  Task updateTask(
      @PathVariable String space,
      @PathVariable String id,
      @Valid @RequestBody TaskInput input,
      Authentication auth) {
    var actor = writer(space, auth);
    return work.saveTask(space, id, input, actor);
  }

  @GetMapping("/contacts")
  List<Contact> contacts(@PathVariable String space, Authentication auth) {
    access.require(space, access.actor(auth), READ);
    return work.contacts(space);
  }

  @PostMapping("/contacts")
  Contact createContact(
      @PathVariable String space, @Valid @RequestBody ContactInput input, Authentication auth) {
    var actor = writer(space, auth);
    return work.saveContact(space, null, input, actor);
  }

  @PutMapping("/contacts/{id}")
  Contact updateContact(
      @PathVariable String space,
      @PathVariable String id,
      @Valid @RequestBody ContactInput input,
      Authentication auth) {
    var actor = writer(space, auth);
    return work.saveContact(space, id, input, actor);
  }

  @GetMapping("/notes")
  List<Note> notes(@PathVariable String space, Authentication auth) {
    var actor = access.actor(auth);
    access.require(space, actor, READ);
    return work.notes(space, actor.id());
  }

  @PostMapping("/notes")
  Note createNote(
      @PathVariable String space, @Valid @RequestBody NoteInput input, Authentication auth) {
    var actor = writer(space, auth);
    return work.saveNote(space, null, input, actor);
  }

  @PutMapping("/notes/{id}")
  Note updateNote(
      @PathVariable String space,
      @PathVariable String id,
      @Valid @RequestBody NoteInput input,
      Authentication auth) {
    var actor = writer(space, auth);
    return work.saveNote(space, id, input, actor);
  }

  @GetMapping("/activity")
  List<AuditLog.Entry> activity(@PathVariable String space, Authentication auth) {
    var actor = access.actor(auth);
    access.require(space, actor, READ);
    return audit.recent(space, actor.id());
  }

  private Access.Actor writer(String space, Authentication auth) {
    var actor = access.actor(auth);
    access.require(space, actor, WRITE);
    return actor;
  }
}
