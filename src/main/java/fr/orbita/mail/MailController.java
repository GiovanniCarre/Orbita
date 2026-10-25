package fr.orbita.mail;

import static fr.orbita.auth.Access.Permission.*;

import fr.orbita.auth.Access;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/spaces/{space}/mails")
public class MailController {
  public record SendInput(@jakarta.validation.constraints.PositiveOrZero long version) {}

  private final Access access;
  private final MailService mail;

  public MailController(Access access, MailService mail) {
    this.access = access;
    this.mail = mail;
  }

  @GetMapping
  List<MailService.Draft> list(@PathVariable String space, Authentication auth) {
    access.require(space, access.actor(auth), READ);
    return mail.list(space);
  }

  @PostMapping
  MailService.Draft create(
      @PathVariable String space,
      @Valid @RequestBody MailService.Input input,
      Authentication auth) {
    var actor = access.actor(auth);
    access.require(space, actor, WRITE);
    return mail.save(space, null, input, actor);
  }

  @PutMapping("/{id}")
  MailService.Draft update(
      @PathVariable String space,
      @PathVariable String id,
      @Valid @RequestBody MailService.Input input,
      Authentication auth) {
    var actor = access.actor(auth);
    access.require(space, actor, WRITE);
    return mail.save(space, id, input, actor);
  }

  @PostMapping("/{id}/send")
  MailService.Draft send(
      @PathVariable String space,
      @PathVariable String id,
      @Valid @RequestBody SendInput input,
      Authentication auth) {
    var actor = access.actor(auth);
    access.require(space, actor, ADMIN);
    return mail.send(space, id, input.version(), actor);
  }
}
