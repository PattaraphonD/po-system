import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { formatTHB } from '../lib/utils';
import { Spinner, EmptyState, Modal, Field, Page, ConfirmDialog } from '../components/UI';
import { Plus, Building2, Pencil, Search, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

const EMPTY_FORM = { name: '', address: '', tax_id: '', contact: '', phone: '', email: '' };

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<'create' | 'edit' | null>(null);
  const [form, setForm] = useState<any>(EMPTY_FORM);
  const [editId, setEditId] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');

  const load = () => {
    api.get('/api/suppliers').then(d => { setSuppliers(d.suppliers); setLoading(false); });
  };
  useEffect(() => { load(); }, []);

  const filtered = suppliers.filter(s =>
    s.name?.toLowerCase().includes(search.toLowerCase()) ||
    s.contact?.toLowerCase().includes(search.toLowerCase()) ||
    s.email?.toLowerCase().includes(search.toLowerCase())
  );

  const openEdit = (s: any) => {
    setForm({ name: s.name, address: s.address || '', tax_id: s.tax_id || '', contact: s.contact || '', phone: s.phone || '', email: s.email || '' });
    setEditId(s.id);
    setModal('edit');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) return toast.error('Supplier name required');
    setSaving(true);
    try {
      if (modal === 'create') {
        await api.post('/api/suppliers', form);
        toast.success('Supplier added');
      } else {
        await api.patch(`/api/suppliers/${editId}`, form);
        toast.success('Supplier updated');
      }
      setModal(null); setForm(EMPTY_FORM); load();
    } catch (err: any) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    await api.delete(`/api/suppliers/${id}`);
    toast.success('Supplier deactivated');
    setDeleteConfirm('');
    load();
  };

  const setField = (k: string, v: string) => setForm((f: any) => ({ ...f, [k]: v }));

  return (
    <Page title="Suppliers" action={
      <button className="btn-primary" onClick={() => { setForm(EMPTY_FORM); setModal('create'); }}>
        <Plus size={16} />New Supplier
      </button>
    }>
      <div className="relative mb-4 w-72">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input className="input pl-9" placeholder="Search suppliers…" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="card overflow-hidden">
        {loading ? <div className="p-8 flex justify-center"><Spinner /></div> :
          filtered.length === 0 ? (
            <EmptyState icon={<Building2 size={40} />} title="No suppliers yet"
              action={<button className="btn-primary" onClick={() => { setForm(EMPTY_FORM); setModal('create'); }}><Plus size={16} />Add Supplier</button>} />
          ) : (
            <table className="table-base">
              <thead><tr>
                <th>Supplier Name</th><th>Contact</th><th>Phone</th>
                <th>Email</th><th className="text-right">Total Spend</th>
                <th className="text-right">POs</th><th>Status</th><th></th>
              </tr></thead>
              <tbody>
                {filtered.map(s => (
                  <tr key={s.id}>
                    <td>
                      <p className="font-medium text-gray-900">{s.name}</p>
                      {s.address && <p className="text-xs text-gray-400 mt-0.5 max-w-xs truncate">{s.address}</p>}
                    </td>
                    <td className="text-sm text-gray-600">{s.contact || '—'}</td>
                    <td className="text-sm text-gray-600">{s.phone || '—'}</td>
                    <td className="text-sm text-blue-600">{s.email || '—'}</td>
                    <td className="text-right tabular-nums font-medium">฿{formatTHB(s.total_spend || 0)}</td>
                    <td className="text-right tabular-nums">{s.po_count || 0}</td>
                    <td>
                      <span className={`badge ${s.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {s.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <div className="flex gap-1">
                        <button className="btn-ghost btn-sm p-1.5" onClick={() => openEdit(s)}><Pencil size={14} /></button>
                        <button className="btn-ghost btn-sm p-1.5 text-red-400 hover:text-red-600" onClick={() => setDeleteConfirm(s.id)}><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        }
      </div>

      <Modal open={!!modal} onClose={() => setModal(null)}
        title={modal === 'create' ? 'New Supplier' : 'Edit Supplier'} size="md">
        <form onSubmit={handleSave} className="space-y-4">
          <Field label="Supplier Name" required>
            <input className="input" value={form.name} onChange={e => setField('name', e.target.value)} required />
          </Field>
          <Field label="Address">
            <textarea className="textarea" rows={2} value={form.address} onChange={e => setField('address', e.target.value)} />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Tax ID"><input className="input" value={form.tax_id} onChange={e => setField('tax_id', e.target.value)} /></Field>
            <Field label="Contact Person"><input className="input" value={form.contact} onChange={e => setField('contact', e.target.value)} /></Field>
            <Field label="Phone"><input className="input" value={form.phone} onChange={e => setField('phone', e.target.value)} /></Field>
            <Field label="Email"><input className="input" type="email" value={form.email} onChange={e => setField('email', e.target.value)} /></Field>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setModal(null)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog open={!!deleteConfirm} onClose={() => setDeleteConfirm('')}
        onConfirm={() => handleDelete(deleteConfirm)}
        title="Deactivate Supplier"
        message="This supplier will be marked inactive. Existing POs will not be affected."
        danger />
    </Page>
  );
}
