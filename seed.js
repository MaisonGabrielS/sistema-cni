require("dotenv").config();

const bcrypt = require("bcryptjs");
const { pool, initDb } = require("./db");

async function main() {
  const name = process.env.ADMIN_NAME || "Administrador CNI";
  const email = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || "";

  if (!process.env.DATABASE_URL) throw new Error("Defina DATABASE_URL antes de executar o seed.");
  if (!email || !email.includes("@")) throw new Error("Defina ADMIN_EMAIL no .env.");
  if (password.length < 12) throw new Error("Defina ADMIN_PASSWORD com pelo menos 12 caracteres.");

  await initDb();

  const existing = await pool.query("SELECT id FROM users WHERE email = $1", [email]);
  if (existing.rows.length) {
    console.log(`Usuário administrador já existe: ${email}`);
    return;
  }

  const hash = bcrypt.hashSync(password, 12);
  await pool.query(
    "INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, 'admin')",
    [name, email, hash]
  );
  console.log(`Administrador criado: ${email}`);
}

main()
  .catch((error) => {
    console.error("Falha ao criar administrador:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
