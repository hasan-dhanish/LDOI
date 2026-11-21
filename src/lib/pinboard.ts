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
  // Backward compatibility for plain-text requirements
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
