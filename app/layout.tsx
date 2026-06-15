import type { Metadata } from 'next';
import './globals.css';
import Sidebar from './Sidebar';

export const metadata: Metadata = {
  title: 'Mayoristas Fede — Sistema',
  description: 'Sistema Operativo para Mayoristas Fede',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <div className="app-layout">
          <Sidebar />
          <div className="main-content">
            {children}
          </div>
        </div>
      </body>
    </html>
  );
}