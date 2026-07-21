const mysql = require('mysql2/promise');
require('dotenv').config();

async function inicializarBaseDeDatos() {
  const conexion = await mysql.createConnection({
    host: process.env.MYSQL_ADDON_HOST || process.env.DB_HOST,
    port: process.env.MYSQL_ADDON_PORT || 3306,
    user: process.env.MYSQL_ADDON_USER || process.env.DB_USER,
    password: process.env.MYSQL_ADDON_PASSWORD || process.env.DB_PASSWORD,
    database: process.env.MYSQL_ADDON_DB || process.env.DB_NAME,
    multipleStatements: true
  });

  try {
    console.log("⏳ Conectando a Clever Cloud para estructurar tablas...");

    // 1. TABLA USUARIOS
    await conexion.query(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nombre VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        rol VARCHAR(50) DEFAULT 'admin'
      )
    `);

    // 2. USUARIO ADMINISTRADOR (INSERT IGNORE evita duplicados por el email UNIQUE)
    await conexion.query(`
      INSERT IGNORE INTO usuarios (nombre, email, password, rol)
      VALUES ('Administrador', 'admin@correo.com', '12345678', 'admin')
    `);

    // 3. TABLA CLIENTES
    await conexion.query(`
      CREATE TABLE IF NOT EXISTS clientes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nombre VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        direccion VARCHAR(255),
        ciudad VARCHAR(100),
        latitud DECIMAL(10,7),
        longitud DECIMAL(10,7)
      )
    `);

    // 4. CLIENTE DE PRUEBA
    await conexion.query(`
      INSERT IGNORE INTO clientes (nombre, email, direccion, ciudad, latitud, longitud)
      VALUES ('Logística Test', 'contacto@logistica.com', 'Av. Corrientes 1234', 'Buenos Aires', -34.6037, -58.3816)
    `);

    console.log("=========================================================");
    console.log("¡ÉXITO TOTAL! 🚀");
    console.log("-> Tabla 'usuarios' creada y cuenta 'admin@correo.com' lista.");
    console.log("-> Tabla 'clientes' creada con geolocalización.");
    console.log("=========================================================");
  } catch (error) {
    console.error("❌ Error crítico inicializando la base de datos:", error);
  } finally {
    await conexion.end();
  }
}

inicializarBaseDeDatos();