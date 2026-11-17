package dev.harness.board;

import java.security.Principal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/posts")
public class PostController {
    private final JdbcTemplate jdbc;
    private final AuthController members;
    public PostController(JdbcTemplate jdbc, AuthController members) { this.jdbc = jdbc; this.members = members; }
    public record Input(@NotBlank @Size(max=120) String title, @NotBlank @Size(max=10000) String body) {}
    public record Post(String id, String authorId, String title, String body, OffsetDateTime createdAt) {}
    private static final RowMapper<Post> MAPPER = (rs, row) -> new Post(rs.getString("id"),
        rs.getString("author_id"), rs.getString("title"), rs.getString("body"),
        rs.getObject("created_at", OffsetDateTime.class));

    @GetMapping List<Post> list() {
        return jdbc.query("SELECT * FROM posts ORDER BY created_at DESC,id DESC", MAPPER);
    }
    @GetMapping("/{id}") Post get(@PathVariable String id) {
        return jdbc.query("SELECT * FROM posts WHERE id=?", MAPPER, id).stream().findFirst()
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "글을 찾을 수 없습니다."));
    }
    @PostMapping @ResponseStatus(HttpStatus.CREATED)
    Post create(@Valid @RequestBody Input input, Principal principal) {
        String id = UUID.randomUUID().toString();
        String author = members.member(principal.getName()).id();
        jdbc.update("INSERT INTO posts(id,author_id,title,body,created_at) VALUES (?,?,?,?,?)",
            id, author, input.title(), input.body(), OffsetDateTime.now());
        return get(id);
    }
    @PutMapping("/{id}") @Transactional
    Post update(@PathVariable String id, @Valid @RequestBody Input input, Principal principal) {
        String author = members.member(principal.getName()).id();
        checkOwner(id, author);
        jdbc.update("UPDATE posts SET title=?,body=? WHERE id=? AND author_id=?",
            input.title(), input.body(), id, author);
        return get(id);
    }
    @DeleteMapping("/{id}") @ResponseStatus(HttpStatus.NO_CONTENT) @Transactional
    void delete(@PathVariable String id, Principal principal) {
        String author = members.member(principal.getName()).id();
        checkOwner(id, author);
        jdbc.update("DELETE FROM posts WHERE id=? AND author_id=?", id, author);
    }
    private void checkOwner(String id, String author) {
        if (!get(id).authorId().equals(author))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "작성자만 수정하거나 삭제할 수 있습니다.");
    }
}
