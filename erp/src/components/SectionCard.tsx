import React from "react";

interface SectionCardProps {
    icon: string;
    iconBg: string;
    title: string;
    subtitle?: string;
    action?: React.ReactNode;
    children: React.ReactNode;
    className?: string;
    compactHeader?: boolean;
}

const SectionCard = ({ icon, iconBg, title, subtitle, action, children, className = "", compactHeader }: SectionCardProps) => (
    <section className={`bg-white dark:bg-slate-900 rounded-[2.5rem] ${compactHeader ? 'p-4 sm:p-5' : 'p-5 sm:p-7'} border border-slate-100 dark:border-slate-800 shadow-premium hover:shadow-premium-lg transition-all duration-500 hover:border-blue-500/20 group ${className}`}>
        <div className={`flex items-center justify-between gap-3 ${compactHeader ? 'mb-3 sm:mb-4' : 'mb-5'}`}>
            <div className="flex items-center gap-2.5 sm:gap-3">
                <div className={`${compactHeader ? 'w-7 h-7 sm:w-8 sm:h-8 rounded-xl' : 'w-10 h-10 sm:w-11 sm:h-11 rounded-[1rem]'} ${iconBg} flex items-center justify-center shadow-md group-hover:scale-105 transition-transform duration-500 shrink-0`}>
                    <i className={`${icon} text-white ${compactHeader ? 'text-xs sm:text-sm' : 'text-lg sm:text-xl'}`} />
                </div>
                <div>
                    <h3 className={`${compactHeader ? 'text-sm sm:text-base font-black uppercase tracking-wider' : 'text-xl sm:text-2xl font-black'} text-slate-900 dark:text-slate-100 tracking-tight leading-tight`}>{title}</h3>
                    {subtitle && (
                        <p className="text-[10px] uppercase font-black text-slate-400 dark:text-slate-500 tracking-[0.2em] mt-0.5">{subtitle}</p>
                    )}
                </div>
            </div>
            {action && (
                <div className="flex items-center shrink-0">
                    {action}
                </div>
            )}
        </div>
        <div className="animate-reveal">
            {children}
        </div>
    </section>
);

export default SectionCard;
