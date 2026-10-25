# syntax=docker/dockerfile:1.7
FROM node:24-alpine AS web
WORKDIR /web
COPY frontend/package*.json ./
RUN npm ci --no-audit --no-fund
COPY frontend/ ./
RUN npm test && npm run build

FROM maven:3.9-eclipse-temurin-25@sha256:93b8a14ea2f412782e4e842651273b4d903e35cc496284f178fbbe2d67d00976 AS build
WORKDIR /workspace
COPY pom.xml .
COPY src/ src/
COPY --from=web /web/dist frontend/dist
RUN --mount=type=cache,id=orbita-maven,target=/root/.m2 mvn -B -ntp verify

FROM eclipse-temurin:25-jre@sha256:dbb43d81099eec91e0800226ed2296d03146ee7857165b95112372ad0d67e87f AS runtime
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd --gid 10001 orbita \
    && useradd --uid 10001 --gid orbita --no-create-home orbita \
    && mkdir -p /app /data \
    && chown orbita:orbita /app /data
WORKDIR /app
COPY --from=build --chown=orbita:orbita /workspace/target/orbita-0.1.0-SNAPSHOT.jar orbita.jar
ENV ORBITA_BIND_ADDRESS=0.0.0.0
ENV ORBITA_DATABASE_URL="jdbc:h2:file:/data/orbita;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DEFAULT_NULL_ORDERING=HIGH"
USER 10001:10001
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=35s --retries=3 CMD curl --fail --silent http://127.0.0.1:8080/api/health || exit 1
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=70", "-jar", "/app/orbita.jar"]
