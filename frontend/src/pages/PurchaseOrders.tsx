import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';
import { formatTHB, formatDate } from '../lib/utils';
import { StatusBadge, Spinner, EmptyState, Page } from '../components/UI';
import { Plus, ShoppingCart, Search, Filter } from 'lucide-react';

const STATUSES = ['', 'draft', 'submitted', 'in_review', 'approved', 'ordered', 'closed', 'rejected'];

export default function PurchaseOrders() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [pos, setPos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');

  const load = () => {
    setLoading(true);
    const qs = statusFilter ? `?status=${statusFilter}` : '';
    api.get(`/api/pos${qs}`).then(d => { setPos(d.pos); setLoading(false); });
  };

  useEffect(() => { load(); }, [statusFilter]);

  const filtered = pos.filter(p =>
    p.po_number?.toLowerCase().includes(search.toLowerCase()) ||
    p.supplier_name?.toLowerCase().includes(search.toLowerCase()) ||
    p.requested_by_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Page title="Purchase Orders" action={
      <button className="btn-primary" onClick={() => navigate('/pos/new')}>
        <Plus size={16} /> New PO
      </button>
    }>
      <div className="flex gap-3 mb-4 flex-wrap">
        <div className="relative w-72">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input pl-9" placeholder="Search POs…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="relative">
          <Filter size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <select className="select pl-9 w-44" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            {STATUSES.map(s => <option key={s} value={s}>{s ? s.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase()) : 'All Statuses'}</option>)}
          </select>
        </div>
      </div>

      <div className="card overflow-hidden">
        {loading ? <div className="p-8 flex justify-center"><Spinner /></div> :
          filtered.length === 0 ? (
            <EmptyState icon={<ShoppingCart size={40} />} title="No purchase orders"
              action={<button className="btn-primary" onClick={() => navigate('/pos/new')}><Plus size={16} />Create PO</button>} />
          ) : (
            <table className="table-base">
              <thead><tr>
                <th>PO Number</th><th>Supplier</th><th>Order Date</th>
                <th>Requested By</th><th className="text-right">Grand Total</th>
                <th>Delivery</th><th>Status</th><th></th>
              </tr></thead>
              <tbody>
                {filtered.map(po => (
                  <tr key={po.id} className="cursor-pointer" onClick={() => navigate(`/pos/${po.id}`)}>
                    <td className="font-mono text-blue-600 font-semibold">{po.po_number}</td>
                    <td className="font-medium max-w-[200px] truncate">{po.supplier_name}</td>
                    <td className="text-gray-500">{formatDate(po.order_date)}</td>
                    <td className="text-gray-500 text-xs">{po.requested_by_name}</td>
                    <td className="text-right tabular-nums font-semibold">฿{formatTHB(po.grand_total)}</td>
                    <td className="text-gray-500 text-xs">{formatDate(po.delivery_date)}</td>
                    <td><StatusBadge status={po.status} /></td>
                    <td>
                      <button className="btn-ghost btn-sm" onClick={e => { e.stopPropagation(); navigate(`/pos/${po.id}`); }}>
                        View →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        }
      </div>
    </Page>
  );
}
