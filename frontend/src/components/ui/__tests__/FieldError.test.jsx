import React from 'react';
import { describe, test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import FieldError from '../FieldError';

describe('<FieldError />', () => {
  test('não renderiza nada quando não há mensagem', () => {
    const { container } = render(<FieldError />);
    expect(container).toBeEmptyDOMElement();
  });

  test('renderiza a mensagem quando fornecida', () => {
    render(<FieldError message="Campo obrigatório." />);
    expect(screen.getByText('Campo obrigatório.')).toBeInTheDocument();
  });
});
