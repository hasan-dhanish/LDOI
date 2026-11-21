import React, { useState } from 'react';
import { Plus, Printer, Trash2, X } from 'lucide-react';
import { formatDateShort, formatInr } from '../constants';
import { useLdoi } from '../context/LdoiContext';
import type { QuotationDoc, QuotationLineItem } from '../types';

interface QuotationBuilderModalProps {
  initial?: Partial<QuotationDoc>;
  onClose: () => void;
}

export const QuotationBuilderModal: React.FC<QuotationBuilderModalProps> = ({
  initial,
  onClose,
}) => {
  const { saveQuotation } = useLdoi();
  const [type, setType] = useState<'Quotation' | 'Proposal'>(initial?.type ?? 'Quotation');
  const [number, setNumber] = useState(
    initial?.number ?? `LDOI-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`
  );
  const [title, setTitle] = useState(initial?.title ?? '');
  const [clientName, setClientName] = useState(initial?.clientName ?? '');
  const [validUntil, setValidUntil] = useState(initial?.validUntil ?? '');
  const [taxPercent, setTaxPercent] = useState<number>(initial?.taxPercent ?? 18);
  const [notes, setNotes] = useState(
    initial?.notes ?? 'Payment Terms: 40% advance, 40% on staging delivery, 20% on final handover.'
  );
  const [items, setItems] = useState<QuotationLineItem[]>(
    initial?.items?.length
      ? initial.items
      : [{ id: 'item_1', description: '', qty: 1, unitPriceInr: 0 }]
  );
  const [printMode, setPrintMode] = useState(false);

  const subtotal = items.reduce((sum, it) => sum + it.qty * it.unitPriceInr, 0);
  const taxAmount = Math.round((subtotal * taxPercent) / 100);
  const grandTotal = subtotal + taxAmount;

  const addLine = () => {
    setItems((prev) => [
      ...prev,
      { id: `item_${Date.now()}`, description: '', qty: 1, unitPriceInr: 0 },
    ]);
  };

  const updateLine = (id: string, patch: Partial<QuotationLineItem>) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  };

  const removeLine = (id: string) => {
    if (items.length === 1) return;
    setItems((prev) => prev.filter((it) => it.id !== id));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveQuotation({
      id: initial?.id,
      projectId: initial?.projectId,
      enquiryId: initial?.enquiryId,
      number,
      title: title || `${clientName} ${type}`,
      clientName,
      type,
      items: items.filter((i) => i.description.trim() !== ''),
      taxPercent,
      notes,
      validUntil,
    });
    onClose();
  };

  if (printMode) {
    return (
      <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto">
        <div className="bg-white w-full max-w-3xl rounded-xl p-8 print-sheet shadow-xl">
          <div className="no-print flex items-center justify-between pb-4 mb-6 border-b border-[#E4E2DC]">
            <span className="text-xs font-medium text-[#52525B]">
              Print / Save as PDF Preview
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#0071E3] text-white rounded-md"
              >
                <Printer className="w-3.5 h-3.5" />
                Print / Save PDF
              </button>
              <button
                type="button"
                onClick={() => setPrintMode(false)}
                className="px-3 py-1.5 text-xs font-medium border border-[#E4E2DC] rounded-md"
              >
                Back to Editor
              </button>
            </div>
          </div>

          <div className="flex justify-between items-start border-b border-[#18181B] pb-5">
            <div>
              <div className="text-xl font-bold tracking-tight text-[#18181B]">
                Project LDOI
              </div>
              <div className="text-xs text-[#52525B] mt-0.5">
                ERP, POS, SaaS &amp; Custom Software Systems
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm font-semibold uppercase tracking-wider text-[#18181B]">
                {type}
              </div>
              <div className="text-xs font-mono-num text-[#52525B] mt-0.5">{number}</div>
              {validUntil && (
                <div className="text-xs text-[#71717A] mt-0.5">
                  Valid until {formatDateShort(validUntil)}
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-4 text-xs">
            <div>
              <div className="text-[#71717A] uppercase font-semibold text-[10px]">Prepared For</div>
              <div className="mt-1 text-sm font-semibold text-[#18181B]">{clientName || 'Client'}</div>
            </div>
            <div>
              <div className="text-[#71717A] uppercase font-semibold text-[10px]">Subject</div>
              <div className="mt-1 text-sm font-medium text-[#18181B]">{title || `${type} Document`}</div>
            </div>
          </div>

          <table className="w-full mt-6 text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#18181B] text-left text-[#52525B]">
                <th className="py-2 font-semibold">Deliverable / Line Item</th>
                <th className="py-2 font-semibold text-right w-16">Qty</th>
                <th className="py-2 font-semibold text-right w-28">Unit Price</th>
                <th className="py-2 font-semibold text-right w-32">Amount</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.id} className="border-b border-[#E4E2DC]">
                  <td className="py-2.5 text-[#18181B]">{it.description || 'Item'}</td>
                  <td className="py-2.5 text-right font-mono-num">{it.qty}</td>
                  <td className="py-2.5 text-right font-mono-num">{formatInr(it.unitPriceInr)}</td>
                  <td className="py-2.5 text-right font-mono-num font-medium">
                    {formatInr(it.qty * it.unitPriceInr)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-5 flex justify-end">
            <div className="w-64 space-y-1.5 text-xs">
              <div className="flex justify-between text-[#52525B]">
                <span>Subtotal</span>
                <span className="font-mono-num">{formatInr(subtotal)}</span>
              </div>
              <div className="flex justify-between text-[#52525B]">
                <span>Tax ({taxPercent}%)</span>
                <span className="font-mono-num">{formatInr(taxAmount)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-[#18181B] text-sm font-semibold text-[#18181B]">
                <span>Total (INR)</span>
                <span className="font-mono-num">{formatInr(grandTotal)}</span>
              </div>
            </div>
          </div>

          {notes && (
            <div className="mt-8 pt-4 border-t border-[#E4E2DC] text-xs text-[#52525B] whitespace-pre-wrap">
              <div className="font-semibold text-[#18181B] mb-1">Terms &amp; Notes</div>
              {notes}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 overflow-y-auto">
      <form
        onSubmit={handleSave}
        className="bg-white border border-[#E4E2DC] rounded-xl w-full max-w-2xl shadow-xl overflow-hidden"
      >
        <div className="px-5 py-4 bg-[#FAF9F6] border-b border-[#E4E2DC] flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[#18181B]">
            INR {type} Builder
          </h3>
          <button type="button" onClick={onClose} className="text-[#71717A] hover:text-[#18181B]">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-[#52525B] mb-1">Document Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as 'Quotation' | 'Proposal')}
                className="w-full px-2.5 py-1.5 text-xs bg-[#FAF9F6] border border-[#E4E2DC] rounded-md"
              >
                <option value="Quotation">Quotation</option>
                <option value="Proposal">Project Proposal</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-medium text-[#52525B] mb-1">Reference No.</label>
              <input
                type="text"
                required
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs font-mono-num bg-[#FAF9F6] border border-[#E4E2DC] rounded-md"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-[#52525B] mb-1">Valid Until</label>
              <input
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs bg-[#FAF9F6] border border-[#E4E2DC] rounded-md"
              />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-[#52525B] mb-1">Client Name</label>
              <input
                type="text"
                required
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Client or company name"
                className="w-full px-2.5 py-1.5 text-xs bg-[#FAF9F6] border border-[#E4E2DC] rounded-md"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-[#52525B] mb-1">Document Title</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Retail POS & Inventory System"
                className="w-full px-2.5 py-1.5 text-xs bg-[#FAF9F6] border border-[#E4E2DC] rounded-md"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[11px] font-medium text-[#52525B]">Line Items (INR)</label>
              <button
                type="button"
                onClick={addLine}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-[#0071E3] hover:underline"
              >
                <Plus className="w-3 h-3" /> Add line
              </button>
            </div>
            <div className="space-y-2">
              {items.map((it) => (
                <div key={it.id} className="grid grid-cols-12 gap-2 items-center">
                  <input
                    type="text"
                    placeholder="Module or deliverable description"
                    value={it.description}
                    onChange={(e) => updateLine(it.id, { description: e.target.value })}
                    className="col-span-6 px-2.5 py-1.5 text-xs bg-[#FAF9F6] border border-[#E4E2DC] rounded-md"
                  />
                  <input
                    type="number"
                    min={1}
                    value={it.qty}
                    onChange={(e) => updateLine(it.id, { qty: Number(e.target.value) || 1 })}
                    className="col-span-2 px-2 py-1.5 text-xs font-mono-num bg-[#FAF9F6] border border-[#E4E2DC] rounded-md"
                  />
                  <input
                    type="number"
                    min={0}
                    placeholder="INR"
                    value={it.unitPriceInr}
                    onChange={(e) => updateLine(it.id, { unitPriceInr: Number(e.target.value) || 0 })}
                    className="col-span-3 px-2 py-1.5 text-xs font-mono-num bg-[#FAF9F6] border border-[#E4E2DC] rounded-md"
                  />
                  <button
                    type="button"
                    onClick={() => removeLine(it.id)}
                    className="col-span-1 flex justify-center text-[#71717A] hover:text-[#DC2626]"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3 items-start">
            <div>
              <label className="block text-[11px] font-medium text-[#52525B] mb-1">Terms / Proposal Notes</label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs bg-[#FAF9F6] border border-[#E4E2DC] rounded-md"
              />
            </div>
            <div className="p-3 bg-[#FAF9F6] border border-[#E4E2DC] rounded-lg space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-[#52525B]">Subtotal</span>
                <span className="font-mono-num font-medium">{formatInr(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#52525B]">Tax %</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={taxPercent}
                  onChange={(e) => setTaxPercent(Number(e.target.value) || 0)}
                  className="w-16 px-2 py-0.5 text-right font-mono-num bg-white border border-[#E4E2DC] rounded"
                />
              </div>
              <div className="flex justify-between pt-1.5 border-t border-[#E4E2DC] font-semibold text-[#18181B]">
                <span>Grand Total</span>
                <span className="font-mono-num">{formatInr(grandTotal)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="px-5 py-3.5 bg-[#FAF9F6] border-t border-[#E4E2DC] flex items-center justify-between">
          <button
            type="button"
            onClick={() => setPrintMode(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white border border-[#E4E2DC] hover:border-[#18181B] rounded-md"
          >
            <Printer className="w-3.5 h-3.5" />
            Print / Save PDF
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-medium text-[#52525B] hover:text-[#18181B]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs font-medium bg-[#0071E3] hover:bg-[#0062C4] text-white rounded-md"
            >
              Save {type}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
