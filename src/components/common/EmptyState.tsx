import React from "react";
import Link from "next/link";

export type EmptyStateProps = {
  icon?: React.ReactNode | string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  className?: string;
};

export function EmptyState({
  icon,
  title,
  description,
  action,
  actionLabel,
  actionHref,
  onAction,
  className = "",
}: EmptyStateProps) {
  return (
    <div
      className={`rounded-2xl border border-gray-100 bg-white p-10 text-center shadow-sm ${className}`}
    >
      {icon && (
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-orange-50 text-4xl">
          {icon}
        </div>
      )}

      <h2 className="mt-4 text-xl font-bold text-gray-900 sm:text-2xl">
        {title}
      </h2>

      {description && (
        <p className="mx-auto mt-2 max-w-md text-sm text-gray-500">
          {description}
        </p>
      )}

      {action ? (
        <div className="mt-6">{action}</div>
      ) : actionHref && actionLabel ? (
        <Link
          href={actionHref}
          className="mt-6 inline-flex rounded-xl bg-orange-500 px-6 py-3 font-semibold text-white transition hover:bg-orange-600"
        >
          {actionLabel}
        </Link>
      ) : onAction && actionLabel ? (
        <button
          onClick={onAction}
          className="mt-5 rounded-xl border border-gray-200 px-5 py-2 text-sm font-semibold text-gray-700 transition hover:border-orange-300 hover:text-orange-600"
        >
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}
