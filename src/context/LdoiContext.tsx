import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { isEmailAllowedForTeam, isSupabaseConfigured, supabase } from '../lib/supabase';
import type {
  DocType,
  Enquiry,
  ExpenseItem,
  JournalEntry,
  LiveCursorState,
  LiveTypingState,
  MemberName,
  Project,
  ProjectNote,
  QuotationDoc,
  UploadedDocument,
  WorkflowStep,
} from '../types';

interface LocalAccount {
  email: string;
  password: string;
  memberName: MemberName;
}

interface LdoiState {
  projects: Project[];
  workflowSteps: WorkflowStep[];
  projectNotes: ProjectNote[];
  expenses: ExpenseItem[];
  quotations: QuotationDoc[];
  documents: UploadedDocument[];
  enquiries: Enquiry[];
  journalEntries: JournalEntry[];
}

const EMPTY_STATE: LdoiState = {
  projects: [],
  workflowSteps: [],
  projectNotes: [],
  expenses: [],
  quotations: [],
  documents: [],
  enquiries: [],
  journalEntries: [],
};

const STORAGE_KEY = 'ldoi_workspace_state_v1';
const ACCOUNTS_KEY = 'ldoi_local_accounts_v1';
const SESSION_KEY = 'ldoi_local_session_v1';

function uid(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

interface LdoiContextValue extends LdoiState {
  currentUser: { email: string; name: MemberName } | null;
  authLoading: boolean;
  syncMode: 'supabase' | 'local';
  onlineMembers: MemberName[];
  liveTypingMap: Record<string, LiveTypingState>;
  liveCursorsMap: Record<string, LiveCursorState>;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string, memberName: MemberName) => Promise<{ error?: string }>;
  quickLocalSignIn: (memberName: MemberName) => void;
  signOut: () => Promise<void>;
  broadcastTyping: (targetKey: string, text: string) => void;
  broadcastCursor: (projectId: string, x: number, y: number) => void;

  createProject: (input: Omit<Project, 'id' | 'createdBy' | 'createdAt' | 'updatedAt' | 'liveNotebookText'>) => Promise<Project>;
  updateProject: (id: string, patch: Partial<Project>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;

  addWorkflowStep: (input: Omit<WorkflowStep, 'id' | 'createdAt'>) => Promise<void>;
  toggleWorkflowStep: (id: string) => Promise<void>;
  deleteWorkflowStep: (id: string) => Promise<void>;

  addProjectNote: (projectId: string, content: string) => Promise<void>;
  updateProjectNote: (id: string, content: string) => Promise<void>;
  deleteProjectNote: (id: string) => Promise<void>;
  addExpense: (input: Omit<ExpenseItem, 'id' | 'addedBy'>) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;

  saveQuotation: (input: Omit<QuotationDoc, 'id' | 'createdBy' | 'createdAt'> & { id?: string }) => Promise<QuotationDoc>;
  deleteQuotation: (id: string) => Promise<void>;

  uploadDocument: (file: File, meta: { projectId?: string; enquiryId?: string; docType: DocType }) => Promise<void>;
  deleteDocument: (id: string) => Promise<void>;

  createEnquiry: (input: Omit<Enquiry, 'id' | 'createdBy' | 'createdAt'>) => Promise<Enquiry>;
  updateEnquiry: (id: string, patch: Partial<Enquiry>) => Promise<void>;
  convertEnquiryToProject: (enquiryId: string) => Promise<Project | null>;
  deleteEnquiry: (id: string) => Promise<void>;

  createJournalEntry: (input: Omit<JournalEntry, 'id' | 'author' | 'createdAt' | 'updatedAt'>) => Promise<JournalEntry>;
  updateJournalEntry: (id: string, patch: Partial<JournalEntry>) => Promise<void>;
  deleteJournalEntry: (id: string) => Promise<void>;
}

const LdoiContext = createContext<LdoiContextValue | null>(null);

function loadLocalState(): LdoiState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_STATE;
    return { ...EMPTY_STATE, ...JSON.parse(raw) };
  } catch {
    return EMPTY_STATE;
  }
}

function saveLocalState(state: LdoiState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore quota errors
  }
}

