import React from 'react';
import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import Page from '../components/layout/Page';
import { LoadingInline, EmptyTableRow } from '../components/ui/Common';
import FieldError from '../components/ui/FieldError';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { listUsers, createUser, updateUser, deleteUser } from '../api/usersApi';
import { userSchema, userUpdateSchema } from '../utils/validationSchemas';
import { extractErrorMessage } from '../utils/errors';
import { ROLES } from '../utils/constants';
import { formatDateTime } from '../utils/format';

const ROLE_LABEL = Object.fromEntries(ROLES.map((r) => [r.value, r.label]));

export default function UsersPage() {
  const { user: me } = useAuth();
  const toast = useToast();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [toDelete, setToDelete] = useState(null);

  const createForm = useForm({ resolver: yupResolver(userSchema) });
  const editForm = useForm({ resolver: yupResolver(userUpdateSchema) });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await listUsers({ limit: 100 });
      setItems(result.data);
    } catch (err) {
      toast.erro(extractErrorMessage(err, 'Não foi possível carregar os usuários.'));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { load(); }, [load]);

  function openCreate() {
    setEditing(null);
    createForm.reset({ nome: '', email: '', senha: '', role: 'operador', departamento: '' });
    setFormOpen(true);
  }
  function openEdit(u) {
    setEditing(u);
    editForm.reset({ nome: u.nome, role: u.role, departamento: u.departamento || '', ativo: u.ativo });
    setFormOpen(true);
  }

  async function onCreateSubmit(values) {
    try {
      await createUser(values);
      toast.sucesso('Usuário criado com sucesso.');
      setFormOpen(false);
      load();
    } catch (err) {
      toast.erro(extractErrorMessage(err, 'Não foi possível criar o usuário.'));
    }
  }

  async function onEditSubmit(values) {
    try {
      await updateUser(editing.id, values);
      toast.sucesso('Usuário atualizado.');
      setFormOpen(false);
      load();
    } catch (err) {
      toast.erro(extractErrorMessage(err, 'Não foi possível atualizar o usuário.'));
    }
  }

  async function confirmDelete() {
    try {
      await deleteUser(toDelete.id);
      toast.sucesso('Usuário desativado.');
      setToDelete(null);
      load();
    } catch (err) {
      toast.erro(extractErrorMessage(err, 'Não foi possível desativar o usuário.'));
      setToDelete(null);
    }
  }

  return (
    <Page title="Usuários" subtitle="Gestão de acessos e permissões (apenas administradores)" actions={<button className="btn btn-primary" onClick={openCreate}>+ Novo usuário</button>}>
      {formOpen && !editing && (
        <form className="card-form" onSubmit={createForm.handleSubmit(onCreateSubmit)}>
          <div className="section-head"><h3 style={{ fontSize: 15 }}>Novo usuário</h3></div>
          <div className="form-grid">
            <div><label>Nome</label><input {...createForm.register('nome')} /><FieldError message={createForm.formState.errors.nome?.message} /></div>
            <div><label>E-mail</label><input type="email" {...createForm.register('email')} /><FieldError message={createForm.formState.errors.email?.message} /></div>
            <div><label>Senha temporária</label><input type="password" {...createForm.register('senha')} /><FieldError message={createForm.formState.errors.senha?.message} /></div>
            <div>
              <label>Papel (role)</label>
              <select {...createForm.register('role')}>
                {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            <div><label>Departamento</label><input {...createForm.register('departamento')} placeholder="FR, CO, IP, MI, MP, Geral..." /></div>
          </div>
          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={createForm.formState.isSubmitting}>Criar usuário</button>
            <button type="button" className="btn btn-ghost" onClick={() => setFormOpen(false)}>Cancelar</button>
          </div>
        </form>
      )}

      {formOpen && editing && (
        <form className="card-form" onSubmit={editForm.handleSubmit(onEditSubmit)}>
          <div className="section-head"><h3 style={{ fontSize: 15 }}>Editar usuário — {editing.email}</h3></div>
          <div className="form-grid">
            <div><label>Nome</label><input {...editForm.register('nome')} /></div>
            <div>
              <label>Papel (role)</label>
              <select {...editForm.register('role')}>
                {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            <div><label>Departamento</label><input {...editForm.register('departamento')} /></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 22 }}>
              <input type="checkbox" style={{ width: 'auto' }} {...editForm.register('ativo')} />
              <label style={{ margin: 0 }}>Usuário ativo</label>
            </div>
          </div>
          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={editForm.formState.isSubmitting}>Salvar</button>
            <button type="button" className="btn btn-ghost" onClick={() => setFormOpen(false)}>Cancelar</button>
          </div>
        </form>
      )}

      <div className="table-wrap">
        <table>
          <thead><tr><th>Nome</th><th>E-mail</th><th>Papel</th><th>Departamento</th><th>Status</th><th>Criado em</th><th>Ações</th></tr></thead>
          <tbody>
            {loading ? (
              <EmptyTableRow colSpan={7}><LoadingInline /></EmptyTableRow>
            ) : items.length === 0 ? (
              <EmptyTableRow colSpan={7}>Nenhum usuário cadastrado.</EmptyTableRow>
            ) : items.map((u) => (
              <tr key={u.id}>
                <td>{u.nome}</td>
                <td className="mono">{u.email}</td>
                <td>{ROLE_LABEL[u.role] || u.role}</td>
                <td>{u.departamento || '-'}</td>
                <td>{u.ativo ? <span className="status-ok">● Ativo</span> : <span className="status-low">● Inativo</span>}</td>
                <td className="mono">{formatDateTime(u.created_at)}</td>
                <td className="actions-cell">
                  <button className="icon-btn icon-btn-edit" title="Editar" onClick={() => openEdit(u)}>✎</button>
                  {u.id !== me.id && (
                    <button className="icon-btn icon-btn-trash" title="Desativar" onClick={() => setToDelete(u)}>🗑</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={!!toDelete}
        title="Desativar usuário"
        message={toDelete ? `Desativar o acesso de ${toDelete.nome}? Ele deixará de conseguir fazer login, mas o histórico dele é preservado.` : ''}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </Page>
  );
}
