import { ReactNode } from 'react';
import { cn, statusLabel } from '../lib/utils';
import { Loader2 } from 'lucide-react';

// ─── Status Badge ─────────────────────────────────────────────
export function StatusBadge({ status }: { status: string }) {
  return <span className={cn('badge', `badge-${status}`)}>{statusLabel(status)}</span>;
}

// ─── Loading Spinner ──────────────────────────────────────────
export function Spinner({ size = 20 }: { size?: number }) {
  return <Loader2 size={size} className="animate-spin text-blue-600" />;
}

// ─── Empty State ──────────────────────────────────────────────
export function EmptyState({ icon, title, description, action }: {
  icon?: ReactNode; title: string; description?: string; action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {icon && <div className="text-gray-300 mb-4">{icon}</div>}
      <p className="font-medium text-gray-700">{title}</p>
      {description && <p className="text-sm text-gray-500 mt-1">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

// ─── Modal ────────────────────────────────────────────────────
export function Modal({ open, onClose, title, children, size = 'md' }: {
  open: boolean; onClose: () => void; title: string; children: ReactNode; size?: 'sm' | 'md' | 'lg' | 'xl';
}) {
  if (!open) return null;
  const widths = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-2xl', xl: 'max-w-4xl' };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className={cn('relative bg-white rounded-2xl shadow-2xl w-full', widths[size], 'max-h-[90vh] flex flex-col')}>
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>
        <div className="overflow-y-auto flex-1 p-5">{children}</div>
      </div>
    </div>
  );
}

// ─── Confirm Dialog ───────────────────────────────────────────
export function ConfirmDialog({ open, onClose, onConfirm, title, message, danger = false }: {
  open: boolean; onClose: () => void; onConfirm: () => void;
  title: string; message: string; danger?: boolean;
}) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      <p className="text-sm text-gray-600 mb-5">{message}</p>
      <div className="flex gap-3 justify-end">
        <button className="btn-secondary" onClick={onClose}>Cancel</button>
        <button className={danger ? 'btn-danger' : 'btn-primary'} onClick={onConfirm}>Confirm</button>
      </div>
    </Modal>
  );
}

// ─── Form Field ───────────────────────────────────────────────
export function Field({ label, required, children, error }: {
  label: string; required?: boolean; children: ReactNode; error?: string;
}) {
  return (
    <div>
      <label className="label">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}

// ─── Page Wrapper ─────────────────────────────────────────────
export function Page({ title, action, children }: {
  title: string; action?: ReactNode; children: ReactNode;
}) {
  return (
    <div className="p-6 max-w-screen-xl mx-auto">
      <div className="page-header">
        <h1 className="page-title">{title}</h1>
        {action && <div>{action}</div>}
      </div>
      {children}
    </div>
  );
}

// ─── Line Item Table (reusable) ───────────────────────────────
export function LineItemsTable({ items }: { items: any[] }) {
  const { formatTHB } = require('../lib/utils');
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="table-base">
        <thead>
          <tr>
            <th>#</th><th>Description</th>
            <th className="text-right">Qty</th><th>Unit</th>
            <th className="text-right">Unit Price</th><th className="text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <tr key={item.id || i}>
              <td className="text-gray-400 text-xs">{item.item_no || i + 1}</td>
              <td className="font-medium">{item.description}</td>
              <td className="text-right tabular-nums">{item.quantity}</td>
              <td className="text-gray-500 text-xs">{item.unit}</td>
              <td className="text-right tabular-nums">฿{formatTHB(item.unit_price)}</td>
              <td className="text-right tabular-nums font-medium">฿{formatTHB(item.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
