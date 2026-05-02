import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { formatTHB, formatDate } from '../lib/utils';
import { Spinner, Page } from '../components/UI';
import { Download } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, Legend
} from 'recharts';
import { STATUS_COLORS } from '../lib/utils';

export default function Reports() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [exportFrom, setExportFrom] = useState('');
  const [exportTo, setExportTo] = useState('');
  const [exportStatus, setExportStatus] = useState('');

  useEffect(() => {
    api.get('/api/reports/summary').then(d => { setData(d); setLoading(false); });
  }, []);

  const handleExport = () => {
    const qs = new URLSearchParams();
    if (exportFrom) qs.set('from', exportFrom);
    if (exportTo) qs.set('to', exportTo);
    if (exportStatus) qs.set('status', exportStatus);
    const apiBase = import.meta.env.VITE_API_URL || '';
    const token = localStorage.getItem('po_token');
    // Download via anchor
    const a = document.createElement('a');
    a.href = `${apiBase}/api/reports/export?${qs.toString()}`;
    // Add auth header via fetch + blob for authenticated download
    fetch(`${apiBase}/api/reports/export?${qs.toString()}`, {
      headers: { Authorization: `Bearer ${token}` }
    }).then(r => r.blob()).then(blob => {
      a.href = URL.createObjectURL(blob);
      a.download = `po-export-${new Date().toISOString().slice(0,10)}.csv`;
      a.click();
    });
  };

  if (loading) return <div className="p-8 flex justify-center"><Spinner size={32} /></div>;

  const s = data?.summary || {};
  const monthly = data?.monthly || [];
  const bySupplier = data?.by_supplier || [];
  const byStatus = data?.by_status || [];

  return (
    <Page title="Reports & Analytics">
      {/* Summary row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total POs', value: s.total_pos || 0 },
          { label: 'Total Spend', value: `฿${formatTHB(s.total_spend || 0)}` },
          { label: 'Approved Spend', value: `฿${formatTHB(s.approved_spend || 0)}` },
          { label: 'Pending Approval', value: s.pending_approval || 0 },
        ].map(({ label, value }) => (
          <div key={label} className="stat-card">
            <p className="text-2xl font-bold tabular-nums text-gray-900">{value}</p>
            <p className="text-xs text-gray-500 mt-1">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 mb-6">
        {/* Monthly spend line chart */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Monthly PO Count & Spend</h2>
          {monthly.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={monthly} margin={{ top: 0, right: 10, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="left" tick={{ fontSize: 11 }} tickFormatter={v => `฿${(v / 1000).toFixed(0)}k`} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: any, name: string) => name === 'total' ? [`฿${formatTHB(v)}`, 'Spend'] : [v, 'Count']} />
                <Legend />
                <Line yAxisId="left" type="monotone" dataKey="total" stroke="#3b82f6" strokeWidth={2} dot={false} name="Spend" />
                <Line yAxisId="right" type="monotone" dataKey="count" stroke="#10b981" strokeWidth={2} dot={false} name="Count" />
              </LineChart>
            </ResponsiveContainer>
          ) : <p className="text-sm text-gray-400 py-10 text-center">No data yet</p>}
        </div>

        {/* Status breakdown bar */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">POs by Status</h2>
          {byStatus.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={byStatus} layout="vertical" margin={{ left: 20 }}>
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="status" tick={{ fontSize: 11, textTransform: 'capitalize' }} width={80} />
                <Tooltip />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {byStatus.map((entry: any) => (
                    <rect key={entry.status} fill={STATUS_COLORS[entry.status] || '#9ca3af'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-sm text-gray-400 py-10 text-center">No data yet</p>}
        </div>
      </div>

      {/* Top suppliers */}
      {bySupplier.length > 0 && (
        <div className="card p-5 mb-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Spend by Supplier</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={bySupplier} margin={{ top: 0, right: 0, left: 0, bottom: 40 }}>
              <XAxis dataKey="supplier" tick={{ fontSize: 10 }} angle={-25} textAnchor="end" />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `฿${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: any) => [`฿${formatTHB(v)}`, 'Spend']} />
              <Bar dataKey="total_spend" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* CSV Export */}
      <div className="card p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Export to CSV</h2>
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="label">From Date</label>
            <input className="input w-40" type="date" value={exportFrom} onChange={e => setExportFrom(e.target.value)} />
          </div>
          <div>
            <label className="label">To Date</label>
            <input className="input w-40" type="date" value={exportTo} onChange={e => setExportTo(e.target.value)} />
          </div>
          <div>
            <label className="label">Status</label>
            <select className="select w-36" value={exportStatus} onChange={e => setExportStatus(e.target.value)}>
              <option value="">All</option>
              {['draft','submitted','in_review','approved','ordered','closed','rejected'].map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <button className="btn-primary" onClick={handleExport}>
            <Download size={16} />Download CSV
          </button>
        </div>
      </div>
    </Page>
  );
}
