'use client';
import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { supabase } from '@/lib/supabase';

function parseNum(val: any): number {
  if (typeof val === 'number') return val;
  return parseFloat(String(val || '0').replace(',', '.').replace(/[^0-9.]/g, '')) || 0;
}

interface Cuenta {
  id: string;
  nombre: string;
  monto: number;
  tipo: 'deben' | 'debo';
  descripcion: string;
}

interface VentaRow {
  fecha: string;
  facturacion: number;
  ganancia: number;
  estado: string;
  cliente: string;
  vendedor: string;
}

export default function FinanzasPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalFact: 0, totalGan: 0, patrimonio: 0,
    ventasHoy: 0, factHoy: 0, ganHoy: 0,
    ventasMes: 0, factMes: 0, ganMes: 0,
    pendientes: 0, factPendiente: 0,
  });
  const [topClientes, setTopClientes] = useState<any[]>([]);
  const [topVendedores, setTopVendedores] = useState<any[]>([]);
  const [graficoData, setGraficoData] = useState<any[]>([]);
  const [cuentas, setCuentas] = useState<Cuenta[]>([]);
  const [showCuentaModal, setShowCuentaModal] = useState(false);
  const [cuentaForm, setCuentaForm] = useState({ nombre: '', monto: '', tipo: 'deben' as 'deben' | 'debo', descripcion: '' });

  useEffect(() => {
    async function cargar() {
      setLoading(true);
      try {
        const [{ data: rawVentas, error: errVentas }, { data: rawStock, error: errStock }] = await Promise.all([
          supabase.from('ventas').select('*'),
          supabase.from('productos').select('nombre, stock, precio_costo')
        ]);
        if (errVentas) throw errVentas;
        if (errStock) throw errStock;

        const hoy = new Date().toISOString().split('T')[0];
        const mes = hoy.slice(0, 7);

        const vs: VentaRow[] = (rawVentas || []).map((r: any) => ({
          fecha: r.fecha || '',
          facturacion: parseNum(r.facturacion),
          ganancia: parseNum(r.ganancia),
          estado: r.estado || '',
          cliente: (r.cliente_nombre || '').trim(),
          vendedor: (r.vendedor || '').trim(),
        })).filter((v: VentaRow) => v.cliente && !v.cliente.startsWith('---') && !v.cliente.toUpperCase().startsWith('CIERRE'));

        const patrimonio = (rawStock || [])
          .filter((r: any) => r.nombre)
          .reduce((s: number, r: any) => {
            const precio = parseNum(r.precio_costo);
            const stock = parseNum(r.stock);
            return s + (stock > 0 ? stock * precio : 0);
          }, 0);

        const hoyVs = vs.filter((v: VentaRow) => v.fecha === hoy);
        const mesVs = vs.filter((v: VentaRow) => v.fecha.startsWith(mes));
        const pendVs = vs.filter((v: VentaRow) => v.estado === 'Pendiente');

        setStats({
          totalFact: vs.reduce((s, v) => s + v.facturacion, 0),
          totalGan: vs.reduce((s, v) => s + v.ganancia, 0),
          patrimonio,
          ventasHoy: hoyVs.length,
          factHoy: hoyVs.reduce((s, v) => s + v.facturacion, 0),
          ganHoy: hoyVs.reduce((s, v) => s + v.ganancia, 0),
          ventasMes: mesVs.length,
          factMes: mesVs.reduce((s, v) => s + v.facturacion, 0),
          ganMes: mesVs.reduce((s, v) => s + v.ganancia, 0),
          pendientes: pendVs.length,
          factPendiente: pendVs.reduce((s, v) => s + v.facturacion, 0),
        });

        const clienteMap: Record<string, { fact: number; gan: number; pedidos: number }> = {};
        vs.forEach((v: VentaRow) => {
          if (!v.cliente) return;
          if (!clienteMap[v.cliente]) clienteMap[v.cliente] = { fact: 0, gan: 0, pedidos: 0 };
          clienteMap[v.cliente].fact += v.facturacion;
          clienteMap[v.cliente].gan += v.ganancia;
          clienteMap[v.cliente].pedidos++;
        });
        setTopClientes(Object.entries(clienteMap)
          .map(([nombre, d]) => ({ nombre, ...d }))
          .sort((a, b) => b.fact - a.fact)
          .slice(0, 5));

        const vendMap: Record<string, { fact: number; gan: number; ventas: number }> = {};
        vs.forEach((v: VentaRow) => {
          const vend = v.vendedor || 'Sin asignar';
          if (!vendMap[vend]) vendMap[vend] = { fact: 0, gan: 0, ventas: 0 };
          vendMap[vend].fact += v.facturacion;
          vendMap[vend].gan += v.ganancia;
          vendMap[vend].ventas++;
        });
        setTopVendedores(Object.entries(vendMap)
          .map(([nombre, d]) => ({ nombre, ...d }))
          .sort((a, b) => b.fact - a.fact));

        const mesMap: Record<string, { facturacion: number; ganancia: number }> = {};
        vs.forEach((v: VentaRow) => {
          const mesKey = v.fecha ? v.fecha.slice(0, 7) : '';
          if (!mesKey) return;
          if (!mesMap[mesKey]) mesMap[mesKey] = { facturacion: 0, ganancia: 0 };
          mesMap[mesKey].facturacion += v.facturacion;
          mesMap[mesKey].ganancia += v.ganancia;
        });
        const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
        const grafico = Object.entries(mesMap)
          .sort(([a], [b]) => a.localeCompare(b))
          .slice(-6)
          .map(([mesKey, d]) => ({
            mes: meses[parseInt(mesKey.slice(5, 7)) - 1] + ' ' + mesKey.slice(2, 4),
            Facturación: Math.round(d.facturacion),
            Ganancia: Math.round(d.ganancia),
          }));
        setGraficoData(grafico);

      } catch (e) { console.error(e); }
      setLoading(false);
    }
    cargar();

    const saved = localStorage.getItem('flowmind_cuentas');
    if (saved) setCuentas(JSON.parse(saved));
  }, []);

  function guardarCuenta(e: React.FormEvent) {
    e.preventDefault();
    const nueva: Cuenta = {
      id: Date.now().toString(),
      nombre: cuentaForm.nombre,
      monto: parseFloat(cuentaForm.monto) || 0,
      tipo: cuentaForm.tipo,
      descripcion: cuentaForm.descripcion,
    };
    const nuevas = [...cuentas, nueva];
    setCuentas(nuevas);
    localStorage.setItem('flowmind_cuentas', JSON.stringify(nuevas));
    setShowCuentaModal(false);
    setCuentaForm({ nombre: '', monto: '', tipo: 'deben', descripcion: '' });
  }

  function eliminarCuenta(id: string) {
    const nuevas = cuentas.filter(c => c.id !== id);
    setCuentas(nuevas);
    localStorage.setItem('flowmind_cuentas', JSON.stringify(nuevas));
  }

  const fmt = (n: number) => '$' + n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const teDeben = cuentas.filter(c => c.tipo === 'deben').reduce((s, c) => s + c.monto, 0);
  const debo = cuentas.filter(c => c.tipo === 'debo').reduce((s, c) => s + c.monto, 0);

  return (
    <>
      <div className="topbar">
        <div className="topbar-title">Finanzas</div>
        <div className="topbar-right">
          <span className="topbar-badge">{loading ? '...' : 'Actualizado'}</span>
        </div>
      </div>

      <div className="page-content">
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Hoy</div>
        <div className="stats-grid" style={{ marginBottom: 20 }}>
          <div className="stat-card"><div className="stat-card-label">Ventas Hoy</div><div className="stat-card-value blue">{loading ? '—' : stats.ventasHoy}</div><div className="stat-card-sub">registradas</div></div>
          <div className="stat-card"><div className="stat-card-label">Facturación Hoy</div><div className="stat-card-value green">{loading ? '—' : fmt(stats.factHoy)}</div><div className="stat-card-sub">del día</div></div>
          <div className="stat-card"><div className="stat-card-label">Ganancia Hoy</div><div className="stat-card-value green">{loading ? '—' : fmt(stats.ganHoy)}</div><div className="stat-card-sub">del día</div></div>
          <div className="stat-card"><div className="stat-card-label">Pendientes</div><div className="stat-card-value orange">{loading ? '—' : stats.pendientes}</div><div className="stat-card-sub">{loading ? '' : fmt(stats.factPendiente)} por cobrar</div></div>
        </div>

        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Este Mes</div>
        <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 20 }}>
          <div className="stat-card"><div className="stat-card-label">Ventas del Mes</div><div className="stat-card-value blue">{loading ? '—' : stats.ventasMes}</div><div className="stat-card-sub">registradas</div></div>
          <div className="stat-card"><div className="stat-card-label">Facturación del Mes</div><div className="stat-card-value green">{loading ? '—' : fmt(stats.factMes)}</div><div className="stat-card-sub">acumulada</div></div>
          <div className="stat-card"><div className="stat-card-label">Ganancia del Mes</div><div className="stat-card-value green">{loading ? '—' : fmt(stats.ganMes)}</div><div className="stat-card-sub">acumulada</div></div>
        </div>

        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Acumulado Total</div>
        <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 24 }}>
          <div className="stat-card"><div className="stat-card-label">Facturación Total</div><div className="stat-card-value green">{loading ? '—' : fmt(stats.totalFact)}</div><div className="stat-card-sub">histórico</div></div>
          <div className="stat-card"><div className="stat-card-label">Ganancia Total</div><div className="stat-card-value green">{loading ? '—' : fmt(stats.totalGan)}</div><div className="stat-card-sub">histórico</div></div>
          <div className="stat-card"><div className="stat-card-label">Patrimonio en Stock</div><div className="stat-card-value blue">{loading ? '—' : fmt(stats.patrimonio)}</div><div className="stat-card-sub">valor inventario USD</div></div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
          <div className="stat-card" style={{ borderLeft: '3px solid var(--success)' }}>
            <div className="stat-card-label">Te Deben</div>
            <div className="stat-card-value green">{fmt(teDeben)}</div>
            <div className="stat-card-sub">deudas de clientes</div>
          </div>
          <div className="stat-card" style={{ borderLeft: '3px solid var(--danger)' }}>
            <div className="stat-card-label">Debés</div>
            <div className="stat-card-value red">{fmt(debo)}</div>
            <div className="stat-card-sub">tus deudas</div>
          </div>
        </div>

        <div className="table-card" style={{ marginBottom: 24 }}>
          <div className="table-header">
            <div className="table-title">Cuentas Corrientes</div>
            <button className="btn btn-primary" onClick={() => setShowCuentaModal(true)}>+ Nueva Cuenta</button>
          </div>
          <table>
            <thead><tr><th>Nombre</th><th>Descripción</th><th>Tipo</th><th>Monto</th><th></th></tr></thead>
            <tbody>
              {cuentas.length === 0 ? (
                <tr className="loading-row"><td colSpan={5}>Sin cuentas registradas</td></tr>
              ) : cuentas.map(c => (
                <tr key={c.id}>
                  <td style={{ fontWeight: 600 }}>{c.nombre}</td>
                  <td className="td-muted">{c.descripcion || '—'}</td>
                  <td><span className={`badge ${c.tipo === 'deben' ? 'badge-green' : 'badge-red'}`}>{c.tipo === 'deben' ? 'Te deben' : 'Debés'}</span></td>
                  <td className="td-money" style={{ color: c.tipo === 'deben' ? 'var(--success)' : 'var(--danger)' }}>{fmt(c.monto)}</td>
                  <td><button className="btn btn-ghost" style={{ color: 'var(--danger)', padding: '4px 8px' }} onClick={() => eliminarCuenta(c.id)}>🗑</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {graficoData.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
            <div className="table-card" style={{ padding: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 16, color: 'var(--text)' }}>📈 Facturación por Mes</div>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={graficoData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="mes" tick={{ fontSize: 11, fill: 'var(--text3)' }} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--text3)' }} tickFormatter={(v: number) => '$' + (v >= 1000 ? (v/1000).toFixed(0) + 'k' : v)} />
                  <Tooltip formatter={(v: any) => ['$' + Number(v).toLocaleString('es-AR'), '']} />
                  <Line type="monotone" dataKey="Facturación" stroke="#22c55e" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="table-card" style={{ padding: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 16, color: 'var(--text)' }}>💰 Ganancia por Mes</div>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={graficoData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="mes" tick={{ fontSize: 11, fill: 'var(--text3)' }} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--text3)' }} tickFormatter={(v: number) => '$' + (v >= 1000 ? (v/1000).toFixed(0) + 'k' : v)} />
                  <Tooltip formatter={(v: any) => ['$' + Number(v).toLocaleString('es-AR'), '']} />
                  <Line type="monotone" dataKey="Ganancia" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div className="table-card">
            <div className="table-header"><div className="table-title">🏆 Top Clientes</div></div>
            <table>
              <thead><tr><th>Cliente</th><th>Pedidos</th><th>Facturación</th></tr></thead>
              <tbody>
                {loading ? <tr className="loading-row"><td colSpan={3}>Cargando...</td></tr>
                  : topClientes.map((c, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 600 }}>
                      <span style={{ color: i === 0 ? '#F59E0B' : i === 1 ? '#94A3B8' : i === 2 ? '#CD7F32' : 'var(--text3)', marginRight: 6, fontSize: 12 }}>#{i+1}</span>
                      {c.nombre}
                    </td>
                    <td><span className="badge badge-blue">{c.pedidos}</span></td>
                    <td className="td-money">${c.fact.toLocaleString('es-AR')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="table-card">
            <div className="table-header"><div className="table-title">🏆 Top Vendedores</div></div>
            <table>
              <thead><tr><th>Vendedor</th><th>Ventas</th><th>Facturación</th></tr></thead>
              <tbody>
                {loading ? <tr className="loading-row"><td colSpan={3}>Cargando...</td></tr>
                  : topVendedores.map((v, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 600 }}>
                      <span style={{ color: i === 0 ? '#F59E0B' : i === 1 ? '#94A3B8' : i === 2 ? '#CD7F32' : 'var(--text3)', marginRight: 6, fontSize: 12 }}>#{i+1}</span>
                      {v.nombre}
                    </td>
                    <td><span className="badge badge-blue">{v.ventas}</span></td>
                    <td className="td-money">${v.fact.toLocaleString('es-AR')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showCuentaModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowCuentaModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <div className="modal-title">Nueva Cuenta Corriente</div>
              <button className="btn btn-ghost" onClick={() => setShowCuentaModal(false)}>✕</button>
            </div>
            <form onSubmit={guardarCuenta}>
              <div className="modal-body">
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Nombre *</label>
                    <input className="input" placeholder="Juan Pérez / Proveedor X" value={cuentaForm.nombre} onChange={e => setCuentaForm({...cuentaForm, nombre: e.target.value})} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Monto *</label>
                    <input className="input" type="number" step="0.01" placeholder="0" value={cuentaForm.monto} onChange={e => setCuentaForm({...cuentaForm, monto: e.target.value})} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Tipo *</label>
                    <select className="input" value={cuentaForm.tipo} onChange={e => setCuentaForm({...cuentaForm, tipo: e.target.value as 'deben' | 'debo'})}>
                      <option value="deben">Te deben</option>
                      <option value="debo">Debés</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Descripción</label>
                    <input className="input" placeholder="Opcional..." value={cuentaForm.descripcion} onChange={e => setCuentaForm({...cuentaForm, descripcion: e.target.value})} />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCuentaModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}