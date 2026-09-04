import { useState, useEffect, useRef } from "react";
import Person from "@/pages/types/person.type";
import { savePerson, getPersonByIdentifiers, isEmployeeEmailTaken, isSupplierNameTaken } from '@/pages/utils/personService';
import { getUserProfileByEmail, getUserProfileByIdOrEmail, saveEmployeeInProfile } from '@/pages/utils/employeeProfileService';
import { toast } from "react-toastify";
import { capitalizePerson } from "@/pages/utils/formatters";
import { getSettings } from "@/pages/utils/settingsService";
import { getAddressByCep, getShippingRouteUrl } from "@/pages/utils/maps";
import { UserRole } from "@/context/AuthContext";
import { getPrimaryRole } from "@/pages/utils/accessRoles";

export const EMPLOYEE_ROLES: { value: UserRole; label: string; description: string; icon: string }[] = [
    { value: 'administrator', label: 'Administrador', description: 'Acesso total a todas as áreas do sistema', icon: 'bi-shield-shaded' },
    { value: 'manager', label: 'Gestor', description: 'Gestão operacional, estoque e relatórios', icon: 'bi-briefcase-fill' },
    { value: 'stockist', label: 'Estoquista', description: 'Controle, contagens e movimentações de estoque', icon: 'bi-boxes' },
    { value: 'seller', label: 'Vendedor', description: 'Vendas, pedidos e clientes', icon: 'bi-tag-fill' },
    { value: 'deliverer', label: 'Entregador / Montador', description: 'Rotas de entrega e montagens', icon: 'bi-truck' },
    { value: 'pending', label: 'Sem Acesso', description: 'Acesso bloqueado temporariamente', icon: 'bi-slash-circle' },
];

export interface UsePersonFormProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: (person: Person) => void;
    person?: Person | null;
    collectionName: string;
    title: string;
}

