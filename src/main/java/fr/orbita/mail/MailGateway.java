package fr.orbita.mail;

public interface MailGateway {
  boolean configured(String space);

  String send(String space, String recipient, String subject, String body);
}
