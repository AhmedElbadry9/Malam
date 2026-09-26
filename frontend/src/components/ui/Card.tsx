import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
  active?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  interactive = false,
  active = false,
  className = '',
  ...props
}) => {
  return (
    <div
      className={`rounded-2xl bg-[#0f172a]/70 border border-slate-800/80 shadow-md transition-all duration-150 ${
        interactive
          ? 'hover:border-slate-700 hover:bg-[#131d35] cursor-pointer'
          : ''
      } ${
        active
          ? 'border-indigo-500/50 bg-[#131d35] shadow-indigo-500/10'
          : ''
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className = '',
  ...props
}) => (
  <div className={`p-4 sm:p-5 border-b border-slate-800/60 ${className}`} {...props}>
    {children}
  </div>
);

export const CardBody: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className = '',
  ...props
}) => (
  <div className={`p-4 sm:p-5 ${className}`} {...props}>
    {children}
  </div>
);

export const CardFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className = '',
  ...props
}) => (
  <div className={`p-4 sm:p-5 border-t border-slate-800/60 bg-slate-950/30 rounded-b-2xl ${className}`} {...props}>
    {children}
  </div>
);
