import type { JournalEntry } from '../types';

export interface RequirementCheckpoint {
  id: string;
  text: string;
  done: boolean;
}

const CHECKPOINTS_PREFIX = '__LDOI_CP__:';

export function parseRequirementCheckpoints(raw: string): RequirementCheckpoint[] {
  if (!raw) return [];
  if (raw.startsWith(CHECKPOINTS_PREFIX)) {
    try {
      const parsed = JSON.parse(raw.slice(CHECKPOINTS_PREFIX.length));
      if (Array.isArray(parsed)) return parsed;
    } catch {
      return [];
    }
  }
  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((text, idx) => ({
      id: `cp_legacy_${idx}`,
      text,
      done: false,
    }));
}

export function serializeRequirementCheckpoints(items: RequirementCheckpoint[]): string {
  return `${CHECKPOINTS_PREFIX}${JSON.stringify(items)}`;
}

export interface PinPageData {
  title: string;
  bodyHtml: string;
  checklist: RequirementCheckpoint[];
  bgColor?: string;
}

const PIN_PAGE_JSON_PREFIX = '__JSON__:';

export function parsePinPageContent(rawNoteContent: string): PinPageData {
  const afterTag = rawNoteContent.startsWith('[PIN_PAGE]')
    ? rawNoteContent.slice('[PIN_PAGE]'.length)
    : rawNoteContent;

  if (afterTag.startsWith(PIN_PAGE_JSON_PREFIX)) {
    try {
      const parsed = JSON.parse(afterTag.slice(PIN_PAGE_JSON_PREFIX.length));
      return {
        title: typeof parsed.title === 'string' ? parsed.title : '',
        bodyHtml: typeof parsed.bodyHtml === 'string' ? parsed.bodyHtml : '',
        checklist: Array.isArray(parsed.checklist) ? parsed.checklist : [],
        bgColor: typeof parsed.bgColor === 'string' ? parsed.bgColor : undefined,
      };
    } catch {
      // fall through
    }
  }

  const newlineIdx = afterTag.indexOf('\n');
  const title = newlineIdx === -1 ? afterTag : afterTag.slice(0, newlineIdx);
  const body = newlineIdx === -1 ? '' : afterTag.slice(newlineIdx + 1);
  return {
    title,
    bodyHtml: body.replace(/\n/g, '<br />'),
    checklist: [],
  };
}

export function serializePinPageContent(data: PinPageData): string {
  return `[PIN_PAGE]${PIN_PAGE_JSON_PREFIX}${JSON.stringify(data)}`;
}

export type ConnectorStyle = 'arrow' | 'line' | 'dashed' | 'dotted';
export type AnchorSide = 'top' | 'right' | 'bottom' | 'left';

export interface BoardConnector {
  id: string;
  fromId: string;
  toId: string;
  fromAnchor?: AnchorSide;
  toAnchor?: AnchorSide;
  style: ConnectorStyle;
  color: string;
  segOffsets?: Record<number, number>;
}

export function loadBoardConnectors(projectId: string): BoardConnector[] {
  try {
    const raw = localStorage.getItem(`ldoi_board_conn_${projectId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveBoardConnectors(projectId: string, connectors: BoardConnector[]): void {
  try {
    localStorage.setItem(`ldoi_board_conn_${projectId}`, JSON.stringify(connectors));
  } catch {
    // ignore
  }
}

export interface BoardPos {
  x: number;
  y: number;
}

export type BoardPositions = Record<string, BoardPos>;

export function loadBoardPositions(projectId: string): BoardPositions {
  try {
    const raw = localStorage.getItem(`ldoi_board_pos_${projectId}`);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveBoardPositions(projectId: string, positions: BoardPositions): void {
  try {
    localStorage.setItem(`ldoi_board_pos_${projectId}`, JSON.stringify(positions));
  } catch {
    // ignore
  }
}

export interface BoardZone {
  id: string;
  title: string;
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
}

export function loadBoardZones(projectId: string): BoardZone[] {
  try {
    const raw = localStorage.getItem(`ldoi_board_zones_${projectId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveBoardZones(projectId: string, zones: BoardZone[]): void {
  try {
    localStorage.setItem(`ldoi_board_zones_${projectId}`, JSON.stringify(zones));
  } catch {
    // ignore
  }
}

export interface BoardStroke {
  id: string;
  points: [number, number][];
  color: string;
  width: number;
}

export function loadBoardStrokes(projectId: string): BoardStroke[] {
  try {
    const raw = localStorage.getItem(`ldoi_board_strokes_${projectId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveBoardStrokes(projectId: string, strokes: BoardStroke[]): void {
  try {
    localStorage.setItem(`ldoi_board_strokes_${projectId}`, JSON.stringify(strokes));
  } catch {
    // ignore
  }
}

export function getJournalBookName(entry: JournalEntry): string {
  const bookTag = entry.tags.find((t) => t.startsWith('book:'));
  return bookTag ? bookTag.slice(5) : 'Notes';
}

export function getJournalBookColor(entry: JournalEntry): string | null {
  const colorTag = entry.tags.find((t) => t.startsWith('color:'));
  return colorTag ? colorTag.slice(6) : null;
}

export function getJournalPlainText(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\u200B/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function getJournalPageSnippet(html: string): string {
  const plain = getJournalPlainText(html);
  if (!plain) return '';
  const words = plain.split(' ');
  return words.length > 7 ? `${words.slice(0, 7).join(' ')}...` : `${plain}...`;
}

export function convertJournalHtmlToPinPage(title: string, html: string): PinPageData {
  if (!html) {
    return { title, bodyHtml: '', checklist: [] };
  }
  try {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const checklist: RequirementCheckpoint[] = [];
    const rows = Array.from(doc.body.querySelectorAll('.ldoi-check-row'));
    rows.forEach((row, idx) => {
      const textEl = row.querySelector('.ldoi-check-text') ?? row;
      const text = (textEl.textContent ?? '').replace(/\u200B/g, '').trim();
      const input = row.querySelector('input[type="checkbox"]') as HTMLInputElement | null;
      const done =
        row.getAttribute('data-checked') === 'true' ||
        Boolean(input?.hasAttribute('checked')) ||
        Boolean(input?.checked);
      if (text) {
        checklist.push({
          id: `cp_imp_${Date.now()}_${idx}`,
          text,
          done,
        });
      }
      row.remove();
    });

    const bodyHtml = doc.body.innerHTML
      .replace(/\u200B/g, '')
      .replace(/^(<br\s*\/?>|\s)+|(<br\s*\/?>|\s)+$/gi, '')
      .trim();

    return {
      title,
      bodyHtml,
      checklist,
    };
  } catch {
    return {
      title,
      bodyHtml: html,
      checklist: [],
    };
  }
}
