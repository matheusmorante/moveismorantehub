import { useState, useEffect, useMemo } from 'react';
import { Alert } from 'react-native';
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

interface UseTransactionFormProps {
  visible: boolean;
  transaction?: FinancialTransaction | null;
  categories: FinancialCategory[];
  userName?: string;
  onSuccess: () => void;
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

  const [amountStr, setAmountStr] = useState('');
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

  const isExpense = type === 'expense';

  useEffect(() => {
    if (!visible) return;
    setFieldErrors({});

    if (transaction) {
      const editingIncomeCategories = buildIncomeCategories(categories);
      const isLoan = normalizeCategoryName(transaction.category_name || '').includes('emprestimo');
      const isPersonalExpense = transaction.type === 'expense' && transaction.purpose === 'PERSONAL_PARTNER';
      const incomeCategory = editingIncomeCategories.find(category =>
        isLoan
          ? normalizeCategoryName(category.name).includes('emprestimo')
          : normalizeCategoryName(category.name).includes('outra')
      );

      setType(transaction.type);
      setPurpose(transaction.purpose === 'PERSONAL_PARTNER' ? 'PERSONAL_PARTNER' : 'BUSINESS');
      setTransactionDate(transaction.date || toLocalIsoDate(new Date()));
      setAmountStr(String(transaction.amount).replace('.', ','));
      setDescription(transaction.description || '');
      setSelectedCatId(
        transaction.type === 'income'
          ? (incomeCategory?.id || '')
          : isPersonalExpense
            ? (transaction.category_id || categories.find(category => category.type === 'expense' && isProLaboreCat(category.name))?.id || 'cat_pro_labore_default')
            : (transaction.category_id || '')
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
    setAmountStr('');
    setDescription('');
    setSelectedCatId('');
    setPaymentMethod('');
    setVehicleId('');
    setCollaboratorId('');
    setCollaboratorName('');
  }, [visible, transaction, categories]);

  useEffect(() => {
    const loadCollaborators = async () => {
      try {
        const { data } = await supabase.from('profiles').select('id, full_name, role').limit(50);
        if (data && data.length > 0) {
          setCollaboratorsList(
            data.map(p => ({
              id: p.id,
              name: p.full_name || 'Colaborador',
            }))
          );
        }
      } catch (err) {
        console.warn('Erro ao carregar colaboradores no mobile finance modal:', err);
      }
    };
    loadCollaborators();
  }, []);

  const filteredCategories = useMemo(() => {
    const byType = categories.filter(c => c.type === type);

    if (type === 'income') {
      return buildIncomeCategories(categories);
    }

    if (isExpense && purpose === 'PERSONAL_PARTNER') {
      const proLaboreCats = byType.filter(c => isProLaboreCat(c.name));
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

    return byType.filter(c => !isProLaboreCat(c.name));
  }, [categories, type, purpose, isExpense]);

  const selectedCategory = useMemo(() => {
    return filteredCategories.find(c => c.id === selectedCatId) || categories.find(c => c.id === selectedCatId);
  }, [filteredCategories, categories, selectedCatId]);

  const handlePurposeChange = (newPurpose: 'BUSINESS' | 'PERSONAL_PARTNER') => {
    setCategoryModalVisible(false);
    setPurpose(newPurpose);
    if (newPurpose === 'PERSONAL_PARTNER') {
      const proLaboreCat = categories.find(c => c.type === type && isProLaboreCat(c.name));
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
    setFieldErrors(prev => ({ ...prev, type: false }));
    if (newType === 'income') {
      setPurpose('BUSINESS');
      setSelectedCatId('');
      setCategoryModalVisible(false);
      return;
    }
    if (purpose === 'PERSONAL_PARTNER') {
      const proLaboreCat = categories.find(c => c.type === newType && isProLaboreCat(c.name));
      setSelectedCatId(proLaboreCat?.id || 'cat_pro_labore_default');
      return;
    }
    setSelectedCatId('');
  };

  const isPersonnelCategory = Boolean(
    selectedCategory?.name &&
      ['salário', 'salários', 'adiantamento', 'comissão', 'comissao', 'benefício', 'beneficio', 'reembolso'].some(term =>
        selectedCategory.name.toLowerCase().includes(term)
      )
  );

  const isVehicleCategory = Boolean(
    selectedCategory?.name &&
      ['combustível', 'gasolina', 'veículo', 'veiculo', 'pedágio', 'pedagio', 'manutenção de veículos'].some(term =>
        selectedCategory.name.toLowerCase().includes(term)
      )
  );

  const handleSave = async () => {
    const errors: Record<string, boolean> = {};

    if (!type) {
      errors.type = true;
    }

    const val = parseFloat(amountStr.replace(',', '.'));
    if (!val || val <= 0) {
      errors.amount = true;
    }

    if (!description.trim()) {
      errors.description = true;
    }

    if (!selectedCatId) {
      errors.category = true;
    }

    if (!paymentMethod) {
      errors.paymentMethod = true;
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      Alert.alert('Campos Obrigatórios', 'Por favor, preencha todos os campos obrigatórios destacados em vermelho.');
      return;
    }

    setFieldErrors({});
    setSaving(true);
    const catName =
      selectedCategory?.name ||
      (isExpense && purpose === 'PERSONAL_PARTNER'
        ? 'Pró-labore'
        : type === 'income'
          ? 'Outras entradas'
          : 'Despesa não classificada');
    const isVirtualCategory = [
      'cat_pro_labore_default',
      'cat_income_other_default',
      'cat_income_loan_default',
    ].includes(selectedCatId);
    const realCatId = isVirtualCategory ? null : selectedCatId || null;

    const editablePayload: Partial<FinancialTransaction> = {
      type: type!,
      amount: val,
      description: description.trim(),
      category_id: realCatId,
      category_name: catName,
      payment_method: paymentMethod,
      purpose: isExpense ? purpose : null,
      vehicle_id: isVehicleCategory ? vehicleId || null : null,
      collaborator_id: isPersonnelCategory ? collaboratorId || null : null,
      collaborator_name: isPersonnelCategory ? collaboratorName || null : null,
      date: transactionDate,
      result_nature: selectedCategory?.result_nature || undefined,
    };

    const result = transaction
      ? await updateFinancialTransaction(transaction.id, editablePayload)
      : await createFinancialTransaction({
          ...editablePayload,
          notes: null,
          origin: 'MANUAL',
          created_by: userName,
          due_date: null,
          is_recurring: false,
          status: 'ACTIVE',
        });

    setSaving(false);
    if (!result.success) {
      Alert.alert(
        transaction ? 'Erro ao editar' : 'Erro ao criar',
        result.error || 'Não foi possível concluir a operação.'
      );
      return;
    }

    setType(null);
    setFieldErrors({});
    setAmountStr('');
    setDescription('');
    setTransactionDate(toLocalIsoDate(new Date()));
    setSelectedCatId('');
    setPaymentMethod('');
    setCategorySearchQuery('');
    setCollaboratorId('');
    setCollaboratorName('');
    onSuccess();
    onClose();
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
    amountStr,
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
    setAmountStr,
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
    handleOpenCategoryModal,
  };
}