export const LdoiProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const syncMode: 'supabase' | 'local' = isSupabaseConfigured ? 'supabase' : 'local';
  const [state, setState] = useState<LdoiState>(() => (syncMode === 'local' ? loadLocalState() : EMPTY_STATE));
  const [currentUser, setCurrentUser] = useState<{ email: string; name: MemberName } | null>(() => {
    if (syncMode === 'local') {
      try {
        const raw = sessionStorage.getItem(SESSION_KEY);
        return raw ? JSON.parse(raw) : null;
      } catch {
        return null;
      }
    }
    return null;
  });
  const [authLoading, setAuthLoading] = useState<boolean>(syncMode === 'supabase');
  const [onlineMembers, setOnlineMembers] = useState<MemberName[]>([]);
  const [liveTypingMap, setLiveTypingMap] = useState<Record<string, LiveTypingState>>({});
  const [liveCursorsMap, setLiveCursorsMap] = useState<Record<string, LiveCursorState>>({});

  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);
  const supabaseChannelRef = useRef<RealtimeChannel | null>(null);

  // Persist local state and notify other tabs
  const commitLocalState = useCallback((updater: (prev: LdoiState) => LdoiState) => {
    setState((prev) => {
      const next = updater(prev);
      saveLocalState(next);
      broadcastChannelRef.current?.postMessage({ type: 'STATE_SYNC', state: next });
      return next;
    });
  }, []);

  // Load all data from Supabase
  const fetchSupabaseAll = useCallback(async () => {
    if (!supabase) return;
    const [
      projRes,
      stepRes,
      noteRes,
      expRes,
      quotRes,
      docRes,
      enqRes,
      jourRes,
    ] = await Promise.all([
      supabase.from('projects').select('*').order('updated_at', { ascending: false }),
      supabase.from('workflow_steps').select('*').order('step_order', { ascending: true }),
      supabase.from('project_notes').select('*').order('created_at', { ascending: true }),
      supabase.from('expenses').select('*').order('date', { ascending: false }),
      supabase.from('quotations').select('*').order('created_at', { ascending: false }),
      supabase.from('documents').select('*').order('created_at', { ascending: false }),
      supabase.from('enquiries').select('*').order('created_at', { ascending: false }),
      supabase.from('journal_entries').select('*').order('updated_at', { ascending: false }),
    ]);

    setState({
      projects: (projRes.data ?? []).map((r) => ({
        id: r.id,
        title: r.title,
        clientName: r.client_name,
        category: r.category,
        status: r.status,
        requirements: r.requirements,
        teamIdea: r.team_idea,
        liveNotebookText: r.live_notebook_text,
        deadline: r.deadline,
        quotedAmountInr: Number(r.quoted_amount_inr || 0),
        budgetNotes: r.budget_notes,
        createdBy: r.created_by,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      })),
      workflowSteps: (stepRes.data ?? []).map((r) => ({
        id: r.id,
        projectId: r.project_id,
        stepOrder: r.step_order,
        title: r.title,
        assignee: r.assignee,
        dueDate: r.due_date,
        completed: r.completed,
        createdAt: r.created_at,
      })),
      projectNotes: (noteRes.data ?? []).map((r) => ({
        id: r.id,
        projectId: r.project_id,
        author: r.author,
        content: r.content,
        createdAt: r.created_at,
      })),
      expenses: (expRes.data ?? []).map((r) => ({
        id: r.id,
        projectId: r.project_id,
        label: r.label,
        category: r.category,
        amountInr: Number(r.amount_inr || 0),
        date: r.date,
        addedBy: r.added_by,
      })),
      quotations: (quotRes.data ?? []).map((r) => ({
        id: r.id,
        projectId: r.project_id ?? undefined,
        enquiryId: r.enquiry_id ?? undefined,
        number: r.number,
        title: r.title,
        clientName: r.client_name,
        type: r.type,
        items: r.items ?? [],
        taxPercent: Number(r.tax_percent ?? 18),
        notes: r.notes,
        validUntil: r.valid_until,
        createdBy: r.created_by,
        createdAt: r.created_at,
      })),
      documents: (docRes.data ?? []).map((r) => ({
        id: r.id,
        projectId: r.project_id ?? undefined,
        enquiryId: r.enquiry_id ?? undefined,
        name: r.name,
        docType: r.doc_type,
        fileSize: Number(r.file_size || 0),
        mimeType: r.mime_type,
        url: r.url,
        uploadedBy: r.uploaded_by,
        createdAt: r.created_at,
      })),
      enquiries: (enqRes.data ?? []).map((r) => ({
        id: r.id,
        clientName: r.client_name,
        contactInfo: r.contact_info,
        category: r.category,
        scopeSummary: r.scope_summary,
        estimatedBudgetInr: Number(r.estimated_budget_inr || 0),
        targetDate: r.target_date,
        status: r.status,
        notes: r.notes,
        convertedProjectId: r.converted_project_id ?? undefined,
        createdBy: r.created_by,
        createdAt: r.created_at,
      })),
      journalEntries: (jourRes.data ?? []).map((r) => ({
        id: r.id,
        kind: r.kind,
        title: r.title,
        content: r.content,
        tags: r.tags ?? [],
        projectId: r.project_id ?? undefined,
        author: r.author,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      })),
    });
  }, []);

  // Auth listener for Supabase
  useEffect(() => {
    if (syncMode !== 'supabase' || !supabase) return;

    supabase.auth.getSession().then(({ data }) => {
      const user = data.session?.user;
      if (user?.email) {
        const name = (user.user_metadata?.member_name as MemberName) || 'Hasan';
        setCurrentUser({ email: user.email, name });
      }
      setAuthLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user;
      if (user?.email) {
        const name = (user.user_metadata?.member_name as MemberName) || 'Hasan';
        setCurrentUser({ email: user.email, name });
      } else {
        setCurrentUser(null);
      }
    });

    return () => {
      sub.subscription.unsubscribe();
    };
  }, [syncMode]);

  // Realtime sync setup (Supabase OR Local BroadcastChannel)
  useEffect(() => {
    if (!currentUser) {
      setOnlineMembers([]);
      return;
    }

    if (syncMode === 'local') {
      const bc = new BroadcastChannel('ldoi-sync');
      broadcastChannelRef.current = bc;
      setOnlineMembers([currentUser.name]);
      bc.postMessage({ type: 'PRESENCE_PING', member: currentUser.name });

      bc.onmessage = (ev) => {
        const msg = ev.data;
        if (!msg) return;
        if (msg.type === 'STATE_SYNC' && msg.state) {
          setState(msg.state);
        } else if (msg.type === 'LIVE_TYPING' && msg.payload) {
          const p = msg.payload as LiveTypingState;
          setLiveTypingMap((prev) => ({ ...prev, [p.targetKey]: p }));
        } else if (msg.type === 'LIVE_CURSOR' && msg.payload) {
          const c = msg.payload as LiveCursorState;
          setLiveCursorsMap((prev) => ({ ...prev, [`${c.projectId}:${c.member}`]: c }));
        } else if (msg.type === 'PRESENCE_PING' && msg.member) {
          setOnlineMembers((prev) => (prev.includes(msg.member) ? prev : [...prev, msg.member]));
          bc.postMessage({ type: 'PRESENCE_PONG', member: currentUser.name });
        } else if (msg.type === 'PRESENCE_PONG' && msg.member) {
          setOnlineMembers((prev) => (prev.includes(msg.member) ? prev : [...prev, msg.member]));
        }
      };

      const onStorage = (e: StorageEvent) => {
        if (e.key === STORAGE_KEY && e.newValue) {
          try {
            setState({ ...EMPTY_STATE, ...JSON.parse(e.newValue) });
          } catch {
            // ignore
          }
        }
      };
      window.addEventListener('storage', onStorage);

      return () => {
        window.removeEventListener('storage', onStorage);
        bc.close();
        broadcastChannelRef.current = null;
      };
    }

    // Supabase Realtime
    if (!supabase) return;
    fetchSupabaseAll();

    const channel = supabase.channel('ldoi-live-room', {
      config: {
        presence: { key: currentUser.name },
        broadcast: { self: false },
      },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const presenceState = channel.presenceState();
        const members = Object.keys(presenceState) as MemberName[];
        setOnlineMembers(members);
      })
      .on('broadcast', { event: 'live-typing' }, ({ payload }) => {
        const p = payload as LiveTypingState;
        if (!p?.targetKey) return;
        setLiveTypingMap((prev) => ({ ...prev, [p.targetKey]: p }));
      })
      .on('broadcast', { event: 'live-cursor' }, ({ payload }) => {
        const c = payload as LiveCursorState;
        if (!c?.projectId || !c?.member) return;
        setLiveCursorsMap((prev) => ({ ...prev, [`${c.projectId}:${c.member}`]: c }));
      })
      .on('postgres_changes', { event: '*', schema: 'public' }, () => {
        fetchSupabaseAll();
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ member: currentUser.name, onlineAt: new Date().toISOString() });
        }
      });

    supabaseChannelRef.current = channel;

    return () => {
      supabase?.removeChannel(channel);
      supabaseChannelRef.current = null;
    };
  }, [currentUser, syncMode, fetchSupabaseAll]);

  // Clear stale live typing indicators after 3.5 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      setLiveTypingMap((prev) => {
        let changed = false;
        const next: Record<string, LiveTypingState> = {};
        for (const [k, v] of Object.entries(prev)) {
          if (now - v.updatedAt < 3500) {
            next[k] = v;
          } else {
            changed = true;
          }
        }
        return changed ? next : prev;
      });
      setLiveCursorsMap((prev) => {
        let changed = false;
        const next: Record<string, LiveCursorState> = {};
        for (const [k, v] of Object.entries(prev)) {
          if (now - v.updatedAt < 6000) {
            next[k] = v;
          } else {
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    }, 1200);
    return () => clearInterval(timer);
  }, []);

  const broadcastTyping = useCallback(
    (targetKey: string, text: string) => {
      if (!currentUser) return;
      const payload: LiveTypingState = {
        targetKey,
        author: currentUser.name,
        text,
        updatedAt: Date.now(),
      };
      if (syncMode === 'local') {
        broadcastChannelRef.current?.postMessage({ type: 'LIVE_TYPING', payload });
      } else {
        supabaseChannelRef.current?.send({
          type: 'broadcast',
          event: 'live-typing',
          payload,
        });
      }
    },
    [currentUser, syncMode]
  );

  const broadcastCursor = useCallback(
    (projectId: string, x: number, y: number) => {
      if (!currentUser) return;
      const payload: LiveCursorState = {
        projectId,
        member: currentUser.name,
        x,
        y,
        updatedAt: Date.now(),
      };
      if (syncMode === 'local') {
        broadcastChannelRef.current?.postMessage({ type: 'LIVE_CURSOR', payload });
      } else {
        supabaseChannelRef.current?.send({
          type: 'broadcast',
          event: 'live-cursor',
          payload,
        });
      }
    },
    [currentUser, syncMode]
  );

  // Auth actions
  const signIn = useCallback(
    async (email: string, password: string): Promise<{ error?: string }> => {
      const cleanEmail = email.trim().toLowerCase();
      if (!isEmailAllowedForTeam(cleanEmail)) {
        return { error: 'This email is not on the 4-member LDOI allowlist.' };
      }
      if (syncMode === 'supabase' && supabase) {
        const { error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
        if (error) return { error: error.message };
        return {};
      }
      // Local mode
      const raw = localStorage.getItem(ACCOUNTS_KEY);
      const accounts: LocalAccount[] = raw ? JSON.parse(raw) : [];
      const found = accounts.find((a) => a.email === cleanEmail && a.password === password);
      if (!found) {
        return { error: 'Invalid email or password. Sign up first or use Quick Member Sign-In below.' };
      }
      const userObj = { email: found.email, name: found.memberName };
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(userObj));
      setCurrentUser(userObj);
      return {};
    },
    [syncMode]
  );

  const signUp = useCallback(
    async (email: string, password: string, memberName: MemberName): Promise<{ error?: string }> => {
      const cleanEmail = email.trim().toLowerCase();
      if (!isEmailAllowedForTeam(cleanEmail)) {
        return { error: 'Sign-up is restricted to the 4 founding team emails.' };
      }
      if (password.length < 6) {
        return { error: 'Password must be at least 6 characters.' };
      }
      if (syncMode === 'supabase' && supabase) {
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: { data: { member_name: memberName } },
        });
        if (error) return { error: error.message };
        if (!data.session) {
          return { error: 'Account created. Check your email to confirm, then sign in.' };
        }
        return {};
      }
      // Local mode
      const raw = localStorage.getItem(ACCOUNTS_KEY);
      const accounts: LocalAccount[] = raw ? JSON.parse(raw) : [];
      if (accounts.some((a) => a.email === cleanEmail)) {
        return { error: 'An account with this email already exists.' };
      }
      accounts.push({ email: cleanEmail, password, memberName });
      localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
      const userObj = { email: cleanEmail, name: memberName };
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(userObj));
      setCurrentUser(userObj);
      return {};
    },
    [syncMode]
  );

  const quickLocalSignIn = useCallback((memberName: MemberName) => {
    const userObj = { email: `${memberName.toLowerCase()}@ldoi.local`, name: memberName };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(userObj));
    setCurrentUser(userObj);
  }, []);

  const signOut = useCallback(async () => {
    if (syncMode === 'supabase' && supabase) {
      await supabase.auth.signOut();
    } else {
      sessionStorage.removeItem(SESSION_KEY);
      setCurrentUser(null);
    }
  }, [syncMode]);

  // Projects CRUD
  const createProject = useCallback(
    async (input: Omit<Project, 'id' | 'createdBy' | 'createdAt' | 'updatedAt' | 'liveNotebookText'>) => {
      const now = new Date().toISOString();
      const proj: Project = {
        ...input,
        id: uid('proj'),
        liveNotebookText: '',
        createdBy: currentUser?.name ?? 'Hasan',
        createdAt: now,
        updatedAt: now,
      };
      if (syncMode === 'supabase' && supabase) {
        await supabase.from('projects').insert({
          id: proj.id,
          title: proj.title,
          client_name: proj.clientName,
          category: proj.category,
          status: proj.status,
          requirements: proj.requirements,
          team_idea: proj.teamIdea,
          live_notebook_text: proj.liveNotebookText,
          deadline: proj.deadline,
          quoted_amount_inr: proj.quotedAmountInr,
          budget_notes: proj.budgetNotes,
          created_by: proj.createdBy,
          created_at: proj.createdAt,
          updated_at: proj.updatedAt,
        });
      }
      commitLocalState((prev) => ({ ...prev, projects: [proj, ...prev.projects] }));
      return proj;
    },
    [currentUser, syncMode, commitLocalState]
  );

  const updateProject = useCallback(
    async (id: string, patch: Partial<Project>) => {
      const updatedAt = new Date().toISOString();
      if (syncMode === 'supabase' && supabase) {
        const dbPatch: Record<string, unknown> = { updated_at: updatedAt };
        if (patch.title !== undefined) dbPatch.title = patch.title;
        if (patch.clientName !== undefined) dbPatch.client_name = patch.clientName;
        if (patch.category !== undefined) dbPatch.category = patch.category;
        if (patch.status !== undefined) dbPatch.status = patch.status;
        if (patch.requirements !== undefined) dbPatch.requirements = patch.requirements;
        if (patch.teamIdea !== undefined) dbPatch.team_idea = patch.teamIdea;
        if (patch.liveNotebookText !== undefined) dbPatch.live_notebook_text = patch.liveNotebookText;
        if (patch.deadline !== undefined) dbPatch.deadline = patch.deadline;
        if (patch.quotedAmountInr !== undefined) dbPatch.quoted_amount_inr = patch.quotedAmountInr;
        if (patch.budgetNotes !== undefined) dbPatch.budget_notes = patch.budgetNotes;
        await supabase.from('projects').update(dbPatch).eq('id', id);
      }
      commitLocalState((prev) => ({
        ...prev,
        projects: prev.projects.map((p) => (p.id === id ? { ...p, ...patch, updatedAt } : p)),
      }));
    },
    [syncMode, commitLocalState]
  );

  const deleteProject = useCallback(
    async (id: string) => {
      if (syncMode === 'supabase' && supabase) {
        await supabase.from('projects').delete().eq('id', id);
      }
      commitLocalState((prev) => ({
        ...prev,
        projects: prev.projects.filter((p) => p.id !== id),
        workflowSteps: prev.workflowSteps.filter((w) => w.projectId !== id),
        projectNotes: prev.projectNotes.filter((n) => n.projectId !== id),
        expenses: prev.expenses.filter((e) => e.projectId !== id),
      }));
    },
    [syncMode, commitLocalState]
  );

  // Workflow Steps
  const addWorkflowStep = useCallback(
    async (input: Omit<WorkflowStep, 'id' | 'createdAt'>) => {
      const step: WorkflowStep = { ...input, id: uid('step'), createdAt: new Date().toISOString() };
      if (syncMode === 'supabase' && supabase) {
        await supabase.from('workflow_steps').insert({
          id: step.id,
          project_id: step.projectId,
          step_order: step.stepOrder,
          title: step.title,
          assignee: step.assignee,
          due_date: step.dueDate,
          completed: step.completed,
          created_at: step.createdAt,
        });
      }
      commitLocalState((prev) => ({ ...prev, workflowSteps: [...prev.workflowSteps, step] }));
    },
    [syncMode, commitLocalState]
  );

  const toggleWorkflowStep = useCallback(
    async (id: string) => {
      const target = state.workflowSteps.find((s) => s.id === id);
      if (!target) return;
      const nextVal = !target.completed;
      if (syncMode === 'supabase' && supabase) {
        await supabase.from('workflow_steps').update({ completed: nextVal }).eq('id', id);
      }
      commitLocalState((prev) => ({
        ...prev,
        workflowSteps: prev.workflowSteps.map((s) => (s.id === id ? { ...s, completed: nextVal } : s)),
      }));
    },
    [state.workflowSteps, syncMode, commitLocalState]
  );

  const deleteWorkflowStep = useCallback(
    async (id: string) => {
      if (syncMode === 'supabase' && supabase) {
        await supabase.from('workflow_steps').delete().eq('id', id);
      }
      commitLocalState((prev) => ({
        ...prev,
        workflowSteps: prev.workflowSteps.filter((s) => s.id !== id),
      }));
    },
    [syncMode, commitLocalState]
  );

  // Project Notes
  const addProjectNote = useCallback(
    async (projectId: string, content: string) => {
      const note: ProjectNote = {
        id: uid('note'),
        projectId,
        author: currentUser?.name ?? 'Hasan',
        content,
        createdAt: new Date().toISOString(),
      };
      if (syncMode === 'supabase' && supabase) {
        await supabase.from('project_notes').insert({
          id: note.id,
          project_id: note.projectId,
          author: note.author,
          content: note.content,
          created_at: note.createdAt,
        });
      }
      commitLocalState((prev) => ({ ...prev, projectNotes: [...prev.projectNotes, note] }));
    },
    [currentUser, syncMode, commitLocalState]
  );

  const updateProjectNote = useCallback(
    async (id: string, content: string) => {
      if (syncMode === 'supabase' && supabase) {
        await supabase.from('project_notes').update({ content }).eq('id', id);
      }
      commitLocalState((prev) => ({
        ...prev,
        projectNotes: prev.projectNotes.map((n) => (n.id === id ? { ...n, content } : n)),
      }));
    },
    [syncMode, commitLocalState]
  );

  const deleteProjectNote = useCallback(
    async (id: string) => {
      if (syncMode === 'supabase' && supabase) {
        await supabase.from('project_notes').delete().eq('id', id);
      }
      commitLocalState((prev) => ({
        ...prev,
        projectNotes: prev.projectNotes.filter((n) => n.id !== id),
      }));
    },
    [syncMode, commitLocalState]
  );

  // Expenses
  const addExpense = useCallback(
    async (input: Omit<ExpenseItem, 'id' | 'addedBy'>) => {
      const exp: ExpenseItem = { ...input, id: uid('exp'), addedBy: currentUser?.name ?? 'Hasan' };
      if (syncMode === 'supabase' && supabase) {
        await supabase.from('expenses').insert({
          id: exp.id,
          project_id: exp.projectId,
          label: exp.label,
          category: exp.category,
          amount_inr: exp.amountInr,
          date: exp.date,
          added_by: exp.addedBy,
        });
      }
      commitLocalState((prev) => ({ ...prev, expenses: [exp, ...prev.expenses] }));
    },
    [currentUser, syncMode, commitLocalState]
  );

  const deleteExpense = useCallback(
    async (id: string) => {
      if (syncMode === 'supabase' && supabase) {
        await supabase.from('expenses').delete().eq('id', id);
      }
      commitLocalState((prev) => ({ ...prev, expenses: prev.expenses.filter((e) => e.id !== id) }));
    },
    [syncMode, commitLocalState]
  );

  // Quotations & Proposals
  const saveQuotation = useCallback(
    async (input: Omit<QuotationDoc, 'id' | 'createdBy' | 'createdAt'> & { id?: string }) => {
      const existing = input.id ? state.quotations.find((q) => q.id === input.id) : undefined;
      const doc: QuotationDoc = {
        ...input,
        id: existing?.id ?? uid('quot'),
        createdBy: existing?.createdBy ?? currentUser?.name ?? 'Hasan',
        createdAt: existing?.createdAt ?? new Date().toISOString(),
      };
      if (syncMode === 'supabase' && supabase) {
        await supabase.from('quotations').upsert({
          id: doc.id,
          project_id: doc.projectId ?? null,
          enquiry_id: doc.enquiryId ?? null,
          number: doc.number,
          title: doc.title,
          client_name: doc.clientName,
          type: doc.type,
          items: doc.items,
          tax_percent: doc.taxPercent,
          notes: doc.notes,
          valid_until: doc.validUntil,
          created_by: doc.createdBy,
          created_at: doc.createdAt,
        });
      }
      commitLocalState((prev) => ({
        ...prev,
        quotations: existing
          ? prev.quotations.map((q) => (q.id === doc.id ? doc : q))
          : [doc, ...prev.quotations],
      }));
      return doc;
    },
    [state.quotations, currentUser, syncMode, commitLocalState]
  );

  const deleteQuotation = useCallback(
    async (id: string) => {
      if (syncMode === 'supabase' && supabase) {
        await supabase.from('quotations').delete().eq('id', id);
      }
      commitLocalState((prev) => ({ ...prev, quotations: prev.quotations.filter((q) => q.id !== id) }));
    },
    [syncMode, commitLocalState]
  );

  // Documents upload
  const uploadDocument = useCallback(
    async (file: File, meta: { projectId?: string; enquiryId?: string; docType: DocType }) => {
      const id = uid('doc');
      let url = '';
      if (syncMode === 'supabase' && supabase) {
        const path = `${meta.projectId || meta.enquiryId || 'general'}/${id}_${file.name}`;
        const { error } = await supabase.storage.from('ldoi-documents').upload(path, file);
        if (!error) {
          const { data } = supabase.storage.from('ldoi-documents').getPublicUrl(path);
          url = data.publicUrl;
        }
      } else {
        url = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result || ''));
          reader.readAsDataURL(file);
        });
      }

      const doc: UploadedDocument = {
        id,
        projectId: meta.projectId,
        enquiryId: meta.enquiryId,
        name: file.name,
        docType: meta.docType,
        fileSize: file.size,
        mimeType: file.type,
        url,
        uploadedBy: currentUser?.name ?? 'Hasan',
        createdAt: new Date().toISOString(),
      };

      if (syncMode === 'supabase' && supabase) {
        await supabase.from('documents').insert({
          id: doc.id,
          project_id: doc.projectId ?? null,
          enquiry_id: doc.enquiryId ?? null,
          name: doc.name,
          doc_type: doc.docType,
          file_size: doc.fileSize,
          mime_type: doc.mimeType,
          url: doc.url,
          uploaded_by: doc.uploadedBy,
          created_at: doc.createdAt,
        });
      }
      commitLocalState((prev) => ({ ...prev, documents: [doc, ...prev.documents] }));
    },
    [currentUser, syncMode, commitLocalState]
  );

  const deleteDocument = useCallback(
    async (id: string) => {
      const target = state.documents.find((d) => d.id === id);
      if (syncMode === 'supabase' && supabase) {
        if (target?.url) {
          const marker = '/object/public/ldoi-documents/';
          const idx = target.url.indexOf(marker);
          const storagePath =
            idx !== -1
              ? decodeURIComponent(target.url.slice(idx + marker.length))
              : `${target.projectId || target.enquiryId || 'general'}/${target.id}_${target.name}`;
          await supabase.storage.from('ldoi-documents').remove([storagePath]);
        }
        await supabase.from('documents').delete().eq('id', id);
      }
      commitLocalState((prev) => ({ ...prev, documents: prev.documents.filter((d) => d.id !== id) }));
    },
    [state.documents, syncMode, commitLocalState]
  );

  // Enquiries
  const createEnquiry = useCallback(
    async (input: Omit<Enquiry, 'id' | 'createdBy' | 'createdAt'>) => {
      const enq: Enquiry = {
        ...input,
        id: uid('enq'),
        createdBy: currentUser?.name ?? 'Hasan',
        createdAt: new Date().toISOString(),
      };
      if (syncMode === 'supabase' && supabase) {
        await supabase.from('enquiries').insert({
          id: enq.id,
          client_name: enq.clientName,
          contact_info: enq.contactInfo,
          category: enq.category,
          scope_summary: enq.scopeSummary,
          estimated_budget_inr: enq.estimatedBudgetInr,
          target_date: enq.targetDate,
          status: enq.status,
          notes: enq.notes,
          created_by: enq.createdBy,
          created_at: enq.createdAt,
        });
      }
      commitLocalState((prev) => ({ ...prev, enquiries: [enq, ...prev.enquiries] }));
      return enq;
    },
    [currentUser, syncMode, commitLocalState]
  );

  const updateEnquiry = useCallback(
    async (id: string, patch: Partial<Enquiry>) => {
      if (syncMode === 'supabase' && supabase) {
        const dbPatch: Record<string, unknown> = {};
        if (patch.clientName !== undefined) dbPatch.client_name = patch.clientName;
        if (patch.contactInfo !== undefined) dbPatch.contact_info = patch.contactInfo;
        if (patch.category !== undefined) dbPatch.category = patch.category;
        if (patch.scopeSummary !== undefined) dbPatch.scope_summary = patch.scopeSummary;
        if (patch.estimatedBudgetInr !== undefined) dbPatch.estimated_budget_inr = patch.estimatedBudgetInr;
        if (patch.targetDate !== undefined) dbPatch.target_date = patch.targetDate;
        if (patch.status !== undefined) dbPatch.status = patch.status;
        if (patch.notes !== undefined) dbPatch.notes = patch.notes;
        if (patch.convertedProjectId !== undefined) dbPatch.converted_project_id = patch.convertedProjectId;
        await supabase.from('enquiries').update(dbPatch).eq('id', id);
      }
      commitLocalState((prev) => ({
        ...prev,
        enquiries: prev.enquiries.map((e) => (e.id === id ? { ...e, ...patch } : e)),
      }));
    },
    [syncMode, commitLocalState]
  );

  const convertEnquiryToProject = useCallback(
    async (enquiryId: string): Promise<Project | null> => {
      const enq = state.enquiries.find((e) => e.id === enquiryId);
      if (!enq) return null;
      const proj = await createProject({
        title: `${enq.clientName} ${enq.category}`,
        clientName: enq.clientName,
        category: enq.category,
        status: 'Planning',
        requirements: enq.scopeSummary,
        teamIdea: enq.notes,
        deadline: enq.targetDate,
        quotedAmountInr: enq.estimatedBudgetInr,
        budgetNotes: `Converted from enquiry (${enq.contactInfo || 'no contact listed'})`,
      });
      await updateEnquiry(enquiryId, { status: 'Won', convertedProjectId: proj.id });
      return proj;
    },
    [state.enquiries, createProject, updateEnquiry]
  );

  const deleteEnquiry = useCallback(
    async (id: string) => {
      if (syncMode === 'supabase' && supabase) {
        await supabase.from('enquiries').delete().eq('id', id);
      }
      commitLocalState((prev) => ({ ...prev, enquiries: prev.enquiries.filter((e) => e.id !== id) }));
    },
    [syncMode, commitLocalState]
  );

  // Journal Entries
  const createJournalEntry = useCallback(
    async (input: Omit<JournalEntry, 'id' | 'author' | 'createdAt' | 'updatedAt'>) => {
      const now = new Date().toISOString();
      const entry: JournalEntry = {
        ...input,
        id: uid('jour'),
        author: currentUser?.name ?? 'Hasan',
        createdAt: now,
        updatedAt: now,
      };
      if (syncMode === 'supabase' && supabase) {
        await supabase.from('journal_entries').insert({
          id: entry.id,
          kind: entry.kind,
          title: entry.title,
          content: entry.content,
          tags: entry.tags,
          project_id: entry.projectId ?? null,
          author: entry.author,
          created_at: entry.createdAt,
          updated_at: entry.updatedAt,
        });
      }
      commitLocalState((prev) => ({ ...prev, journalEntries: [entry, ...prev.journalEntries] }));
      return entry;
    },
    [currentUser, syncMode, commitLocalState]
  );

  const updateJournalEntry = useCallback(
    async (id: string, patch: Partial<JournalEntry>) => {
      const updatedAt = new Date().toISOString();
      if (syncMode === 'supabase' && supabase) {
        const dbPatch: Record<string, unknown> = { updated_at: updatedAt };
        if (patch.kind !== undefined) dbPatch.kind = patch.kind;
        if (patch.title !== undefined) dbPatch.title = patch.title;
        if (patch.content !== undefined) dbPatch.content = patch.content;
        if (patch.tags !== undefined) dbPatch.tags = patch.tags;
        if (patch.projectId !== undefined) dbPatch.project_id = patch.projectId ?? null;
        await supabase.from('journal_entries').update(dbPatch).eq('id', id);
      }
      commitLocalState((prev) => ({
        ...prev,
        journalEntries: prev.journalEntries.map((j) => (j.id === id ? { ...j, ...patch, updatedAt } : j)),
      }));
    },
    [syncMode, commitLocalState]
  );

  const deleteJournalEntry = useCallback(
    async (id: string) => {
      if (syncMode === 'supabase' && supabase) {
        await supabase.from('journal_entries').delete().eq('id', id);
      }
      commitLocalState((prev) => ({
        ...prev,
        journalEntries: prev.journalEntries.filter((j) => j.id !== id),
      }));
    },
    [syncMode, commitLocalState]
  );

  const value = useMemo<LdoiContextValue>(
    () => ({
      ...state,
      currentUser,
      authLoading,
      syncMode,
      onlineMembers,
      liveTypingMap,
      liveCursorsMap,
      signIn,
      signUp,
      quickLocalSignIn,
      signOut,
      broadcastTyping,
      broadcastCursor,
      createProject,
      updateProject,
      deleteProject,
      addWorkflowStep,
      toggleWorkflowStep,
      deleteWorkflowStep,
      addProjectNote,
      updateProjectNote,
      deleteProjectNote,
      addExpense,
      deleteExpense,
      saveQuotation,
      deleteQuotation,
      uploadDocument,
      deleteDocument,
      createEnquiry,
      updateEnquiry,
      convertEnquiryToProject,
      deleteEnquiry,
      createJournalEntry,
      updateJournalEntry,
      deleteJournalEntry,
    }),
    [
      state,
      currentUser,
      authLoading,
      syncMode,
      onlineMembers,
      liveTypingMap,
      liveCursorsMap,
      signIn,
      signUp,
      quickLocalSignIn,
      signOut,
      broadcastTyping,
      broadcastCursor,
      createProject,
      updateProject,
      deleteProject,
      addWorkflowStep,
      toggleWorkflowStep,
      deleteWorkflowStep,
      addProjectNote,
      updateProjectNote,
      deleteProjectNote,
      addExpense,
      deleteExpense,
      saveQuotation,
      deleteQuotation,
      uploadDocument,
      deleteDocument,
      createEnquiry,
      updateEnquiry,
      convertEnquiryToProject,
      deleteEnquiry,
      createJournalEntry,
      updateJournalEntry,
      deleteJournalEntry,
    ]
  );

  return <LdoiContext.Provider value={value}>{children}</LdoiContext.Provider>;
};

export function useLdoi(): LdoiContextValue {
  const ctx = useContext(LdoiContext);
  if (!ctx) throw new Error('useLdoi must be used inside LdoiProvider');
  return ctx;
}
