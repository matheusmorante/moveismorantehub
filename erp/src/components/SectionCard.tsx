import React from "react";

interface SectionCardProps {
    icon: string;
    iconBg: string;
    title: string;
    subtitle?: string;
    children: React.ReactNode;
    className?: string;
}

const SectionCard = ({ icon, iconBg, title, subtitle, children, className = "" }: SectionCardProps) => (
    <section className={`bg-white dark:bg-slate-900 rounded-[3rem] p-6 md:p-10 border border-slate-100 dark:border-slate-800 shadow-premium hover:shadow-premium-lg transition-all duration-500 hover:border-blue-500/20 group ${className}`}>
        <div className="flex items-center gap-5 mb-8">
            <div className={`w-14 h-14 ${iconBg} rounded-[1.25rem] flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-500`}>
                <i className={`${icon} text-white text-2xl`} />
            </div>
            <div>
                <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight leading-tight">{title}</h3>
                {subtitle && (
                    <p className="text-[10px] uppercase font-black text-slate-400 dark:text-slate-500 tracking-[0.2em] mt-1">{subtitle}</p>
                )}
            </div>
        </div>
        <div className="animate-reveal">
            {children}
        </div>
    </section>
);

export default SectionCard;
