import * as yup from 'yup';

export const loginSchema = yup.object({
  email: yup.string().email('E-mail inválido.').required('E-mail obrigatório.'),
  senha: yup.string().required('Senha obrigatória.')
});

export const productSchema = yup.object({
  codigo: yup.string().trim().max(30, 'Máximo 30 caracteres.').required('Código obrigatório.'),
  nome: yup.string().trim().max(160).required('Nome obrigatório.'),
  categoria: yup.string().oneOf(['FR', 'CO', 'IP', 'MI'], 'Selecione uma categoria.').required('Categoria obrigatória.'),
  unidade: yup.string().trim().max(10).required('Unidade obrigatória.'),
  estoqueMinimo: yup.number().typeError('Deve ser um número.').min(0, 'Não pode ser negativo.').required('Obrigatório.'),
  estoqueAtual: yup.number().typeError('Deve ser um número.').min(0, 'Não pode ser negativo.').required('Obrigatório.')
});

export const vehicleSchema = yup.object({
  placa: yup.string().trim().min(5, 'Placa inválida.').max(10).required('Placa obrigatória.'),
  modelo: yup.string().trim().max(80).required('Modelo obrigatório.'),
  marca: yup.string().trim().max(60).required('Marca obrigatória.')
});

export const assetSchema = yup.object({
  codigo: yup.string().trim().max(30).required('Código obrigatório.'),
  nome: yup.string().trim().max(160).required('Nome obrigatório.'),
  tipo: yup.string().trim().max(60).required('Tipo obrigatório.'),
  localizacao: yup.string().trim().max(160).nullable(),
  status: yup.string().oneOf(['disponivel', 'instalado', 'manutencao']).required()
});

export const movementSchema = yup.object({
  productId: yup.number().typeError('Selecione um produto.').required('Selecione um produto.'),
  type: yup.string().oneOf(['entrada', 'saida']).required(),
  quantidade: yup.number().typeError('Informe uma quantidade.').moreThan(0, 'Deve ser maior que zero.').required(),
  referencia: yup.string().trim().max(160).nullable(),
  observacao: yup.string().trim().max(1000).nullable(),
  vehiclePlaca: yup.string().trim().max(10).nullable()
});

export const adjustMovementSchema = yup.object({
  type: yup.string().oneOf(['entrada', 'saida']).required(),
  quantidade: yup.number().typeError('Informe uma quantidade.').moreThan(0, 'Deve ser maior que zero.').required(),
  justificativa: yup.string().trim().min(5, 'Mínimo 5 caracteres.').max(500).required('Justificativa obrigatória.')
});

export const userSchema = yup.object({
  nome: yup.string().trim().min(2).max(120).required('Nome obrigatório.'),
  email: yup.string().email('E-mail inválido.').required('E-mail obrigatório.'),
  senha: yup.string().min(8, 'Mínimo 8 caracteres.').required('Senha obrigatória.'),
  role: yup.string().oneOf(['admin', 'gestor', 'operador', 'visualizador']).required(),
  departamento: yup.string().trim().max(60).nullable()
});

export const userUpdateSchema = yup.object({
  nome: yup.string().trim().min(2).max(120),
  role: yup.string().oneOf(['admin', 'gestor', 'operador', 'visualizador']),
  departamento: yup.string().trim().max(60).nullable(),
  ativo: yup.boolean()
});
