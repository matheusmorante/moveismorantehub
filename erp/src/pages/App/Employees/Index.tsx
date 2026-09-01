import PersonPage from "../Registrations/shared/PersonPage";

const Employees = () => (
    <PersonPage
        title="Colaboradores"
        subtitle="Gerencie sua equipe e colaboradores"
        newLabel="Novo Colaborador"
        newIcon="bi bi-person-badge-fill"
        collectionName="employees"
        storageKey="employees_table"
    />
);

export default Employees;
