import React from 'react';
import { describe, test, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ConfirmDialog from '../ConfirmDialog';

describe('<ConfirmDialog />', () => {
  test('não renderiza nada quando open=false', () => {
    const { container } = render(
      <ConfirmDialog open={false} title="Excluir" message="tem certeza?" onConfirm={() => {}} onCancel={() => {}} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  test('mostra título e mensagem quando open=true', () => {
    render(<ConfirmDialog open title="Excluir produto" message="Remover PNEU-295?" onConfirm={() => {}} onCancel={() => {}} />);
    expect(screen.getByText('Excluir produto')).toBeInTheDocument();
    expect(screen.getByText('Remover PNEU-295?')).toBeInTheDocument();
  });

  test('chama onConfirm ao clicar no botão de confirmação', async () => {
    const onConfirm = vi.fn();
    render(<ConfirmDialog open title="Excluir" message="tem certeza?" confirmLabel="Excluir" onConfirm={onConfirm} onCancel={() => {}} />);
    await userEvent.click(screen.getByRole('button', { name: 'Excluir' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  test('chama onCancel ao clicar em Cancelar', async () => {
    const onCancel = vi.fn();
    render(<ConfirmDialog open title="Excluir" message="tem certeza?" onConfirm={() => {}} onCancel={onCancel} />);
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
