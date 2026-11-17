FROM gradle:9.2.1-jdk21 AS build
WORKDIR /app
COPY backend/ .
RUN gradle bootJar --no-daemon
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=build /app/build/libs/board.jar /app/board.jar
ENV JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=65 -XX:+ExitOnOutOfMemoryError"
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/board.jar"]
