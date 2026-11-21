import React, { useState } from 'react';
import { CheckCircle2, Lock, Mail, Moon, Sun, UserCheck } from 'lucide-react';
import { TEAM_MEMBERS } from '../constants';
import { useLdoi } from '../context/LdoiContext';
import type { MemberName } from '../types';
import { LdoiLogo } from './LdoiLogo';

interface AuthScreenProps {
  darkMode: boolean;
  onToggleDarkMode: () => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({
  darkMode,
  onToggleDarkMode,
}) => {
  const { signIn, signUp, quickLocalSignIn, syncMode } = useLdoi();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [memberName, setMemberName] = useState<MemberName>('Hasan');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const [unlockLabel, setUnlockLabel] = useState('');

  const triggerUnlockAnimation = (name: string, onDone: () => void) => {
    setUnlockLabel(name);
    setUnlocking(true);
    window.setTimeout(() => {
      onDone();
    }, 450);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    if (mode === 'signin') {
      const res = await signIn(email, password);
      setBusy(false);
      if (res.error) {
        setError(res.error);
      }
    } else {
      const res = await signUp(email, password, memberName);
      setBusy(false);
      if (res.error) {
        setError(res.error);
      }
    }
  };

  const handleQuickSignIn = (name: MemberName) => {
    triggerUnlockAnimation(name, () => quickLocalSignIn(name));
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 sm:p-6 overflow-hidden bg-[#111317]">
      {/* Day Workbench Layer */}
      <div
        aria-hidden="true"
        className="absolute inset-0 login-workbench-day transition-opacity duration-500 ease-in-out"
        style={{ opacity: darkMode ? 0 : 1 }}
      />
      {/* Night Workbench Layer (Cross-fades smoothly on toggle) */}
      <div
        aria-hidden="true"
        className="absolute inset-0 login-workbench-bg transition-opacity duration-500 ease-in-out"
        style={{ opacity: darkMode ? 1 : 0 }}
      />

      <div
        className={`relative z-10 w-full max-w-md rounded-[26px] p-7 sm:p-8 transition-all duration-500 ease-out ${
          darkMode
            ? 'login-glass-card text-zinc-100'
            : 'login-glass-card-day text-[#23211E]'
        } ${unlocking ? 'opacity-0 scale-95 translate-y-2' : 'opacity-100 scale-100 translate-y-0'}`}
      >
        {unlocking ? (
          <div className="py-16 flex flex-col items-center justify-center text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-[#4D8B6F]/25 text-[#4D8B6F] flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-[#23211E]'}`}>
              Opening {unlockLabel}&apos;s Workspace...
            </div>
          </div>
        ) : (
          <>
            {/* Compact Header + Day/Night Switch */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <LdoiLogo size={42} />
                <div>
                  <h1
                    className={`text-lg font-bold leading-tight ${
                      darkMode ? 'text-white' : 'text-[#23211E]'
                    }`}
                  >
                    Project LDOI
                  </h1>
                  <p
                    className={`text-[11px] font-medium ${
                      darkMode ? 'text-zinc-400' : 'text-[#6D665C]'
                    }`}
                  >
                    Team Sign In
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold ${
                    darkMode
                      ? 'bg-white/10 border border-white/10 text-zinc-300'
                      : 'bg-white/60 border border-white/60 text-[#524C44]'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-xs ${
                      syncMode === 'supabase' ? 'bg-[#4D8B6F]' : 'bg-[#C86D44]'
                    }`}
                  />
                  {syncMode === 'supabase' ? 'Cloud' : 'Local'}
                </span>

                <button
                  type="button"
                  onClick={onToggleDarkMode}
                  title={darkMode ? 'Switch to Day Theme' : 'Switch to Night Theme'}
                  className={`ios-press p-1.5 rounded-lg border transition-colors ${
                    darkMode
                      ? 'bg-white/10 border-white/15 text-zinc-200 hover:bg-white/20'
                      : 'bg-white/60 border-white/70 text-[#23211E] hover:bg-white/85'
                  }`}
                >
                  {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Segmented Control */}
            <div
              className={`flex rounded-xl p-1 border ${
                darkMode
                  ? 'bg-black/30 border-white/10'
                  : 'bg-[#EAE4D7]/80 border-[#8C806E]/15'
              }`}
            >
              <button
                type="button"
                onClick={() => {
                  setMode('signin');
                  setError('');
                }}
                className={`ios-press flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                  mode === 'signin'
                    ? darkMode
                      ? 'bg-white/15 text-white shadow-xs border border-white/15'
                      : 'bg-white/85 text-[#23211E] shadow-xs border border-white/70'
                    : darkMode
                    ? 'text-zinc-400 hover:text-white'
                    : 'text-[#524C44] hover:text-[#23211E]'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('signup');
                  setError('');
                }}
                className={`ios-press flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                  mode === 'signup'
                    ? darkMode
                      ? 'bg-white/15 text-white shadow-xs border border-white/15'
                      : 'bg-white/85 text-[#23211E] shadow-xs border border-white/70'
                    : darkMode
                    ? 'text-zinc-400 hover:text-white'
                    : 'text-[#524C44] hover:text-[#23211E]'
                }`}
              >
                Create Account
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              {mode === 'signup' && (
                <div>
                  <label
                    className={`block text-[11px] font-semibold uppercase tracking-wider mb-2 ${
                      darkMode ? 'text-zinc-400' : 'text-[#6D665C]'
                    }`}
                  >
                    Member
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {TEAM_MEMBERS.map((m) => {
                      const active = memberName === m.name;
                      return (
                        <button
                          key={m.name}
                          type="button"
                          onClick={() => setMemberName(m.name)}
                          className={`ios-press flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-xl border text-left transition-all ${
                            active
                              ? darkMode
                                ? 'border-[#388BFD] bg-[#388BFD]/20 text-white'
                                : 'border-[#2E74B5] bg-[#2E74B5]/12 text-[#2E74B5]'
                              : darkMode
                              ? 'border-white/15 bg-white/8 text-zinc-200 hover:bg-white/12'
                              : 'border-white/70 bg-white/60 text-[#23211E] hover:bg-white/85'
                          }`}
                        >
                          <span
                            className="w-5 h-5 rounded-md flex items-center justify-center text-[9px] font-bold text-white"
                            style={{ backgroundColor: m.accentHex }}
                          >
                            {m.initials}
                          </span>
                          <span className="flex-1">{m.name}</span>
                          {active && <UserCheck className="w-3.5 h-3.5" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div>
                <label
                  className={`block text-[11px] font-semibold uppercase tracking-wider mb-1.5 ${
                    darkMode ? 'text-zinc-400' : 'text-[#6D665C]'
                  }`}
                >
                  Email
                </label>
                <div className="relative">
                  <Mail
                    className={`w-4 h-4 absolute left-3.5 top-3 ${
                      darkMode ? 'text-zinc-400' : 'text-[#8C806E]'
                    }`}
                  />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    className={`w-full pl-10 pr-3.5 py-2.5 text-sm rounded-xl focus:outline-none focus:ring-2 ${
                      darkMode
                        ? 'bg-black/30 border border-white/15 text-white placeholder:text-zinc-500 focus:border-[#388BFD] focus:ring-[#388BFD]/20'
                        : 'bg-white/65 border border-white/75 text-[#23211E] placeholder:text-[#787065] focus:bg-white/85 focus:border-[#2E74B5] focus:ring-[#2E74B5]/15'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label
                  className={`block text-[11px] font-semibold uppercase tracking-wider mb-1.5 ${
                    darkMode ? 'text-zinc-400' : 'text-[#6D665C]'
                  }`}
                >
                  Password
                </label>
                <div className="relative">
                  <Lock
                    className={`w-4 h-4 absolute left-3.5 top-3 ${
                      darkMode ? 'text-zinc-400' : 'text-[#8C806E]'
                    }`}
                  />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    className={`w-full pl-10 pr-3.5 py-2.5 text-sm rounded-xl focus:outline-none focus:ring-2 ${
                      darkMode
                        ? 'bg-black/30 border border-white/15 text-white placeholder:text-zinc-500 focus:border-[#388BFD] focus:ring-[#388BFD]/20'
                        : 'bg-white/65 border border-white/75 text-[#23211E] placeholder:text-[#787065] focus:bg-white/85 focus:border-[#2E74B5] focus:ring-[#2E74B5]/15'
                    }`}
                  />
                </div>
              </div>

              {error && (
                <div
                  className={`p-3 text-xs font-medium rounded-xl border ${
                    darkMode
                      ? 'text-[#FCA5A5] bg-[#DC2626]/20 border-[#DC2626]/35'
                      : 'text-[#C84B31] bg-[#C84B31]/10 border-[#C84B31]/25'
                  }`}
                >
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={busy}
                className="ios-press w-full py-3 px-4 bg-[#2E74B5] hover:bg-[#3682C9] disabled:opacity-60 text-white text-sm font-semibold rounded-xl shadow-[0_6px_18px_rgba(46,116,181,0.32)]"
              >
                {busy ? 'Signing in...' : mode === 'signin' ? 'Sign In' : 'Create Account'}
              </button>
            </form>

            {syncMode === 'local' && (
              <div
                className={`mt-6 pt-5 border-t ${
                  darkMode ? 'border-white/12' : 'border-[#8C806E]/20'
                }`}
              >
                <div
                  className={`text-[11px] font-semibold uppercase tracking-wider mb-2.5 ${
                    darkMode ? 'text-zinc-400' : 'text-[#8C806E]'
                  }`}
                >
                  Quick Sign-In
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {TEAM_MEMBERS.map((m) => (
                    <button
                      key={m.name}
                      type="button"
                      onClick={() => handleQuickSignIn(m.name)}
                      className={`ios-press flex items-center justify-center gap-1.5 py-2 px-2 text-xs font-semibold rounded-xl border ${
                        darkMode
                          ? 'bg-white/10 border-white/15 hover:bg-white/18 text-zinc-100'
                          : 'bg-white/60 border-white/70 hover:bg-white/85 text-[#23211E]'
                      }`}
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-xs"
                        style={{ backgroundColor: m.accentHex }}
                      />
                      {m.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
