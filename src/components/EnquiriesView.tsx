import React, { useState } from 'react';
import { ArrowRightCircle, Plus, Trash2, X } from 'lucide-react';
import { PROJECT_CATEGORIES, formatDateShort, formatInr } from '../constants';
import { useLdoi } from '../context/LdoiContext';
import type { EnquiryStatus, ProjectCategory } from '../types';

interface EnquiriesViewProps {
  onOpenProject: (projectId: string) => void;
}

const STATUS_STYLES: Record<EnquiryStatus, string> = {
  New: 'bg-[#0071E3] text-white',
  Discussing: 'bg-[#18181B] text-white',
  Quoted: 'bg-[#B45309] text-white',
  Won: 'bg-[#0F766E] text-white',
  Dropped: 'bg-[#71717A] text-white',
};

export const EnquiriesView: React.FC<EnquiriesViewProps> = ({ onOpenProject }) => {
  const { enquiries, createEnquiry, updateEnquiry, convertEnquiryToProject, deleteEnquiry } =
    useLdoi();
  const [showCreate, setShowCreate] = useState(false);

  const [clientName, setClientName] = useState('');
  const [contactInfo, setContactInfo] = useState('');
  const [category, setCategory] = useState<ProjectCategory>('ERP');
  const [estimatedBudgetInr, setEstimatedBudgetInr] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [scopeSummary, setScopeSummary] = useState('');
  const [notes, setNotes] = useState('');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    await createEnquiry({
      clientName: clientName.trim(),
      contactInfo: contactInfo.trim(),
      category,
      scopeSummary: scopeSummary.trim(),
      estimatedBudgetInr: Number(estimatedBudgetInr) || 0,
      targetDate,
      status: 'New',
      notes: notes.trim(),
    });
    setShowCreate(false);
    setClientName('');
    setContactInfo('');
    setEstimatedBudgetInr('');
    setTargetDate('');
    setScopeSummary('');
    setNotes('');
  };

  const handleConvert = async (id: string) => {
    const proj = await convertEnquiryToProject(id);
    if (proj) onOpenProject(proj.id);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
        <div>
          <h1 className="text-xl font-semibold text-[#18181B]">Client Enquiries</h1>
          <p className="text-xs text-[#71717A] mt-0.5">
            Track incoming leads, estimated INR budgets, and convert won enquiries into Projects.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium bg-[#0071E3] hover:bg-[#0062C4] text-white rounded-md shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          New Enquiry
        </button>
      </div>

      {enquiries.length === 0 ? (
        <div className="paper-card rounded-xl p-10 text-center">
          <p className="text-sm font-medium text-[#18181B]">No enquiries logged yet</p>
          <p className="mt-1 text-xs text-[#71717A]">
            Add a client enquiry whenever someone approaches your team for an ERP, POS, SaaS, or Hardware build.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {enquiries.map((enq) => (
            <div key={enq.id} className="paper-card rounded-xl p-5">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="space-y-1.5 min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold text-[#18181B]">{enq.clientName}</h3>
                    <span className="px-2 py-0.5 text-[11px] font-medium bg-[#FAF9F6] border border-[#E4E2DC] rounded">
                      {enq.category}
                    </span>
                    <span className={`px-2 py-0.5 text-[11px] font-semibold rounded ${STATUS_STYLES[enq.status]}`}>
                      {enq.status}
                    </span>
                  </div>
                  <div className="text-xs text-[#52525B]">
                    Contact: {enq.contactInfo || 'Not provided'} · Est. Budget:{' '}
                    <span className="font-mono-num font-medium text-[#18181B]">
                      {formatInr(enq.estimatedBudgetInr)}
                    </span>{' '}
                    · Target: {enq.targetDate ? formatDateShort(enq.targetDate) : 'TBD'}
                  </div>
                  {enq.scopeSummary && (
                    <p className="text-xs text-[#18181B] pt-1 whitespace-pre-wrap">
                      {enq.scopeSummary}
                    </p>
                  )}
                  {enq.notes && (
                    <p className="text-[11px] text-[#71717A] whitespace-pre-wrap">
                      Team notes: {enq.notes}
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <select
                    value={enq.status}
                    onChange={(e) => updateEnquiry(enq.id, { status: e.target.value as EnquiryStatus })}
                    className="px-2.5 py-1.5 text-xs bg-[#FAF9F6] border border-[#E4E2DC] rounded-md"
                  >
                    {(['New', 'Discussing', 'Quoted', 'Won', 'Dropped'] as EnquiryStatus[]).map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>

                  {enq.convertedProjectId ? (
                    <button
                      type="button"
                      onClick={() => onOpenProject(enq.convertedProjectId!)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-[#0F766E] text-white rounded-md"
                    >
                      Open Project
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleConvert(enq.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#18181B] hover:bg-[#27272A] text-white rounded-md"
                    >
                      <ArrowRightCircle className="w-3.5 h-3.5" />
                      Convert to Project
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => deleteEnquiry(enq.id)}
                    className="p-1.5 text-[#71717A] hover:text-[#DC2626]"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 overflow-y-auto">
          <form
            onSubmit={handleCreate}
            className="bg-white border border-[#E4E2DC] rounded-xl w-full max-w-lg shadow-xl overflow-hidden"
          >
            <div className="px-5 py-4 bg-[#FAF9F6] border-b border-[#E4E2DC] flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[#18181B]">Log New Enquiry</h3>
              <button type="button" onClick={() => setShowCreate(false)}>
                <X className="w-4 h-4 text-[#71717A]" />
              </button>
            </div>
            <div className="p-5 space-y-3.5">
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-[#52525B] mb-1">
                    Client / Company Name
                  </label>
                  <input
                    type="text"
                    required
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-[#FAF9F6] border border-[#E4E2DC] rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-[#52525B] mb-1">
                    Phone / Email
                  </label>
                  <input
                    type="text"
                    value={contactInfo}
                    onChange={(e) => setContactInfo(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-[#FAF9F6] border border-[#E4E2DC] rounded-md"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-[#52525B] mb-1">Type</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as ProjectCategory)}
                    className="w-full px-2.5 py-2 text-xs bg-[#FAF9F6] border border-[#E4E2DC] rounded-md"
                  >
                    {PROJECT_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-[#52525B] mb-1">
                    Est. Budget (INR)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={estimatedBudgetInr}
                    onChange={(e) => setEstimatedBudgetInr(e.target.value)}
                    className="w-full px-2.5 py-2 text-xs font-mono-num bg-[#FAF9F6] border border-[#E4E2DC] rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-[#52525B] mb-1">
                    Target Date
                  </label>
                  <input
                    type="date"
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                    className="w-full px-2.5 py-2 text-xs bg-[#FAF9F6] border border-[#E4E2DC] rounded-md"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[#52525B] mb-1">
                  Client Scope / Requirements
                </label>
                <textarea
                  rows={3}
                  value={scopeSummary}
                  onChange={(e) => setScopeSummary(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#FAF9F6] border border-[#E4E2DC] rounded-md"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[#52525B] mb-1">
                  Initial Team Thoughts
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#FAF9F6] border border-[#E4E2DC] rounded-md"
                />
              </div>
            </div>
            <div className="px-5 py-3.5 bg-[#FAF9F6] border-t border-[#E4E2DC] flex justify-end gap-2">
              <button type="button" onClick={() => setShowCreate(false)} className="px-3 py-1.5 text-xs text-[#52525B]">
                Cancel
              </button>
              <button type="submit" className="px-4 py-1.5 text-xs font-medium bg-[#0071E3] text-white rounded-md">
                Save Enquiry
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