export const usePersonForm = ({
    isOpen,
    onClose,
    onSuccess,
    person,
    collectionName,
    title
}: UsePersonFormProps) => {
    const isEmployee = collectionName === 'employees';

    const [formData, setFormData] = useState<Partial<Person>>({
        personType: "PF",
        fullName: "",
        socialName: "",
        cpfCnpj: "",
        email: "",
        phone: "",
        noPhone: false,
        active: true,
        type: collectionName as any,
        fullAddress: {
            cep: "",
            street: "",
            number: "",
            neighborhood: "",
            city: "",
            state: "PR",
            housingType: "",
            complement: "",
            mapsUrl: "",
            observation: ""
        },
        noAddress: false,
        marketingOrigin: "",
        position: "",
        role: "seller",
        roles: ["seller"],
        additionalContacts: [],
        observations: ""
    });

    const [loading, setLoading] = useState(false);
    const [settings] = useState(getSettings());
    const isInitialMount = useRef(true);
    const [isAddressOpen, setIsAddressOpen] = useState(!isEmployee);

    const toggleEmployeeRole = (roleValue: UserRole) => {
        const currentRoles = (formData.roles && formData.roles.length > 0)
            ? [...formData.roles]
            : (formData.role ? [formData.role] : ['seller']);

        let nextRoles: UserRole[];

        if (roleValue === 'pending') {
            nextRoles = ['pending'];
        } else {
            const withoutPending = currentRoles.filter(r => r !== 'pending');
            if (withoutPending.includes(roleValue)) {
                nextRoles = withoutPending.filter(r => r !== roleValue);
                if (nextRoles.length === 0) {
                    nextRoles = ['pending'];
                }
            } else {
                nextRoles = [...withoutPending, roleValue];
            }
        }

        const defaultRoleNames: Record<UserRole, string> = {
            administrator: 'Administrador',
            manager: 'Gestor',
            stockist: 'Estoquista',
            seller: 'Vendedor',
            deliverer: 'Entregador / Montador',
            accountant: 'Contador',
            pending: 'Sem Acesso'
        };

        const primaryRole = getPrimaryRole(nextRoles);

        setFormData(prev => ({
            ...prev,
            roles: nextRoles,
            role: primaryRole,
            position: (!prev.position || prev.position.trim() === '' || EMPLOYEE_ROLES.some(er => er.label === prev.position) || prev.position.includes('/'))
                ? (nextRoles.filter(r => r !== 'pending').map(r => defaultRoleNames[r]).join(' / ') || defaultRoleNames[primaryRole])
                : prev.position
        }));
    };

    const handleEmployeeEmailBlur = async () => {
        if (!isEmployee || !formData.email?.trim()) return;

        try {
            const isTaken = await isEmployeeEmailTaken(formData.email, person?.id);
            if (isTaken) {
                toast.error("Este e-mail já está sendo utilizado por outro colaborador.");
                return;
            }

            const profile = await getUserProfileByEmail(formData.email);
            if (!profile) return;

            const profileRoles = profile.roles && profile.roles.length > 0
                ? profile.roles
                : (profile.role ? [profile.role] : ['seller']);

            setFormData((current) => ({
                ...current,
                fullName: current.fullName || profile.full_name || profile.email,
                position: current.position || profile.position || "",
                role: current.role || profile.role || getPrimaryRole(profileRoles),
                roles: current.roles && current.roles.length > 0 ? current.roles : profileRoles,
            }));
            toast.info("Dados e cargos da conta vinculados ao funcionário.");
        } catch (error) {
            console.error("Erro ao localizar conta pelo e-mail:", error);
        }
    };

    useEffect(() => {
        if (person) {
            const initialRoles = (person.roles && person.roles.length > 0)
                ? person.roles
                : (person.role ? [person.role] : ['seller']);

            setFormData({
                ...person,
                role: person.role || getPrimaryRole(initialRoles),
                roles: initialRoles,
                personType: person.personType || "PF",
                fullAddress: {
                    cep: person.fullAddress?.cep || "",
                    street: person.fullAddress?.street || "",
                    number: person.fullAddress?.number || "",
                    neighborhood: person.fullAddress?.neighborhood || "",
                    city: person.fullAddress?.city || "",
                    state: person.fullAddress?.state || "PR",
                    housingType: (person.fullAddress as any)?.housingType || "",
                    complement: person.fullAddress?.complement || "",
                    mapsUrl: person.fullAddress?.mapsUrl || (person.fullAddress as any)?.googleMapsUrl || (person.fullAddress as any)?.mapsLink || "",
                    observation: person.fullAddress?.observation || ""
                },
                additionalContacts: person.additionalContacts || [],
                observations: person.observations || ""
            });
            if (isEmployee && person.email) {
                getUserProfileByEmail(person.email).then((prof) => {
                    if (prof?.roles && prof.roles.length > 0) {
                        setFormData((prev) => ({
                            ...prev,
                            roles: prof.roles || prev.roles,
                            role: prof.role || getPrimaryRole(prof.roles || []) || prev.role
                        }));
                    } else if (prof?.role) {
                        setFormData((prev) => ({
                            ...prev,
                            role: prof.role || prev.role,
                            roles: [prof.role]
                        }));
                    }
                }).catch(() => {});
            }
            if (isEmployee) {
                const hasAddressData = !!(person.fullAddress?.street || person.fullAddress?.cep || person.fullAddress?.city);
                setIsAddressOpen(hasAddressData);
            } else {
                setIsAddressOpen(true);
            }
        } else {
            setIsAddressOpen(!isEmployee);
            setFormData({
                personType: "PF",
                fullName: "",
                socialName: "",
                cpfCnpj: "",
                email: "",
                phone: "",
                noPhone: false,
                active: true,
                type: collectionName as any,
                role: "seller",
                roles: ["seller"],
                fullAddress: {
                    cep: "",
                    street: "",
                    number: "",
                    neighborhood: "",
                    city: "",
                    state: "PR",
                    housingType: "",
                    complement: "",
                    mapsUrl: "",
                    observation: ""
                },
                noAddress: false,
                marketingOrigin: "",
                position: title === "Vendedor" ? "Vendedor" : "",
                additionalContacts: [],
                observations: ""
            });
        }
        isInitialMount.current = true;
    }, [person, isOpen]);

    const handleAddressChange = (field: string, value: string) => {
        setFormData((prev: Partial<Person>) => {
            const currentAddress = prev.fullAddress || {
                cep: "", street: "", number: "", neighborhood: "",
                city: "", state: "PR", housingType: "", complement: "", mapsUrl: "", observation: ""
            };
            return {
                ...prev,
                fullAddress: { ...currentAddress, [field]: value }
            };
        });
    };

    // Auto-enable noAddress for "Consumidor Final" in registration
    useEffect(() => {
        if (!formData.fullName) return;
        const isFinalConsumer = formData.fullName.toLowerCase().trim() === 'consumidor final';
        if (isFinalConsumer && !formData.noAddress) {
            setFormData(prev => ({ ...prev, noAddress: true }));
        }
    }, [formData.fullName]);

    const handleCepBlur = async (e: React.FocusEvent<HTMLInputElement>) => {
        const cepValue = e.target.value.replace(/\D/g, "");
        if (cepValue.length === 8) {
            try {
                const data = await getAddressByCep(cepValue);
                if (data && !(data as any).error) {
                    setFormData((prev: Partial<Person>) => ({
                        ...prev,
                        fullAddress: {
                            ...prev.fullAddress!,
                            street: data.street || prev.fullAddress?.street || "",
                            neighborhood: data.neighborhood || prev.fullAddress?.neighborhood || "",
                            city: data.city || prev.fullAddress?.city || "",
                            state: (data.state || prev.fullAddress?.state || "PR").toUpperCase(),
                        }
                    }));
                }
            } catch (error) { /* ignore */ }
        }
    };

    const addAdditionalContact = () => {
        const current = formData.additionalContacts || [];
        setFormData({ ...formData, additionalContacts: [...current, { name: "", phone: "" }] });
    };

    const removeAdditionalContact = (index: number) => {
        const current = formData.additionalContacts || [];
        setFormData({ ...formData, additionalContacts: current.filter((_, i) => i !== index) });
    };

    const updateAdditionalContact = (index: number, field: 'name' | 'phone', value: string) => {
        const current = formData.additionalContacts || [];
        const updated = current.map((c, i) => i === index ? { ...c, [field]: value } : c);
        setFormData({ ...formData, additionalContacts: updated });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        const { requiredFields } = settings;

        if (!formData.fullName) {
            toast.error(formData.personType === 'PJ' ? "A Razão Social é obrigatória." : "O nome é obrigatório.");
            return;
        }

        if (collectionName === 'customers' && requiredFields.customer?.phone && !formData.noPhone && (!formData.phone || formData.phone.trim() === '')) {
            toast.error("O telefone é obrigatório.");
            return;
        }

        if (collectionName !== 'suppliers' && requiredFields.customer?.cpfCnpj && (!formData.cpfCnpj || formData.cpfCnpj.trim() === '')) {
            toast.error("O CPF/CNPJ é obrigatório.");
            return;
        }

        if ((isEmployee || (collectionName !== 'suppliers' && requiredFields.customer?.email)) && (!formData.email || formData.email.trim() === '')) {
            toast.error("O e-mail é obrigatório.");
            return;
        }

        if (collectionName !== 'suppliers' && requiredFields.customer?.rgIe && (!(formData as any).rgIe || (formData as any).rgIe.trim() === '')) {
            toast.error("O RG/IE é obrigatório.");
            return;
        }

        if (collectionName === 'employees' && requiredFields.customer?.position && (!formData.position || formData.position.trim() === '')) {
            toast.error("O Cargo Principal é obrigatório.");
            return;
        }

        if (collectionName === 'customers' && !formData.noAddress) {
            const addr = formData.fullAddress;
            if (!addr?.street || !addr?.number || !addr?.city) {
                toast.error("Rua, Número e Cidade são obrigatórios no endereço.");
                return;
            }
        }

        if (collectionName === 'customers' && !formData.marketingOrigin) {
            toast.error("Por favor, informe se o cliente é de tráfego pago.");
            return;
        }

        if (isEmployee && formData.email && formData.email.trim() !== '') {
            const isEmailTaken = await isEmployeeEmailTaken(formData.email, person?.id);
            if (isEmailTaken) {
                toast.error("Já existe outro colaborador cadastrado com este e-mail.");
                return;
            }
        }

        if (collectionName === 'suppliers' && formData.fullName && formData.fullName.trim() !== '') {
            const isNameTaken = await isSupplierNameTaken(formData.fullName, person?.id);
            if (isNameTaken) {
                toast.error("Já existe um fornecedor cadastrado com este nome.");
                return;
            }
        }

        if (!person) { 
            const existing = await getPersonByIdentifiers({
                cpfCnpj: formData.cpfCnpj || "",
                email: formData.email || "",
                phone: formData.phone || ""
            }, collectionName);

            if (existing) {
                if (collectionName === 'suppliers') {
                    toast.error("Este fornecedor já está cadastrado.");
                    return;
                } else if (collectionName === 'customers') {
                    toast.warn("Aviso: Já existe um cliente cadastrado com este CPF/CNPJ, e-mail ou celular.");
                } else if (collectionName === 'employees') {
                    toast.error("Este funcionário já está cadastrado.");
                    return;
                }
            }
        }

        setLoading(true);
        try {
            const dataToSave = capitalizePerson({ ...formData, isDraft: false } as Person);
            if (dataToSave.position?.trim() === "") {
                dataToSave.position = null as any;
            }
            if (isEmployee) {
                if (!dataToSave.roles || dataToSave.roles.length === 0) {
                    dataToSave.roles = dataToSave.role ? [dataToSave.role] : ['seller'];
                }
                dataToSave.role = dataToSave.role || getPrimaryRole(dataToSave.roles);
            }

            const savedPerson = await savePerson(formData.type || collectionName, dataToSave);

            if (isEmployee) {
                try {
                    const userProfile = await getUserProfileByIdOrEmail(person?.id, dataToSave.email);
                    if (userProfile) {
                        await saveEmployeeInProfile(userProfile, dataToSave);
                    }
                } catch (profErr) {
                    console.warn("Aviso ao sincronizar profile do colaborador:", profErr);
                }
            }

            toast.success(person ? "Atualizado com sucesso!" : "Criado com sucesso!");
            if (onSuccess) onSuccess(savedPerson);
            onClose();
        } catch (error) {
            toast.error("Erro ao salvar.");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const routeUrl = formData.fullAddress?.mapsUrl || (
        formData.fullAddress?.street?.trim()
            ? getShippingRouteUrl(formData.fullAddress as any)
            : ""
    );

    return {
        formData,
        setFormData,
        loading,
        settings,
        isEmployee,
        isAddressOpen,
        setIsAddressOpen,
        routeUrl,
        toggleEmployeeRole,
        handleEmployeeEmailBlur,
        handleAddressChange,
        handleCepBlur,
        addAdditionalContact,
        removeAdditionalContact,
        updateAdditionalContact,
        handleSubmit
    };
};
