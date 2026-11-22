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
