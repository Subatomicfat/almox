import React from 'react';
export function CategoriaBadge({ categoria }) {
  return <span className={`badge badge-${categoria?.toLowerCase()}`}>{categoria}</span>;
}

export function LoadingInline({ label = 'Carregando...' }) {
  return (
    <div className="loading-inline">
      <span className="spinner" /> {label}
    </div>
  );
}

export function EmptyHint({ title, children }) {
  return (
    <div className="empty-hint">
      <strong style={{ display: 'block', marginBottom: 4, color: 'var(--ink)' }}>{title}</strong>
      {children}
    </div>
  );
}

export function StatCard({ title, value, sub, tone }) {
  return (
    <div className={`stat-card ${tone || ''}`}>
      <h3>{title}</h3>
      <div className="num">{value}</div>
      {sub && <div className="sub">{sub}</div>}
    </div>
  );
}

export function EmptyTableRow({ colSpan, children }) {
  return (
    <tr className="empty-row">
      <td colSpan={colSpan}>{children}</td>
    </tr>
  );
}
