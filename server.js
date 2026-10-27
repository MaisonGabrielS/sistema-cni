require("dotenv").config();

const express = require("express");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const path = require("path");
const { pool, initDb } = require("./db");

const app = express();
const PORT = Number(process.env.PORT || 3000);
const JWT_SECRET = process.env.JWT_SECRET || "";

if (process.env.NODE_ENV === "production" && JWT_SECRET.length < 32) {
  throw new Error("JWT_SECRET precisa ter pelo menos 32 caracteres nas variáveis de ambiente.");
}
if (JWT_SECRET.length < 32) {
  console.warn("AVISO: configure JWT_SECRET com pelo menos 32 caracteres no arquivo .env.");
}

app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: "100kb" }));

// Em produção, a Vercel entrega os arquivos de /public pelo CDN.
// express.static também é útil para executar localmente.
app.use(express.static(path.join(__dirname, "public")));

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Muitas tentativas. Aguarde alguns minutos e tente novamente." }
});

// Garante que as tabelas existam antes de processar uma rota da API.
app.use("/api", async (_req, res, next) => {
  try {
    await initDb();
    next();
  } catch (error) {
    console.error("Falha ao inicializar o banco:", error.message);
    res.status(500).json({ error: "Não foi possível conectar ao banco de dados." });
  }
});

function auth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return res.status(401).json({ error: "Faça login para continuar." });

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: "Sessão inválida ou expirada. Entre novamente." });
  }
}

function allow(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Você não tem permissão para esta ação." });
    }
    next();
  };
}

app.post("/api/auth/login", loginLimiter, async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");
  if (!email || !password) return res.status(400).json({ error: "Informe e-mail e senha." });

  try {
    const result = await pool.query(
      "SELECT id, name, email, password_hash, role, active FROM users WHERE email = $1",
      [email]
    );
    const user = result.rows[0];
    if (!user || !user.active || !bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ error: "E-mail ou senha inválidos." });
    }

    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: "8h" }
    );
    return res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (error) {
    console.error("Erro no login:", error.message);
    return res.status(500).json({ error: "Não foi possível realizar o login." });
  }
});

app.get("/api/me", auth, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, name, email, role FROM users WHERE id = $1 AND active = TRUE",
      [req.user.id]
    );
    const user = result.rows[0];
    if (!user) return res.status(404).json({ error: "Usuário não encontrado." });
    return res.json({ user });
  } catch (error) {
    console.error("Erro ao consultar usuário:", error.message);
    return res.status(500).json({ error: "Não foi possível consultar o usuário." });
  }
});

app.get("/api/courses", auth, async (req, res) => {
  try {
    let result;
    if (req.user.role === "admin" || req.user.role === "teacher") {
      result = await pool.query(`
        SELECT c.id, c.title, c.description, c.modality, c.published,
               COUNT(e.id)::int AS enrolled_count
        FROM courses c
        LEFT JOIN enrollments e ON e.course_id = c.id
        GROUP BY c.id
        ORDER BY c.created_at DESC
      `);
    } else {
      result = await pool.query(`
        SELECT c.id, c.title, c.description, c.modality, c.published,
               e.progress, e.id AS enrollment_id
        FROM enrollments e
        JOIN courses c ON c.id = e.course_id
        WHERE e.user_id = $1
        ORDER BY e.created_at DESC
      `, [req.user.id]);
    }
    return res.json({ courses: result.rows });
  } catch (error) {
    console.error("Erro ao listar cursos:", error.message);
    return res.status(500).json({ error: "Não foi possível carregar os cursos." });
  }
});

app.post("/api/courses", auth, allow("admin", "teacher"), async (req, res) => {
  const title = String(req.body.title || "").trim();
  const description = String(req.body.description || "").trim();
  const modality = String(req.body.modality || "EAD");

  if (title.length < 3 || title.length > 120) {
    return res.status(400).json({ error: "O título deve ter entre 3 e 120 caracteres." });
  }
  if (!["EAD", "Presencial", "Híbrido"].includes(modality)) {
    return res.status(400).json({ error: "Modalidade inválida." });
  }

  try {
    const result = await pool.query(
      "INSERT INTO courses (title, description, modality, created_by) VALUES ($1, $2, $3, $4) RETURNING id",
      [title, description.slice(0, 2000), modality, req.user.id]
    );
    return res.status(201).json({ id: result.rows[0].id, message: "Curso criado como rascunho." });
  } catch (error) {
    console.error("Erro ao criar curso:", error.message);
    return res.status(500).json({ error: "Não foi possível cadastrar o curso." });
  }
});

