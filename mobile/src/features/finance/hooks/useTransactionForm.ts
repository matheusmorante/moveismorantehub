import { useState, useEffect, useMemo, useRef } from 'react';
import { Alert } from 'react-native';
import { z } from 'zod';
import { flattenFormErrors, useZodForm } from '../../../hooks/useZodForm';
import { financialTransactionFormSchema } from '../../../../../shared-utils/financialFormSchemas';
import {
  FinancialCategory,
  FinancialTransaction,
  createFinancialTransaction,
  updateFinancialTransaction,
} from '../../../services/mobileFinanceService';
import { supabase } from '../../../services/supabaseClient';
import {
  toLocalIsoDate,
  isProLaboreCat,
  normalizeCategoryName,
  buildIncomeCategories,
} from '../components/transactionModalUtils';
import { sortCategoriesWithOthersAtEnd } from '../../../services/financial/mobileCategoryService';
import { withTimeout } from '../../../../../shared-utils/withTimeout';

// This owner completes manual transactions; incomplete AI drafts use another contract.
const manualTransactionFormSchema = financialTransactionFormSchema.extend({
  transactionId: z.string().trim().min(1, 'Transação não identificada.').optional(),
  category_id: z.string().trim().min(1, 'Selecione uma categoria.'),
  category_name: z.string().trim().min(1, 'Selecione uma categoria.'),
  purpose: z.enum(['BUSINESS', 'PERSONAL_PARTNER']),
  vehicle_id: z.string().trim(),
  collaborator_id: z.string().trim(),
  collaborator_name: z.string().trim(),
  result_nature: z.enum(['RECEITA', 'DESPESA', 'NAO_AFETA_RESULTADO']).optional(),
  created_by: z.string().trim().min(1, 'Operador não identificado.'),
});
const uncertainMessage = 'Não foi possível confirmar o registro. Confira as movimentações antes de repetir.';

interface UseTransactionFormProps {
  visible: boolean;
  transaction?: FinancialTransaction | null;
  categories: FinancialCategory[];
  userName?: string;
  onSuccess: () => void | Promise<void>;
  onClose: () => void;
}

