import React from "react";
interface props {
    onClick: () => void;
    children: React.ReactNode
}

const ToggleValueTypeBtn = ({ onClick, children }: props) => {
    return (
        <span
            onClick={onClick}
            className="flex w-10 h-7 justify-center items-center bg-slate-100 dark:bg-slate-800 
                rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer
                text-[10px] font-black text-slate-400 dark:text-slate-500 active:scale-95"
        >
            {children}
        </span>
    )
}
export default ToggleValueTypeBtn;