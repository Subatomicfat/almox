import React from 'react';
import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import Page from '../components/layout/Page';
import { LoadingInline, EmptyTableRow } from '../components/ui/Common';
import FieldError from '../components/ui/FieldError';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { listVehicles, createVehicle, updateVehicle, getVehicleConsumo } from '../api/vehiclesApi';
import { vehicleSchema } from '../utils/validationSchemas';
import { extractErrorMessage } from '../utils/errors';
import { formatNumber, formatDate } from '../utils/format';
import { WRITE_ROLES } from '../utils/constants';
import { maskPlaca } from '../utils/format';

export default function VehiclesPage() {
  const { hasRole } = useAuth();
  const canWrite = hasRole(...WRITE_ROLES);
  const toast = useToast();

  const [items, setItems] = useState([]);
  const [busca, setBusca] = useState('');
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [consumo, setConsumo] = useState(null); // { veiculo, historico }

  const { register, handleSubmit, reset, setValue, formState: { errors, isSubmitting } } = useForm({
    resolver: yupResolver(vehicleSchema)
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listVehicles({ busca: busca || undefined });
      setItems(data);
    } catch (err) {
      toast.erro(extractErrorMessage(err, 'Não foi possível carregar os veículos.'));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busca]);

  useEffect(() => { load(); }, [load]);

  function openCreate() {
    setEditing(null);
    reset({ placa: '', modelo: '', marca: '' });
    setFormOpen(true);
  }
  function openEdit(v) {
    setEditing(v);
    reset({ placa: v.placa, modelo: v.modelo, marca: v.marca });
    setFormOpen(true);
  }

  async function onSubmit(values) {
    try {
      if (editing) {
        await updateVehicle(editing.id, { modelo: values.modelo, marca: values.marca });
        toast.sucesso('Veículo atualizado.');
      } else {
        await createVehicle(values);
        toast.sucesso('Veículo cadastrado com sucesso.');
      }
      setFormOpen(false);
      load();
    } catch (err) {
      toast.erro(extractErrorMessage(err, 'Não foi possível salvar o veículo.'));
    }
  }

  async function verConsumo(v) {
    try {
      const data = await getVehicleConsumo(v.id);
      setConsumo(data);
    } catch (err) {
      toast.erro(extractErrorMessage(err, 'Não foi possível carregar o consumo.'));
    }
  }

  return (
    <Page
      title="Frota de Veículos"
      subtitle="Cadastro de veículos e histórico de consumo (FR)"
      actions={canWrite && <button className="btn btn-primary" onClick={openCreate}>+ Novo veículo</button>}
    >
      <div className="toolbar">
        <div className="search-row">
          <input placeholder="Buscar por placa, modelo ou marca..." value={busca} onChange={(e) => setBusca(e.target.value)} style={{ maxWidth: 300 }} />
        </div>
      </div>

      {formOpen && (
        <form className="card-form" onSubmit={handleSubmit(onSubmit)}>
          <div className="section-head"><h3 style={{ fontSize: 15 }}>{editing ? 'Editar veículo' : 'Novo veículo'}</h3></div>
          <div className="form-grid">
            <div>
              <label>Placa</label>
              <input {...register('placa')} disabled={!!editing} onChange={(e) => setValue('placa', maskPlaca(e.target.value))} placeholder="ABC-1234" />
              <FieldError message={errors.placa?.message} />
            </div>
            <div>
              <label>Modelo</label>
              <input {...register('modelo')} placeholder="Ex: Volvo FH 540" />
              <FieldError message={errors.modelo?.message} />
            </div>
            <div>
              <label>Marca</label>
              <input {...register('marca')} placeholder="Ex: Volvo" />
              <FieldError message={errors.marca?.message} />
            </div>
          </div>
          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>{isSubmitting ? 'Salvando...' : 'Salvar'}</button>
            <button type="button" className="btn btn-ghost" onClick={() => setFormOpen(false)}>Cancelar</button>
          </div>
        </form>
      )}

      {consumo && (
        <div className="panel">
          <div className="section-head">
            <h2 style={{ fontSize: 14 }}>Consumo do veículo: <span className="mono">{consumo.veiculo.placa}</span></h2>
            <button className="btn btn-ghost btn-sm" onClick={() => setConsumo(null)}>Fechar</button>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Data</th><th>Produto</th><th>Quantidade</th><th>Unidade</th><th>Responsável</th></tr></thead>
              <tbody>
                {consumo.historico.length === 0 ? (
                  <EmptyTableRow colSpan={5}>Nenhuma saída registrada para este veículo.</EmptyTableRow>
                ) : consumo.historico.map((h) => (
                  <tr key={h.id}>
                    <td className="mono">{formatDate(h.data_movimentacao)}</td>
                    <td>{h.produto_codigo} — {h.produto_nome}</td>
                    <td className="mono">{formatNumber(h.quantidade)}</td>
                    <td>{h.unidade}</td>
                    <td>{h.responsavel}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="table-wrap">
        <table>
          <thead><tr><th>Placa</th><th>Modelo</th><th>Marca</th><th>Consumo</th>{canWrite && <th>Ações</th>}</tr></thead>
          <tbody>
            {loading ? (
              <EmptyTableRow colSpan={5}><LoadingInline /></EmptyTableRow>
            ) : items.length === 0 ? (
              <EmptyTableRow colSpan={5}>Nenhum veículo cadastrado.</EmptyTableRow>
            ) : items.map((v) => (
              <tr key={v.id}>
                <td className="mono">{v.placa}</td>
                <td>{v.modelo}</td>
                <td>{v.marca}</td>
                <td><button className="btn btn-ghost btn-sm" onClick={() => verConsumo(v)}>Ver consumo</button></td>
                {canWrite && (
                  <td className="actions-cell">
                    <button className="icon-btn icon-btn-edit" title="Editar" onClick={() => openEdit(v)}>✎</button>
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
