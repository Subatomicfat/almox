import { useCallback, useEffect, useState } from 'react';
import Page from '../components/layout/Page';
import { LoadingInline, EmptyTableRow } from '../components/ui/Common';
import { useToast } from '../context/ToastContext';
import { listAuditLog } from '../api/auditLogApi';
import { extractErrorMessage } from '../utils/errors';
import { formatDateTime } from '../utils/format';

const ACTION_LABEL = {
  CREATE: 'Criação', UPDATE: 'Atualização', DELETE: 'Exclusão',
  LOGIN: 'Login', LOGIN_FAILED: 'Login falhou', LOGOUT: 'Logout'
};

export default function AuditLogPage() {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listAuditLog({ data_inicio: dataInicio || undefined, data_fim: dataFim || undefined, limit: 100 });
      setItems(data);
    } catch (err) {
      toast.erro(extractErrorMessage(err, 'Não foi possível carregar o log de auditoria.'));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataInicio, dataFim]);

  useEffect(() => { load(); }, [load]);

  return (
    <Page title="Log de Auditoria" subtitle="Quem fez o quê, quando e a partir de qual IP (apenas administradores)">
      <div className="toolbar">
        <div className="search-row">
          <div>
            <label style={{ marginBottom: 4 }}>De</label>
            <input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
          </div>
          <div>
            <label style={{ marginBottom: 4 }}>Até</label>
            <input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="table-wrap">
        <table>
          <thead><tr><th>Quando</th><th>Usuário</th><th>Ação</th><th>Tabela</th><th>Registro</th><th>IP</th></tr></thead>
          <tbody>
            {loading ? (
              <EmptyTableRow colSpan={6}><LoadingInline /></EmptyTableRow>
            ) : items.length === 0 ? (
              <EmptyTableRow colSpan={6}>Nenhum evento encontrado para o período.</EmptyTableRow>
            ) : items.map((log) => (
              <tr key={log.id}>
                <td className="mono">{formatDateTime(log.timestamp)}</td>
                <td>{log.user_nome || '—'}</td>
                <td>{ACTION_LABEL[log.action] || log.action}</td>
                <td className="mono">{log.table_affected}</td>
                <td className="mono">{log.record_id || '-'}</td>
                <td className="mono">{log.ip_address || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Page>
  );
}
