'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

const WH_NUEVO = 'https://valennn.app.n8n.cloud/webhook/nuevo-producto-fede';
const WH_ENTRADA = 'https://valennn.app.n8n.cloud/webhook/registrar-entrada-fede';
const WH_ELIMINAR_PROD = 'https://valennn.app.n8n.cloud/webhook/eliminar-producto-fede';

interface Producto {
  id: string;
  nombre: string;
  stock: number;
  precio: number;
  valorTotal: number;
}

export default function StockPage() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [buscar, setBuscar] = useState('');
  const [filtro, setFiltro] = useState('todos');
  const [umbralBajo, setUmbralBajo] = useState(5);
  const [showNuevo, setShowNuevo] = useState(false);
  const [showEntrada, setShowEntrada] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formNuevo, setFormNuevo] = useState({ codigo: '', nombre: '', stock: '', precio_costo: '' });
  const [formEntrada, setFormEntrada] = useState({ producto: '', cantidad: '', precio_costo: '' });
  const [editandoStockId, setEditandoStockId] = useState<string | null>(null);
  const [stockValue, setStockValue] = useState('');
  const [savingStock, setSavingStock] = useState(false);

  async function cargar() {
    setLoading(true);
    try {
      const { data: raw, error } = await supabase
        .from('productos')
        .select('codigo, nombre, stock, precio_costo')
        .order('nombre', { ascending: true });
      if (error) throw error;
      const prods = (raw || [])
        .filter((r: any) => r.nombre)
        .map((r: any) => {
          const precio = Number(r.precio_costo) || 0;
          const stock = Number(r.stock) || 0;
          return {
            id: r.codigo || '',
            nombre: r.nombre || '',
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
    const matchFiltro = filtro === 'todos' || (filtro === 'ok' && p.stock > umbralBajo) || (filtro === 'bajo' && p.stock > 0 && p.stock <= umbralBajo) || (filtro === 'sin' && p.stock <= 0);
    return matchBuscar && matchFiltro;
  });

  const sinStock = filtrados.filter(p => p.stock <= 0).length;
  const stockBajo = filtrados.filter(p => p.stock > 0 && p.stock <= umbralBajo).length;
  const disponibles = filtrados.filter(p => p.stock > umbralBajo).length;
  const patrimonio = filtrados.reduce((s, p) => s + p.valorTotal, 0);

  function estadoBadge(stock: number) {
    if (stock <= 0) return <span className="badge badge-red">Sin Stock</span>;
    if (stock <= umbralBajo) return <span className="badge badge-orange">Stock Bajo</span>;
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

  function abrirEditarStock(p: Producto) {
    setEditandoStockId(p.id);
    setStockValue(String(p.stock));
  }

  function cancelarEditarStock() {
    setEditandoStockId(null);
    setStockValue('');
  }

  async function guardarStock(p: Producto) {
    const nuevoStock = parseInt(stockValue);
    if (isNaN(nuevoStock) || nuevoStock < 0) {
      alert('Ingresá una cantidad de stock válida');
      return;
    }
    setSavingStock(true);
    try {
      const { error } = await supabase.from('productos').update({ stock: nuevoStock }).eq('codigo', p.id);
      if (error) throw error;
      setProductos(prev => prev.map(x => x.id === p.id ? { ...x, stock: nuevoStock, valorTotal: nuevoStock * x.precio } : x));
      cancelarEditarStock();
    } catch (e) {
      console.error(e);
      alert('Error al actualizar el stock');
    }
    setSavingStock(false);
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
          <span className="topbar-badge">{filtrados.length} de {productos.length} productos</span>
          <button className="btn btn-secondary" onClick={cargar}>↻ Actualizar</button>
          <button className="btn btn-secondary" onClick={() => setShowEntrada(true)}>+ Registrar Entrada</button>
          <button className="btn btn-primary" onClick={() => setShowNuevo(true)}>+ Nuevo Producto</button>
        </div>
      </div>

      <div className="page-content">
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-card-label">Total Productos</div>
            <div className="stat-card-value blue">{filtrados.length}</div>
            <div className="stat-card-sub">{filtrados.length !== productos.length ? `de ${productos.length} ` : ''}en inventario</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-label">Sin Stock</div>
            <div className="stat-card-value red">{sinStock}</div>
            <div className="stat-card-sub">agotados</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-label">Stock Bajo</div>
            <div className="stat-card-value orange">{stockBajo}</div>
            <div className="stat-card-sub">≤ {umbralBajo} unidades</div>
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
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <label style={{ fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>Umbral bajo:</label>
                <input className="input" type="number" min="1" style={{ width: 64 }} value={umbralBajo} onChange={e => setUmbralBajo(Math.max(1, parseInt(e.target.value) || 1))} />
              </div>
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
                  <td style={{ fontWeight: 700, color: p.stock <= 0 ? 'var(--danger)' : p.stock <= umbralBajo ? 'var(--warning)' : 'var(--success)', fontSize: 16 }}>
                    {editandoStockId === p.id ? (
                      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                        <input
                          className="input"
                          type="number"
                          min="0"
                          autoFocus
                          value={stockValue}
                          onChange={e => setStockValue(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') guardarStock(p); if (e.key === 'Escape') cancelarEditarStock(); }}
                          style={{ width: 72, fontSize: 14, fontWeight: 700 }}
                        />
                        <button className="btn btn-ghost" style={{ padding: '4px 6px' }} disabled={savingStock} onClick={() => guardarStock(p)} title="Guardar">✓</button>
                        <button className="btn btn-ghost" style={{ padding: '4px 6px' }} disabled={savingStock} onClick={cancelarEditarStock} title="Cancelar">✕</button>
                      </div>
                    ) : p.stock}
                  </td>
                  <td className="td-muted">${p.precio.toFixed(2)}</td>
                  <td className="td-money">${p.valorTotal.toFixed(2)}</td>
                  <td>{estadoBadge(p.stock)}</td>
                  <td style={{ display: 'flex', gap: 4 }}>
                    <button className="btn btn-ghost" style={{ padding: '4px 8px' }} onClick={() => abrirEditarStock(p)} title="Editar stock">✏️</button>
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