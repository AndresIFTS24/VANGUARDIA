const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const pool = mysql.createPool({
  host: process.env.MYSQL_ADDON_HOST || process.env.DB_HOST,
  port: process.env.MYSQL_ADDON_PORT || 3306,
  user: process.env.MYSQL_ADDON_USER || process.env.DB_USER,
  password: process.env.MYSQL_ADDON_PASSWORD || process.env.DB_PASSWORD,
  database: process.env.MYSQL_ADDON_DB || process.env.DB_NAME,
  connectionLimit: 2
});

// 🔍 FUNCIÓN TRUCO: Convierte Dirección + Ciudad en Coordenadas reales (Geocodificación)
async function obtenerCoordenadas(direccion, ciudad) {
  try {
    if (!direccion || !ciudad) return { lat: null, lon: null };

    const consulta = encodeURIComponent(`${direccion}, ${ciudad}`);
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${consulta}&limit=1`;

    const respuesta = await fetch(url, {
      headers: { 'User-Agent': 'VanguardiaFumigacionesApp' }
    });

    const datos = await respuesta.json();
    if (datos && datos.length > 0) {
      return { lat: parseFloat(datos[0].lat), lon: parseFloat(datos[0].lon) };
    }
  } catch (error) {
    console.error("⚠️ Error consultando el mapa de OpenStreetMap:", error);
  }
  return { lat: null, lon: null };
}

// 🔑 LOGIN
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const [rows] = await pool.query(
      'SELECT id, nombre, email, rol FROM usuarios WHERE email = ? AND password = ?',
      [email, password]
    );

    if (rows.length > 0) {
      res.json({ ok: true, usuario: rows[0] });
    } else {
      res.status(401).json({ ok: false, mensaje: "Credenciales incorrectas" });
    }
  } catch (error) {
    console.error("❌ ERROR CRÍTICO EN /api/login:", error);
    res.status(500).json({ ok: false, error: "Error de servidor", detalle: error.message });
  }
});

// 📋 CRUD CLIENTES - LEER TODOS
app.get('/api/clientes', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, nombre, email, direccion, ciudad, latitud, longitud FROM clientes ORDER BY id ASC');
    res.json(rows);
  } catch (error) {
    console.error("❌ Error en GET /api/clientes:", error);
    res.status(500).json({ error: "Error al obtener los clientes" });
  }
});

// 📋 CRUD CLIENTES - CREAR NUEVO (Con Geolocalizador automático)
app.post('/api/clientes', async (req, res) => {
  const { nombre, email, direccion, ciudad } = req.body;

  const coords = await obtenerCoordenadas(direccion, ciudad);

  try {
    const [resultado] = await pool.query(
      'INSERT INTO clientes (nombre, email, direccion, ciudad, latitud, longitud) VALUES (?, ?, ?, ?, ?, ?)',
      [nombre, email, direccion, ciudad, coords.lat, coords.lon]
    );
    res.json({ ok: true, id: resultado.insertId, mensaje: "Cliente geolocalizado y registrado" });
  } catch (error) {
    console.error("❌ Error en POST /api/clientes:", error);
    res.status(500).json({ error: "Error al registrar. ¿El correo ya existe?" });
  }
});

// 📋 CRUD CLIENTES - ACTUALIZAR
app.put('/api/clientes/:id', async (req, res) => {
  const { id } = req.params;
  const { nombre, email, direccion, ciudad } = req.body;

  const coords = await obtenerCoordenadas(direccion, ciudad);

  try {
    await pool.query(
      'UPDATE clientes SET nombre=?, email=?, direccion=?, ciudad=?, latitud=?, longitud=? WHERE id=?',
      [nombre, email, direccion, ciudad, coords.lat, coords.lon, id]
    );
    res.json({ ok: true, mensaje: "Cliente actualizado con éxito" });
  } catch (error) {
    console.error("❌ Error en PUT /api/clientes:", error);
    res.status(500).json({ error: "Error al actualizar cliente" });
  }
});

// 📋 CRUD CLIENTES - ELIMINAR
app.delete('/api/clientes/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM clientes WHERE id = ?', [id]);
    res.json({ ok: true, mensaje: "Cliente eliminado" });
  } catch (error) {
    console.error("❌ Error en DELETE /api/clientes:", error);
    res.status(500).json({ error: "Error al eliminar" });
  }
});

app.listen(port, () => {
  console.log(`🚀 Servidor Inteligente en http://localhost:${port}`);
});