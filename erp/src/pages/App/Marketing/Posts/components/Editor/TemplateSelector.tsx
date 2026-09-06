import React, { useState, useEffect } from 'react';
import { MarketingTemplate } from '../../types';
import { templateService } from '../../services/templateService';

interface TemplateSelectorProps {
  selectedTemplateId?: string | null;
  onSelectTemplate: (template: MarketingTemplate) => void;
}

export const TemplateSelector: React.FC<TemplateSelectorProps> = ({
  selectedTemplateId,
  onSelectTemplate
}) => {
  const [templates, setTemplates] = useState<MarketingTemplate[]>([]);

  useEffect(() => {
    templateService.getAll().then(items => setTemplates(items.filter(item => !item.name.startsWith('@element/'))));
  }, []);

  return (
    <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 p-2 rounded-xl">
      <i className="bi bi-layout-text-window-reverse text-indigo-400 text-base"></i>
      <span className="text-xs font-semibold text-slate-300">Template:</span>
      <select
        value={selectedTemplateId || ''}
        onChange={e => {
          const found = templates.find(t => t.id === e.target.value);
          if (found) onSelectTemplate(found);
        }}
        className="bg-slate-950 border border-slate-700 text-white text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-indigo-500 font-medium"
      >
        {templates.map(t => (
          <option key={t.id} value={t.id}>
            {t.name} ({t.aspectRatio})
          </option>
        ))}
      </select>
    </div>
  );
};
