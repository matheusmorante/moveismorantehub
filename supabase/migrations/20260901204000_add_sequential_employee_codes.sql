-- Mantém o UUID em people.id como identificador técnico e adiciona um código legível
-- exclusivamente para colaboradores.
CREATE SEQUENCE IF NOT EXISTS public.employee_code_sequence MINVALUE 1;

ALTER TABLE public.people
    ADD COLUMN IF NOT EXISTS employee_code integer;

WITH employees_to_number AS (
    SELECT id, row_number() OVER (ORDER BY created_at NULLS LAST, id)::integer AS code
    FROM public.people
    WHERE lower(COALESCE(person_type, '')) = 'employees'
       OR position IS NOT NULL
)
UPDATE public.people AS person
SET employee_code = employees_to_number.code
FROM employees_to_number
WHERE person.id = employees_to_number.id
  AND person.employee_code IS NULL;

SELECT setval(
    'public.employee_code_sequence',
    COALESCE((SELECT MAX(employee_code) FROM public.people), 0) + 1,
    false
);

CREATE UNIQUE INDEX IF NOT EXISTS people_employee_code_unique
    ON public.people (employee_code)
    WHERE employee_code IS NOT NULL;

CREATE OR REPLACE FUNCTION public.assign_employee_code()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF (lower(COALESCE(NEW.person_type, '')) = 'employees' OR NEW.position IS NOT NULL)
       AND NEW.employee_code IS NULL THEN
        NEW.employee_code := nextval('public.employee_code_sequence')::integer;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS assign_employee_code_before_write ON public.people;
CREATE TRIGGER assign_employee_code_before_write
    BEFORE INSERT OR UPDATE OF person_type, position ON public.people
    FOR EACH ROW
    EXECUTE FUNCTION public.assign_employee_code();
