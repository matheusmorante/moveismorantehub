'use client';

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Sparkles, X, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { flattenFormErrors, useZodForm } from '@/hooks/useZodForm';
import {
  storefrontAttributeFormSchema,
  storefrontAttributeValueFormSchema,
} from '@/shared-utils/storefrontProductFormSchemas';
import { DbAttribute, DbAttributeValue } from '../types';

interface AttributeManagerModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  dbAttributes: DbAttribute[];
  dbAttributeValues: DbAttributeValue[];
  fetchDbAttributes: () => Promise<void>;
  onAttributeCreated?: (name: string, firstValue: string) => void;
}

export function AttributeManagerModal({
  isOpen,
  onOpenChange,
  dbAttributes,
  dbAttributeValues,
  fetchDbAttributes,
  onAttributeCreated,
}: AttributeManagerModalProps) {
  const [fastAttrName, setFastAttrName] = useState('');
  const [fastAttrValues, setFastAttrValues] = useState<string[]>([]);
  const [fastAttrValInput, setFastAttrValInput] = useState('');
  const [editingAttrId, setEditingAttrId] = useState<string | null>(null);

  const attributeForm = useZodForm(storefrontAttributeFormSchema, {
    name: fastAttrName,
    values: fastAttrValues,
  });
  const attributeValueForm = useZodForm(storefrontAttributeValueFormSchema, {
    attributeId: '',
    value: '',
  });

  const showFormError = (errors: Parameters<typeof flattenFormErrors>[0]) =>
    toast.error(Object.values(flattenFormErrors(errors))[0]);

  const handleKeyDownFastAttrVal = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const val = fastAttrValInput.trim().replace(/,/g, '');
      if (val) {
        if (fastAttrValues.includes(val)) {
          toast.error('Este valor já foi adicionado!');
          return;
        }
        setFastAttrValues((prev) => [...prev, val]);
      }
      setFastAttrValInput('');
    } else if (e.key === 'Backspace' && !fastAttrValInput) {
      setFastAttrValues((prev) => prev.slice(0, -1));
    }
  };

  const handleFastSaveAttribute = async () => {
    let finalValues = [...fastAttrValues];
    const pendingVal = fastAttrValInput.trim().replace(/,/g, '');
    if (pendingVal) {
      if (!finalValues.includes(pendingVal)) {
        finalValues.push(pendingVal);
      }
    }

    await attributeForm.validateAndRun(
      { name: fastAttrName, values: finalValues },
      async (validated) => {
        const valuesToSave = validated.values;
        const toastId = toast.loading('Salvando atributo...');
        try {
          if (editingAttrId) {
            const { error: attrErr } = await supabase
              .from('attributes')
              .update({ name: validated.name })
              .eq('id', editingAttrId);

            if (attrErr) throw attrErr;

            const { error: delErr } = await supabase
              .from('attribute_values')
              .delete()
              .eq('attribute_id', editingAttrId);

            if (delErr) throw delErr;

            const valuesToInsert = valuesToSave.map((val) => ({
              attribute_id: editingAttrId,
              value: val,
            }));
            const { error: valErr } = await supabase.from('attribute_values').insert(valuesToInsert);
            if (valErr) throw valErr;

            toast.success('Atributo atualizado com sucesso!', { id: toastId });
            await fetchDbAttributes();
          } else {
            const { data: attr, error: attrErr } = await supabase
              .from('attributes')
              .insert([{ name: validated.name }])
              .select()
              .single();

            if (attrErr) throw attrErr;

            const valuesToInsert = valuesToSave.map((val) => ({
              attribute_id: attr.id,
              value: val,
            }));
            const { error: valErr } = await supabase.from('attribute_values').insert(valuesToInsert);
            if (valErr) throw valErr;

            toast.success('Atributo criado com sucesso!', { id: toastId });
            await fetchDbAttributes();

            if (onAttributeCreated) {
              onAttributeCreated(validated.name, valuesToSave[0] || '');
            }
          }

          onOpenChange(false);
          setFastAttrName('');
          setFastAttrValues([]);
          setFastAttrValInput('');
          setEditingAttrId(null);
        } catch (err: any) {
          toast.error('Erro ao salvar atributo: ' + err.message, { id: toastId });
        }
      },
      showFormError
    );
  };

  const handleDeleteDbAttribute = async (attrId: string) => {
    if (
      !confirm(
        'Excluir este atributo global e todos os seus valores vinculados? Isso pode afetar variações existentes.'
      )
    )
      return;
    try {
      const { error } = await supabase.from('attributes').delete().eq('id', attrId);
      if (error) throw error;
      toast.success('Atributo excluído com sucesso!');
      await fetchDbAttributes();
      if (editingAttrId === attrId) {
        setEditingAttrId(null);
        setFastAttrName('');
        setFastAttrValues([]);
        setFastAttrValInput('');
      }
    } catch (err: any) {
      toast.error('Erro ao excluir atributo: ' + err.message);
    }
  };

  const handleStartEditDbAttribute = (attrId: string, attrName: string) => {
    const vals = dbAttributeValues.filter((v) => v.attribute_id === attrId).map((v) => v.value);
    setEditingAttrId(attrId);
    setFastAttrName(attrName);
    setFastAttrValues(vals);
    setFastAttrValInput('');
  };

  const handleCancelEditDbAttribute = () => {
    setEditingAttrId(null);
    setFastAttrName('');
    setFastAttrValues([]);
    setFastAttrValInput('');
  };

  const handleDeleteDbAttributeValue = async (valId: string) => {
    try {
      const { error } = await supabase.from('attribute_values').delete().eq('id', valId);
      if (error) throw error;
      toast.success('Valor removido com sucesso!');
      await fetchDbAttributes();
    } catch (err: any) {
      toast.error('Erro ao remover valor: ' + err.message);
    }
  };

  const handleAddDbAttributeValueToExisting = async (attrId: string, valText: string) => {
    if (!valText.trim()) return;
    await attributeValueForm.validateAndRun(
      { attributeId: attrId, value: valText },
      async (validated) => {
        try {
          const { error } = await supabase
            .from('attribute_values')
            .insert([{ attribute_id: validated.attributeId, value: validated.value }]);

          if (error) throw error;
          toast.success('Valor adicionado com sucesso!');
          await fetchDbAttributes();
        } catch (err: any) {
          toast.error('Erro ao adicionar valor: ' + err.message);
        }
      },
      showFormError
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl lg:max-w-6xl w-[95vw] rounded-[24px] p-6 bg-white border border-gray-150 overflow-hidden flex flex-col max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-gray-800 flex items-center gap-1.5">
            <Sparkles className="h-5 w-5 text-primary" />
            Gerenciar Atributos Globais
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Gerencie as propriedades (ex: Cor, Voltagem) utilizadas na grade de variações.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 overflow-y-auto pr-1 py-4 flex-1">
          <Card className="lg:col-span-1 rounded-2xl shadow-sm border h-fit">
            <CardHeader>
              <CardTitle className="text-base font-bold flex items-center gap-1.5">
                <Sparkles className="h-5 w-5 text-primary" />
                {editingAttrId ? 'Editar Atributo' : 'Novo Atributo'}
              </CardTitle>
              <CardDescription className="text-xs">
                Cadastre propriedades reutilizáveis.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700">Nome do Atributo</label>
                  <Input
                    placeholder="Ex: Cor, Tamanho, Voltagem"
                    value={fastAttrName}
                    onChange={(e) => setFastAttrName(e.target.value)}
                    className="h-10"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700">
                    Valores (Enter ou Vírgula)
                  </label>
                  <div className="min-h-12 flex flex-wrap gap-1.5 p-2 bg-white border rounded-xl items-center focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all">
                    {fastAttrValues.map((val, idx) => (
                      <Badge
                        key={idx}
                        variant="secondary"
                        className="h-7 bg-primary/10 text-primary font-bold text-xs gap-1 py-0 px-2 rounded-lg border border-primary/20"
                      >
                        {val}
                        <button
                          type="button"
                          onClick={() =>
                            setFastAttrValues((prev) => prev.filter((_, i) => i !== idx))
                          }
                          className="text-primary hover:text-red-500 rounded-full transition-colors"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                    <input
                      type="text"
                      placeholder={fastAttrValues.length === 0 ? 'Ex: Azul, Preto...' : ''}
                      value={fastAttrValInput}
                      onChange={(e) => setFastAttrValInput(e.target.value)}
                      onKeyDown={handleKeyDownFastAttrVal}
                      className="flex-1 min-w-[100px] bg-transparent outline-none border-none text-sm p-1"
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  {editingAttrId && (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={handleCancelEditDbAttribute}
                      className="flex-1 rounded-xl h-10"
                    >
                      Cancelar
                    </Button>
                  )}
                  <Button
                    type="button"
                    onClick={handleFastSaveAttribute}
                    className="flex-1 font-bold h-10 rounded-xl"
                  >
                    {editingAttrId ? 'Salvar' : 'Criar Atributo'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="lg:col-span-2 space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
            {dbAttributes.length === 0 ? (
              <div className="bg-white rounded-2xl border p-12 text-center shadow-sm italic text-muted-foreground">
                Nenhum atributo cadastrado ainda.
              </div>
            ) : (
              dbAttributes.map((attr) => {
                const attrVals = dbAttributeValues.filter((v) => v.attribute_id === attr.id);
                return (
                  <Card key={attr.id} className="rounded-2xl shadow-sm border">
                    <CardHeader className="pb-3 flex flex-row items-start justify-between space-y-0">
                      <div>
                        <CardTitle className="text-base font-bold text-gray-800">
                          {attr.name}
                        </CardTitle>
                        <CardDescription className="text-xs">
                          Valores vinculados a este atributo.
                        </CardDescription>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleStartEditDbAttribute(attr.id, attr.name)}
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 h-8 w-8"
                          title="Editar Atributo"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteDbAttribute(attr.id)}
                          className="text-red-500 hover:text-red-600 hover:bg-red-50 h-8 w-8"
                          title="Excluir Atributo"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex flex-wrap gap-2">
                        {attrVals.map((val) => (
                          <Badge
                            key={val.id}
                            variant="outline"
                            className="py-1 px-3 gap-1.5 font-semibold text-xs border bg-gray-50 text-gray-700 rounded-full group"
                          >
                            {val.value}
                            <button
                              type="button"
                              onClick={() => handleDeleteDbAttributeValue(val.id)}
                              className="text-gray-400 hover:text-red-500 rounded-full transition-colors"
                              title="Remover este valor"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </Badge>
                        ))}
                      </div>

                      <div className="flex gap-2 max-w-sm pt-2">
                        <Input
                          placeholder="Adicionar novo valor..."
                          id={`modal-input-val-${attr.id}`}
                          onKeyDown={async (e) => {
                            if (e.key === 'Enter') {
                              const inputEl = e.currentTarget;
                              await handleAddDbAttributeValueToExisting(attr.id, inputEl.value);
                              inputEl.value = '';
                            }
                          }}
                          className="h-9 text-xs"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={async () => {
                            const inputEl = document.getElementById(
                              `modal-input-val-${attr.id}`
                            ) as HTMLInputElement;
                            if (inputEl) {
                              await handleAddDbAttributeValueToExisting(attr.id, inputEl.value);
                              inputEl.value = '';
                            }
                          }}
                          className="font-bold text-xs h-9 px-3"
                        >
                          Adicionar
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </div>

        <DialogFooter className="border-t pt-4 flex justify-end">
          <Button type="button" onClick={() => onOpenChange(false)} className="rounded-xl">
            Fechar Gerenciador
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
