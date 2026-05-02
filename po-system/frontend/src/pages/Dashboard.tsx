import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { formatTHB } from '../lib/utils';
import { Spinner } from '../components/UI';
import { ShoppingCart, CheckCircle, Clock, XCircle, TrendingUp, FileText } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { STATUS_COLORS } from '../lib/utils';

export default function Dashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/reports/summary').then(d => { setData(d); setLoading(false); });
  }, []);

  if (loading) return <div className="p-8 flex justify-center"><Spinner size={32} /></div>;

  const s = data?.summary || {};
  const monthly = data?.monthly || [];
  const byStatus = (data?.by_status || []).filter((x: any) => x.count > 0);
  const bySupplier = data?.by_supplier || [];

  const statCards = [
    { label: 'Total POs', value: s.total_pos || 0, icon: ShoppingCart, color: 'blue' },
    { label: 'Total Spend', value: `฿${formatTHB(s.total_spend || 0)}`, icon: TrendingUp, color: 'green' },
    { label: 'Pending Approval', value: s.pending_approval || 0, icon: Clock, color: 'amber' },
    { label: 'Approved', value: s.approved || 0, icon: CheckCircle, color: 'emerald' },
    { label: 'Drafts', value: s.drafts || 0, icon: FileText, color: 'gray' },
    { label: 'Rejected', value: s.rejected || 0, icon: XCircle, color: 'red' },
  ];

  const colorMap: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600', green: 'bg-green-50 text-green-600',
    amber: 'bg-amber-50 text-amber-600', emerald: 'bg-emerald-50 text-emerald-600',
    gray: 'bg-gray-100 text-gray-600', red: 'bg-red-50 text-red-600',
  };

  return (
    <div className="p-6 max-w-screen-xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">Purchase Order overview and analytics</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
        {statCards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="stat-card">
            <div className={`w-9 h-9 rounded-lg ${colorMap[color]} flex items-center justify-center mb-3`}>
              <Icon size={18} />
            </div>
            <p className="text-xl font-semibold text-gray-900 tabular-nums">{value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Monthly trend */}
        <div className="card p-5 xl:col-span-2">
          <h2 className="text-sm font-medium text-gray-700 mb-4">Monthly PO Spend (฿)</h2>
          {monthly.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={monthly} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `฿${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: any) => [`฿${formatTHB(v)}`, 'Spend']} />
                <Bar dataKey="total" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-52 flex items-center justify-center text-sm text-gray-400">No data yet</div>
          )}
        </div>

        {/* Status breakdown */}
        <div className="card p-5">
          <h2 className="text-sm font-medium text-gray-700 mb-4">Status Breakdown</h2>
          {byStatus.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={byStatus} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={80}>
                  {byStatus.map((entry: any) => (
                    <Cell key={entry.status} fill={STATUS_COLORS[entry.status] || '#9ca3af'} />
                  ))}
                </Pie>
                <Legend formatter={(v) => <span style={{ fontSize: 11, textTransform: 'capitalize' }}>{v}</span>} />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-52 flex items-center justify-center text-sm text-gray-400">No data yet</div>
          )}
        </div>

        {/* Top suppliers */}
        {bySupplier.length > 0 && (
          <div className="card p-5 xl:col-span-3">
            <h2 className="text-sm font-medium text-gray-700 mb-4">Top Suppliers by Spend</h2>
            <div className="space-y-3">
              {bySupplier.map((s: any) => {
                const maxSpend = bySupplier[0].total_spend;
                const pct = (s.total_spend / maxSpend) * 100;
                return (
                  <div key={s.supplier} className="flex items-center gap-3">
                    <span className="text-sm text-gray-700 w-64 truncate">{s.supplier}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-2">
                      <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-sm font-medium tabular-nums w-32 text-right">฿{formatTHB(s.total_spend)}</span>
                    <span className="text-xs text-gray-400 w-12 text-right">{s.po_count} POs</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
