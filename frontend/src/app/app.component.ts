import { Component, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; 
import { HttpClient } from '@angular/common/http'; 
import * as L from 'leaflet';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <!-- VISTA 1: LOGIN (Se mantiene intacto) -->
    <div class="login-container" *ngIf="vistaActual === 'login'">
      <div class="login-card">
        <div class="login-header">
          <div class="logo-icon">🛡️</div>
          <h1>Vanguardia</h1>
          <p>Control de Plagas & Sanidad</p>
        </div>
        <div class="form-group">
          <label>Correo del Administrador</label>
          <div class="input-wrapper"><input type="email" [(ngModel)]="email" placeholder="admin@correo.com"></div>
        </div>
        <div class="form-group">
          <label>Contraseña</label>
          <div class="input-wrapper"><input type="password" [(ngModel)]="password" placeholder="••••••••"></div>
        </div>
        <button class="btn-submit" (click)="iniciarSesion()">Ingresar →</button>
        <div *ngIf="mensajeError" class="alert-error"><span>⚠️</span> <p>{{ mensajeError }}</p></div>
      </div>
    </div>

    <!-- VISTA 2: DASHBOARD AUTOMÁTICO -->
    <div class="dashboard-container" *ngIf="vistaActual === 'admin'">
      <header class="dash-header">
        <div class="header-logo">
          <span class="shield-mini">🛡️</span>
          <div>
            <h2>Vanguardia Central</h2>
            <p>Panel de Gestión de Clientes y Puntos de Fumigación</p>
          </div>
        </div>
        <button class="btn-logout" (click)="cerrarSesion()">Cerrar Sesión 🚪</button>
      </header>

      <!-- Tarjetas Superiores -->
      <section class="stats-row">
        <div class="stat-card">
          <div class="stat-icon">🏢</div>
          <div class="stat-info">
            <h3>{{ clientes.length }}</h3>
            <p>Clientes Totales</p>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">☣️</div>
          <div class="stat-info">
            <h3>{{ contarClientesUbicados() }}</h3>
            <p>Puntos Localizados en el Mapa</p>
          </div>
        </div>
      </section>

      <!-- Contenido en cuadricula -->
      <div class="main-grid">
        <div class="left-column">
          <!-- Mapa -->
          <div class="card map-card">
            <h3>📍 Mapa de Establecimientos Activos</h3>
            <div id="map"></div>
          </div>

          <!-- Formulario Adaptado a Texto -->
          <div class="card form-card">
            <h3>{{ editandoId ? '📝 Editar Datos de Cliente' : '➕ Registrar Nuevo Cliente' }}</h3>
            <div class="form-grid">
              <input type="text" [(ngModel)]="crudForm.nombre" placeholder="Nombre de la Empresa / Cliente">
              <input type="email" [(ngModel)]="crudForm.email" placeholder="Correo de contacto">
              
              <!-- NUEVOS INPUTS CÓMODOS -->
              <input type="text" [(ngModel)]="crudForm.direccion" placeholder="Dirección (Ej: Av. Corrientes 1234)">
              <input type="text" [(ngModel)]="crudForm.ciudad" placeholder="Ciudad (Ej: Buenos Aires)">
            </div>
            <div class="form-actions">
              <button class="btn-save" (click)="guardarCliente()">{{ editandoId ? 'Actualizar Cliente' : 'Registrar Cliente' }}</button>
              <button class="btn-cancel" *ngIf="editandoId" (click)="cancelarEdicion()">Cancelar</button>
            </div>
          </div>
        </div>

        <!-- Directorio de Clientes -->
        <div class="right-column">
          <div class="card table-card">
            <h3>📋 Directorio y Ubicaciones</h3>
            <div class="table-responsive">
              <table>
                <thead>
                  <tr>
                    <th>Cliente / Ubicación</th>
                    <th>Estado GPS</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let c of clientes">
                    <td>
                      <div class="user-meta">
                        <span class="user-name">{{ c.nombre }}</span>
                        <span class="user-email">{{ c.direccion || 'Sin dirección' }}, {{ c.ciudad || '' }}</span>
                      </div>
                    </td>
                    <td>
                      <span class="badge" [ngClass]="c.latitud ? 'ubicado' : 'sin-gps'">
                        {{ c.latitud ? '🟢 Ubicado' : '🔴 No Encontrado' }}
                      </span>
                    </td>
                    <td>
                      <div class="action-buttons">
                        <button (click)="prepararEditar(c)">✏️</button>
                        <button (click)="eliminarCliente(c.id)">🗑️</button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    /* Reutilizamos los excelentes estilos visuales que ya tenías */
    .login-container, .dashboard-container { font-family: system-ui, sans-serif; background: linear-gradient(135deg, #0f172a 0%, #064e3b 100%); min-height: 100vh; color: #f8fafc; padding: 25px; box-sizing: border-box; }
    .login-container { display: flex; justify-content: center; align-items: center; }
    .login-card { background: rgba(30, 41, 59, 0.8); padding: 40px; width: 100%; max-width: 400px; border-radius: 24px; text-align: center; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5); }
    .logo-icon { font-size: 3rem; margin-bottom: 10px; }
    .login-header h1 { margin: 0; background: linear-gradient(to right, #fff, #10b981); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    .login-header p { color: #94a3b8; font-size: 0.9rem; margin-bottom: 30px; }
    .form-group { margin-bottom: 20px; text-align: left; }
    .form-group label { display: block; font-size: 0.85rem; margin-bottom: 8px; color: #cbd5e1; }
    .input-wrapper input { width: 100%; padding: 14px; background: #0f172a; border: 1px solid #334155; border-radius: 12px; color: white; box-sizing: border-box; }
    .btn-submit { width: 100%; padding: 15px; background: linear-gradient(90deg, #10b981, #059669); color: white; border: none; border-radius: 12px; font-weight: 600; cursor: pointer; }
    .alert-error { background: rgba(239, 68, 68, 0.1); border: 1px solid #ef4444; padding: 10px; border-radius: 8px; margin-top: 15px; display: flex; gap: 10px; }
    
    .dash-header { display: flex; justify-content: space-between; align-items: center; background: rgba(30, 41, 59, 0.6); padding: 15px 25px; border-radius: 16px; margin-bottom: 25px; }
    .header-logo { display: flex; align-items: center; gap: 15px; }
    .shield-mini { font-size: 2rem; }
    .header-logo h2 { margin: 0; font-size: 1.2rem; }
    .header-logo p { margin: 0; font-size: 0.8rem; color: #94a3b8; }
    .btn-logout { background: #334155; border: none; color: white; padding: 8px 16px; border-radius: 8px; cursor: pointer; }
    
    .stats-row { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 25px; }
    .stat-card { background: #1e293b; border-radius: 16px; padding: 20px; display: flex; align-items: center; gap: 20px; }
    .stat-icon { font-size: 2.5rem; background: rgba(16, 185, 129, 0.1); padding: 10px; border-radius: 12px; }
    .stat-info h3 { margin: 0; font-size: 1.8rem; color: #10b981; }
    .stat-info p { margin: 0; color: #94a3b8; font-size: 0.85rem; }
    
    .main-grid { display: grid; grid-template-columns: 1.2fr 1fr; gap: 25px; }
    @media (max-width: 900px) { .main-grid { grid-template-columns: 1fr; } }
    .card { background: #1e293b; border-radius: 16px; padding: 20px; margin-bottom: 25px; border: 1px solid rgba(255,255,255,0.05); }
    .card h3 { margin-top: 0; border-bottom: 1px solid #334155; padding-bottom: 10px; font-size: 1rem; }
    
    #map { height: 300px; border-radius: 12px; background: #0f172a; }
    .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .form-grid input { background: #0f172a; border: 1px solid #334155; padding: 12px; border-radius: 8px; color: white; }
    .form-actions { margin-top: 15px; display: flex; gap: 10px; }
    .btn-save { background: #10b981; border: none; color: white; padding: 12px; border-radius: 8px; font-weight: 600; cursor: pointer; flex: 1; }
    .btn-cancel { background: #475569; border: none; color: white; padding: 12px; border-radius: 8px; cursor: pointer; }
    
    table { width: 100%; border-collapse: collapse; }
    th { padding: 10px; color: #94a3b8; font-size: 0.8rem; border-bottom: 1px solid #334155; text-align: left; }
    td { padding: 12px 10px; border-bottom: 1px solid rgba(255,255,255,0.05); }
    .user-meta { display: flex; flex-direction: column; }
    .user-name { font-weight: 600; }
    .user-email { font-size: 0.75rem; color: #94a3b8; }
    
    .badge { padding: 4px 8px; border-radius: 6px; font-size: 0.75rem; font-weight: 600; }
    .badge.ubicado { background: rgba(16, 185, 129, 0.15); color: #34d399; }
    .badge.sin-gps { background: rgba(239, 68, 68, 0.15); color: #fca5a5; }
    .action-buttons { display: flex; gap: 8px; }
    .action-buttons button { background: #334155; border: none; padding: 6px; border-radius: 6px; cursor: pointer; }
  `]
})
export class AppComponent {
  vistaActual = 'login';
  mensajeError = '';
  email = '';
  password = '';

  clientes: any[] = [];
  mapa!: L.Map;
  capaMarcadores: L.LayerGroup = L.layerGroup();

  editandoId: number | null = null;
  crudForm = { nombre: '', email: '', direccion: '', ciudad: '' };

  private apiUrl = 'http://192.168.0.7:3000/api';

  constructor(private http: HttpClient) {}

  iniciarSesion() {
    this.mensajeError = '';
    this.http.post(`${this.apiUrl}/login`, { email: this.email, password: this.password }).subscribe({
      next: (res: any) => {
        if (res.ok && res.usuario.rol === 'admin') {
          this.vistaActual = 'admin';
          this.cargarDashboard();
        } else {
          this.mensajeError = 'Acceso exclusivo para el administrador.';
        }
      },
      error: () => this.mensajeError = 'Credenciales incorrectas.'
    });
  }

  cargarDashboard() {
    this.http.get<any[]>(`${this.apiUrl}/clientes`).subscribe({
      next: (data) => {
        this.clientes = data;
        setTimeout(() => this.inicializarMapa(), 100);
      }
    });
  }

  inicializarMapa() {
    if (this.mapa) return;
    this.mapa = L.map('map').setView([-34.6037, -58.3816], 11);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(this.mapa);
    this.capaMarcadores.addTo(this.mapa);
    this.dibujarMarcadores();
  }

  dibujarMarcadores() {
    this.capaMarcadores.clearLayers();
    const edificioIcon = L.divIcon({
      html: '<span style="font-size: 26px;">🏢</span>',
      className: 'custom-client-marker',
      iconSize: [30, 30],
      iconAnchor: [15, 30]
    });

    this.clientes.forEach(c => {
      if (c.latitud && c.longitud) {
        // CORREGIDO: Eliminados corchetes incorrectos en L.marker
        const marcador = L.marker([Number(c.latitud), Number(c.longitud)], { icon: edificioIcon })
          .bindPopup(`<b>🏢 ${c.nombre}</b><br>${c.direccion}<br><i>Fumigación Pendiente</i>`);
        this.capaMarcadores.addLayer(marcador);
      }
    });
  }

  guardarCliente() {
    if (!this.crudForm.nombre || !this.crudForm.direccion || !this.crudForm.ciudad) {
      alert('Nombre, Dirección y Ciudad son obligatorios');
      return;
    }

    if (this.editandoId) {
      this.http.put(`${this.apiUrl}/clientes/${this.editandoId}`, this.crudForm).subscribe(() => {
        this.refrescarDatos();
        this.cancelarEdicion();
      });
    } else {
      this.http.post(`${this.apiUrl}/clientes`, this.crudForm).subscribe(() => {
        this.refrescarDatos();
        this.limpiarFormulario();
      });
    }
  }

  prepararEditar(c: any) {
    this.editandoId = c.id;
    this.crudForm = {
      nombre: c.nombre,
      email: c.email,
      direccion: c.direccion || '',
      ciudad: c.ciudad || ''
    };
  }

  eliminarCliente(id: number) {
    if (confirm('¿Seguro que deseas eliminar este cliente?')) {
      this.http.delete(`${this.apiUrl}/clientes/${id}`).subscribe(() => this.refrescarDatos());
    }
  }

  refrescarDatos() {
    this.http.get<any[]>(`${this.apiUrl}/clientes`).subscribe(data => {
      this.clientes = data;
      this.dibujarMarcadores();
    });
  }

  contarClientesUbicados = () => this.clientes.filter(c => c.latitud).length;
  cancelarEdicion = () => { this.editandoId = null; this.limpiarFormulario(); };
  limpiarFormulario = () => this.crudForm = { nombre: '', email: '', direccion: '', ciudad: '' };
  cerrarSesion = () => { this.vistaActual = 'login'; this.email = ''; this.password = ''; (this.mapa as any) = null; };
}