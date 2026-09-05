export const CATEGORIAS = [
  { value: 'FR', label: 'Frota de Veículos (FR)' },
  { value: 'CO', label: 'Ativos em Comodato (CO)' },
  { value: 'IP', label: 'Insumos de Produção (IP)' },
  { value: 'MI', label: 'Manutenção Industrial (MI)' },
  { value: 'MP', label: 'Manutenção Predial (MP)' }
];

export const ASSET_STATUSES = [
  { value: 'disponivel', label: 'Disponível em estoque' },
  { value: 'instalado', label: 'Instalado no cliente' },
  { value: 'manutencao', label: 'Em manutenção' }
];

export const ROLES = [
  { value: 'admin', label: 'Administrador' },
  { value: 'gestor', label: 'Gestor' },
  { value: 'operador', label: 'Operador' },
  { value: 'visualizador', label: 'Visualizador' }
];

// Quem pode criar/editar/excluir cadastros (produtos, veículos, ativos)
export const WRITE_ROLES = ['admin', 'gestor'];
// Quem pode registrar movimentações
export const MOVEMENT_ROLES = ['admin', 'gestor', 'operador'];
