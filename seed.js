require("dotenv").config();
const bcrypt = require("bcryptjs");
const db = require("./db");

const name = process.env.ADMIN_NAME || "Administrador CNI";
const email = (process.env.ADMIN_EMAIL || "admin@cni.local").toLowerCase();
const password = process.env.ADMIN_PASSWORD || "TroqueEstaSenha123!";
const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email);

if (existing) {
  console.log(`Usuário administrador já existe: ${email}`);
} else {
  const hash = bcrypt.hashSync(password, 12);
  db.prepare("INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, 'admin')")
    .run(name, email, hash);
  console.log(`Administrador criado: ${email}`);
  console.log("Por segurança, altere a senha de demonstração antes de disponibilizar o sistema.");
}
