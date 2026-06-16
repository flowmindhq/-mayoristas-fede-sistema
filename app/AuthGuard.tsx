'use client';
import { useState, useEffect } from 'react';

const PASSWORD = 'fede2026';
const KEY = 'fm_auth';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const [authed, setAuthed] = useState(false);
  const [pass, setPass] = useState('');
  const [error, setError] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (localStorage.getItem(KEY) === 'ok') setAuthed(true);
    setChecking(false);
  }, []);

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (pass === PASSWORD) {
      localStorage.setItem(KEY, 'ok');
      setAuthed(true);
      setError(false);
    } else {
      setError(true);
      setPass('');
    }
  }

  if (checking) return null;

  if (!authed) return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)', fontFamily: 'inherit'
    }}>
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12,
        padding: '40px 36px', width: 340, boxShadow: '0 4px 24px rgba(0,0,0,0.06)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 8, background: '#7C3AED',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontWeight: 700, fontSize: 16
          }}>F</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>Mayoristas Fede</div>
            <div style={{ fontSize: 11, color: 'var(--text3)' }}>Sistema Operativo</div>
          </div>
        </div>

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', display: 'block', marginBottom: 6 }}>
              Contraseña
            </label>
            <input
              className="input"
              type="password"
              placeholder="••••••••"
              value={pass}
              onChange={e => { setPass(e.target.value); setError(false); }}
              autoFocus
              style={{ width: '100%' }}
            />
            {error && (
              <div style={{ fontSize: 12, color: 'var(--danger)', marginTop: 6 }}>
                Contraseña incorrecta
              </div>
            )}
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
            Ingresar
          </button>
        </form>
      </div>
    </div>
  );

  return <>{children}</>;
}