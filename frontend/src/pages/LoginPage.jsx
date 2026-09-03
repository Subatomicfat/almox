import React from 'react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { loginSchema } from '../utils/validationSchemas';
import { extractErrorMessage } from '../utils/errors';
import FieldError from '../components/ui/FieldError';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [apiError, setApiError] = useState(null);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: yupResolver(loginSchema)
  });

  async function onSubmit(values) {
    setApiError(null);
    try {
      await login(values.email, values.senha);
      const redirectTo = location.state?.from?.pathname || '/';
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setApiError(extractErrorMessage(err, 'Não foi possível fazer login.'));
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-brand">
          <div className="brand-mark" style={{ background: 'var(--amber)', color: '#1B2430', width: 38, height: 38, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontWeight: 700 }}>AC</div>
          <div>
            <strong style={{ display: 'block', fontSize: 16 }}>ALMOX//CTRL</strong>
            <small style={{ color: 'var(--steel-2)', fontSize: 11 }}>Controle de Estoque</small>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div style={{ marginBottom: 14 }}>
            <label htmlFor="email">E-mail</label>
            <input id="email" type="email" autoComplete="username" placeholder="seu.email@empresa.com.br" {...register('email')} />
            <FieldError message={errors.email?.message} />
          </div>
          <div style={{ marginBottom: 18 }}>
            <label htmlFor="senha">Senha</label>
            <input id="senha" type="password" autoComplete="current-password" placeholder="••••••••" {...register('senha')} />
            <FieldError message={errors.senha?.message} />
          </div>

          {apiError && <div className="field-error" style={{ marginBottom: 14 }}>{apiError}</div>}

          <button type="submit" className="btn btn-primary btn-block" disabled={isSubmitting}>
            {isSubmitting ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}
