import React from 'react';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(({
  label,
  error,
  hint,
  required,
  children,
  className = '',
  id,
  ...props
}, ref) => {
  const selectId = id || (label ? `select-${label.replace(/\s+/g, '-').toLowerCase()}` : undefined);

  return (
    <div className="w-full space-y-1.5 text-right">
      {label && (
        <label htmlFor={selectId} className="block text-xs font-bold text-slate-300">
          {label} {required && <span className="text-rose-400">*</span>}
        </label>
      )}
      <select
        ref={ref}
        id={selectId}
        className={`w-full rounded-xl bg-slate-900 border text-slate-100 text-xs sm:text-sm px-3.5 py-2.5 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50 disabled:bg-slate-950 cursor-pointer ${
          error ? 'border-rose-500/80 focus:ring-rose-500' : 'border-slate-800 hover:border-slate-700'
        } ${className}`}
        {...props}
      >
        {children}
      </select>
      {error && <p className="text-[11px] font-semibold text-rose-400 mt-1">{error}</p>}
      {hint && !error && <p className="text-[11px] text-slate-400 mt-1">{hint}</p>}
    </div>
  );
});

Select.displayName = 'Select';
