package fr.orbita.mail;

import jakarta.mail.internet.MimeMessage;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Component;

@Component
public class SmtpGateway implements MailGateway {
  private final ObjectProvider<JavaMailSender> senders;
  private final String host;
  private final String from;
  private final String spaceId;

  public SmtpGateway(
      ObjectProvider<JavaMailSender> senders,
      @Value("${spring.mail.host:}") String host,
      @Value("${orbita.mail-from}") String from,
      @Value("${orbita.smtp-space-id}") String spaceId) {
    this.senders = senders;
    this.host = host;
    this.from = from;
    this.spaceId = spaceId;
  }

  public boolean configured(String space) {
    return spaceId.equals(space)
        && !host.isBlank()
        && !from.isBlank()
        && senders.getIfAvailable() != null;
  }

  public String send(String space, String recipient, String subject, String body) {
    if (!configured(space)) {
      throw new IllegalStateException("Connexion SMTP indisponible dans cet espace.");
    }
    try {
      JavaMailSender sender = senders.getObject();
      MimeMessage message = sender.createMimeMessage();
      MimeMessageHelper helper = new MimeMessageHelper(message, false, "UTF-8");
      helper.setFrom(from);
      helper.setTo(recipient);
      helper.setSubject(subject);
      helper.setText(body, false);
      sender.send(message);
      return message.getMessageID();
    } catch (Exception exception) {
      throw new IllegalStateException("Le résultat de l'envoi SMTP doit être vérifié.");
    }
  }
}
