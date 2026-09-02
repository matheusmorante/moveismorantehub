import { UserRole } from '@/context/AuthContext';

export interface RoleOption {
    value: UserRole;
    label: string;
    description: string;
    icon: string;
}

export const ROLES: RoleOption[] = [
    { value: 'administrator', label: 'Administrador', description: 'Acesso total irrestrito a todas as áreas e ações', icon: 'bi-shield-shaded' },
    { value: 'manager', label: 'Gestor', description: 'Gestão operacional, estoque, relatórios e vendas', icon: 'bi-briefcase-fill' },
    { value: 'seller', label: 'Vendedor', description: 'Atendimento, orçamentos, vendas e cadastros', icon: 'bi-tag-fill' },
    { value: 'deliverer', label: 'Entregador / Montador', description: 'Rotas de entrega, status e montagens', icon: 'bi-truck' },
];

export interface PermissionActionDef {
    id: string;
    label: string;
    description: string;
    icon: string;
    defaultRoles: UserRole[];
}

export interface PermissionAreaDef {
    id: string;
    name: string;
    description: string;
    icon: string;
    actions: PermissionActionDef[];
}

export const PERMISSION_AREAS: PermissionAreaDef[] = [
    {
        id: 'salesOrders',
        name: 'Vendas e Pedidos de Venda',
        description: 'Ações sobre propostas comerciais, orçamentos, vendas e entregas.',
        icon: 'bi-bag-check-fill',
        actions: [
            {
                id: 'viewOrders',
                label: 'Visualizar Pedidos de Venda',
                description: 'Permite consultar e visualizar a lista e detalhes de vendas.',
                icon: 'bi-eye-fill',
                defaultRoles: ['manager', 'seller', 'deliverer']
            },
            {
                id: 'createEditOrders',
                label: 'Criar e Editar Pedidos',
                description: 'Permite cadastrar novos pedidos e alterar produtos, preços ou descontos.',
                icon: 'bi-pencil-square',
                defaultRoles: ['manager', 'seller']
            },
            {
                id: 'deleteOrders',
                label: 'Excluir e Cancelar Pedidos',
                description: 'Permite apagar, cancelar ou mover pedidos para a lixeira.',
                icon: 'bi-trash3-fill',
                defaultRoles: ['manager']
            },
            {
                id: 'startDelivery',
                label: 'Iniciar Entrega e Rota',
                description: 'Permite despachar pedidos para rota de entrega e atualizar status.',
                icon: 'bi-truck',
                defaultRoles: ['manager', 'deliverer']
            }
        ]
    },
    {
        id: 'stockAndProducts',
        name: 'Estoque e Produtos',
        description: 'Ações sobre o catálogo de produtos, estoque e movimentações.',
        icon: 'bi-boxes',
        actions: [
            {
                id: 'viewProducts',
                label: 'Visualizar Catálogo e Estoque',
                description: 'Permite consultar lista de produtos, preços e saldos em estoque.',
                icon: 'bi-box-seam-fill',
                defaultRoles: ['manager', 'seller', 'deliverer']
            },
            {
                id: 'productConfig',
                label: 'Criar e Editar Produtos',
                description: 'Permite cadastrar e alterar produtos, marcas e variações.',
                icon: 'bi-gear-fill',
                defaultRoles: ['manager']
            },
            {
                id: 'manualStockMovement',
                label: 'Movimentação Manual de Estoque',
                description: 'Permite realizar entradas, saídas manuais e auditoria de estoque.',
                icon: 'bi-arrow-left-right',
                defaultRoles: ['manager']
            },
            {
                id: 'deleteProducts',
                label: 'Excluir e Desativar Produtos',
                description: 'Permite apagar ou inativar produtos cadastrados.',
                icon: 'bi-trash-fill',
                defaultRoles: ['manager']
            }
        ]
    },
    {
        id: 'financials',
        name: 'Financeiro e Relatórios',
        description: 'Ações sobre faturamento, DRE, caixa e exportação de dados.',
        icon: 'bi-currency-dollar',
        actions: [
            {
                id: 'viewFinancials',
                label: 'Visualizar Financeiro e Métricas',
                description: 'Permite consultar faturamento, margens, ticket médio e números.',
                icon: 'bi-graph-up-arrow',
                defaultRoles: ['manager']
            },
            {
                id: 'exportReports',
                label: 'Exportar Relatórios e Métricas',
                description: 'Permite baixar relatórios analíticos em PDF, Excel ou CSV.',
                icon: 'bi-file-earmark-spreadsheet-fill',
                defaultRoles: ['manager']
            }
        ]
    },
    {
        id: 'registrations',
        name: 'Cadastros (Clientes e Fornecedores)',
        description: 'Ações sobre a base de clientes, fornecedores e contatos.',
        icon: 'bi-people-fill',
        actions: [
            {
                id: 'viewPeople',
                label: 'Visualizar Clientes e Fornecedores',
                description: 'Permite pesquisar e consultar fichas de pessoas e empresas.',
                icon: 'bi-person-lines-fill',
                defaultRoles: ['manager', 'seller', 'deliverer']
            },
            {
                id: 'createEditPeople',
                label: 'Criar e Editar Cadastros',
                description: 'Permite cadastrar novos clientes/fornecedores e alterar dados.',
                icon: 'bi-person-plus-fill',
                defaultRoles: ['manager', 'seller']
            },
            {
                id: 'deletePeople',
                label: 'Excluir e Inativar Cadastros',
                description: 'Permite apagar ou inativar clientes ou fornecedores.',
                icon: 'bi-person-x-fill',
                defaultRoles: ['manager']
            }
        ]
    },
    {
        id: 'settingsAndAccess',
        name: 'Configurações e Acessos',
        description: 'Ações de administração de usuários, colaboradores e preferências.',
        icon: 'bi-shield-gear',
        actions: [
            {
                id: 'manageAccess',
                label: 'Gerenciar Colaboradores e Cargos',
                description: 'Permite cadastrar colaboradores, alterar cargos e permissões.',
                icon: 'bi-person-badge-fill',
                defaultRoles: ['manager']
            },
            {
                id: 'manageSettings',
                label: 'Alterar Configurações Gerais do ERP',
                description: 'Permite alterar preferências do sistema, regras e parâmetros.',
                icon: 'bi-sliders2',
                defaultRoles: [] // Apenas Admin
            }
        ]
    }
];
