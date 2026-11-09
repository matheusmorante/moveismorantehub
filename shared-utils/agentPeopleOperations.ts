import { isIdentifiedTestArtifact } from './testArtifactPolicy';
import { buildPostgrestAccentInsensitiveOrFilter } from './searchText';

export interface UpsertAgentCustomerInput {
  clienteId?: string;
  nome: string;
  telefone?: string;
  cpfCnpj?: string;
  email?: string;
  cep?: string;
  logradouro?: string;
  rua?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
  estado?: string;
  observacoes?: string;
  ativo?: boolean;
}

export async function upsertCustomerForAgent(
  supabase: any,
  input: UpsertAgentCustomerInput
) {
  const fullName = input.nome?.trim();
  if (!fullName) {
    throw new Error('O nome completo do cliente é obrigatório.');
  }

  const fullAddress: Record<string, any> = {};
  if (input.cep) fullAddress.cep = input.cep.trim();
  const street = input.logradouro?.trim() || input.rua?.trim();
  if (street) fullAddress.street = street;
  if (input.numero) fullAddress.number = input.numero.trim();
  if (input.complemento) fullAddress.complement = input.complemento.trim();
  if (input.bairro) fullAddress.neighborhood = input.bairro.trim();
  if (input.cidade) fullAddress.city = input.cidade.trim();
  const state = (input.uf?.trim() || input.estado?.trim() || '').toUpperCase();
  if (state) fullAddress.state = state;

  const nowIso = new Date().toISOString();
  const payload: Record<string, any> = {
    full_name: fullName,
    person_type: 'customers',
    active: input.ativo !== undefined ? Boolean(input.ativo) : true,
    deleted: false,
    updated_at: nowIso,
  };
  if (input.telefone !== undefined) payload.phone = input.telefone.trim();
  if (input.cpfCnpj !== undefined) payload.cpf_cnpj = input.cpfCnpj.trim();
  if (input.email !== undefined) payload.email = input.email.trim();
  if (input.observacoes !== undefined) payload.observations = input.observacoes.trim();
  if (Object.keys(fullAddress).length > 0) payload.full_address = fullAddress;

  if (input.clienteId?.trim()) {
    const { data, error } = await supabase
      .from('people')
      .update(payload)
      .eq('id', input.clienteId.trim())
      .select('id, full_name, phone, email, cpf_cnpj, full_address, active')
      .single();
    if (error) throw error;
    return {
      id: data?.id || input.clienteId.trim(),
      nome: data?.full_name || fullName,
      telefone: data?.phone || input.telefone || null,
      email: data?.email || input.email || null,
      cpfCnpj: data?.cpf_cnpj || input.cpfCnpj || null,
      cidade: data?.full_address?.city || input.cidade || null,
      ativo: data?.active ?? true,
      acao: 'atualizado',
    };
  }

  const { data, error } = await supabase
    .from('people')
    .insert([{ ...payload, created_at: nowIso }])
    .select('id, full_name, phone, email, cpf_cnpj, full_address, active')
    .single();
  if (error) throw error;

  return {
    id: data?.id,
    nome: data?.full_name || fullName,
    telefone: data?.phone || input.telefone || null,
    email: data?.email || input.email || null,
    cpfCnpj: data?.cpf_cnpj || input.cpfCnpj || null,
    cidade: data?.full_address?.city || input.cidade || null,
    ativo: data?.active ?? true,
    acao: 'criado',
  };
}

export async function searchCustomersForAgent(
  supabase: any,
  args: { termo: string; limite?: number }
) {
  const term = args.termo?.trim().replace(/[,%()]/g, '');
  if (!term || term.length < 2) {
    throw new Error('Informe pelo menos dois caracteres do nome, telefone ou e-mail do cliente.');
  }
  const limit = Math.min(Math.max(Math.floor(args.limite ?? 10), 1), 20);
  const { data, error } = await supabase
    .from('people')
    .select('id, full_name, phone, email, full_address, active')
    .eq('person_type', 'customers')
    .eq('deleted', false)
    .or(
      'full_address->testArtifact->>is_test.is.null,full_address->testArtifact->>is_test.neq.true'
    )
    .or(buildPostgrestAccentInsensitiveOrFilter(['full_name', 'phone', 'email'], term))
    .order('full_name', { ascending: true })
    .limit(limit);
  if (error) throw error;
  const visiblePeople = (data || []).filter((person: any) => !isIdentifiedTestArtifact(person));
  return visiblePeople.map((person: any) => ({
    id: person.id,
    nome: person.full_name,
    telefone: person.phone,
    email: person.email,
    cidade: person.full_address?.city || person.full_address?.cidade || null,
    ativo: person.active,
  }));
}

export async function searchCollaboratorsForAgent(
  supabase: any,
  args: { termo: string; limite?: number }
) {
  const term = args.termo?.trim().replace(/[,%(){}]/g, '');
  if (!term || term.length < 2) {
    throw new Error('Informe pelo menos dois caracteres do nome, e-mail ou cargo do colaborador.');
  }
  const limit = Math.min(Math.max(Math.floor(args.limite ?? 10), 1), 20);
  const normalizedTerm = term
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  const roleAliases: Record<string, string> = {
    administrador: 'administrator',
    administradora: 'administrator',
    admin: 'administrator',
    gerente: 'manager',
    vendedor: 'seller',
    vendedora: 'seller',
    entregador: 'deliverer',
    entregadora: 'deliverer',
    contador: 'accountant',
    contadora: 'accountant',
    estoquista: 'stockist',
    pendente: 'pending',
  };
  const role =
    roleAliases[normalizedTerm] ||
    ([
      'administrator',
      'manager',
      'seller',
      'deliverer',
      'accountant',
      'stockist',
      'pending',
    ].includes(normalizedTerm)
      ? normalizedTerm
      : null);
  const conditions = [
    buildPostgrestAccentInsensitiveOrFilter(['full_name', 'email', 'position'], term),
  ];
  if (role) conditions.push(`role.eq.${role}`, `roles.cs.{${role}}`);
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, position, role, roles')
    .or(conditions.join(','))
    .order('full_name', { ascending: true })
    .limit(100);
  if (error) throw error;
  const matched = (data || [])
    .filter((profile: any) => {
      const roles =
        Array.isArray(profile.roles) && profile.roles.length
          ? profile.roles
          : profile.role
            ? [profile.role]
            : [];
      return !role || roles.includes(role) || profile.role === role;
    })
    .slice(0, limit);
  return matched.map((profile: any) => ({
    id: profile.id,
    nome: profile.full_name || profile.email,
    email: profile.email,
    cargo: profile.position,
    cargos: profile.roles?.length ? profile.roles : profile.role ? [profile.role] : [],
  }));
}
