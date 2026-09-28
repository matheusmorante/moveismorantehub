import React, { useState, KeyboardEvent, FocusEvent } from 'react';

interface TagInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  label?: string;
}

const TagInput = ({
  value,
  onChange,
  placeholder = 'Adicionar...',
  className = '',
  label,
}: TagInputProps) => {
  const [inputValue, setInputValue] = useState('');

  // Split string into array of tags
  const tags = value ? value.split(';').filter((t) => t.trim() !== '') : [];

  const addTag = (tag: string) => {
    const trimmedTag = tag.trim();
    if (trimmedTag && !tags.includes(trimmedTag)) {
      const newTags = [...tags, trimmedTag];
      onChange(newTags.join(';'));
    }
    setInputValue('');
  };

  const removeTag = (indexToRemove: number) => {
    const newTags = tags.filter((_, index) => index !== indexToRemove);
    onChange(newTags.join(';'));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag(inputValue);
    } else if (e.key === ',' || e.key === ';') {
      e.preventDefault();
      addTag(inputValue);
    } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      removeTag(tags.length - 1);
    }
  };

  const handleBlur = (e: FocusEvent<HTMLInputElement>) => {
    addTag(inputValue);
  };

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {label && (
        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 ml-1">
          {label}
        </label>
      )}
      <div className="flex flex-wrap gap-2 p-3 bg-slate-50/50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-3xl min-h-[100px] items-start transition-all focus-within:border-blue-500/50 focus-within:ring-4 focus-within:ring-blue-500/5">
        {tags.map((tag, index) => (
          <span
            key={index}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold border border-slate-100 dark:border-slate-700 shadow-sm animate-in fade-in zoom-in-95 duration-200"
          >
            {tag}
            <button
              type="button"
              onClick={() => removeTag(index)}
              className="text-slate-400 hover:text-red-500 transition-colors"
            >
              <i className="bi bi-x-circle-fill" />
            </button>
          </span>
        ))}
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          placeholder={tags.length === 0 ? placeholder : ''}
          className="flex-1 min-w-[120px] bg-transparent outline-none text-sm py-1 placeholder:text-slate-300 dark:placeholder:text-slate-700 dark:text-slate-300 font-medium"
        />
      </div>
    </div>
  );
};

export default TagInput;
