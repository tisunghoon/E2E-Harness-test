package dev.harness.board;

import java.util.Map;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestControllerAdvice
public class ApiErrors {
    @ExceptionHandler(DuplicateKeyException.class)
    ResponseEntity<?> duplicate() {
        return ResponseEntity.status(409).body(Map.of("message", "이미 가입된 이메일입니다."));
    }
    @ExceptionHandler({MethodArgumentNotValidException.class, HttpMessageNotReadableException.class})
    ResponseEntity<?> invalid() {
        return ResponseEntity.badRequest().body(Map.of("message", "입력값을 확인해 주세요. 빈 값이나 너무 긴 내용은 저장할 수 없습니다."));
    }
    @ExceptionHandler(ResponseStatusException.class)
    ResponseEntity<?> status(ResponseStatusException error) {
        return ResponseEntity.status(error.getStatusCode()).body(Map.of("message", error.getReason() == null ? "요청을 처리할 수 없습니다." : error.getReason()));
    }
}
