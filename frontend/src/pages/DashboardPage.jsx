import React from 'react';
import { useEffect, useState } from 'react';
import Page from '../components/layout/Page';
import { StatCard, LoadingInline, EmptyHint } from '../components/ui/Common';
import { getDashboardStats } from '../api/dashboardApi';
import { getEstoqueBaixo } from '../api/productsApi';
import { listMovements } from '../api/movementsApi';
import { extractErrorMessage } from '../utils/errors';
import { formatNumber, formatDateTime } from '../utils/format';
import { useToast } from '../context/ToastContext';

export default function DashboardPage() {
  const toast = useToast();
  const [stats, setStats] = useState(null);
  const [alertas, setAlertas] = useState([]);
  const [recentes, setRecentes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [statsData, alertasData, movsData] = await Promise.all([
          getDashboardStats(),
          getEstoqueBaixo(),
          listMovements({ limit: 6 })
        ]);
        setStats(statsData);
        setAlertas(alertasData);
        setRecentes(movsData);
      } catch (err) {
        toast.erro(extractErrorMessage(err, 'Não foi possível carregar o dashboard.'));
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) return <Page title="Dashboard"><LoadingInline label="Carregando dashboard..." /></Page>;

  return (
    <Page title="Dashboard" subtitle="Visão geral do estoque e alertas em tempo real">
      <div className="stat-grid">
        <StatCard title="Total de Produtos" value={formatNumber(stats.totalProdutos)} sub="itens cadastrados" tone="accent" />
        <StatCard title="Estoque Baixo" value={formatNumber(stats.estoqueBaixo)} sub="itens no ou abaixo do mínimo" tone="alert" />
        <StatCard title="Movimentações Hoje" value={formatNumber(stats.movimentacoesHoje)} sub="entradas e saídas" tone="ok" />
        <StatCard title="Veículos / Ativos" value={`${formatNumber(stats.totalVeiculos)} / ${formatNumber(stats.totalAtivos)}`} sub="frota / comodato" />
      </div>

      {alertas.length > 0 && (
        <div className="panel" style={{ borderLeft: '4px solid var(--red)', background: 'var(--red-soft)' }}>
          <h2 style={{ color: '#7A2717', fontSize: 14, marginBottom: 10 }}>⚠ Alertas de estoque mínimo</h2>
          <ul style={{ margin: 0, paddingLeft: 18, color: '#7A2717', fontSize: 13, lineHeight: 1.9 }}>
            {alertas.slice(0, 8).map((p) => (
              <li key={p.id}><strong className="mono">{p.codigo}</strong> — {p.nome}: {formatNumber(p.estoque_atual)} {p.unidade} (mínimo {formatNumber(p.estoque_minimo)})</li>
            ))}
          </ul>
        </div>
      )}

      <div className="panel">
        <div className="section-head"><h2>Atividade recente</h2></div>
        {recentes.length === 0 ? (
          <EmptyHint title="Nenhuma movimentação ainda">Registre uma entrada ou saída para ver a atividade aqui.</EmptyHint>
        ) : (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {recentes.map((m) => (
              <li key={m.id} style={{ display: 'flex', gap: 12, padding: '11px 0', borderBottom: '1px solid var(--line)', fontSize: 13 }}>
                <span style={{ width: 30, height: 30, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: m.type === 'entrada' ? 'var(--teal-soft)' : 'var(--red-soft)', color: m.type === 'entrada' ? 'var(--teal)' : 'var(--red)' }}>
                  {m.type === 'entrada' ? '↓' : '↑'}
                </span>
                <span style={{ flex: 1 }}>
                  <strong className="mono">{m.produto_codigo}</strong> — {m.produto_nome} · {m.type === 'entrada' ? 'entrada' : 'saída'} de {formatNumber(m.quantidade)} · {m.responsavel}
                </span>
                <span style={{ color: 'var(--steel-2)', fontSize: 11.5, whiteSpace: 'nowrap' }}>{formatDateTime(m.data_movimentacao)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Page>
  );
}
