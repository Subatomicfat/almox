import React from 'react';
export default function Page({ title, subtitle, actions, children }) {
  return (
    <>
      <header className="topbar">
        <div>
          <h1>{title}</h1>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {actions && <div className="action-row">{actions}</div>}
      </header>
      <main className="content">{children}</main>
    </>
  );
}
