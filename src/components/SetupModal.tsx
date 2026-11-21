import React from 'react';
import { CheckCircle2, Globe, Wifi, X } from 'lucide-react';
import { useLdoi } from '../context/LdoiContext';

interface SetupModalProps {
  onClose: () => void;
}

export const SetupModal: React.FC<SetupModalProps> = ({ onClose }) => {
  const { syncMode } = useLdoi();

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white border border-[#E4E2DC] rounded-xl w-full max-w-lg shadow-xl overflow-hidden">
        <div className="px-5 py-4 bg-[#FAF9F6] border-b border-[#E4E2DC] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wifi className="w-4 h-4 text-[#0071E3]" />
            <h3 className="text-sm font-semibold text-[#18181B]">
              4-Location Sync &amp; Custom Domain Setup
            </h3>
          </div>
          <button type="button" onClick={onClose}>
            <X className="w-4 h-4 text-[#71717A]" />
          </button>
        </div>

        <div className="p-5 space-y-4 text-xs text-[#18181B] leading-relaxed">
          <div className="p-3 rounded-lg bg-[#FAF9F6] border border-[#E4E2DC] flex items-center justify-between">
            <span className="font-medium">Current Sync Mode</span>
            <span
              className={`px-2 py-0.5 rounded font-semibold ${
                syncMode === 'supabase'
                  ? 'bg-[#0F766E] text-white'
                  : 'bg-[#B45309] text-white'
              }`}
            >
              {syncMode === 'supabase' ? 'Live Supabase Cloud' : 'Local Multi-Tab Preview'}
            </span>
          </div>

          <div className="space-y-2">
            <div className="font-semibold text-sm">How to enable live sync across 4 locations:</div>
            <ol className="list-decimal pl-4 space-y-1.5 text-[#52525B]">
              <li>
                Create a free project on <strong className="text-[#18181B]">supabase.com</strong>.
              </li>
              <li>
                Open <strong className="text-[#18181B]">SQL Editor</strong> in Supabase, paste the
                file <code className="px-1 py-0.5 bg-[#FAF9F6] border rounded">supabase/schema.sql</code>, and click Run.
              </li>
              <li>
                Copy <code className="px-1 py-0.5 bg-[#FAF9F6] border rounded">.env.example</code> to{' '}
                <code className="px-1 py-0.5 bg-[#FAF9F6] border rounded">.env</code> and paste your{' '}
                <code className="px-1 py-0.5 bg-[#FAF9F6] border rounded">VITE_SUPABASE_URL</code>,{' '}
                <code className="px-1 py-0.5 bg-[#FAF9F6] border rounded">VITE_SUPABASE_ANON_KEY</code>, and your 4 emails in{' '}
                <code className="px-1 py-0.5 bg-[#FAF9F6] border rounded">VITE_TEAM_ALLOWED_EMAILS</code>.
              </li>
            </ol>
          </div>

          <div className="pt-3 border-t border-[#E4E2DC] space-y-2">
            <div className="flex items-center gap-1.5 font-semibold text-sm">
              <Globe className="w-4 h-4 text-[#0071E3]" />
              <span>Pre-Launch Checklist</span>
            </div>
            <div className="space-y-1 text-[#52525B]">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#0F766E]" />
                <span>Favicon added and clean metadata configured</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#0F766E]" />
                <span>Zero AI tags, zero fake metrics, zero gradients</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded border border-[#D4D4D8] inline-block" />
                <span>Connect your custom domain on Vercel / Cloudflare Pages before team rollout</span>
              </div>
            </div>
          </div>
        </div>

        <div className="px-5 py-3 bg-[#FAF9F6] border-t border-[#E4E2DC] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium bg-[#18181B] text-white rounded-md"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
