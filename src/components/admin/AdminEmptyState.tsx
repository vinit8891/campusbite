type Props = {
  title: string;
  description?: string;
  action?: React.ReactNode;
};

export default function AdminEmptyState({
  title,
  description,
  action,
}: Props) {
  return (
    <div className="rounded-2xl border border-dashed bg-white px-6 py-16 text-center">
      <p className="text-lg font-semibold text-gray-700">{title}</p>
      {description && (
        <p className="mt-2 text-sm text-gray-500">{description}</p>
      )}
      {action && <div className="mt-6 flex justify-center">{action}</div>}
    </div>
  );
}
