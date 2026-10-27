require("dotenv").config();
const express = require("express");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const path = require("path");
const db = require("./db");

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  console.warn("AVISO: configure JWT_SECRET com pelo menos 32 caracteres no arquivo .env.");
}

const app = express();
const PORT = Number(process.env.PORT || 3000);
const JWT_SECRET = process.env.JWT_SECRET || "dev-only-secret-change-this-before-deploying-123456";

app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: "100kb" }));
app.use(express.static(path.join(__dirname, "public")));

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Muitas tentativas. Aguarde alguns minutos e tente novamente." }
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

app.post("/api/auth/login", loginLimiter, (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");
  if (!email || !password) return res.status(400).json({ error: "Informe e-mail e senha." });

  const user = db.prepare("SELECT id, name, email, password_hash, role, active FROM users WHERE email = ?").get(email);
  if (!user || !user.active || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: "E-mail ou senha inválidos." });
  }
  const token = jwt.sign(
    { id: user.id, name: user.name, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: "8h" }
  );
  res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
});

app.get("/api/me", auth, (req, res) => {
  const user = db.prepare("SELECT id, name, email, role FROM users WHERE id = ? AND active = 1").get(req.user.id);
  if (!user) return res.status(404).json({ error: "Usuário não encontrado." });
  res.json({ user });
});

app.get("/api/courses", auth, (req, res) => {
  let courses;
  if (req.user.role === "admin" || req.user.role === "teacher") {
    courses = db.prepare(`
      SELECT c.id, c.title, c.description, c.modality, c.published,
      COUNT(e.id) AS enrolled_count
      FROM courses c LEFT JOIN enrollments e ON e.course_id = c.id
      GROUP BY c.id ORDER BY c.created_at DESC
    `).all();
  } else {
    courses = db.prepare(`
      SELECT c.id, c.title, c.description, c.modality, c.published,
      e.progress, e.id AS enrollment_id
      FROM enrollments e JOIN courses c ON c.id = e.course_id
      WHERE e.user_id = ? ORDER BY e.created_at DESC
    `).all(req.user.id);
  }
  res.json({ courses });
});

app.post("/api/courses", auth, allow("admin", "teacher"), (req, res) => {
  const title = String(req.body.title || "").trim();
  const description = String(req.body.description || "").trim();
  const modality = String(req.body.modality || "EAD");
  if (title.length < 3 || title.length > 120) {
    return res.status(400).json({ error: "O título deve ter entre 3 e 120 caracteres." });
  }
  if (!["EAD", "Presencial", "Híbrido"].includes(modality)) {
    return res.status(400).json({ error: "Modalidade inválida." });
  }
  const result = db.prepare(
    "INSERT INTO courses (title, description, modality, created_by) VALUES (?, ?, ?, ?)"
  ).run(title, description.slice(0, 2000), modality, req.user.id);
  res.status(201).json({ id: result.lastInsertRowid, message: "Curso criado como rascunho." });
});

app.patch("/api/courses/:id/publish", auth, allow("admin"), (req, res) => {
  const id = Number(req.params.id);
  const course = db.prepare("SELECT id, published FROM courses WHERE id = ?").get(id);
  if (!course) return res.status(404).json({ error: "Curso não encontrado." });
  db.prepare("UPDATE courses SET published = ? WHERE id = ?").run(course.published ? 0 : 1, id);
  res.json({ published: course.published ? 0 : 1 });
});

app.post("/api/enrollments", auth, allow("admin"), (req, res) => {
  const userId = Number(req.body.userId);
  const courseId = Number(req.body.courseId);
  if (!Number.isInteger(userId) || !Number.isInteger(courseId)) {
    return res.status(400).json({ error: "Informe os IDs de aluno e curso." });
  }
  try {
    db.prepare("INSERT INTO enrollments (user_id, course_id) VALUES (?, ?)").run(userId, courseId);
    res.status(201).json({ message: "Matrícula criada." });
  } catch {
    res.status(400).json({ error: "Não foi possível matricular. Confira os IDs e se já existe matrícula." });
  }
});

app.get("/api/admin/users", auth, allow("admin"), (req, res) => {
  const users = db.prepare("SELECT id, name, email, role, active, created_at FROM users ORDER BY id DESC").all();
  res.json({ users });
});

app.post("/api/admin/users", auth, allow("admin"), (req, res) => {
  const name = String(req.body.name || "").trim();
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");
  const role = String(req.body.role || "student");
  if (name.length < 2 || !email.includes("@") || password.length < 10 || !["admin", "teacher", "student"].includes(role)) {
    return res.status(400).json({ error: "Confira nome, e-mail, perfil e senha (mínimo de 10 caracteres)." });
  }
  try {
    const hash = bcrypt.hashSync(password, 12);
    const result = db.prepare("INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)")
      .run(name, email, hash, role);
    res.status(201).json({ id: result.lastInsertRowid, message: "Usuário cadastrado." });
  } catch {
    res.status(409).json({ error: "Este e-mail já está cadastrado." });
  }
});

app.get("/api/health", (_req, res) => res.json({ status: "ok", app: "CNI AVA" }));

app.get("*", (_req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));

app.listen(PORT, () => console.log(`CNI AVA disponível em http://localhost:${PORT}`));
