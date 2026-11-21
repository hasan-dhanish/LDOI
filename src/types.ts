export type MemberName = 'Hasan' | 'Aathavan' | 'Allen' | 'Harsath';

export interface TeamMember {
  name: MemberName;
  initials: string;
  defaultEmailHint: string;
  accentHex: string;
}

export type ProjectCategory = 'ERP' | 'POS' | 'SaaS' | 'Hardware' | 'Other';
export type ProjectStatus = 'Planning' | 'Active' | 'Review' | 'Completed' | 'Archived';
export type EnquiryStatus = 'New' | 'Discussing' | 'Quoted' | 'Won' | 'Dropped';
export type ExpenseCategory = 'Development' | 'Infrastructure' | 'Hardware' | 'Operations' | 'Other';
export type DocType = 'Quotation' | 'Proposal' | 'Contract' | 'Spec' | 'Other';
export type JournalKind = 'Idea' | 'Learning';

export interface WorkflowStep {
  id: string;
  projectId: string;
  stepOrder: number;
  title: string;
  assignee: MemberName;
  dueDate: string;
  completed: boolean;
  createdAt: string;
}

export interface ProjectNote {
  id: string;
  projectId: string;
  author: MemberName;
  content: string;
  createdAt: string;
}

export interface ExpenseItem {
  id: string;
  projectId: string;
  label: string;
  category: ExpenseCategory;
  amountInr: number;
  date: string;
  addedBy: MemberName;
}

export interface QuotationLineItem {
  id: string;
  description: string;
  qty: number;
  unitPriceInr: number;
}

export interface QuotationDoc {
  id: string;
  projectId?: string;
  enquiryId?: string;
  number: string;
  title: string;
  clientName: string;
  type: 'Quotation' | 'Proposal';
  items: QuotationLineItem[];
  taxPercent: number;
  notes: string;
  validUntil: string;
  createdBy: MemberName;
  createdAt: string;
}

export interface UploadedDocument {
  id: string;
  projectId?: string;
  enquiryId?: string;
  name: string;
  docType: DocType;
  fileSize: number;
  mimeType: string;
  url: string;
  uploadedBy: MemberName;
  createdAt: string;
}

export interface Project {
  id: string;
  title: string;
  clientName: string;
  category: ProjectCategory;
  status: ProjectStatus;
  requirements: string;
  teamIdea: string;
  liveNotebookText: string;
  deadline: string;
  quotedAmountInr: number;
  budgetNotes: string;
  createdBy: MemberName;
  createdAt: string;
  updatedAt: string;
}

export interface Enquiry {
  id: string;
  clientName: string;
  contactInfo: string;
  category: ProjectCategory;
  scopeSummary: string;
  estimatedBudgetInr: number;
  targetDate: string;
  status: EnquiryStatus;
  notes: string;
  convertedProjectId?: string;
  createdBy: MemberName;
  createdAt: string;
}

export interface JournalEntry {
  id: string;
  kind: JournalKind;
  title: string;
  content: string;
  tags: string[];
  projectId?: string;
  author: MemberName;
  createdAt: string;
  updatedAt: string;
}

export interface LiveTypingState {
  targetKey: string; // e.g. "project-notebook:<id>" or "journal:<id>"
  author: MemberName;
  text: string;
  updatedAt: number;
}

export type ActiveTab =
  | 'dashboard'
  | 'projects'
  | 'enquiries'
  | 'deadlines'
  | 'journal'
  | 'quotations';
