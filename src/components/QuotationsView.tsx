import React, { useState } from 'react';
import { Download, FileText, Plus, Trash2, Upload } from 'lucide-react';
import { formatDateShort, formatInr } from '../constants';
import { useLdoi } from '../context/LdoiContext';
import type { DocType, QuotationDoc } from '../types';
import { QuotationBuilderModal } from './QuotationBuilderModal';

export const QuotationsView: React.FC = () => {
  const {
    quotations,
    documents,
    projects,
    deleteQuotation,
    uploadDocument,
    deleteDocument,
  } = useLdoi();
  const [builderDoc, setBuilderDoc] = useState<Partial<QuotationDoc> | null>(null);
  const [docType, setDocType] = useState<DocType>('Proposal');
  const [selectedProjectId, setSelectedProjectId] = useState('');

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadDocument(file, {
      projectId: selectedProjectId || undefined,
      docType,
    });
    e.target.value = '';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
        <div>
          <h1 className="text-xl font-semibold text-[#18181B]">Quotations &amp; Proposals</h1>
          <p className="text-xs text-[#71717A] mt-0.5">
            Create INR quotations/proposals in-app or upload existing PDFs and documents.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setBuilderDoc({ type: 'Quotation' })}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium bg-[#0071E3] hover:bg-[#0062C4] text-white rounded-md shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          New INR Quotation / Proposal
        </button>
      </div>

      {/* In-app Quotations & Proposals */}
      <section className="paper-card rounded-xl p-5 space-y-4">
        <h2 className="text-sm font-semibold text-[#18181B]">
          Created Quotations &amp; Proposals ({quotations.length})
        </h2>

        {quotations.length === 0 ? (
          <div className="py-8 text-center text-xs text-[#71717A] border border-dashed border-[#E4E2DC] rounded-lg">
            No quotations created yet. Click &ldquo;New INR Quotation / Proposal&rdquo; above.
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {quotations.map((q) => {
              const sub = q.items.reduce((s, i) => s + i.qty * i.unitPriceInr, 0);
              const total = sub + Math.round((sub * q.taxPercent) / 100);
              const proj = projects.find((p) => p.id === q.projectId);
              return (
                <div
                  key={q.id}
                  className="p-4 rounded-lg border border-[#E4E2DC] bg-[#FAF9F6] flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-[#71717A]">
                      <span>{q.type}</span>
                      <span className="font-mono-num">{q.number}</span>
                    </div>
                    <div className="mt-1 text-sm font-semibold text-[#18181B] truncate">
                      {q.title}
                    </div>
                    <div className="text-xs text-[#52525B] mt-0.5">
                      Client: {q.clientName}
                    </div>
                    {proj && (
                      <div className="text-[11px] text-[#0071E3] mt-0.5 truncate">
                        Project: {proj.title}
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-[#E4E2DC] flex items-center justify-between">
                    <span className="text-sm font-semibold font-mono-num text-[#18181B]">
                      {formatInr(total)}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setBuilderDoc(q)}
                        className="px-2.5 py-1 text-[11px] font-medium bg-white border border-[#E4E2DC] rounded hover:border-[#0071E3]"
                      >
                        Open / Print
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteQuotation(q.id)}
                        className="text-[#71717A] hover:text-[#DC2626]"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Uploaded Files Vault */}
      <section className="paper-card rounded-xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-[#18181B]">
            Uploaded Documents Vault ({documents.length})
          </h2>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-[#FAF9F6] border border-[#E4E2DC] rounded-md"
            >
              <option value="">General Document</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
            <select
              value={docType}
              onChange={(e) => setDocType(e.target.value as DocType)}
              className="px-2.5 py-1.5 text-xs bg-[#FAF9F6] border border-[#E4E2DC] rounded-md"
            >
              {(['Quotation', 'Proposal', 'Contract', 'Spec', 'Other'] as DocType[]).map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <label className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#18181B] text-white rounded-md cursor-pointer">
              <Upload className="w-3.5 h-3.5" />
              Upload File
              <input type="file" className="hidden" onChange={handleFileUpload} />
            </label>
          </div>
        </div>

        {documents.length === 0 ? (
          <div className="py-8 text-center text-xs text-[#71717A] border border-dashed border-[#E4E2DC] rounded-lg">
            No files uploaded yet. Upload client proposals, quotations, or contracts here.
          </div>
        ) : (
          <div className="divide-y divide-[#E4E2DC] border border-[#E4E2DC] rounded-lg overflow-hidden">
            {documents.map((d) => {
              const proj = projects.find((p) => p.id === d.projectId);
              return (
                <div
                  key={d.id}
                  className="flex items-center justify-between gap-3 px-4 py-3 bg-white hover:bg-[#FAF9F6]"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <FileText className="w-4 h-4 text-[#0071E3] shrink-0" />
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-[#18181B] truncate">
                        {d.name}
                      </div>
                      <div className="text-[11px] text-[#71717A]">
                        {d.docType} {proj ? `· ${proj.title}` : ''} · By {d.uploadedBy} ·{' '}
                        {formatDateShort(d.createdAt)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <a
                      href={d.url}
                      download={d.name}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium bg-[#FAF9F6] border border-[#E4E2DC] rounded hover:border-[#0071E3]"
                    >
                      <Download className="w-3 h-3" />
                      Download
                    </a>
                    <button
                      type="button"
                      onClick={() => deleteDocument(d.id)}
                      className="text-[#71717A] hover:text-[#DC2626]"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {builderDoc && (
        <QuotationBuilderModal
          initial={builderDoc}
          onClose={() => setBuilderDoc(null)}
        />
      )}
    </div>
  );
};
