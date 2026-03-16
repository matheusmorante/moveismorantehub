import React from "react";
import { createPortal } from "react-dom";
import Variations from "../../Variations/Index";

interface AttributeManagementModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const AttributeManagementModal: React.FC<AttributeManagementModalProps> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[10002] flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md" onClick={onClose} />
            <div className="relative bg-white dark:bg-slate-900 w-full max-w-6xl h-[90vh] rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500 border border-slate-100 dark:border-slate-800">
                <div className="absolute top-6 right-8 z-[10003]">
                    <button 
                        onClick={onClose} 
                        className="w-12 h-12 flex items-center justify-center bg-white dark:bg-slate-800 text-slate-400 hover:text-red-500 transition-colors rounded-2xl shadow-lg border border-slate-100 dark:border-slate-700"
                    >
                        <i className="bi bi-x-lg text-xl"></i>
                    </button>
                </div>
                
                <div className="flex-1 overflow-hidden">
                    <Variations />
                </div>
            </div>
        </div>
    , document.body);
};

export default AttributeManagementModal;
