package fr.orbita.api;

import java.util.Map;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class ApiErrors {
  @ExceptionHandler(ApiException.class)
  ResponseEntity<?> domain(ApiException exception) {
    return ResponseEntity.status(exception.status())
        .body(Map.of("message", exception.getMessage()));
  }

  @ExceptionHandler(MethodArgumentNotValidException.class)
  ResponseEntity<?> validation(MethodArgumentNotValidException exception) {
    return ResponseEntity.badRequest()
        .body(
            Map.of(
                "message",
                "Vérifiez les champs du formulaire.",
                "fields",
                exception.getBindingResult().getFieldErrors().stream()
                    .map(
                        error ->
                            Map.of(
                                "field",
                                error.getField(),
                                "message",
                                error.getDefaultMessage() == null
                                    ? "Valeur invalide"
                                    : error.getDefaultMessage()))
                    .toList()));
  }

  @ExceptionHandler(HttpMessageNotReadableException.class)
  ResponseEntity<?> invalidJson() {
    return ResponseEntity.badRequest()
        .body(Map.of("message", "Le format d'un champ est invalide."));
  }

  @ExceptionHandler(DataIntegrityViolationException.class)
  ResponseEntity<?> duplicate() {
    return ResponseEntity.status(HttpStatus.CONFLICT)
        .body(
            Map.of(
                "message",
                "Cette adresse existe déjà dans cet espace ou cet élément est encore utilisé."));
  }
}
