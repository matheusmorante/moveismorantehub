import React from "react";
import { createPortal } from "react-dom";
import Person from "../../../types/person.type";
import {
    usePersonForm,
    PersonIdentificationSection,
    PersonEmployeeRolesSection,
    PersonContactsSection,
    PersonAddressSection,
    PersonObservationsSection
} from "./personForm";

export interface PersonFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: (person: Person) => void;
    person?: Person | null;
    collectionName: string;
    title: string;
}

const PersonFormModal: React.FC<PersonFormModalProps> = ({
    isOpen,
    onClose,
    onSuccess,
    person,
    collectionName,
    title
}) => {
    const {
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
    } = usePersonForm({
        isOpen,
        onClose,
        onSuccess,
        person,
        collectionName,
        title
    });

    if (!isOpen) return null;

    const modalTitle = person
        ? (title.startsWith("Editar") ? title : `Editar ${title}`)
        : (title.startsWith("Novo") ? title : `Novo ${title}`);

    const modalContent = (
        <div className="fixed inset-0 z-[9999999] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-slide-up border border-slate-100 dark:border-slate-800">
                <div className="p-8 border-b border-slate-50 dark:border-slate-800 flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">
                            {modalTitle}
                        </h2>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-red-500 transition-colors ml-auto">
                        <i className="bi bi-x-lg"></i>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 flex flex-col gap-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <PersonIdentificationSection
                            formData={formData}
                            setFormData={setFormData}
                            isEmployee={isEmployee}
                            collectionName={collectionName}
                            settings={settings}
                        />

                        {isEmployee && (
                            <PersonEmployeeRolesSection
                                formData={formData}
                                setFormData={setFormData}
                                toggleEmployeeRole={toggleEmployeeRole}
                                settings={settings}
                            />
                        )}

                        <PersonContactsSection
                            formData={formData}
                            setFormData={setFormData}
                            isEmployee={isEmployee}
                            person={person}
                            collectionName={collectionName}
                            settings={settings}
                            handleEmployeeEmailBlur={handleEmployeeEmailBlur}
                            addAdditionalContact={addAdditionalContact}
                            removeAdditionalContact={removeAdditionalContact}
                            updateAdditionalContact={updateAdditionalContact}
                        />
                    </div>

                    <PersonAddressSection
                        formData={formData}
                        setFormData={setFormData}
                        isEmployee={isEmployee}
                        collectionName={collectionName}
                        isAddressOpen={isAddressOpen}
                        setIsAddressOpen={setIsAddressOpen}
                        routeUrl={routeUrl}
                        handleAddressChange={handleAddressChange}
                        handleCepBlur={handleCepBlur}
                    />

                    <PersonObservationsSection
                        formData={formData}
                        setFormData={setFormData}
                        collectionName={collectionName}
                    />
                </form>

                <div className="p-8 border-t border-slate-50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-all active:scale-95"
                    >
                        Cancelar
                    </button>
                    {collectionName === 'employees' && !person && (
                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={loading}
                            className="px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-emerald-500/20"
                        >
                            {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <i className="bi bi-check-all text-lg" />}
                            Salvar e Selecionar
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={loading}
                        className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
                    >
                        {loading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                        {person ? "Salvar Alterações" : `Criar ${title}`}
                    </button>
                </div>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
};

export default PersonFormModal;
