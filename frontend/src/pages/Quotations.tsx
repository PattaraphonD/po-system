import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { formatTHB, formatDate } from '../lib/utils';
import { StatusBadge, Spinner, EmptyState, Modal, Field, Page } from '../components/UI';
import { Plus, FileText, Search } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Quotations() {
  const navigate = useNavigate();
  const [quotations, setQuotations] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<any>({ supplier_id: '', quotation_no: '', quote_date: '', valid_days: 14, delivery_days: 45, contact_person: '', items: [] });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get('/api/quotations'),
      api.get('/api/suppliers'),
    ]).then(([qData, sData]) => {
      setQuotations(qData.quotations);
      setSuppliers(sData.suppliers.filter((s: any) => s.is_active));
      setLoading(false);
    });
  }, []);

  const filtered = quotations.filter(q =>
    q.quotation_no?.toLowerCase().includes(search.toLowerCase()) ||
    q.supplier_name?.toLowerCase().includes(search.toLowerCase())
  );

  const addItem = () => setForm((f: any) => ({
    ...f, items: [...f.items, { item_no: f.items.length + 1, description: '', quantity: 1, unit: 'EA', unit_price: 0, amount: 0 }]
  }));

  const updateItem = (idx: number, field: string, value: any) => {
    const items = [...form.items];
    items[idx] = { ...items[idx], [field]: value };
    if (field === 'quantity' || field === 'unit_price') {
      items[idx].amount = Number(items[idx].quantity) * Number(items[idx].unit_price);
    }
    setForm((f: any) => ({ ...f, items }));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.supplier_id || !form.quotation_no) return toast.error('Supplier and quotation number required');
    setSaving(true);
    try {
      await api.post('/api/quotations', form);
      toast.success('Quotation created');
      setShowCreate(false);
      const data = await api.get('/api/quotations');
      setQuotations(data.quotations);
      setForm({ supplier_id: '', quotation_no: '', quote_date: '', valid_days: 14, delivery_days: 45, contact_person: '', items: [] });
    } catch (err: any) {
      toast.error(err.message);
    } finally { setSaving(false); }
  };

  return (
    <Page title="Quotations" action={
      <button className="btn-primary" onClick={() => setShowCreate(true)}>
        <Plus size={16} /> New Quotation
      </button>
    }>
      {/* Search */}
      <div className="relative mb-4 w-72">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input className="input pl-9" placeholder="Search quotations…" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="card overflow-hidden">
        {loading ? <div className="p-8 flex justify-center"><Spinner /></div> :
          filtered.length === 0 ? <EmptyState icon={<FileText size={40} />} title="No quotations yet" action={<button className="btn-primary" onClick={() => setShowCreate(true)}><Plus size={16} />Add Quotation</button>} /> : (
          <table className="table-base">
            <thead><tr>
              <th>Quotation No.</th><th>Supplier</th><th>Date</th>
              <th>Contact</th><th className="text-right">Grand Total</th>
              <th>Delivery</th><th>Status</th><th></th>
            </tr></thead>
            <tbody>
              {filtered.map(q => (
                <tr key={q.id} className="cursor-pointer" onClick={() => navigate(`/quotations/${q.id}`)}>
                  <td className="font-mono text-blue-600 font-medium">{q.quotation_no}</td>
                  <td className="font-medium">{q.supplier_name}</td>
                  <td className="text-gray-500">{formatDate(q.quote_date)}</td>
                  <td className="text-gray-500 text-xs">{q.contact_person}</td>
                  <td className="text-right tabular-nums font-semibold">฿{formatTHB(q.grand_total)}</td>
                  <td className="text-gray-500 text-xs">{q.delivery_days} days</td>
                  <td><StatusBadge status={q.status} /></td>
                  <td>
                    <button className="btn-secondary btn-sm" onClick={e => { e.stopPropagation(); navigate(`/pos/new?quotation=${q.id}`); }}>
                      Create PO
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="New Quotation" size="xl">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Supplier" required>
              <select className="select" value={form.supplier_id} onChange={e => setForm((f: any) => ({ ...f, supplier_id: e.target.value }))} required>
                <option value="">Select supplier…</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </Field>
            <Field label="Quotation Number" required>
              <input className="input" value={form.quotation_no} onChange={e => setForm((f: any) => ({ ...f, quotation_no: e.target.value }))} placeholder="e.g. 26/007" required />
            </Field>
            <Field label="Quotation Date">
              <input className="input" type="date" value={form.quote_date} onChange={e => setForm((f: any) => ({ ...f, quote_date: e.target.value }))} />
            </Field>
            <Field label="Contact Person">
              <input className="input" value={form.contact_person} onChange={e => setForm((f: any) => ({ ...f, contact_person: e.target.value }))} placeholder="K. Waraporn M" />
            </Field>
            <Field label="Valid (days)">
              <input className="input" type="number" value={form.valid_days} onChange={e => setForm((f: any) => ({ ...f, valid_days: e.target.value }))} />
            </Field>
            <Field label="Delivery (days)">
              <input className="input" type="number" value={form.delivery_days} onChange={e => setForm((f: any) => ({ ...f, delivery_days: e.target.value }))} />
            </Field>
          </div>

          {/* Line items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="label mb-0">Line Items</label>
              <button type="button" className="btn-ghost btn-sm" onClick={addItem}><Plus size={14} />Add Row</button>
            </div>
            <div className="overflow-x-auto border border-gray-200 rounded-lg">
              <table className="table-base text-xs">
                <thead><tr>
                  <th>#</th><th>Description</th><th>Qty</th><th>Unit</th><th>Unit Price</th><th>Amount</th><th></th>
                </tr></thead>
                <tbody>
                  {form.items.map((item: any, idx: number) => (
                    <tr key={idx}>
                      <td className="text-gray-400">{idx + 1}</td>
                      <td><input className="input text-xs py-1" value={item.description} onChange={e => updateItem(idx, 'description', e.target.value)} placeholder="Item description" /></td>
                      <td><input className="input text-xs py-1 w-16" type="number" value={item.quantity} onChange={e => updateItem(idx, 'quantity', Number(e.target.value))} /></td>
                      <td><input className="input text-xs py-1 w-16" value={item.unit} onChange={e => updateItem(idx, 'unit', e.target.value)} /></td>
                      <td><input className="input text-xs py-1 w-24" type="number" value={item.unit_price} onChange={e => updateItem(idx, 'unit_price', Number(e.target.value))} /></td>
                      <td className="tabular-nums text-right font-medium">฿{formatTHB(item.amount)}</td>
                      <td><button type="button" className="text-red-400 hover:text-red-600 p-1" onClick={() => setForm((f: any) => ({ ...f, items: f.items.filter((_: any, i: number) => i !== idx) }))}>×</button></td>
                    </tr>
                  ))}
                  {form.items.length === 0 && <tr><td colSpan={7} className="text-center py-4 text-gray-400">No items — click Add Row</td></tr>}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Saving…' : 'Create Quotation'}
            </button>
          </div>
        </form>
      </Modal>
    </Page>
  );
}
