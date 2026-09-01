import { useState } from 'react';
import Page from '../components/layout/Page';
import { EmptyTableRow, LoadingInline } from '../components/ui/Common';
import { useToast } from '../context/ToastContext';
import * as reportsApi from '../api/reportsApi';
import { extractErrorMessage } from '../utils/errors';
import { formatNumber, formatDate, maskPlaca } from '../utils/format';
import { CategoriaBadge } from '../components/ui/Common';

export default function ReportsPage() {
  const toast = useToast();

  const [placa, setPlaca] = useState('');
  const [consumoVeiculo, setConsumoVeiculo] = useState(null);
  const [loadingVeiculo, setLoadingVeiculo] = useState(false);

  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [consumoCategoria, setConsumoCategoria] = useState(null);
  const [loadingCategoria, setLoadingCategoria] = useState(false);

  const [reposicao, setReposicao] = useState(null);
  const [loadingReposicao, setLoadingReposicao] = useState(false);

  async function buscarConsumoVeiculo() {
    if (!placa) { toast.erro('Digite uma placa para buscar.'); return; }
    setLoadingVeiculo(true);
    try {
      const data = await reportsApi.consumoPorVeiculo(placa.toUpperCase());
      setConsumoVeiculo(data);
    } catch (err) {
      toast.erro(extractErrorMessage(err));
    } finally {
      setLoadingVeiculo(false);
    }
  }

  async function gerarRelatorioCategoria() {
    setLoadingCategoria(true);
    try {
      const data = await reportsApi.consumoPorCategoria({ data_inicio: dataInicio || undefined, data_fim: dataFim || undefined });
      setConsumoCategoria(data);
    } catch (err) {
      toast.erro(extractErrorMessage(err));
    } finally {
      setLoadingCategoria(false);
    }
  }

  async function carregarReposicao() {
    setLoadingReposicao(true);
    try {
      const data = await reportsApi.estoqueBaixoReport();
      setReposicao(data);
    } catch (err) {
      toast.erro(extractErrorMessage(err));
    } finally {
      setLoadingReposicao(false);
    }
  }

  async function exportar(relatorio, extraPayload = {}) {
    try {
      const blob = await reportsApi.exportCsv({ relatorio, ...extraPayload });
      reportsApi.downloadBlob(blob, `${relatorio}.csv`);
      toast.sucesso('Exportação gerada.');
    } catch (err) {
      toast.erro(extractErrorMessage(err, 'Não foi possível exportar.'));
    }
  }

  return (
    <Page title="Relatórios" subtitle="Consumo por veículo, por categoria e itens para repor">
      <div className="panel">
        <div className="section-head"><h2>Consumo por veículo</h2></div>
        <div className="search-row" style={{ marginBottom: 4 }}>
          <input placeholder="Ex: ABC-1234" value={placa} onChange={(e) => setPlaca(maskPlaca(e.target.value))} style={{ maxWidth: 200 }} />
          <button className="btn btn-primary" onClick={buscarConsumoVeiculo}>Buscar consumo</button>
        </div>

        {loadingVeiculo && <LoadingInline />}
        {consumoVeiculo && !loadingVeiculo && (
          <div style={{ marginTop: 16 }}>
            <div className="section-head">
              <h3 style={{ fontSize: 14 }}>Consumo de <span className="mono">{placa.toUpperCase()}</span></h3>
              <button className="btn btn-ghost btn-sm" onClick={() => exportar('consumo-veiculo', { placa: placa.toUpperCase() })}>Exportar CSV</button>
            </div>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Data</th><th>Produto</th><th>Quantidade</th><th>Responsável</th></tr></thead>
                <tbody>
                  {consumoVeiculo.length === 0 ? (
                    <EmptyTableRow colSpan={4}>Nenhuma movimentação encontrada para esta placa.</EmptyTableRow>
                  ) : consumoVeiculo.map((c, i) => (
                    <tr key={i}>
                      <td className="mono">{formatDate(c.data_movimentacao)}</td>
                      <td>{c.produto_nome}</td>
                      <td className="mono">{formatNumber(c.quantidade)}</td>
                      <td>{c.responsavel}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <div className="panel">
        <div className="section-head"><h2>Relatório geral por categoria</h2></div>
        <div className="form-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', marginBottom: 14 }}>
          <div>
            <label>Data inicial</label>
            <input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
          </div>
          <div>
            <label>Data final</label>
            <input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
          </div>
        </div>
        <div className="action-row" style={{ marginBottom: 16 }}>
          <button className="btn btn-primary" onClick={gerarRelatorioCategoria}>Gerar relatório</button>
          {consumoCategoria && <button className="btn btn-ghost" onClick={() => exportar('consumo-categoria', { data_inicio: dataInicio, data_fim: dataFim })}>Exportar CSV</button>}
        </div>
        {loadingCategoria && <LoadingInline />}
        {consumoCategoria && !loadingCategoria && (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Categoria</th><th>Entradas</th><th>Saídas</th></tr></thead>
              <tbody>
                {consumoCategoria.map((c) => (
                  <tr key={c.categoria}>
                    <td><CategoriaBadge categoria={c.categoria} /></td>
                    <td className="mono">{formatNumber(c.entradas)}</td>
                    <td className="mono">{formatNumber(c.saidas)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="panel" style={{ marginBottom: 0 }}>
        <div className="section-head">
          <h2>Itens para repor</h2>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-ghost btn-sm" onClick={carregarReposicao}>Atualizar</button>
            {reposicao && <button className="btn btn-ghost btn-sm" onClick={() => exportar('estoque-baixo')}>Exportar lista de compras</button>}
          </div>
        </div>
        {loadingReposicao && <LoadingInline />}
        {reposicao && !loadingReposicao && (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Código</th><th>Nome</th><th>Categoria</th><th>Atual</th><th>Mínimo</th><th>Faltam</th></tr></thead>
              <tbody>
                {reposicao.length === 0 ? (
                  <EmptyTableRow colSpan={6}>Nenhum item abaixo do estoque mínimo no momento. 🎉</EmptyTableRow>
                ) : reposicao.map((p) => (
                  <tr key={p.id}>
                    <td className="mono">{p.codigo}</td>
                    <td>{p.nome}</td>
                    <td><CategoriaBadge categoria={p.categoria} /></td>
                    <td className="mono">{formatNumber(p.estoque_atual)}</td>
                    <td className="mono">{formatNumber(p.estoque_minimo)}</td>
                    <td className="mono status-low">{formatNumber(p.quantidade_faltante)} {p.unidade}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Page>
  );
}
