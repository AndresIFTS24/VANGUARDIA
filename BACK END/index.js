const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.POSTGRESQL_ADDON_URI || process.env.DATABASE_URL,
  max: 2,
  ssl: { rejectUnauthorized: false }
});

// 🔍 FUNCIÓN TRUCO: Convierte Dirección + Ciudad en Coordenadas reales (Geocodificación)
async function obtenerCoordenadas(direccion, ciudad) {
  try {
    if (!direccion || !ciudad) return { lat: null, lon: null };
    
    const consulta = encodeURIComponent(`${direccion}, ${ciudad}`);
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${consulta}&limit=1`;
    
    // OpenStreetMap requiere obligatoriamente un identificador User-Agent
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
  return { lat: null, lon: null }; // Retorna nulo si no encuentra la calle
}

// 🔑 LOGIN (Sincronizado con la nueva tabla)
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const sql = 'SELECT id, nombre, email, rol FROM usuarios WHERE email = $1 AND password = $2';
    const resultado = await pool.query(sql, [email, password]);
    
    if (resultado.rows.length > 0) {
      res.json({ ok: true, usuario: resultado.rows[0] });
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
    const resultado = await pool.query('SELECT id, nombre, email, direccion, ciudad, latitud, longitud FROM clientes ORDER BY id ASC');
    res.json(resultado.rows);
  } catch (error) {
    console.error("❌ Error en GET /api/clientes:", error);
    res.status(500).json({ error: "Error al obtener los clientes" });
  }
});

// 📋 CRUD CLIENTES - CREAR NUEVO (Con Geolocalizador automático)
app.post('/api/clientes', async (req, res) => {
  const { nombre, email, direccion, ciudad } = req.body;
  
  // 🧭 Buscamos el GPS de la calle automáticamente en internet
  const coords = await obtenerCoordenadas(direccion, ciudad);

  try {
    const sql = 'INSERT INTO clientes (nombre, email, direccion, ciudad, latitud, longitud) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id';
    const resultado = await pool.query(sql, [nombre, email, direccion, ciudad, coords.lat, coords.lon]);
    res.json({ ok: true, id: resultado.rows[0].id, mensaje: "Cliente geolocalizado y registrado" });
  } catch (error) {
    console.error("❌ Error en POST /api/clientes:", error);
    res.status(500).json({ error: "Error al registrar. ¿El correo ya existe?" });
  }
});

// 📋 CRUD CLIENTES - ACTUALIZAR
app.put('/api/clientes/:id', async (req, res) => {
  const { id } = req.params;
  const { nombre, email, direccion, ciudad } = req.body;
  
  // Si cambia la dirección, recalculamos el GPS
  const coords = await obtenerCoordenadas(direccion, ciudad);

  try {
    const sql = 'UPDATE clientes SET nombre=$1, email=$2, direccion=$3, ciudad=$4, latitud=$5, longitud=$6 WHERE id=$7';
    await pool.query(sql, [nombre, email, direccion, ciudad, coords.lat, coords.lon, id]);
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
    await pool.query('DELETE FROM clientes WHERE id = $1', [id]);
    res.json({ ok: true, mensaje: "Cliente eliminado" });
  } catch (error) {
    console.error("❌ Error en DELETE /api/clientes:", error);
    res.status(500).json({ error: "Error al eliminar" });
  }
});

app.listen(port, () => {
  console.log(`🚀 Servidor Inteligente en http://localhost:${port}`);
});