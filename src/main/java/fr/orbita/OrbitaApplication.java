package fr.orbita;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class OrbitaApplication {
  public static void main(String[] args) {
    SpringApplication.run(OrbitaApplication.class, args);
  }
}
