export function formatTHB(n: number) {
  return new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

export function formatDate(d?: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function statusLabel(s: string) {
  const map: Record<string, string> = {
    draft: 'Draft', submitted: 'Submitted', in_review: 'In Review',
    approved: 'Approved', ordered: 'Ordered', closed: 'Closed',
    rejected: 'Rejected', pending: 'Pending', converted: 'Converted',
  };
  return map[s] || s;
}

export function cn(...classes: (string | undefined | false)[]) {
  return classes.filter(Boolean).join(' ');
}

export const STATUS_COLORS: Record<string, string> = {
  draft: '#6b7280', submitted: '#3b82f6', in_review: '#f59e0b',
  approved: '#10b981', ordered: '#6366f1', closed: '#64748b',
  rejected: '#ef4444', pending: '#f59e0b', converted: '#14b8a6',
};
