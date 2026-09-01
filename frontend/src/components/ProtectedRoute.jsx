import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LoadingInline } from './ui/Common';

/**
 * Protege uma rota exigindo autenticação e, opcionalmente, um papel
 * específico. Isso é só a camada de UX (esconder o que o usuário não
 * pode fazer) — a permissão de verdade é sempre revalidada no backend
 * (ver rbac.middleware.js); esconder um botão no frontend nunca é
 * suficiente sozinho.
 */
export default function ProtectedRoute({ children, roles }) {
  const { isAuthenticated, bootstrapping, hasRole } = useAuth();
  const location = useLocation();

  if (bootstrapping) {
    return <div style={{ padding: 40 }}><LoadingInline label="Verificando sessão..." /></div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (roles && !hasRole(...roles)) {
    return (
      <div style={{ padding: 40 }}>
        <div className="empty-hint">
          <strong style={{ display: 'block', marginBottom: 4 }}>Acesso restrito</strong>
          Seu perfil não tem permissão para acessar esta página.
        </div>
      </div>
    );
  }

  return children;
}