export function useTransactionForm({
  visible,
  transaction,
  categories,
  userName = 'Operador',
  onSuccess,
  onClose,
}: UseTransactionFormProps) {
  const todayStr = toLocalIsoDate(new Date());
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = toLocalIsoDate(yesterday);

  const [type, setType] = useState<'income' | 'expense' | null>(null);
  const [purpose, setPurpose] = useState<'BUSINESS' | 'PERSONAL_PARTNER'>('BUSINESS');
  const [transactionDate, setTransactionDate] = useState(todayStr);
  const [datePickerVisible, setDatePickerVisible] = useState(false);

  const [amount, setAmount] = useState<number | null>(null);
  const [description, setDescription] = useState('');
  const [selectedCatId, setSelectedCatId] = useState('');
  const [categorySearchQuery, setCategorySearchQuery] = useState('');
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);

  const [paymentMethod, setPaymentMethod] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const [collaboratorId, setCollaboratorId] = useState('');
  const [collaboratorName, setCollaboratorName] = useState('');
  const [collaboratorsList, setCollaboratorsList] = useState<{ id: string; name: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, boolean>>({});
  const mounted = useRef(true);
  const inFlight = useRef(false);
  const uncertainContexts = useRef(new Set<string>());
  const completedRevision = useRef(-1);
  const latestProps = useRef({ visible, transaction, categories, userName });
  latestProps.current = { visible, transaction, categories, userName };
  const context = useRef({ visible, transactionId: transaction?.id, userName, revision: 0 });
  if (context.current.visible !== visible || context.current.transactionId !== transaction?.id || context.current.userName !== userName) {
    context.current = { visible, transactionId: transaction?.id, userName, revision: context.current.revision + 1 };
  }
  const contextRevision = context.current.revision;

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const isExpense = type === 'expense';

  useEffect(() => {
    const { visible, transaction, categories } = latestProps.current;
    if (!visible) return;
    setFieldErrors({});

    if (transaction) {
      const editingIncomeCategories = buildIncomeCategories(categories);
      const isLoan = normalizeCategoryName(transaction.category_name || '').includes('emprestimo');
      const isPersonalExpense =
        transaction.type === 'expense' && transaction.purpose === 'PERSONAL_PARTNER';
      const incomeCategory = editingIncomeCategories.find((category) =>
        isLoan
          ? normalizeCategoryName(category.name).includes('emprestimo')
          : normalizeCategoryName(category.name).includes('outra')
      );

      setType(transaction.type);
      setPurpose(transaction.purpose === 'PERSONAL_PARTNER' ? 'PERSONAL_PARTNER' : 'BUSINESS');
      setTransactionDate(transaction.date || toLocalIsoDate(new Date()));
      setAmount(transaction.amount || null);
      setDescription(transaction.description || '');
      setSelectedCatId(
        transaction.type === 'income'
          ? incomeCategory?.id || ''
          : isPersonalExpense
            ? transaction.category_id ||
              categories.find(
                (category) => category.type === 'expense' && isProLaboreCat(category.name)
              )?.id ||
              'cat_pro_labore_default'
            : transaction.category_id || ''
      );
      setPaymentMethod(transaction.payment_method || '');
      setVehicleId(transaction.vehicle_id || '');
      setCollaboratorId(transaction.collaborator_id || '');
      setCollaboratorName(transaction.collaborator_name || '');
      return;
    }

    setType(null);
    setPurpose('BUSINESS');
    setTransactionDate(toLocalIsoDate(new Date()));
    setAmount(null);
    setDescription('');
    setSelectedCatId('');
    setPaymentMethod('');
    setVehicleId('');
    setCollaboratorId('');
    setCollaboratorName('');
  }, [contextRevision]);

  useEffect(() => {
    let current = true;
    const loadCollaborators = async () => {
      try {
        const response = await withTimeout(supabase.from('profiles').select('id, full_name, role').limit(50), 15_000, null, 'financeiro:colaboradores');
        if (!current || !response) return;
        const { data } = response;
        if (data && data.length > 0) {
          setCollaboratorsList(
            data.map((p) => ({
              id: p.id,
              name: p.full_name || 'Colaborador',
            }))
          );
        }
      } catch (err) {
        console.warn('Erro ao carregar colaboradores no mobile finance modal:', err);
      }
    };
    void loadCollaborators();
    return () => { current = false; };
  }, []);

  const filteredCategories = useMemo(() => {
    const byType = categories.filter((c) => c.type === type);

    if (type === 'income') {
      return buildIncomeCategories(categories);
    }

    if (isExpense && purpose === 'PERSONAL_PARTNER') {
      const proLaboreCats = byType.filter((c) => isProLaboreCat(c.name));
      if (proLaboreCats.length > 0) {
        return proLaboreCats;
      }
      return [
        {
          id: 'cat_pro_labore_default',
          name: 'Pró-labore',
          type: type,
        },
      ];
    }

    const expenses = byType.filter((c) => !isProLaboreCat(c.name));
    return sortCategoriesWithOthersAtEnd(expenses);
  }, [categories, type, purpose, isExpense]);

  const selectedCategory = useMemo(() => {
    return (
      filteredCategories.find((c) => c.id === selectedCatId) ||
      categories.find((c) => c.id === selectedCatId)
    );
  }, [filteredCategories, categories, selectedCatId]);

  const handlePurposeChange = (newPurpose: 'BUSINESS' | 'PERSONAL_PARTNER') => {
    setCategoryModalVisible(false);
    setPurpose(newPurpose);
    if (newPurpose === 'PERSONAL_PARTNER') {
      const proLaboreCat = categories.find((c) => c.type === type && isProLaboreCat(c.name));
      if (proLaboreCat) {
        setSelectedCatId(proLaboreCat.id);
      } else {
        setSelectedCatId('cat_pro_labore_default');
      }
    } else {
      if (selectedCategory && isProLaboreCat(selectedCategory.name)) {
        setSelectedCatId('');
      }
    }
  };

  const handleTypeChange = (newType: 'income' | 'expense') => {
    setType(newType);
    setFieldErrors((prev) => ({ ...prev, type: false }));
    if (newType === 'income') {
      setPurpose('BUSINESS');
      setSelectedCatId('');
      setCategoryModalVisible(false);
      return;
    }
    if (purpose === 'PERSONAL_PARTNER') {
      const proLaboreCat = categories.find((c) => c.type === newType && isProLaboreCat(c.name));
      setSelectedCatId(proLaboreCat?.id || 'cat_pro_labore_default');
      return;
    }
    setSelectedCatId('');
  };

  const isPersonnelCategory = Boolean(
    selectedCategory?.name &&
      [
        'salário',
        'salários',
        'adiantamento',
        'comissão',
        'comissao',
        'benefício',
        'beneficio',
        'reembolso',
      ].some((term) => selectedCategory.name.toLowerCase().includes(term))
  );

  const isVehicleCategory = Boolean(
    selectedCategory?.name &&
      [
        'combustível',
        'gasolina',
        'veículo',
        'veiculo',
        'pedágio',
        'pedagio',
        'manutenção de veículos',
        'manutenção do carro',
      ].some((term) => selectedCategory.name.toLowerCase().includes(term))
  );

  const formValues = {
    transactionId: transaction ? transaction.id : undefined,
    type: type!, amount: amount || 0, description, date: transactionDate, payment_method: paymentMethod,
    category_id: selectedCatId,
    category_name:
      selectedCategory?.name ||
      (isExpense && purpose === 'PERSONAL_PARTNER'
        ? 'Pró-labore'
        : type === 'income'
          ? 'Outras entradas'
          : 'Despesa não classificada'),
    purpose,
    vehicle_id: isVehicleCategory ? vehicleId : '',
    collaborator_id: isPersonnelCategory ? collaboratorId : '',
    collaborator_name: isPersonnelCategory ? collaboratorName : '',
    result_nature: selectedCategory?.result_nature,
    created_by: userName,
  };
  const form = useZodForm(manualTransactionFormSchema, formValues);

  const handleSave = async () => {
    const revision = contextRevision;
    const isCurrent = () => mounted.current && context.current.visible && context.current.revision === revision;
    if (!isCurrent() || inFlight.current || completedRevision.current === revision) return;
    const contextKey = JSON.stringify([userName, transaction?.id || 'new']);
    if (uncertainContexts.current.has(contextKey)) {
      Alert.alert('Registro não confirmado', uncertainMessage);
      return;
    }
    inFlight.current = true;
    setSaving(true);
    let writing = false;
    let confirmed = false;
    try {
      return await form.validateAndRun(formValues, async (values) => {
        if (!isCurrent()) return false;
        setFieldErrors({});
        const { transactionId, created_by, ...fields } = values;
        const editablePayload: Partial<FinancialTransaction> = {
          ...fields,
          category_id: ['cat_pro_labore_default', 'cat_income_other_default', 'cat_income_loan_default'].includes(values.category_id) ? null : values.category_id,
          purpose: values.type === 'expense' ? values.purpose : null,
          vehicle_id: values.vehicle_id || null,
          collaborator_id: values.collaborator_id || null,
          collaborator_name: values.collaborator_name || null,
        };
        writing = true;
        const operation: Promise<{ success: boolean; error?: string; data?: FinancialTransaction }> = transactionId
          ? updateFinancialTransaction(transactionId, editablePayload)
          : createFinancialTransaction({ ...editablePayload, notes: null, origin: 'MANUAL', created_by, due_date: null, is_recurring: false, status: 'ACTIVE' });
        const result = await withTimeout(operation, 20_000, null, 'financeiro:lancamento-manual');
        if (!result || (result.success && !transactionId && !result.data?.id)) {
          uncertainContexts.current.add(contextKey);
          if (isCurrent()) Alert.alert('Registro não confirmado', uncertainMessage);
          return false;
        }
        if (!isCurrent()) return false;
        if (result.success !== true) {
          Alert.alert(transactionId ? 'Erro ao editar' : 'Erro ao criar', result.error || 'Não foi possível concluir a operação.');
          return false;
        }
        confirmed = true;
        completedRevision.current = revision;
        setType(null);
        setFieldErrors({});
        setAmount(null);
        setDescription('');
        setTransactionDate(toLocalIsoDate(new Date()));
        setSelectedCatId('');
        setPaymentMethod('');
        setCategorySearchQuery('');
        setCollaboratorId('');
        setCollaboratorName('');
        const refreshed = await withTimeout(Promise.resolve(onSuccess()).then(() => true), 15_000, false, 'Atualização do lançamento financeiro');
        if (!refreshed && isCurrent()) Alert.alert('Registro salvo', 'A atualização da lista demorou demais. Confira as movimentações.');
        if (isCurrent()) onClose();
        return true;
      }, (errors) => {
        if (!isCurrent()) return;
        const messages = flattenFormErrors(errors);
        setFieldErrors(Object.fromEntries(Object.keys(messages).map((key) => [key === 'payment_method' ? 'paymentMethod' : key === 'category_id' ? 'category' : key, true])));
        Alert.alert('Campos Obrigatórios', Object.values(messages)[0]);
      });
    } catch (error) {
      if (writing && !confirmed) uncertainContexts.current.add(contextKey);
      if (isCurrent()) {
        Alert.alert(confirmed ? 'Registro salvo' : writing ? 'Registro não confirmado' : 'Erro ao validar',
          confirmed ? 'A movimentação foi salva, mas a atualização da tela falhou. Confira a lista antes de repetir.'
            : writing ? uncertainMessage : error instanceof Error ? error.message : 'Revise os campos informados.');
      }
      return false;
    } finally {
      inFlight.current = false;
      if (mounted.current) setSaving(false);
    }
  };

  const handleOpenCategoryModal = (initialQuery = '') => {
    setCategorySearchQuery(initialQuery);
    setCategoryModalVisible(true);
  };

  return {
    todayStr,
    yesterdayStr,
    type,
    purpose,
    transactionDate,
    datePickerVisible,
    amount,
    description,
    selectedCatId,
    categorySearchQuery,
    categoryModalVisible,
    paymentMethod,
    vehicleId,
    collaboratorId,
    collaboratorName,
    collaboratorsList,
    saving,
    fieldErrors,
    isExpense,
    filteredCategories,
    selectedCategory,
    isPersonnelCategory,
    isVehicleCategory,
    setDatePickerVisible,
    setCategoryModalVisible,
    setTransactionDate,
    setAmount,
    setDescription,
    setSelectedCatId,
    setPaymentMethod,
    setVehicleId,
    setCollaboratorId,
    setCollaboratorName,
    setFieldErrors,
    handleTypeChange,
    handlePurposeChange,
    handleSave,
    handleClose: () => { if (!inFlight.current) onClose(); },
    handleOpenCategoryModal,
  };
}
