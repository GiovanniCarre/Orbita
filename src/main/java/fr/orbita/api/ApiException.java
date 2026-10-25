package fr.orbita.api;

import org.springframework.http.HttpStatus;

public class ApiException extends RuntimeException {
  private final HttpStatus status;

  public ApiException(HttpStatus status, String message) {
    super(message);
    this.status = status;
  }

  public HttpStatus status() {
    return status;
  }

  public static ApiException missing() {
    return new ApiException(HttpStatus.NOT_FOUND, "Cet élément est introuvable dans cet espace.");
  }

  public static ApiException invalid(String message) {
    return new ApiException(HttpStatus.BAD_REQUEST, message);
  }

  public static ApiException forbidden() {
    return new ApiException(HttpStatus.FORBIDDEN, "Votre rôle ne permet pas cette action.");
  }

  public static ApiException conflict() {
    return new ApiException(
        HttpStatus.CONFLICT, "Cet élément a changé. Actualisez la page avant de réessayer.");
  }
}
