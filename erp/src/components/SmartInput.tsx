import React, { useState, useEffect, useRef, useMemo } from "react";
import { supabase } from '@/pages/utils/supabaseConfig';
import DropdownPortal from "./shared/DropdownPortal";

interface SmartInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    suggestions?: string[];
    tableName?: string;
    columnName?: string;
    patterns?: string[];
    onValueChange: (value: string) => void;
    icon?: string;
    error?: boolean;
    isSelected?: boolean;
    forceSelection?: boolean; // If true, requires selecting from list, else reverts
    disableSuggestions?: boolean;
}

const SmartInput: React.FC<SmartInputProps> = ({
    label,
    suggestions = [],
    patterns = [],
    tableName,
    columnName,
    value,
    onValueChange,
    icon,
    className,
    error,
    isSelected = false,
    forceSelection = false,
    disableSuggestions = false,
    ...props
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [dynamicSuggestions, setDynamicSuggestions] = useState<string[]>([]);
    const [activeIndex, setActiveIndex] = useState(-1);
    const [inputValue, setInputValue] = useState(value || "");
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setInputValue(value || "");
    }, [value]);

    // Fetch dynamic suggestions if table and column are provided
    useEffect(() => {
        if (disableSuggestions || !tableName || !columnName) return;

        const fetchRecent = async () => {
            try {
                const { data, error: fetchError } = await supabase
                    .from(tableName)
                    .select(columnName)
                    .not(columnName, 'is', null)
                    .order('created_at', { ascending: false })
                    .limit(30);

                if (fetchError) throw fetchError;

                if (data) {
                    const uniqueValues = Array.from(new Set(data.map((item: any) => String(item[columnName]))))
                        .filter((v: any) => typeof v === 'string' && v.trim() !== "");
                    setDynamicSuggestions(uniqueValues as string[]);
                }
            } catch (err) {
                console.error("Error fetching dynamic suggestions:", err);
            }
        };

        fetchRecent();
    }, [tableName, columnName, disableSuggestions]);

    const allSuggestions = useMemo(() => {
        if (disableSuggestions) return [];
        const combined = [...new Set([...patterns, ...suggestions, ...dynamicSuggestions])];
        return combined;
    }, [patterns, suggestions, dynamicSuggestions, disableSuggestions]);

    const filteredSuggestions = useMemo(() => {
        if (disableSuggestions) return [];
        const query = (String(inputValue || "")).toLowerCase().trim();
        if (!query) return allSuggestions.slice(0, 10); 

        const patternMatches = patterns.filter(s => s.toLowerCase().startsWith(query));
        const otherMatches = allSuggestions.filter(s => 
            s.toLowerCase().startsWith(query) && !patternMatches.includes(s)
        );
        const containsMatches = allSuggestions.filter(s => 
            s.toLowerCase().includes(query) && 
            !patternMatches.includes(s) && 
            !otherMatches.includes(s)
        );

        return [...patternMatches, ...otherMatches, ...containsMatches].slice(0, 30);
    }, [inputValue, allSuggestions, patterns, disableSuggestions]);

    const handleSelect = (suggestion: string) => {
        setInputValue(suggestion);
        onValueChange(suggestion);
        setIsOpen(false);
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                if (forceSelection) {
                    setInputValue(value || ""); // Revert only if forceSelection is true
                }
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [value, forceSelection]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (!isOpen || disableSuggestions) {
            if (e.key === "ArrowDown" && !disableSuggestions) setIsOpen(true);
            return;
        }

        if (e.key === "ArrowDown") {
            setActiveIndex((prev: number) => (prev < filteredSuggestions.length - 1 ? prev + 1 : prev));
        } else if (e.key === "ArrowUp") {
            setActiveIndex((prev: number) => (prev > 0 ? prev - 1 : -1));
        } else if (e.key === "Enter" && activeIndex >= 0) {
            e.preventDefault();
            handleSelect(filteredSuggestions[activeIndex]);
        } else if (e.key === "Escape") {
            setIsOpen(false);
            if (forceSelection) {
                setInputValue(value || "");
            }
        }
    };

    return (
        <div className="flex flex-col gap-2 relative w-full" ref={containerRef}>
            {label && (
                <label className={`text-[10px] font-black uppercase tracking-widest ${error ? 'text-red-500' : 'text-slate-400 dark:text-slate-500'}`}>
                    {label} {props.required && <span className="text-red-500">*</span>}
                </label>
            )}
            <div className="relative">
                {icon && (
                    <i className={`bi ${icon} absolute left-1 top-1/2 -translate-y-1/2 ${error ? 'text-red-500' : 'text-slate-400'}`} />
                )}
                <input
                    {...props}
                    value={inputValue}
                    onChange={(e) => {
                        const val = e.target.value;
                        setInputValue(val);
                        if (!forceSelection) {
                            onValueChange(val); // Update parent immediately for non-selection fields
                        }
                        if (!disableSuggestions) {
                            setIsOpen(true);
                        }
                        setActiveIndex(-1);
                    }}
                    onFocus={() => {
                        if (!disableSuggestions) setIsOpen(true);
                    }}
                    onKeyDown={handleKeyDown}
                    className={`w-full ${icon ? 'pl-7' : 'px-1'} py-2 bg-transparent outline-none transition-all text-sm font-bold dark:text-slate-100 rounded-none
                        ${error 
                          ? 'border-b-2 border-red-500' 
                          : isSelected 
                            ? 'border-b-2 border-blue-500'
                            : 'border-b-2 border-slate-200 dark:border-slate-700 focus:border-blue-600'} 
                        ${className}`}
                />

                {!disableSuggestions && (
                    <DropdownPortal anchorRef={containerRef} isOpen={isOpen && filteredSuggestions.length > 0}>
                        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                            <div className="p-2 flex flex-col gap-1 max-h-60 overflow-y-auto custom-scrollbar">
                                {filteredSuggestions.map((suggestion, index) => (
                                    <button
                                        key={index}
                                        type="button"
                                        onClick={() => handleSelect(suggestion)}
                                        onMouseEnter={() => setActiveIndex(index)}
                                        className={`flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-colors ${index === activeIndex ? 'bg-blue-600 text-white' : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'}`}
                                    >
                                        <i className={`bi ${index === activeIndex ? 'bi-check2' : 'bi-person'} text-sm opacity-50`} />
                                        <span className="text-sm font-bold">{suggestion}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </DropdownPortal>
                )}
            </div>
        </div>
    );
};

export default SmartInput;
