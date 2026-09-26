import React from 'react';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({
  label,
  error,
  hint,
  required,
  className = '',
  id,
  rows = 3,
  ...props
}, ref) => {
  const textareaId = id || (label ? `textarea-${label.replace(/\s+/g, '-').toLowerCase()}` : undefined);

  return (
    <div className="w-full space-y-1.5 text-right">
      {label && (
        <label htmlFor={textareaId} className="block text-xs font-bold text-slate-300">
          {label} {required && <span className="text-rose-400">*</span>}
        </label>
      )}
      <textarea
        ref={ref}
        id={textareaId}
        rows={rows}
        className={`w-full rounded-xl bg-slate-900 border text-slate-100 placeholder:text-slate-500 text-xs sm:text-sm p-3 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50 disabled:bg-slate-950 resize-y ${
          error ? 'border-rose-500/80 focus:ring-rose-500' : 'border-slate-800 hover:border-slate-700'
        } ${className}`}
        {...props}
      />
      {error && <p className="text-[11px] font-semibold text-rose-400 mt-1">{error}</p>}
      {hint && !error && <p className="text-[11px] text-slate-400 mt-1">{hint}</p>}
    </div>
  );
});

Textarea.displayName = 'Textarea';
