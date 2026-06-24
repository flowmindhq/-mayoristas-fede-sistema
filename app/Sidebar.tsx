'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';

const navItems = [
  {
    label: 'Principal',
    items: [
      { href: '/', icon: '🏠', label: 'Dashboard' },
      { href: '/ventas', icon: '📋', label: 'Ventas' },
      { href: '/stock', icon: '📦', label: 'Stock' },
      { href: '/clientes', icon: '👥', label: 'Clientes' },
      { href: '/finanzas', icon: '💰', label: 'Finanzas' },
    ]
  }
];

export default function Sidebar() {
  const pathname = usePathname();
  const [ultimaActualizacion, setUltimaActualizacion] = useState('');

  useEffect(() => {
    function actualizar() {
      const ahora = new Date();
      const hora = ahora.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
      setUltimaActualizacion(hora);
    }
    actualizar();
    // Actualiza cada vez que cambia la ruta
  }, [pathname]);

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">F</div>
        <div>
          <div className="sidebar-logo-text">Mayoristas Fede</div>
          <div className="sidebar-logo-sub">Sistema Operativo</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {navItems.map(section => (
          <div key={section.label}>
            <div className="sidebar-section-label">{section.label}</div>
            {section.items.map(item => (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-item ${pathname === item.href ? 'active' : ''}`}
              >
                <span style={{ fontSize: 15 }}>{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span className="status-dot" />
          Sistema activo
        </div>
        {ultimaActualizacion && (
          <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4, paddingLeft: 2 }}>
            Última actualización: {ultimaActualizacion}
          </div>
        )}
      </div>
    </aside>
  );
}