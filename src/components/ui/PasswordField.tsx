'use client';

import React, { useState, useId } from 'react';
import { Eye, EyeOff } from 'lucide-react';

export interface PasswordFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const PasswordField = React.forwardRef<HTMLInputElement, PasswordFieldProps>(
  ({ label, error, className = '', id, ...props }, ref) => {
    const [show, setShow] = useState(false);
    const generatedId = useId();
    const inputId = id || (label ? generatedId : undefined);

    return (
      <div className="w-full space-y-1">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-semibold uppercase tracking-wider text-zinc-700"
          >
            {label}
          </label>
        )}
        <div className="relative">
          <input
            {...props}
            id={inputId}
            ref={ref}
            type={show ? 'text' : 'password'}
            className={`w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 pr-10 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20 transition-all ${className}`}
          />
          <button
            type="button"
            onClick={() => setShow(!show)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors focus:outline-none cursor-pointer"
            tabIndex={-1}
            aria-label={show ? 'Hide password' : 'Show password'}
          >
            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {error && <p className="text-xs text-red-500" role="alert">{error}</p>}
      </div>
    );
  }
);

PasswordField.displayName = 'PasswordField';

export default PasswordField;
