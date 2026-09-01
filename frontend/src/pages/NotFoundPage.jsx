import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
      <h1 style={{ fontSize: 48 }}>404</h1>
      <p style={{ color: 'var(--steel-2)' }}>Página não encontrada.</p>
      <Link to="/" className="btn btn-primary">Voltar ao início</Link>
    </div>
  );
}
