'use client';
import { useState, useEffect } from 'react';

const SHEET_ID = '187O6oQfinj-OtKwx2JYxiGxUljrF9gtVFm2m6b1we4s';

interface Venta {
  fecha: string;
  cliente: string;
  pedido: string;
  facturacion: number;
  ganancia: number;
  estadoPedido: string;
}

interface Cliente {
  nombre: string;
  numero: string;
  localidad: string;
  totalCompras: number;
  totalGanancia: number;
  cantidadPedidos: number;
  ultimaCompra: string;
  ventas: Venta[];
}

function formatFecha(val: any): string {
  if (!val) return '';
  const s = String(val);
  const m = s.match(/^Date\((\d+),(\d+),(\d+)\)$/);
  if (m) {
    const y = m[1], mo = String(parseInt(m[2]) + 1).padStart(2, '0'), d = String(m[3]).padStart(2, '0');
    return `${y}-${mo}-${d}`;
  }
  return s;
}

function parseGviz(raw: string) {
  const json = JSON.parse(raw.replace(/^[^(]+\(/, '').replace(/\);?\s*$/, ''));
  const cols = json.table.cols.map((c: any) => c.label);
  return (json.table.rows || []).map((r: any, i: number) => {
    const obj: any = { row_number: i + 2 };
    r.c?.forEach((cell: any, j: number) => {
      const raw = cell?.v ?? cell?.f ?? '';
      obj[cols[j]] = typeof raw === 'string' && raw.startsWith('Date(') ? formatFecha(raw) : raw;
    });
    return obj;
  });
}

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [buscar, setBuscar] = useState('');
  const [clienteSeleccionado, setClienteSeleccionado] = useState<Cliente | null>(null);

  useEffect(() => {
    async function cargar() {
      setLoading(true);
      try {
        const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&headers=1&sheet=VENTAS&nocache=${Date.now()}`;
        const res = await fetch(url);
        const raw = parseGviz(await res.text());

        // Agrupar ventas por cliente
        const map: Record<string, Cliente> = {};
        raw.forEach((r: any) => {
          const nombre = (r.CLIENTE || r.cliente || '').trim();
          if (!nombre || nombre.startsWith('---') || nombre.toUpperCase().startsWith('CIERRE')) return;

          const facturacion = parseFloat(String(r.FACTURACION || r.facturacion || '0').replace(/[^0-9.]/g, '')) || 0;
          const ganancia = parseFloat(String(r.GANANCIA || r.ganancia || '0').replace(/[^0-9.]/g, '')) || 0;
          const fecha = r.FECHA || r.fecha || '';

          if (!map[nombre]) {
            map[nombre] = {
              nombre,
              numero: r.NUMERO || r.numero || '',
              localidad: r.LOCALIDAD || r.localidad || '',
              totalCompras: 0,
              totalGanancia: 0,
              cantidadPedidos: 0,
              ultimaCompra: fecha,
              ventas: []
            };
          }

          map[nombre].totalCompras += facturacion;
          map[nombre].totalGanancia += ganancia;
          map[nombre].cantidadPedidos++;
          if (fecha > map[nombre].ultimaCompra) map[nombre].ultimaCompra = fecha;
          map[nombre].ventas.push({
            fecha,
            cliente: nombre,
            pedido: r.PEDIDO || r.pedido || '',
            facturacion,
            ganancia,
            estadoPedido: r['ESTADO PEDIDO'] || r.estadoPedido || ''
          });
        });

        const lista = Object.values(map).sort((a, b) => b.totalCompras - a.totalCompras);
        setClientes(lista);
      } catch (e) { console.error(e); }
      setLoading(false);
    }
    cargar();
  }, []);

  const filtrados = clientes.filter(c =>
    !buscar || c.nombre.toLowerCase().includes(buscar.toLowerCase()) ||
    c.localidad.toLowerCase().includes(buscar.toLowerCase())
  );

  return (
    <>
      <div className="topbar">
        <div className="topbar-title">Clientes</div>
        <div className="topbar-right">
          <span className="topbar-badge">{clientes.length} clientes</span>
        </div>
      </div>

      <div className="page-content">
        <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
          <div className="stat-card">
            <div className="stat-card-label">Total Clientes</div>
            <div className="stat-card-value blue">{clientes.length}</div>
            <div className="stat-card-sub">únicos</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-label">Facturación Total</div>
            <div className="stat-card-value green">${clientes.reduce((s, c) => s + c.totalCompras, 0).toLocaleString('es-AR')}</div>
            <div className="stat-card-sub">acumulada</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-label">Ganancia Total</div>
            <div className="stat-card-value green">${clientes.reduce((s, c) => s + c.totalGanancia, 0).toLocaleString('es-AR')}</div>
            <div className="stat-card-sub">acumulada</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 20 }}>
          {/* Lista */}
          <div className="table-card" style={{ flex: 1 }}>
            <div className="table-header">
              <div className="table-title">Historial por Cliente</div>
              <div className="search-wrapper">
                <svg className="search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                <input className="search-input" placeholder="Buscar cliente..." value={buscar} onChange={e => setBuscar(e.target.value)} />
              </div>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Localidad</th>
                  <th>Pedidos</th>
                  <th>Total Facturado</th>
                  <th>Última Compra</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr className="loading-row"><td colSpan={5}>Cargando clientes...</td></tr>
                ) : filtrados.length === 0 ? (
                  <tr className="loading-row"><td colSpan={5}>Sin clientes</td></tr>
                ) : filtrados.map((c, i) => (
                  <tr key={i} style={{ cursor: 'pointer' }} onClick={() => setClienteSeleccionado(c)}>
                    <td style={{ fontWeight: 600 }}>{c.nombre}</td>
                    <td className="td-muted">{c.localidad || '—'}</td>
                    <td><span className="badge badge-blue">{c.cantidadPedidos}</span></td>
                    <td className="td-money">${c.totalCompras.toLocaleString('es-AR')}</td>
                    <td className="td-muted">{c.ultimaCompra || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Detalle */}
          {clienteSeleccionado && (
            <div className="table-card" style={{ width: 360, flexShrink: 0 }}>
              <div className="table-header">
                <div className="table-title">👤 {clienteSeleccionado.nombre}</div>
                <button className="btn btn-ghost" onClick={() => setClienteSeleccionado(null)}>✕</button>
              </div>
              <div style={{ padding: 16, borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {clienteSeleccionado.numero && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                    <span style={{ color: 'var(--text3)' }}>Teléfono</span>
                    <span>{clienteSeleccionado.numero}</span>
                  </div>
                )}
                {clienteSeleccionado.localidad && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                    <span style={{ color: 'var(--text3)' }}>Localidad</span>
                    <span>{clienteSeleccionado.localidad}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span style={{ color: 'var(--text3)' }}>Total facturado</span>
                  <span style={{ fontWeight: 700, color: 'var(--success)' }}>${clienteSeleccionado.totalCompras.toLocaleString('es-AR')}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span style={{ color: 'var(--text3)' }}>Ganancia generada</span>
                  <span style={{ fontWeight: 600, color: 'var(--success)' }}>${clienteSeleccionado.totalGanancia.toLocaleString('es-AR')}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span style={{ color: 'var(--text3)' }}>Pedidos</span>
                  <span style={{ fontWeight: 600 }}>{clienteSeleccionado.cantidadPedidos}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span style={{ color: 'var(--text3)' }}>Última compra</span>
                  <span>{clienteSeleccionado.ultimaCompra || '—'}</span>
                </div>
              </div>
              <div style={{ padding: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
                  Historial ({clienteSeleccionado.ventas.length})
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 300, overflowY: 'auto' }}>
                  {clienteSeleccionado.ventas.map((v, i) => (
                    <div key={i} style={{ padding: '10px 12px', background: 'var(--bg)', borderRadius: 6, border: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 12, color: 'var(--text3)' }}>{v.fecha}</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--success)' }}>${v.facturacion.toLocaleString('es-AR')}</span>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text2)' }}>{v.pedido || '—'}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}