import React from 'react';
import { useEffect, useState } from 'react';
import { listProducts } from '../../api/productsApi';
import { formatNumber, formatCurrency } from '../../utils/format';

/**
 * Campo de busca de produto com autocomplete (digita código/nome,
 * escolhe da lista). Usado em Movimentações (escolher o produto a
 * movimentar) e em Relatórios (escolher o produto do Kardex) — extraído
 * aqui em vez de duplicado, já que o comportamento é idêntico nos dois
 * lugares.
 */
export default function ProductPicker({ value, onSelect, placeholder = 'Digite o código ou nome do produto...' }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!query || query.length < 2) { setResults([]); return; }
    const timer = setTimeout(async () => {
      try {
        const { data } = await listProducts({ busca: query, limit: 8 });
        setResults(data);
      } catch { /* busca opcional — falha silenciosa não bloqueia o formulário */ }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div style={{ position: 'relative' }}>
      <input
        placeholder={placeholder}
        value={value ? `${value.codigo} — ${value.nome}` : query}
        onChange={(e) => { onSelect(null); setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
      />
      {value && (
        <div className="info-line" style={{ display: 'block', background: 'var(--amber-soft)', color: 'var(--amber-dark)', borderRadius: 6, padding: '8px 12px', fontSize: 12.5, fontFamily: 'var(--font-mono)', marginTop: 6 }}>
          Estoque atual: {formatNumber(value.estoque_atual)} {value.unidade} · Mínimo: {formatNumber(value.estoque_minimo)} {value.unidade}
          {Number(value.custo_medio) > 0 && <> · Custo médio: {formatCurrency(value.custo_medio)}</>}
        </div>
      )}
      {open && results.length > 0 && !value && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--panel)', border: '1px solid var(--line-strong)', borderRadius: 7, zIndex: 10, boxShadow: 'var(--shadow-md)', maxHeight: 220, overflowY: 'auto' }}>
          {results.map((p) => (
            <div
              key={p.id}
              style={{ padding: '9px 12px', cursor: 'pointer', fontSize: 13, borderBottom: '1px solid var(--line)' }}
              onMouseDown={() => { onSelect(p); setOpen(false); setQuery(''); }}
            >
              <span className="mono">{p.codigo}</span> — {p.nome}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
