import React from 'react';
import { useCallback, useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import Page from '../components/layout/Page';
import { LoadingInline, EmptyTableRow } from '../components/ui/Common';
import FieldError from '../components/ui/FieldError';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { listMovements, createMovement, adjustMovement } from '../api/movementsApi';
import { listProducts } from '../api/productsApi';
import { movementSchema, adjustMovementSchema } from '../utils/validationSchemas';
import { extractErrorMessage } from '../utils/errors';
import { formatNumber, formatDateTime, maskPlaca } from '../utils/format';
import { CATEGORIAS, MOVEMENT_ROLES, WRITE_ROLES } from '../utils/constants';

function ProductPicker({ value, onSelect }) {
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
        placeholder="Digite o código ou nome do produto..."
        value={value ? `${value.codigo} — ${value.nome}` : query}
        onChange={(e) => { onSelect(null); setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
      />
      {value && (
        <div className="info-line" style={{ display: 'block', background: 'var(--amber-soft)', color: 'var(--amber-dark)', borderRadius: 6, padding: '8px 12px', fontSize: 12.5, fontFamily: 'var(--font-mono)', marginTop: 6 }}>
          Estoque atual: {formatNumber(value.estoque_atual)} {value.unidade} · Mínimo: {formatNumber(value.estoque_minimo)} {value.unidade}
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

export default function MovementsPage() {
  const { hasRole } = useAuth();
  const canCreate = hasRole(...MOVEMENT_ROLES);
  const canAdjust = hasRole(...WRITE_ROLES);
  const toast = useToast();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tipo, setTipo] = useState('');
  const [categoria, setCategoria] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [adjusting, setAdjusting] = useState(null); // movimentação sendo ajustada

  const { register, handleSubmit, reset, control, setValue, formState: { errors, isSubmitting } } = useForm({
    resolver: yupResolver(movementSchema)
  });

  const adjustForm = useForm({ resolver: yupResolver(adjustMovementSchema) });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listMovements({ tipo: tipo || undefined, categoria: categoria || undefined, limit: 50 });
      setItems(data);
    } catch (err) {
      toast.erro(extractErrorMessage(err, 'Não foi possível carregar as movimentações.'));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipo, categoria]);

  useEffect(() => { load(); }, [load]);

  async function onSubmit(values) {
    try {
      await createMovement(values);
      toast.sucesso('Movimentação registrada com sucesso.');
      reset({ type: 'entrada', productId: undefined, quantidade: '', referencia: '', observacao: '', vehiclePlaca: '' });
      setSelectedProduct(null);
      load();
    } catch (err) {
      toast.erro(extractErrorMessage(err, 'Não foi possível registrar a movimentação.'));
    }
  }

  async function onAdjustSubmit(values) {
    try {
      await adjustMovement(adjusting.id, values);
      toast.sucesso('Ajuste registrado — o histórico original foi preservado.');
      setAdjusting(null);
      load();
    } catch (err) {
      toast.erro(extractErrorMessage(err, 'Não foi possível registrar o ajuste.'));
    }
  }

  return (
    <Page title="Movimentações" subtitle="Registro de entradas e saídas de estoque">
      {canCreate && (
        <form className="card-form" onSubmit={handleSubmit(onSubmit)}>
          <div className="section-head"><h3 style={{ fontSize: 15 }}>Registrar movimentação</h3></div>
          <div className="form-grid">
            <div>
              <label>Tipo</label>
              <select {...register('type')} defaultValue="entrada">
                <option value="entrada">📥 Entrada</option>
                <option value="saida">📤 Saída</option>
              </select>
            </div>
            <div>
              <label>Produto</label>
              <Controller
                name="productId"
                control={control}
                render={() => (
                  <ProductPicker
                    value={selectedProduct}
                    onSelect={(p) => { setSelectedProduct(p); setValue('productId', p ? p.id : undefined); }}
                  />
                )}
              />
              <FieldError message={errors.productId?.message} />
            </div>
            <div>
              <label>Quantidade</label>
              <input type="number" step="0.01" {...register('quantidade')} placeholder="Quantidade" />
              <FieldError message={errors.quantidade?.message} />
            </div>
            <div>
              <label>Placa (se for retirada de veículo)</label>
              <input {...register('vehiclePlaca')} onChange={(e) => setValue('vehiclePlaca', maskPlaca(e.target.value))} placeholder="ABC-1234" />
            </div>
            <div>
              <label>Referência (setor / local)</label>
              <input {...register('referencia')} placeholder="Ex: Setor Produção" />
            </div>
            <div>
              <label>Observação</label>
              <input {...register('observacao')} placeholder="Detalhes adicionais..." />
            </div>
          </div>
          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>{isSubmitting ? 'Registrando...' : 'Registrar movimentação'}</button>
          </div>
        </form>
      )}

      <div className="toolbar">
        <div className="search-row">
          <select value={tipo} onChange={(e) => setTipo(e.target.value)} style={{ maxWidth: 180 }}>
            <option value="">Entradas e saídas</option>
            <option value="entrada">Só entradas</option>
            <option value="saida">Só saídas</option>
          </select>
          <select value={categoria} onChange={(e) => setCategoria(e.target.value)} style={{ maxWidth: 220 }}>
            <option value="">Todas as categorias</option>
            {CATEGORIAS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
      </div>

      <div className="table-wrap">
        <table>
          <thead><tr><th>Data/Hora</th><th>Tipo</th><th>Produto</th><th>Qtd</th><th>Responsável</th><th>Referência</th>{canAdjust && <th>Ações</th>}</tr></thead>
          <tbody>
            {loading ? (
              <EmptyTableRow colSpan={7}><LoadingInline /></EmptyTableRow>
            ) : items.length === 0 ? (
              <EmptyTableRow colSpan={7}>Nenhuma movimentação encontrada.</EmptyTableRow>
            ) : items.map((m) => (
              <tr key={m.id}>
                <td className="mono">{formatDateTime(m.data_movimentacao)}</td>
                <td>{m.type === 'entrada' ? '📥 Entrada' : '📤 Saída'}{m.adjustment_of && <span style={{ marginLeft: 6, fontSize: 10.5, color: 'var(--steel-2)' }}>(ajuste)</span>}</td>
                <td className="mono">{m.produto_codigo} — {m.produto_nome}</td>
                <td className="mono">{formatNumber(m.quantidade)}</td>
                <td>{m.responsavel}</td>
                <td>{m.referencia || '-'}</td>
                {canAdjust && (
                  <td className="actions-cell">
                    <button className="btn btn-ghost btn-sm" onClick={() => { setAdjusting(m); adjustForm.reset({ type: 'entrada', quantidade: '', justificativa: '' }); }}>Corrigir</button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {adjusting && (
        <div className="modal-overlay" onClick={() => setAdjusting(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Corrigir movimentação</h3>
            <p>
              Movimentações não são editadas nem excluídas — esta correção cria uma
              <strong> nova movimentação de ajuste</strong>, referenciando a original
              (<span className="mono">#{adjusting.id}</span> — {adjusting.produto_nome}), preservando todo o histórico.
            </p>
            <form onSubmit={adjustForm.handleSubmit(onAdjustSubmit)}>
              <div className="form-grid">
                <div>
                  <label>Tipo do ajuste</label>
                  <select {...adjustForm.register('type')}>
                    <option value="entrada">Entrada (devolver ao estoque)</option>
                    <option value="saida">Saída (remover do estoque)</option>
                  </select>
                </div>
                <div>
                  <label>Quantidade</label>
                  <input type="number" step="0.01" {...adjustForm.register('quantidade')} />
                  <FieldError message={adjustForm.formState.errors.quantidade?.message} />
                </div>
              </div>
              <div style={{ marginBottom: 16 }}>
                <label>Justificativa (obrigatória)</label>
                <textarea rows={3} {...adjustForm.register('justificativa')} placeholder="Explique o motivo da correção..." />
                <FieldError message={adjustForm.formState.errors.justificativa?.message} />
              </div>
              <div className="form-actions" style={{ justifyContent: 'flex-end' }}>
                <button type="submit" className="btn btn-primary" disabled={adjustForm.formState.isSubmitting}>Confirmar ajuste</button>
                <button type="button" className="btn btn-ghost" onClick={() => setAdjusting(null)}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Page>
  );
}
