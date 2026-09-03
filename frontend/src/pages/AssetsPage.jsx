import React from 'react';
import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import Page from '../components/layout/Page';
import { LoadingInline, EmptyTableRow, StatCard } from '../components/ui/Common';
import FieldError from '../components/ui/FieldError';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { listAssets, createAsset, updateAsset } from '../api/assetsApi';
import { assetSchema } from '../utils/validationSchemas';
import { extractErrorMessage } from '../utils/errors';
import { ASSET_STATUSES, WRITE_ROLES } from '../utils/constants';

const STATUS_LABEL = Object.fromEntries(ASSET_STATUSES.map((s) => [s.value, s.label]));

export default function AssetsPage() {
  const { hasRole } = useAuth();
  const canWrite = hasRole(...WRITE_ROLES);
  const toast = useToast();

  const [items, setItems] = useState([]);
  const [busca, setBusca] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
    resolver: yupResolver(assetSchema)
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listAssets({ busca: busca || undefined, status: status || undefined });
      setItems(data);
    } catch (err) {
      toast.erro(extractErrorMessage(err, 'Não foi possível carregar os ativos.'));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busca, status]);

  useEffect(() => { load(); }, [load]);

  const counts = { disponivel: 0, instalado: 0, manutencao: 0 };
  items.forEach((a) => { if (counts[a.status] !== undefined) counts[a.status]++; });

  function openCreate() {
    setEditing(null);
    reset({ codigo: '', nome: '', tipo: '', localizacao: '', status: 'disponivel' });
    setFormOpen(true);
  }
  function openEdit(a) {
    setEditing(a);
    reset({ codigo: a.codigo, nome: a.nome, tipo: a.tipo, localizacao: a.localizacao || '', status: a.status });
    setFormOpen(true);
  }

  async function onSubmit(values) {
    try {
      if (editing) {
        await updateAsset(editing.id, values);
        toast.sucesso('Ativo atualizado.');
      } else {
        await createAsset(values);
        toast.sucesso('Ativo cadastrado com sucesso.');
      }
      setFormOpen(false);
      load();
    } catch (err) {
      toast.erro(extractErrorMessage(err, 'Não foi possível salvar o ativo.'));
    }
  }

  return (
    <Page
      title="Ativos em Comodato"
      subtitle="Equipamentos cedidos a clientes — localização e disponibilidade (CO)"
      actions={canWrite && <button className="btn btn-primary" onClick={openCreate}>+ Novo ativo</button>}
    >
      <div className="stat-grid" style={{ marginBottom: 16 }}>
        <StatCard title="Disponíveis em estoque" value={counts.disponivel} tone="ok" />
        <StatCard title="Instalados no cliente" value={counts.instalado} tone="accent" />
        <StatCard title="Em manutenção" value={counts.manutencao} tone="alert" />
      </div>

      <div className="toolbar">
        <div className="search-row">
          <input placeholder="Buscar por código, nome ou local..." value={busca} onChange={(e) => setBusca(e.target.value)} style={{ maxWidth: 280 }} />
          <select value={status} onChange={(e) => setStatus(e.target.value)} style={{ maxWidth: 220 }}>
            <option value="">Todos os status</option>
            {ASSET_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
      </div>

      {formOpen && (
        <form className="card-form" onSubmit={handleSubmit(onSubmit)}>
          <div className="section-head"><h3 style={{ fontSize: 15 }}>{editing ? 'Editar ativo' : 'Novo ativo'}</h3></div>
          <div className="form-grid">
            <div>
              <label>Código</label>
              <input {...register('codigo')} disabled={!!editing} placeholder="Ex: FORNO-001" />
              <FieldError message={errors.codigo?.message} />
            </div>
            <div>
              <label>Nome</label>
              <input {...register('nome')} placeholder="Ex: Forno industrial" />
              <FieldError message={errors.nome?.message} />
            </div>
            <div>
              <label>Tipo</label>
              <input {...register('tipo')} placeholder="Forno, Freezer, Armário..." />
              <FieldError message={errors.tipo?.message} />
            </div>
            <div>
              <label>Localização</label>
              <input {...register('localizacao')} placeholder="Ex: Loja 01 - Centro" />
              <FieldError message={errors.localizacao?.message} />
            </div>
            <div>
              <label>Status</label>
              <select {...register('status')}>
                {ASSET_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
              <FieldError message={errors.status?.message} />
            </div>
          </div>
          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>{isSubmitting ? 'Salvando...' : 'Salvar'}</button>
            <button type="button" className="btn btn-ghost" onClick={() => setFormOpen(false)}>Cancelar</button>
          </div>
        </form>
      )}

      <div className="table-wrap">
        <table>
          <thead><tr><th>Código</th><th>Nome</th><th>Tipo</th><th>Localização</th><th>Status</th>{canWrite && <th>Ações</th>}</tr></thead>
          <tbody>
            {loading ? (
              <EmptyTableRow colSpan={6}><LoadingInline /></EmptyTableRow>
            ) : items.length === 0 ? (
              <EmptyTableRow colSpan={6}>Nenhum ativo encontrado.</EmptyTableRow>
            ) : items.map((a) => (
              <tr key={a.id}>
                <td className="mono">{a.codigo}</td>
                <td>{a.nome}</td>
                <td>{a.tipo}</td>
                <td>{a.localizacao || '-'}</td>
                <td>{STATUS_LABEL[a.status] || a.status}</td>
                {canWrite && (
                  <td className="actions-cell">
                    <button className="icon-btn icon-btn-edit" title="Editar" onClick={() => openEdit(a)}>✎</button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Page>
  );
}
