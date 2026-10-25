import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'raised' | 'interactive';
  header?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({
  variant = 'default',
  header,
  action,
  children,
  className,
  ...props
}) => {
  const baseClasses = 'p-5 transition-all duration-200';
  const variantClasses = {
    default: 'glass-panel',
    raised: 'glass-panel-raised shadow-glow',
    interactive: 'glass-panel hover:border-accent-cyan/40 hover:shadow-glow cursor-pointer',
  };

  return (
    <div
      className={twMerge(clsx(baseClasses, variantClasses[variant], className))}
      {...props}
    >
      {(header || action) && (
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-border-subtle">
          <div className="font-heading font-semibold text-sm tracking-wide text-slate-200">
            {header}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      <div>{children}</div>
    </div>
  );
};
