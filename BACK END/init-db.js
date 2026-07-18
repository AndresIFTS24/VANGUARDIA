const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.POSTGRESQL_ADDON_URI || process.env.DATABASE_URL,
  max: 1,
  ssl: { rejectUnauthorized: false }
});

const sqlEstructuraCompleta = `
  -- 1. CREAR TABLA DE USUARIOS (Si no existe)
  CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    rol VARCHAR(50) DEFAULT 'admin'
  );

  -- 2. INYECTAR USUARIO ADMINISTRADOR (Evita duplicados usando ON CONFLICT)
  INSERT INTO usuarios (nombre, email, password, rol)
  VALUES ('Administrador', 'admin@correo.com', '12345678', 'admin')
  ON CONFLICT (email) DO NOTHING;

  -- 3. CREAR TABLA DE CLIENTES (Si no existe de base)
  CREATE TABLE IF NOT EXISTS clientes (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    latitud NUMERIC,
    longitud NUMERIC
  );

  -- 4. ASEGURAR COLUMNAS DE DIRECCIÓN (Por si la tabla clientes ya existía de antes en formato viejo)
  ALTER TABLE clientes ADD COLUMN IF NOT EXISTS direccion VARCHAR(255);
  ALTER TABLE clientes ADD COLUMN IF NOT EXISTS ciudad VARCHAR(100);

  -- 5. INYECTAR UN CLIENTE DE PRUEBA
  INSERT INTO clientes (nombre, email, direccion, ciudad, latitud, longitud)
  VALUES ('Logística Test', 'contacto@logistica.com', 'Av. Corrientes 1234', 'Buenos Aires', -34.6037, -58.3816)
  ON CONFLICT (email) DO NOTHING;
`;

async function inicializarBaseDeDatos() {
  try {
    console.log("⏳ Conectando a Clever Cloud para estructurar tablas...");
    await pool.query(sqlEstructuraCompleta);
    console.log("=========================================================");
    console.log("¡ÉXITO TOTAL! 🚀");
    console.log("-> Tabla 'usuarios' creada y cuenta 'admin@correo.com' lista.");
    console.log("-> Tabla 'clientes' actualizada con geolocalización.");
    console.log("=========================================================");
  } catch (error) {
    console.error("❌ Error crítico inicializando la base de datos:", error);
  } finally {
    await pool.end();
  }
}

inicializarBaseDeDatos();