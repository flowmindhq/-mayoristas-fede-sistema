'use client';
import { useState, useEffect } from 'react';

const SHEET_ID = '187O6oQfinj-OtKwx2JYxiGxUljrF9gtVFm2m6b1we4s';
const WH_NUEVO = 'https://valennn.app.n8n.cloud/webhook/nuevo-producto-fede';
const WH_ENTRADA = 'https://valennn.app.n8n.cloud/webhook/registrar-entrada-fede';
const WH_ELIMINAR_PROD = 'https://valennn.app.n8n.cloud/webhook/eliminar-producto-fede';

interface Producto {
  rowNum: number;
  id: string;
  nombre: string;
  stock: number;
  precio: number;
  valorTotal: number;
}

function parseGviz(raw: string) {
  const json = JSON.parse(raw.replace(/^[^(]+\(/, '').replace(/\);?\s*$/, ''));
  const cols = json.table.cols.map((c: any) => c.label);
  return (json.table.rows || []).map((r: any, i: number) => {
    const obj: any = { row_number: i + 2 };
    r.c?.forEach((cell: any, j: number) => { obj[cols[j]] = cell?.v ?? cell?.f ?? ''; });
    return obj;
  });
}

async function fetchSheet(name: string) {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&headers=1&sheet=${encodeURIComponent(name)}&nocache=${Date.now()}`;
  const res = await fetch(url);
  return parseGviz(await res.text());
}

export default function StockPage() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [buscar, setBuscar] = useState('');
  const [filtro, setFiltro] = useState('todos');
  const [showNuevo, setShowNuevo] = useState(false);
  const [showEntrada, setShowEntrada] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formNuevo, setFormNuevo] = useState({ codigo: '', nombre: '', stock: '', precio_costo: '' });
  const [formEntrada, setFormEntrada] = useState({ producto: '', cantidad: '', precio_costo: '' });

  async function cargar() {
    setLoading(true);
    try {
      const raw = await fetchSheet('STOCK');
      const prods = raw
        .filter((r: any) => r.NOMBRE || r.nombre)
        .map((r: any) => {
          const precio = parseFloat(String(r['PRECIO_COSTO (USD)'] || r.PRECIO_COSTO || r.precio_costo || '0').replace(/[^0-9.]/g, '')) || 0;
          const stock = parseFloat(String(r.STOCK || r.stock || '0').replace(/[^0-9.-]/g, '')) || 0;
          return {
            rowNum: r.row_number,
            id: r.CODIGO || r.codigo || '',
            nombre: r.NOMBRE || r.nombre || '',
            stock,
            precio,
            valorTotal: stock * precio
          };
        });
      setProductos(prods);
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  useEffect(() => { cargar(); }, []);

  const filtrados = productos.filter(p => {
    const matchBuscar = !buscar || p.nombre.toLowerCase().includes(buscar.toLowerCase()) || p.id.toLowerCase().includes(buscar.toLowerCase());
    const matchFiltro = filtro === 'todos' || (filtro === 'ok' && p.stock > 5) || (filtro === 'bajo' && p.stock > 0 && p.stock <= 5) || (filtro === 'sin' && p.stock <= 0);
    return matchBuscar && matchFiltro;
  });

  const sinStock = productos.filter(p => p.stock <= 0).length;
  const stockBajo = productos.filter(p => p.stock > 0 && p.stock <= 5).length;
  const disponibles = productos.filter(p => p.stock > 5).length;
  const patrimonio = productos.reduce((s, p) => s + p.valorTotal, 0);

  function estadoBadge(stock: number) {
    if (stock <= 0) return <span className="badge badge-red">Sin Stock</span>;
    if (stock <= 5) return <span className="badge badge-orange">Stock Bajo</span>;
    return <span className="badge badge-green">OK</span>;
  }

  async function guardarNuevo(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await fetch(WH_NUEVO, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo: 'nuevo_producto', ...formNuevo })
      });
      setShowNuevo(false);
      setFormNuevo({ codigo: '', nombre: '', stock: '', precio_costo: '' });
      setTimeout(() => cargar(), 2000);
    } catch (e) { console.error(e); }
    setSaving(false);
  }

  async function guardarEntrada(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await fetch(WH_ENTRADA, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo: 'entrada_stock', ...formEntrada })
      });
      setShowEntrada(false);
      setFormEntrada({ producto: '', cantidad: '', precio_costo: '' });
      setTimeout(() => cargar(), 2000);
    } catch (e) { console.error(e); }
    setSaving(false);
  }

  async function eliminarProducto(p: Producto) {
    if (!confirm(`¿Eliminar ${p.nombre} del stock?`)) return;
    try {
      await fetch(WH_ELIMINAR_PROD, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codigo: p.id })
      });
      setProductos(prev => prev.filter(x => x.id !== p.id));
      setTimeout(() => cargar(), 3000);
    } catch (e) { console.error(e); }
  }

  return (
    <>
      <div className="topbar">
        <div className="topbar-title">Stock</div>
        <div className="topbar-right">
          <span className="topbar-badge">{productos.length} productos</span>
          <button className="btn btn-secondary" onClick={cargar}>↻ Actualizar</button>
          <button className="btn btn-secondary" onClick={() => setShowEntrada(true)}>+ Registrar Entrada</button>
          <button className="btn btn-primary" onClick={() => setShowNuevo(true)}>+ Nuevo Producto</button>
        </div>
      </div>

      <div className="page-content">
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-card-label">Total Productos</div>
            <div className="stat-card-value blue">{productos.length}</div>
            <div className="stat-card-sub">en inventario</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-label">Sin Stock</div>
            <div className="stat-card-value red">{sinStock}</div>
            <div className="stat-card-sub">agotados</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-label">Stock Bajo</div>
            <div className="stat-card-value orange">{stockBajo}</div>
            <div className="stat-card-sub">≤ 5 unidades</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-label">Patrimonio</div>
            <div className="stat-card-value green">${patrimonio.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <div className="stat-card-sub">valor total en USD</div>
          </div>
        </div>

        <div className="table-card">
          <div className="table-header">
            <div className="table-title">Control de Stock</div>
            <div className="table-actions">
              <select className="input" style={{ width: 140 }} value={filtro} onChange={e => setFiltro(e.target.value)}>
                <option value="todos">Todos</option>
                <option value="ok">Con Stock</option>
                <option value="bajo">Stock Bajo</option>
                <option value="sin">Sin Stock</option>
              </select>
              <div className="search-wrapper">
                <svg className="search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                <input className="search-input" placeholder="Buscar producto..." value={buscar} onChange={e => setBuscar(e.target.value)} />
              </div>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Código</th>
                <th>Producto</th>
                <th>Stock</th>
                <th>Costo USD</th>
                <th>Valor Total</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr className="loading-row"><td colSpan={7}>Cargando stock...</td></tr>
              ) : filtrados.length === 0 ? (
                <tr className="loading-row"><td colSpan={7}>Sin productos</td></tr>
              ) : filtrados.map((p, i) => (
                <tr key={i}>
                  <td className="td-muted" style={{ fontFamily: 'monospace', fontSize: 12 }}>{p.id}</td>
                  <td style={{ fontWeight: 600 }}>{p.nombre}</td>
                  <td style={{ fontWeight: 700, color: p.stock <= 0 ? 'var(--danger)' : p.stock <= 5 ? 'var(--warning)' : 'var(--success)', fontSize: 16 }}>{p.stock}</td>
                  <td className="td-muted">${p.precio.toFixed(2)}</td>
                  <td className="td-money">${p.valorTotal.toFixed(2)}</td>
                  <td>{estadoBadge(p.stock)}</td>
                  <td>
                    <button className="btn btn-ghost" style={{ color: 'var(--danger)', padding: '4px 8px' }} onClick={() => eliminarProducto(p)} title="Eliminar">🗑</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Nuevo Producto */}
      {showNuevo && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowNuevo(false)}>
          <div className="modal">
            <div className="modal-header">
              <div className="modal-title">Nuevo Producto</div>
              <button className="btn btn-ghost" onClick={() => setShowNuevo(false)}>✕</button>
            </div>
            <form onSubmit={guardarNuevo}>
              <div className="modal-body">
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Código *</label>
                    <input className="input" placeholder="A001" value={formNuevo.codigo} onChange={e => setFormNuevo({...formNuevo, codigo: e.target.value})} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Nombre *</label>
                    <input className="input" placeholder="Nombre del producto" value={formNuevo.nombre} onChange={e => setFormNuevo({...formNuevo, nombre: e.target.value})} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Stock inicial</label>
                    <input className="input" type="number" placeholder="0" value={formNuevo.stock} onChange={e => setFormNuevo({...formNuevo, stock: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Precio Costo (USD)</label>
                    <input className="input" type="number" step="0.01" placeholder="0.00" value={formNuevo.precio_costo} onChange={e => setFormNuevo({...formNuevo, precio_costo: e.target.value})} />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowNuevo(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Guardando...' : 'Agregar Producto'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Registrar Entrada */}
      {showEntrada && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowEntrada(false)}>
          <div className="modal">
            <div className="modal-header">
              <div className="modal-title">Registrar Entrada de Stock</div>
              <button className="btn btn-ghost" onClick={() => setShowEntrada(false)}>✕</button>
            </div>
            <form onSubmit={guardarEntrada}>
              <div className="modal-body">
                <div className="form-grid">
                  <div className="form-group full">
                    <label className="form-label">Producto *</label>
                    <select className="input" value={formEntrada.producto} onChange={e => setFormEntrada({...formEntrada, producto: e.target.value})} required>
                      <option value="">Elegí un producto...</option>
                      {productos.map(p => <option key={p.id} value={p.nombre}>{p.nombre}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Cantidad *</label>
                    <input className="input" type="number" min="1" placeholder="0" value={formEntrada.cantidad} onChange={e => setFormEntrada({...formEntrada, cantidad: e.target.value})} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Precio Costo (USD)</label>
                    <input className="input" type="number" step="0.01" placeholder="0.00" value={formEntrada.precio_costo} onChange={e => setFormEntrada({...formEntrada, precio_costo: e.target.value})} />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowEntrada(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Guardando...' : 'Registrar Entrada'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}