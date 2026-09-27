import React from 'react';
import { Plus, Trash2, Link2 } from 'lucide-react';
import { Input } from './ui/Input';

interface DeliverableUrlsInputProps {
  urls: string[];
  onChange: (urls: string[]) => void;
  label?: string;
  hint?: string;
  disabled?: boolean;
}

export const DeliverableUrlsInput: React.FC<DeliverableUrlsInputProps> = ({
  urls,
  onChange,
  label = 'روابط ملفات المخرجات والتسليم (Deliverables):',
  hint = 'يمكنك إضافة أكثر من رابط (مثل مجلد Google Drive، ملف Figma، أو رابط تجريبي مباشر)',
  disabled = false,
}) => {
  // Ensure we have at least one entry
  const currentUrls = urls.length > 0 ? urls : [''];

  const handleItemChange = (index: number, value: string) => {
    const updated = [...currentUrls];
    updated[index] = value;
    onChange(updated);
  };

  const handleAddRow = () => {
    onChange([...currentUrls, '']);
  };

  const handleRemoveRow = (index: number) => {
    const updated = currentUrls.filter((_, idx) => idx !== index);
    onChange(updated.length > 0 ? updated : ['']);
  };

  return (
    <div className="space-y-2 text-right">
      <div className="flex items-center justify-between gap-2">
        <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
          <Link2 className="w-3.5 h-3.5 text-indigo-400" />
          <span>{label}</span>
          <span className="text-[11px] text-indigo-400 font-semibold bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">
            {currentUrls.length} {currentUrls.length === 1 ? 'رابط' : 'روابط'}
          </span>
        </label>

        <button
          type="button"
          onClick={handleAddRow}
          disabled={disabled}
          className="text-xs text-indigo-300 hover:text-white bg-indigo-600/20 hover:bg-indigo-600/40 px-2.5 py-1 rounded-lg border border-indigo-500/30 flex items-center gap-1 font-bold transition-all cursor-pointer shadow-sm active:scale-95 disabled:opacity-50"
        >
          <Plus className="w-3.5 h-3.5 text-indigo-300" />
          <span>إضافة رابط آخر</span>
        </button>
      </div>

      <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
        {currentUrls.map((url, idx) => (
          <div key={idx} className="flex items-center gap-2 group">
            <span className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 text-xs font-bold flex items-center justify-center shrink-0">
              {idx + 1}
            </span>
            <div className="flex-1">
              <Input
                type="text"
                dir="ltr"
                value={url}
                disabled={disabled}
                onChange={(e) => handleItemChange(idx, e.target.value)}
                placeholder={
                  idx === 0
                    ? 'https://drive.google.com/... أو https://figma.com/file/...'
                    : `رابط إضافي رقم ${idx + 1}...`
                }
                className="w-full text-xs font-mono"
              />
            </div>
            {currentUrls.length > 1 && (
              <button
                type="button"
                onClick={() => handleRemoveRow(idx)}
                disabled={disabled}
                className="w-8 h-8 rounded-lg bg-rose-500/10 hover:bg-rose-500/25 text-rose-400 border border-rose-500/30 flex items-center justify-center transition-colors cursor-pointer shrink-0"
                title="حذف هذا الرابط"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ))}
      </div>

      {hint && (
        <p className="text-[11px] text-slate-400 leading-normal">
          {hint}
        </p>
      )}
    </div>
  );
};
