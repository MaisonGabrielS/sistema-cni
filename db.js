const { Pool } = require("pg");

if (!process.env.DATABASE_URL) {
  console.warn("AVISO: defina DATABASE_URL com a conexão PostgreSQL do Neon.");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // No Neon, prefira a string de conexão com pooler (host contendo -pooler).
  max: 1,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 10000
});

let initPromise;

async function initDb() {
  if (!initPromise) {
    initPromise = (async () => {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          email TEXT NOT NULL UNIQUE,
          password_hash TEXT NOT NULL,
          role TEXT NOT NULL CHECK (role IN ('admin', 'teacher', 'student')) DEFAULT 'student',
          active BOOLEAN NOT NULL DEFAULT TRUE,
          created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS courses (
          id SERIAL PRIMARY KEY,
          title TEXT NOT NULL,
          description TEXT NOT NULL DEFAULT '',
          modality TEXT NOT NULL CHECK (modality IN ('EAD', 'Presencial', 'Híbrido')) DEFAULT 'EAD',
          published BOOLEAN NOT NULL DEFAULT FALSE,
          created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS enrollments (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
          progress INTEGER NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
          created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
          UNIQUE (user_id, course_id)
        )
      `);
    })().catch((error) => {
      initPromise = undefined;
      throw error;
    });
  }
  return initPromise;
}

module.exports = { pool, initDb };