app.patch("/api/courses/:id/publish", auth, allow("admin"), async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: "ID de curso inválido." });

  try {
    const result = await pool.query("SELECT id, published FROM courses WHERE id = $1", [id]);
    const course = result.rows[0];
    if (!course) return res.status(404).json({ error: "Curso não encontrado." });

    const published = !course.published;
    await pool.query("UPDATE courses SET published = $1 WHERE id = $2", [published, id]);
    return res.json({ published });
  } catch (error) {
    console.error("Erro ao publicar curso:", error.message);
    return res.status(500).json({ error: "Não foi possível atualizar a publicação." });
  }
});

app.post("/api/enrollments", auth, allow("admin"), async (req, res) => {
  const userId = Number(req.body.userId);
  const courseId = Number(req.body.courseId);
  if (!Number.isInteger(userId) || !Number.isInteger(courseId) || userId < 1 || courseId < 1) {
    return res.status(400).json({ error: "Informe os IDs de aluno e curso." });
  }

  try {
    await pool.query(
      "INSERT INTO enrollments (user_id, course_id) VALUES ($1, $2)",
      [userId, courseId]
    );
    return res.status(201).json({ message: "Matrícula criada." });
  } catch (error) {
    if (error.code === "23505" || error.code === "23503") {
      return res.status(400).json({ error: "Não foi possível matricular. Confira os IDs e se já existe matrícula." });
    }
    console.error("Erro ao criar matrícula:", error.message);
    return res.status(500).json({ error: "Não foi possível criar a matrícula." });
  }
});

app.get("/api/admin/users", auth, allow("admin"), async (_req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, name, email, role, active, created_at FROM users ORDER BY id DESC"
    );
    return res.json({ users: result.rows });
  } catch (error) {
    console.error("Erro ao listar usuários:", error.message);
    return res.status(500).json({ error: "Não foi possível carregar os usuários." });
  }
});

app.post("/api/admin/users", auth, allow("admin"), async (req, res) => {
  const name = String(req.body.name || "").trim();
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");
  const role = String(req.body.role || "student");

  if (name.length < 2 || !email.includes("@") || password.length < 10 ||
      !["admin", "teacher", "student"].includes(role)) {
    return res.status(400).json({ error: "Confira nome, e-mail, perfil e senha (mínimo de 10 caracteres)." });
  }

  try {
    const hash = bcrypt.hashSync(password, 12);
    const result = await pool.query(
      "INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id",
      [name, email, hash, role]
    );
    return res.status(201).json({ id: result.rows[0].id, message: "Usuário cadastrado." });
  } catch (error) {
    if (error.code === "23505") return res.status(409).json({ error: "Este e-mail já está cadastrado." });
    console.error("Erro ao cadastrar usuário:", error.message);
    return res.status(500).json({ error: "Não foi possível cadastrar o usuário." });
  }
});

app.get("/api/health", (_req, res) => res.json({ status: "ok", app: "CNI AVA" }));

app.use("/api", (_req, res) => res.status(404).json({ error: "Rota da API não encontrada." }));

// Fallback para desenvolvimento local. Na Vercel, public/ é servido pelo CDN.
app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"), (error) => {
    if (error && !res.headersSent) res.status(404).send("Arquivo não encontrado. Confira a pasta public.");
  });
});

app.use((error, _req, res, _next) => {
  console.error("Erro inesperado:", error.message);
  if (!res.headersSent) res.status(500).json({ error: "Erro interno do servidor." });
});

if (require.main === module) {
  app.listen(PORT, () => console.log(`CNI AVA disponível em http://localhost:${PORT}`));
}

module.exports = app;
