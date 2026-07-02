'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { supabase } from '@/lib/supabase';

function parseNum(val: any): number {
  if (typeof val === 'number') return val;
  return parseFloat(String(val || '0').replace(',', '.').replace(/[^0-9.]/g, '')) || 0;
}

// Fecha local en formato YYYY-MM-DD (no usar toISOString: convierte a UTC
// y desfasa el día/mes en Argentina, sobre todo cerca de medianoche o fin de mes).
function fechaLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

interface VentaRow {
  fecha: string;
  cliente: string;
  facturacion: number;
  ganancia: number;
  estado: string;
  vendedor: string;
  pedido: string;
}

const modulos = [
  { href: '/ventas', icon: '📋', label: 'Ventas', desc: 'Registrar y gestionar pedidos', color: 'var(--primary)' },
  { href: '/stock', icon: '📦', label: 'Stock', desc: 'Control de inventario', color: '#8B5CF6' },
  { href: '/clientes', icon: '👥', label: 'Clientes', desc: 'Base de clientes e historial', color: '#06B6D4' },
  { href: '/finanzas', icon: '💰', label: 'Finanzas', desc: 'Métricas y análisis financiero', color: 'var(--success)' },
];

export default function HomePage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    ventasHoy: 0, factHoy: 0, ganHoy: 0,
    ventasMes: 0, factMes: 0, ganMes: 0,
    pendientes: 0, factPendiente: 0,
  });
  const [ultimasVentas, setUltimasVentas] = useState<VentaRow[]>([]);
  const [diarioData, setDiarioData] = useState<any[]>([]);

  useEffect(() => {
    async function cargar() {
      setLoading(true);
      try {
        const { data: rawVentas, error } = await supabase.from('ventas').select('*').order('orden_ingreso', { ascending: true });
        if (error) throw error;

        const hoy = fechaLocal(new Date());
        const mes = hoy.slice(0, 7);

        const vs: VentaRow[] = (rawVentas || []).map((r: any) => ({
          fecha: r.fecha || '',
          cliente: (r.cliente_nombre || '').trim(),
          facturacion: parseNum(r.facturacion),
          ganancia: parseNum(r.ganancia),
          estado: r.estado || '',
          vendedor: (r.vendedor || '').trim(),
          pedido: r.pedido || '',
        })).filter((v: VentaRow) => v.cliente && !v.cliente.startsWith('---') && !v.cliente.toUpperCase().startsWith('CIERRE'));

        const hoyVs = vs.filter(v => v.fecha === hoy);
        const mesVs = vs.filter(v => v.fecha.startsWith(mes));
        const pendVs = vs.filter(v => v.estado === 'Pendiente');

        setStats({
          ventasHoy: hoyVs.length,
          factHoy: hoyVs.reduce((s, v) => s + v.facturacion, 0),
          ganHoy: hoyVs.reduce((s, v) => s + v.ganancia, 0),
          ventasMes: mesVs.length,
          factMes: mesVs.reduce((s, v) => s + v.facturacion, 0),
          ganMes: mesVs.reduce((s, v) => s + v.ganancia, 0),
          pendientes: pendVs.length,
          factPendiente: pendVs.reduce((s, v) => s + v.facturacion, 0),
        });

        setUltimasVentas(vs.slice(-5).reverse());

        const last7 = [];
        for (let i = 6; i >= 0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          last7.push(fechaLocal(d));
        }
        const dias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
        const diario = last7.map(fecha => {
          const dVentas = vs.filter(v => v.fecha === fecha);
          const dayName = dias[new Date(fecha + 'T12:00:00').getDay()];
          const dayNum = fecha.slice(8, 10);
          return {
            dia: `${dayName} ${dayNum}`,
            Facturación: Math.round(dVentas.reduce((s, v) => s + v.facturacion, 0)),
            Ventas: dVentas.length,
          };
        });
        setDiarioData(diario);

      } catch (e) { console.error(e); }
      setLoading(false);
    }
    cargar();
  }, []);

  const fmt = (n: number) => '$' + n.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  const fmtFull = (n: number) => '$' + n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const hoyLabel = new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <>
      <div className="topbar">
        <div className="topbar-title">Dashboard</div>
        <div className="topbar-right">
          <span className="topbar-badge" style={{ textTransform: 'capitalize' }}>{hoyLabel}</span>
          <span className="topbar-badge">{loading ? '...' : 'Actualizado'}</span>
        </div>
      </div>

      <div className="page-content">
        {/* KPIs principales */}
        <div className="stats-grid" style={{ marginBottom: 24 }}>
          <div className="stat-card" style={{ borderTop: '3px solid var(--primary)' }}>
            <div className="stat-card-label">Ventas Hoy</div>
            <div className="stat-card-value blue">{loading ? '—' : stats.ventasHoy}</div>
            <div className="stat-card-sub">{loading ? '' : fmtFull(stats.factHoy) + ' facturado'}</div>
          </div>
          <div className="stat-card" style={{ borderTop: '3px solid var(--success)' }}>
            <div className="stat-card-label">Facturación del Mes</div>
            <div className="stat-card-value green">{loading ? '—' : fmt(stats.factMes)}</div>
            <div className="stat-card-sub">{loading ? '' : stats.ventasMes + ' ventas registradas'}</div>
          </div>
          <div className="stat-card" style={{ borderTop: '3px solid #8B5CF6' }}>
            <div className="stat-card-label">Ganancia del Mes</div>
            <div className="stat-card-value" style={{ color: '#8B5CF6' }}>{loading ? '—' : fmt(stats.ganMes)}</div>
            <div className="stat-card-sub">{loading ? '' : 'margen ' + (stats.factMes > 0 ? ((stats.ganMes / stats.factMes) * 100).toFixed(1) : '0') + '%'}</div>
          </div>
          <div className="stat-card" style={{ borderTop: '3px solid var(--warning)' }}>
            <div className="stat-card-label">Pendientes</div>
            <div className="stat-card-value orange">{loading ? '—' : stats.pendientes}</div>
            <div className="stat-card-sub">{loading ? '' : fmtFull(stats.factPendiente) + ' por despachar'}</div>
          </div>
        </div>

        {/* Chart + últimas ventas */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 16, marginBottom: 24 }}>
          <div className="table-card" style={{ padding: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4, color: 'var(--text)' }}>Actividad últimos 7 días</div>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 16 }}>Facturación diaria</div>
            {loading ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, color: 'var(--text3)', fontSize: 13 }}>Cargando gráfico...</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={diarioData} barSize={28}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="dia" tick={{ fontSize: 11, fill: 'var(--text3)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--text3)' }} axisLine={false} tickLine={false} tickFormatter={(v: number) => v >= 1000 ? (v / 1000).toFixed(0) + 'k' : String(v)} />
                  <Tooltip
                    contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                    formatter={(v: any, name: any) => [name === 'Facturación' ? '$' + Number(v).toLocaleString('es-AR') : v, name]}
                    labelStyle={{ fontWeight: 600, marginBottom: 4 }}
                  />
                  <Bar dataKey="Facturación" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="table-card">
            <div className="table-header">
              <div className="table-title">Últimas Ventas</div>
              <Link href="/ventas" className="btn btn-ghost" style={{ fontSize: 12, color: 'var(--primary)' }}>Ver todas →</Link>
            </div>
            <table>
              <thead>
                <tr><th>Cliente</th><th>Monto</th><th>Estado</th></tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr className="loading-row"><td colSpan={3}>Cargando...</td></tr>
                ) : ultimasVentas.length === 0 ? (
                  <tr className="loading-row"><td colSpan={3}>Sin ventas registradas</td></tr>
                ) : ultimasVentas.map((v, i) => (
                  <tr key={i}>
                    <td>
                      <div style={{ fontWeight: 500, fontSize: 13 }}>{v.cliente}</div>
                      <div style={{ fontSize: 11, color: 'var(--text3)' }}>{v.fecha}</div>
                    </td>
                    <td className="td-money">{fmtFull(v.facturacion)}</td>
                    <td>
                      <span className={`badge ${v.estado === 'Pendiente' ? 'badge-orange' : 'badge-green'}`}>
                        {v.estado || '—'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Resumen rápido del día */}
        {!loading && stats.ventasHoy > 0 && (
          <div className="stat-card" style={{ marginBottom: 24, display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px' }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--success-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>📊</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>Resumen del día</div>
              <div style={{ fontSize: 12, color: 'var(--text2)' }}>
                Hoy se registraron <strong>{stats.ventasHoy} ventas</strong> por un total de <strong style={{ color: 'var(--success)' }}>{fmtFull(stats.factHoy)}</strong> con una ganancia de <strong style={{ color: 'var(--success)' }}>{fmtFull(stats.ganHoy)}</strong>
              </div>
            </div>
          </div>
        )}

        {/* Accesos rápidos */}
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Accesos Rápidos</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {modulos.map(m => (
            <Link key={m.href} href={m.href} style={{ textDecoration: 'none' }}>
              <div className="stat-card" style={{ cursor: 'pointer', transition: 'box-shadow 0.15s, border-color 0.15s' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 12px rgba(0,0,0,0.06)'; (e.currentTarget as HTMLElement).style.borderColor = m.color; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = 'none'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 8, background: m.color + '12', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>{m.icon}</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{m.label}</div>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text3)' }}>{m.desc}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
