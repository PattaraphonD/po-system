import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';
import { formatTHB } from '../lib/utils';
import { Field, Page, Spinner } from '../components/UI';
import { Plus, Trash2, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';

export default function NewPO() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const quotationId = searchParams.get('quotation');

  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [quotations, setQuotations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState<any>({
    supplier_id: '', quotation_id: quotationId || '',
    delivery_date: '', shipping_address: '', notes: '',
    items: [],
  });

  useEffect(() => {
    Promise.all([
      api.get('/api/suppliers'),
      api.get('/api/quotations?status=pending'),
    ]).then(([sData, qData]) => {
      setSuppliers(sData.suppliers.filter((s: any) => s.is_active));
      setQuotations(qData.quotations);
      setLoading(false);
    });
  }, []);

  // Auto-populate from quotation
  useEffect(() => {
    if (!form.quotation_id) return;
    api.get(`/api/quotations/${form.quotation_id}`).then(d => {
      const q = d.quotation;
      setForm((f: any) => ({
        ...f,
        supplier_id: q.supplier_id,
        items: (q.items || []).map((i: any) => ({ ...i, po_id: undefined, id: undefined })),
      }));
    });
  }, [form.quotation_id]);

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const addItem = () => set('items', [...form.items, {
    item_no: form.items.length + 1, description: '', quantity: 1, unit: 'EA', unit_price: 0, amount: 0,
  }]);

  const updateItem = (idx: number, field: string, value: any) => {
    const items = [...form.items];
    items[idx] = { ...items[idx], [field]: value };
    if (field === 'quantity' || field === 'unit_price') {
      items[idx].amount = Number(items[idx].quantity) * Number(items[idx].unit_price);
    }
    set('items', items);
  };

  const removeItem = (idx: number) => set('items', form.items.filter((_: any, i: number) => i !== idx));

  const subtotal = form.items.reduce((s: number, i: any) => s + Number(i.amount), 0);
  const vat = Math.round(subtotal * 7) / 100;
  const grandTotal = subtotal + vat;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.supplier_id) return toast.error('Select a supplier');
    if (form.items.length === 0) return toast.error('Add at least one item');
    setSaving(true);
    try {
      const data = await api.post('/api/pos', form);
      toast.success(`PO ${data.po.po_number} created`);
      navigate(`/pos/${data.po.id}`);
    } catch (err: any) {
      toast.error(err.message);
    } finally { setSaving(false); }
  };

  if (loading) return <div className="p-8 flex justify-center"><Spinner size={32} /></div>;

  return (
    <Page title="New Purchase Order" action={
      <button className="btn-secondary" onClick={() => navigate(-1)}><ArrowLeft size={16} />Back</button>
    }>
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Left col */}
          <div className="xl:col-span-2 space-y-5">
            {/* Reference quotation */}
            <div className="card p-5">
              <h2 className="text-sm font-semibold text-gray-700 mb-4">Reference Quotation (optional)</h2>
              <Field label="Import from Quotation">
                <select className="select" value={form.quotation_id} onChange={e => set('quotation_id', e.target.value)}>
                  <option value="">— None, enter items manually —</option>
                  {quotations.map(q => (
                    <option key={q.id} value={q.id}>{q.quotation_no} — {q.supplier_name} (฿{formatTHB(q.grand_total)})</option>
                  ))}
                </select>
              </Field>
            </div>

            {/* Supplier & delivery */}
            <div className="card p-5">
              <h2 className="text-sm font-semibold text-gray-700 mb-4">Order Details</h2>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Supplier" required>
                  <select className="select" value={form.supplier_id} onChange={e => set('supplier_id', e.target.value)} required>
                    <option value="">Select supplier…</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </Field>
                <Field label="Expected Delivery Date">
                  <input className="input" type="date" value={form.delivery_date} onChange={e => set('delivery_date', e.target.value)} />
                </Field>
                <div className="col-span-2">
                  <Field label="Shipping Address">
                    <textarea className="textarea" rows={2} value={form.shipping_address} onChange={e => set('shipping_address', e.target.value)} placeholder="Delivery address…" />
                  </Field>
                </div>
                <div className="col-span-2">
                  <Field label="Notes">
                    <textarea className="textarea" rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Additional notes…" />
                  </Field>
                </div>
              </div>
            </div>

            {/* Line items */}
            <div className="card p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-gray-700">Line Items</h2>
                <button type="button" className="btn-secondary btn-sm" onClick={addItem}><Plus size={14} />Add Row</button>
              </div>
              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="table-base text-xs">
                  <thead><tr>
                    <th className="w-8">#</th>
                    <th>Description</th>
                    <th className="w-20">Qty</th>
                    <th className="w-16">Unit</th>
                    <th className="w-28">Unit Price (฿)</th>
                    <th className="w-28 text-right">Amount (฿)</th>
                    <th className="w-8"></th>
                  </tr></thead>
                  <tbody>
                    {form.items.map((item: any, idx: number) => (
                      <tr key={idx}>
                        <td className="text-gray-400">{idx + 1}</td>
                        <td>
                          <input className="input text-xs py-1" value={item.description}
                            onChange={e => updateItem(idx, 'description', e.target.value)}
                            placeholder="Item description" required />
                        </td>
                        <td>
                          <input className="input text-xs py-1" type="number" min="1" value={item.quantity}
                            onChange={e => updateItem(idx, 'quantity', Number(e.target.value))} />
                        </td>
                        <td>
                          <input className="input text-xs py-1" value={item.unit}
                            onChange={e => updateItem(idx, 'unit', e.target.value)} />
                        </td>
                        <td>
                          <input className="input text-xs py-1" type="number" min="0" step="0.01" value={item.unit_price}
                            onChange={e => updateItem(idx, 'unit_price', Number(e.target.value))} />
                        </td>
                        <td className="text-right tabular-nums font-semibold pr-3">฿{formatTHB(item.amount)}</td>
                        <td>
                          <button type="button" onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-600 p-1">
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {form.items.length === 0 && (
                      <tr><td colSpan={7} className="text-center py-6 text-gray-400 text-sm">
                        No items — click Add Row or select a quotation above
                      </td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Right col — summary */}
          <div className="space-y-4">
            <div className="card p-5 sticky top-6">
              <h2 className="text-sm font-semibold text-gray-700 mb-4">Order Summary</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Items</span>
                  <span className="font-medium">{form.items.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Subtotal</span>
                  <span className="tabular-nums">฿{formatTHB(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">VAT 7%</span>
                  <span className="tabular-nums">฿{formatTHB(vat)}</span>
                </div>
                <div className="border-t border-gray-100 pt-2 flex justify-between font-semibold text-base">
                  <span>Grand Total</span>
                  <span className="text-blue-700 tabular-nums">฿{formatTHB(grandTotal)}</span>
                </div>
              </div>

              <div className="mt-6 space-y-2">
                <button type="submit" className="btn-primary w-full justify-center" disabled={saving}>
                  {saving ? 'Creating…' : 'Create Purchase Order'}
                </button>
                <button type="button" className="btn-secondary w-full justify-center" onClick={() => navigate(-1)}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      </form>
    </Page>
  );
}
