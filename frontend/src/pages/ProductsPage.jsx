import React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import Page from '../components/layout/Page';
import { CategoriaBadge, LoadingInline, EmptyTableRow } from '../components/ui/Common';
import FieldError from '../components/ui/FieldError';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { listProducts, createProduct, updateProduct, deleteProduct, importProductsCsv } from '../api/productsApi';
import { productSchema } from '../utils/validationSchemas';
import { extractErrorMessage } from '../utils/errors';
import { formatNumber } from '../utils/format';
import { CATEGORIAS, WRITE_ROLES } from '../utils/constants';

const LIMIT = 20;

export default function ProductsPage() {
  const { hasRole } = useAuth();
  const canWrite = hasRole(...WRITE_ROLES);
  const toast = useToast();

  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [categoria, setCategoria] = useState('');
  const [estoqueBaixo, setEstoqueBaixo] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null); // produto sendo editado, ou null para criação
  const [toDelete, setToDelete] = useState(null);
  const fileInputRef = useRef(null);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
    resolver: yupResolver(productSchema)
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await listProducts({
        page, limit: LIMIT,
        busca: busca || undefined,
        categoria: categoria || undefined,
        estoque_baixo: estoqueBaixo || undefined
      });
      setItems(result.data);
      setTotal(result.total);
    } catch (err) {
      toast.erro(extractErrorMessage(err, 'Não foi possível carregar os produtos.'));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, busca, categoria, estoqueBaixo]);

  useEffect(() => { load(); }, [load]);

  function openCreate() {
    setEditing(null);
    reset({ codigo: '', nome: '', categoria: '', unidade: '', estoqueMinimo: 0, estoqueAtual: 0 });
    setFormOpen(true);
  }
  function openEdit(p) {
    setEditing(p);
    reset({
      codigo: p.codigo, nome: p.nome, categoria: p.categoria, unidade: p.unidade,
      estoqueMinimo: Number(p.estoque_minimo), estoqueAtual: Number(p.estoque_atual)
    });
    setFormOpen(true);
  }

  async function onSubmit(values) {
    try {
      if (editing) {
        await updateProduct(editing.id, {
          nome: values.nome, categoria: values.categoria, unidade: values.unidade, estoqueMinimo: values.estoqueMinimo
        });
        toast.sucesso('Produto atualizado.');
      } else {
        await createProduct(values);
        toast.sucesso('Produto cadastrado com sucesso.');
      }
      setFormOpen(false);
      load();
    } catch (err) {
      toast.erro(extractErrorMessage(err, 'Não foi possível salvar o produto.'));
    }
  }

  async function confirmDelete() {
    try {
      await deleteProduct(toDelete.id);
      toast.sucesso('Produto removido.');
      setToDelete(null);
      load();
    } catch (err) {
      toast.erro(extractErrorMessage(err, 'Não foi possível remover o produto.'));
      setToDelete(null);
    }
  }

  async function handleImportFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const result = await importProductsCsv(file);
      toast.sucesso(`${result.importados} produto(s) importado(s). ${result.ignorados} ignorado(s), ${result.erros} com erro.`);
      load();
    } catch (err) {
      toast.erro(extractErrorMessage(err, 'Não foi possível importar o CSV.'));
    } finally {
      e.target.value = '';
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  return (
    <Page
      title="Produtos"
      subtitle="Cadastro e controle de itens do almoxarifado"
      actions={canWrite && (
        <>
          <input ref={fileInputRef} type="file" accept=".csv,.txt" hidden onChange={handleImportFile} />
          <button className="btn btn-ghost" onClick={() => fileInputRef.current.click()}>Importar CSV</button>
          <button className="btn btn-primary" onClick={openCreate}>+ Novo produto</button>
        </>
      )}
    >
      <div className="toolbar">
        <div className="search-row">
          <input placeholder="Buscar por código ou nome..." value={busca} onChange={(e) => { setPage(1); setBusca(e.target.value); }} style={{ maxWidth: 280 }} />
          <select value={categoria} onChange={(e) => { setPage(1); setCategoria(e.target.value); }} style={{ maxWidth: 200 }}>
            <option value="">Todas as categorias</option>
            {CATEGORIAS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 400, fontSize: 13 }}>
            <input type="checkbox" style={{ width: 'auto' }} checked={estoqueBaixo} onChange={(e) => { setPage(1); setEstoqueBaixo(e.target.checked); }} />
            Só estoque baixo
          </label>
        </div>
      </div>

      {formOpen && (
        <form className="card-form" onSubmit={handleSubmit(onSubmit)}>
          <div className="section-head"><h3 style={{ fontSize: 15 }}>{editing ? 'Editar produto' : 'Novo produto'}</h3></div>
          <div className="form-grid">
            <div>
              <label>Código</label>
              <input {...register('codigo')} disabled={!!editing} placeholder="Ex: PNEU-001" />
              <FieldError message={errors.codigo?.message} />
            </div>
            <div>
              <label>Nome</label>
              <input {...register('nome')} placeholder="Nome do produto" />
              <FieldError message={errors.nome?.message} />
            </div>
            <div>
              <label>Categoria</label>
              <select {...register('categoria')}>
                <option value="">Selecione...</option>
                {CATEGORIAS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
              <FieldError message={errors.categoria?.message} />
            </div>
            <div>
              <label>Unidade</label>
              <input {...register('unidade')} placeholder="un, kg, L..." />
              <FieldError message={errors.unidade?.message} />
            </div>
            <div>
              <label>Estoque mínimo</label>
              <input type="number" step="0.01" {...register('estoqueMinimo')} />
              <FieldError message={errors.estoqueMinimo?.message} />
            </div>
            <div>
              <label>Estoque atual</label>
              <input type="number" step="0.01" {...register('estoqueAtual')} disabled={!!editing} />
              <FieldError message={errors.estoqueAtual?.message} />
              {editing && <small style={{ color: 'var(--steel-2)', fontSize: 11 }}>Só muda via movimentação.</small>}
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
          <thead>
            <tr><th>Código</th><th>Nome</th><th>Categoria</th><th>Unidade</th><th>Atual</th><th>Mínimo</th><th>Status</th>{canWrite && <th>Ações</th>}</tr>
          </thead>
          <tbody>
            {loading ? (
              <EmptyTableRow colSpan={8}><LoadingInline /></EmptyTableRow>
            ) : items.length === 0 ? (
              <EmptyTableRow colSpan={8}>Nenhum produto encontrado.</EmptyTableRow>
            ) : items.map((p) => {
              const baixo = Number(p.estoque_atual) <= Number(p.estoque_minimo);
              return (
                <tr key={p.id}>
                  <td className="mono">{p.codigo}</td>
                  <td>{p.nome}</td>
                  <td><CategoriaBadge categoria={p.categoria} /></td>
                  <td>{p.unidade}</td>
                  <td className="mono">{formatNumber(p.estoque_atual)}</td>
                  <td className="mono">{formatNumber(p.estoque_minimo)}</td>
                  <td>{baixo ? <span className="status-low">⚠ Baixo</span> : <span className="status-ok">● Normal</span>}</td>
                  {canWrite && (
                    <td className="actions-cell">
                      <button className="icon-btn icon-btn-edit" title="Editar" onClick={() => openEdit(p)}>✎</button>
                      <button className="icon-btn icon-btn-trash" title="Excluir" onClick={() => setToDelete(p)}>🗑</button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginTop: 16 }}>
          <button className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Anterior</button>
          <span style={{ fontSize: 13, color: 'var(--steel-2)', alignSelf: 'center' }}>Página {page} de {totalPages}</span>
          <button className="btn btn-ghost btn-sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Próxima</button>
        </div>
      )}

      <ConfirmDialog
        open={!!toDelete}
        title="Excluir produto"
        message={toDelete ? `Remover o produto ${toDelete.codigo}? O histórico de movimentações não será apagado.` : ''}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </Page>
  );
}
