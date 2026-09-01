import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: <path d="M3 3h8v8H3zM13 3h8v8h-8zM3 13h8v8H3zM13 13h8v8h-8z" /> },
  { to: '/produtos', label: 'Produtos', icon: <path d="M3 8l9-5 9 5-9 5-9-5Zm0 0v9l9 5 9-5V8M12 13v9" /> },
  { to: '/veiculos', label: 'Frota', icon: <path d="M2 8h12v8H2zM14 11h4l3 3v2h-7zM6.5 18a1.7 1.7 0 100-3.4 1.7 1.7 0 000 3.4zm10 0a1.7 1.7 0 100-3.4 1.7 1.7 0 000 3.4z" /> },
  { to: '/ativos', label: 'Comodato', icon: <path d="M12 3l9 5-9 5-9-5 9-5ZM3 13l9 5 9-5" /> },
  { to: '/movimentacoes', label: 'Movimentações', icon: <path d="M4 9h13M13 5l4 4-4 4M20 15H7M11 19l-4-4 4-4" /> },
  { to: '/relatorios', label: 'Relatórios', icon: <path d="M4 20V10M10 20V4M16 20v-7M4 20h16" /> }
];

const ADMIN_ITEMS = [
  { to: '/usuarios', label: 'Usuários', icon: <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /> },
  { to: '/auditoria', label: 'Log de auditoria', icon: <path d="M12 2 1 21h22L12 2ZM12 9v5M12 17h.01" /> }
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [theme, setTheme] = useState(() => localStorage.getItem('almox_theme') || 'light');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('almox_theme', theme);
  }, [theme]);

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">AC</div>
          <div className="brand-text"><strong>ALMOX//CTRL</strong><small>Controle de Estoque</small></div>
        </div>

        <nav className="nav">
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.to} to={item.to} className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`} end={item.to === '/'}>
              <svg className="icon" viewBox="0 0 24 24">{item.icon}</svg>
              <span>{item.label}</span>
            </NavLink>
          ))}
          {user?.role === 'admin' && (
            <>
              <div style={{ height: 1, background: 'rgba(255,255,255,.09)', margin: '8px 4px' }} />
              {ADMIN_ITEMS.map((item) => (
                <NavLink key={item.to} to={item.to} className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
                  <svg className="icon" viewBox="0 0 24 24">{item.icon}</svg>
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </>
          )}
        </nav>

        <div className="sidebar-footer">
          <button type="button" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
            {theme === 'light' ? '🌙 Modo escuro' : '☀️ Modo claro'}
          </button>
          <button type="button" onClick={handleLogout}>
            <svg className="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" /></svg>
            Sair ({user?.nome})
          </button>
        </div>
      </aside>

      <div className="main">
        <Outlet />
      </div>
    </div>
  );
}
