import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, useAuth } from '../lib/api';
import { formatTHB, formatDate } from '../lib/utils';
import { StatusBadge, Spinner, Modal, Page } from '../components/UI';
import { generatePOPdf } from '../lib/pdfGenerator';
import { ArrowLeft, Download, Send, CheckCircle, XCircle, Package, Clock } from 'lucide-react';
import toast from 'react-hot-toast';

export default function PODetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [po, setPo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [rejectModal, setRejectModal] = useState(false);
  const [rejectComment, setRejectComment] = useState('');
  const [approveModal, setApproveModal] = useState(false);
  const [approveComment, setApproveComment] = useState('');
  const [actionLoading, setActionLoading] = useState('');

  const load = () => {
    api.get(`/api/pos/${id}`).then(d => { setPo(d.po); setLoading(false); });
  };

  useEffect(() => { load(); }, [id]);

  const doAction = async (action: string, body: any = {}) => {
    setActionLoading(action);
    try {
      await api.post(`/api/pos/${id}/${action}`, body);
      toast.success(`PO ${action}d successfully`);
      setRejectModal(false);
      setApproveModal(false);
      load();
    } catch (err: any) {
      toast.error(err.message);
    } finally { setActionLoading(''); }
  };

  if (loading) return <div className="p-8 flex justify-center"><Spinner size={32} /></div>;
  if (!po) return <div className="p-8 text-center text-gray-500">PO not found</div>;

  const isApprover = ['approver', 'admin'].includes(user?.role || '');
  const canSubmit = ['draft', 'rejected'].includes(po.status);
  const canApprove = isApprover && ['submitted', 'in_review'].includes(po.status);
  const canMarkOrdered = isApprover && po.status === 'approved';

  return (
    <Page title={`PO: ${po.po_number}`} action={
      <div className="flex gap-2">
        <button className="btn-secondary" onClick={() => navigate('/pos')}><ArrowLeft size={16} />Back</button>
        <button className="btn-secondary" onClick={() => generatePOPdf(po)}><Download size={16} />Download PDF</button>
      </div>
    }>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="xl:col-span-2 space-y-5">
          {/* Header card */}
          <div className="card p-5">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-2xl font-mono font-bold text-blue-700">{po.po_number}</p>
                <p className="text-sm text-gray-500 mt-0.5">Created {formatDate(po.created_at)}</p>
              </div>
              <StatusBadge status={po.status} />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              {[
                ['Supplier', po.supplier_name],
                ['Order Date', formatDate(po.order_date)],
                ['Delivery Date', formatDate(po.delivery_date)],
                ['Requested By', po.requested_by_name],
                ['Approved By', po.approved_by_name || '—'],
                ['Approved At', formatDate(po.approved_at)],
              ].map(([label, value]) => (
                <div key={label}>
                  <p className="text-xs text-gray-400 mb-0.5">{label}</p>
                  <p className="font-medium text-gray-800">{value}</p>
                </div>
              ))}
            </div>
            {po.notes && (
              <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-100 text-sm text-amber-800">
                <strong>Notes:</strong> {po.notes}
              </div>
            )}
          </div>

          {/* Supplier info */}
          <div className="card p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Supplier Details</h2>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-gray-400">Company</p>
                <p className="font-medium">{po.supplier_name}</p>
              </div>
              {po.supplier_address && <div>
                <p className="text-xs text-gray-400">Address</p>
                <p>{po.supplier_address}</p>
              </div>}
              {po.supplier_phone && <div>
                <p className="text-xs text-gray-400">Phone</p>
                <p>{po.supplier_phone}</p>
              </div>}
              {po.supplier_email && <div>
                <p className="text-xs text-gray-400">Email</p>
                <p className="text-blue-600">{po.supplier_email}</p>
              </div>}
              {po.supplier_contact && <div>
                <p className="text-xs text-gray-400">Contact Person</p>
                <p>{po.supplier_contact}</p>
              </div>}
              {po.shipping_address && <div>
                <p className="text-xs text-gray-400">Ship To</p>
                <p>{po.shipping_address}</p>
              </div>}
            </div>
          </div>

          {/* Line items */}
          <div className="card overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-700">Line Items</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="table-base">
                <thead><tr>
                  <th>#</th><th>Description</th>
                  <th className="text-center">Qty</th><th>Unit</th>
                  <th className="text-right">Unit Price</th><th className="text-right">Amount</th>
                </tr></thead>
                <tbody>
                  {(po.items || []).map((item: any, i: number) => (
                    <tr key={item.id || i}>
                      <td className="text-gray-400 text-xs">{item.item_no || i + 1}</td>
                      <td className="font-medium">{item.description}</td>
                      <td className="text-center tabular-nums">{item.quantity}</td>
                      <td className="text-gray-500 text-xs">{item.unit}</td>
                      <td className="text-right tabular-nums">฿{formatTHB(item.unit_price)}</td>
                      <td className="text-right tabular-nums font-semibold">฿{formatTHB(item.amount)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 border-t border-gray-200">
                    <td colSpan={5} className="text-right px-4 py-2 text-sm text-gray-600">Subtotal</td>
                    <td className="text-right px-4 py-2 tabular-nums font-medium">฿{formatTHB(po.subtotal)}</td>
                  </tr>
                  <tr className="bg-gray-50">
                    <td colSpan={5} className="text-right px-4 py-2 text-sm text-gray-600">VAT ({po.vat_pct || 7}%)</td>
                    <td className="text-right px-4 py-2 tabular-nums font-medium">฿{formatTHB(po.vat_amount)}</td>
                  </tr>
                  <tr className="bg-blue-50 border-t border-blue-200">
                    <td colSpan={5} className="text-right px-4 py-3 font-semibold text-blue-900">Grand Total</td>
                    <td className="text-right px-4 py-3 tabular-nums font-bold text-blue-900 text-base">฿{formatTHB(po.grand_total)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>

        {/* Right col — actions + timeline */}
        <div className="space-y-4">
          {/* Actions */}
          <div className="card p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Actions</h2>
            <div className="space-y-2">
              {canSubmit && (
                <button className="btn-primary w-full justify-center" disabled={!!actionLoading}
                  onClick={() => doAction('submit')}>
                  <Send size={16} />
                  {actionLoading === 'submit' ? 'Submitting…' : 'Submit for Approval'}
                </button>
              )}
              {canApprove && (<>
                <button className="w-full justify-center btn bg-emerald-600 text-white hover:bg-emerald-700"
                  disabled={!!actionLoading} onClick={() => setApproveModal(true)}>
                  <CheckCircle size={16} />Approve
                </button>
                <button className="btn-danger w-full justify-center" disabled={!!actionLoading}
                  onClick={() => setRejectModal(true)}>
                  <XCircle size={16} />Reject
                </button>
              </>)}
              {canMarkOrdered && (
                <button className="w-full justify-center btn bg-indigo-600 text-white hover:bg-indigo-700"
                  disabled={!!actionLoading} onClick={() => doAction('close')}>
                  <Package size={16} />
                  {actionLoading === 'close' ? 'Updating…' : 'Mark as Ordered'}
                </button>
              )}
              <button className="btn-secondary w-full justify-center" onClick={() => generatePOPdf(po)}>
                <Download size={16} />Download PDF
              </button>
            </div>
          </div>

          {/* Approval timeline */}
          <div className="card p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Approval Timeline</h2>
            {(po.approvals || []).length === 0 ? (
              <p className="text-sm text-gray-400">No activity yet</p>
            ) : (
              <div className="relative">
                <div className="absolute left-3.5 top-0 bottom-0 w-px bg-gray-200" />
                <div className="space-y-4">
                  {(po.approvals || []).map((a: any) => {
                    const colors: Record<string, string> = {
                      created: 'bg-gray-400', submitted: 'bg-blue-500',
                      approved: 'bg-emerald-500', rejected: 'bg-red-500',
                      in_review: 'bg-amber-500',
                    };
                    return (
                      <div key={a.id} className="flex gap-3 pl-1">
                        <div className={`w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center ${colors[a.action] || 'bg-gray-400'} z-10`}>
                          <Clock size={12} className="text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium capitalize text-gray-800">{a.action}</p>
                          <p className="text-xs text-gray-500">{a.actor_name} · {formatDate(a.created_at)}</p>
                          {a.comment && <p className="text-xs text-gray-600 mt-1 bg-gray-50 rounded p-1.5">{a.comment}</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Approve Modal */}
      <Modal open={approveModal} onClose={() => setApproveModal(false)} title="Approve Purchase Order" size="sm">
        <p className="text-sm text-gray-600 mb-4">You are approving <strong>{po.po_number}</strong> (฿{formatTHB(po.grand_total)}).</p>
        <div className="mb-4">
          <label className="label">Comment (optional)</label>
          <textarea className="textarea" rows={3} value={approveComment}
            onChange={e => setApproveComment(e.target.value)} placeholder="Any notes for the buyer…" />
        </div>
        <div className="flex gap-3 justify-end">
          <button className="btn-secondary" onClick={() => setApproveModal(false)}>Cancel</button>
          <button className="btn bg-emerald-600 text-white hover:bg-emerald-700"
            onClick={() => doAction('approve', { comment: approveComment })} disabled={!!actionLoading}>
            <CheckCircle size={16} />{actionLoading === 'approve' ? 'Approving…' : 'Approve'}
          </button>
        </div>
      </Modal>

      {/* Reject Modal */}
      <Modal open={rejectModal} onClose={() => setRejectModal(false)} title="Reject Purchase Order" size="sm">
        <p className="text-sm text-gray-600 mb-4">Please provide a reason for rejecting <strong>{po.po_number}</strong>.</p>
        <div className="mb-4">
          <label className="label">Rejection Reason <span className="text-red-500">*</span></label>
          <textarea className="textarea" rows={3} value={rejectComment}
            onChange={e => setRejectComment(e.target.value)} placeholder="Required…" required />
        </div>
        <div className="flex gap-3 justify-end">
          <button className="btn-secondary" onClick={() => setRejectModal(false)}>Cancel</button>
          <button className="btn-danger" disabled={!rejectComment || !!actionLoading}
            onClick={() => doAction('reject', { comment: rejectComment })}>
            <XCircle size={16} />{actionLoading === 'reject' ? 'Rejecting…' : 'Reject PO'}
          </button>
        </div>
      </Modal>
    </Page>
  );
}
