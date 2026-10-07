-- Migration: Adiciona coluna ie_indicator à tabela people
-- Separa semanticamente os dados fiscais do cliente do JSON de endereço.

ALTER TABLE public.people
ADD COLUMN IF NOT EXISTS ie_indicator text CHECK (ie_indicator IN ('1', '2', '9')) DEFAULT '9';

COMMENT ON COLUMN public.people.ie_indicator IS 'Indicador da IE do destinatário perante o ICMS (indIEDest): 1=Contribuinte, 2=Isento, 9=Não Contribuinte';
COMMENT ON COLUMN public.people.rg_ie IS 'Documento secundário: para PF representa RG; para PJ representa Inscrição Estadual (IE)';

-- Atualiza clientes existentes: por padrão não contribuintes '9', exceto se PJ e possui IE cadastrada preexistente
UPDATE public.people
SET ie_indicator = '9'
WHERE ie_indicator IS NULL;
