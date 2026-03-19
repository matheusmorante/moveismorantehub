```typescript
import React, { useState, useEffect } from "react";
import SmartInput from "../../../components/SmartInput";
import { ValidationErrors } from "../../utils/validations";
import { subscribeToPeople } from "../../utils/personService";

interface Props {
    seller: string,
    setSeller: (seller: string) => void,
    errors: ValidationErrors
}

const Seller = ({ seller, setSeller, errors }: Props) => {
    const [employeeNames, setEmployeeNames] = useState<string[]>([]);

    useEffect(() => {
        // Busca a lista de funcionários para sugerir no autocomplete
        const unsubscribe = subscribeToPeople('employees', (people) => {
            const names = people
                .map(p => p.fullName)
                .filter(name => name && name.trim() !== "");
            setEmployeeNames(names);
        });
        return unsubscribe;
    }, []);

    return (
        <div className="flex flex-col relative w-full">
            <SmartInput
                label="Vendedor Principal *"
                value={seller}
                onValueChange={setSeller}
                placeholder="Nome do Vendedor"
                error={!!errors['seller']}
                suggestions={employeeNames}
                name="seller"
                icon="bi-person-badge"
            />
            {errors['seller'] && (
                <p className="text-[10px] text-red-500 font-bold mt-1 ml-1 animate-in fade-in slide-in-from-top-1">
                    {errors['seller']}
                </p>
            )}
        </div>
    );
};

export default Seller;