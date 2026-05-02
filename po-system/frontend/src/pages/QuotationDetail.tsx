import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { formatTHB, formatDate } from '../lib/utils';
import { StatusBadge, Spinner, Page } from '../components/UI';
import { ArrowLeft, Plus } from 'lucide-react';
import toast from 'react-hot-toast';

export default function QuotationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [quotation, setQuotation] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/api/quotations/${id}`).then(d => { setQuotation(d.quotation); setLoading(false); });
  }, [id]);

  const handleCreatePO = async () => {
    navigate(`/pos/new?quotation=${id}`);
  };

  const updateStatus = async (status: string) => {
    await api.patch(`/api/quotations/${id}`, { status });
    toast.success('Status updated');
    const d = await api.get(`/api/quotations/${id}`);
    setQuotation(d.quotation);
  };

  if (loading) return <div className="p-8 flex justify-center"><Spinner size={32} /></div>;
  if (!quotation) return <div className="p-8 text-center">Not found</div>;

  return (
    <Page title={`Quotation ${quotation.quotation_no}`} action={
      <div className="flex gap-2">
        <button className="btn-secondary" onClick={() => navigate('/quotations')}><ArrowLeft size={16} />Back</button>
        {quotation.status === 'pending' && (
          <button className="btn-primary" onClick={handleCreatePO}><Plus size={16} />Create PO</button>
        )}
      </div>
    }>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-5">
          {/* Header */}
          <div className="card p-5">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-2xl font-mono font-bold text-blue-700">{quotation.quotation_no}</p>
                <p className="text-sm text-gray-500">{quotation.supplier_name}</p>
              </div>
              <StatusBadge status={quotation.status} />
            </div>
            <div className="grid grid-cols-3 gap-4 text-sm">
              {[
                ['Quote Date', formatDate(quotation.quote_date)],
                ['Contact Person', quotation.contact_person || '—'],
                ['Valid', `${quotation.valid_days} days`],
                ['Delivery', `${quotation.delivery_days} days`],
                ['Phone', quotation.supplier_phone || '—'],
                ['Email', quotation.supplier_email || '—'],
              ].map(([label, value]) => (
                <div key={label}>
                  <p className="text-xs text-gray-400">{label}</p>
                  <p className="font-medium">{value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Items */}
          <div className="card overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-700">Line Items ({(quotation.items || []).length})</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="table-base">
                <thead><tr>
                  <th>#</th><th>Description</th>
                  <th className="text-center">Qty</th><th>Unit</th>
                  <th className="text-right">Unit Price</th><th className="text-right">Amount</th>
                </tr></thead>
                <tbody>
                  {(quotation.items || []).map((item: any) => (
                    <tr key={item.id}>
                      <td className="text-gray-400 text-xs">{item.item_no}</td>
                      <td className="font-medium">{item.description}</td>
                      <td className="text-center">{item.quantity}</td>
                      <td className="text-gray-500 text-xs">{item.unit}</td>
                      <td className="text-right tabular-nums">฿{formatTHB(item.unit_price)}</td>
                      <td className="text-right tabular-nums font-semibold">฿{formatTHB(item.amount)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 border-t">
                    <td colSpan={5} className="text-right px-4 py-2 text-sm">Subtotal</td>
                    <td className="text-right px-4 py-2 font-medium tabular-nums">฿{formatTHB(quotation.subtotal)}</td>
                  </tr>
                  <tr className="bg-gray-50">
                    <td colSpan={5} className="text-right px-4 py-2 text-sm">VAT 7%</td>
                    <td className="text-right px-4 py-2 font-medium tabular-nums">฿{formatTHB(quotation.vat_amount)}</td>
                  </tr>
                  <tr className="bg-blue-50 border-t border-blue-200">
                    <td colSpan={5} className="text-right px-4 py-3 font-semibold text-blue-900">Grand Total</td>
                    <td className="text-right px-4 py-3 font-bold text-blue-900 text-base tabular-nums">฿{formatTHB(quotation.grand_total)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="card p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Actions</h2>
            <div className="space-y-2">
              {quotation.status === 'pending' && (
                <button className="btn-primary w-full justify-center" onClick={handleCreatePO}>
                  <Plus size={16} />Create Purchase Order
                </button>
              )}
              {quotation.status === 'pending' && (
                <button className="btn-secondary w-full justify-center" onClick={() => updateStatus('rejected')}>
                  Reject Quotation
                </button>
              )}
              {quotation.status === 'rejected' && (
                <button className="btn-secondary w-full justify-center" onClick={() => updateStatus('pending')}>
                  Reopen
                </button>
              )}
            </div>
          </div>

          <div className="card p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Supplier</h2>
            <p className="font-medium text-sm">{quotation.supplier_name}</p>
            {quotation.supplier_address && <p className="text-xs text-gray-500 mt-1">{quotation.supplier_address}</p>}
            {quotation.supplier_contact && <p className="text-xs text-gray-500 mt-1">Contact: {quotation.supplier_contact}</p>}
          </div>
        </div>
      </div>
    </Page>
  );
}
