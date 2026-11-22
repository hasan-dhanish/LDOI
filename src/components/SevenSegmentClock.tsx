import React from 'react';

type SegmentKey = 'a' | 'b' | 'c' | 'd' | 'e' | 'f' | 'g';

const DIGIT_SEGMENTS: Record<string, ReadonlySet<SegmentKey>> = {
  '0': new Set(['a', 'b', 'c', 'd', 'e', 'f']),
  '1': new Set(['b', 'c']),
  '2': new Set(['a', 'b', 'd', 'e', 'g']),
  '3': new Set(['a', 'b', 'c', 'd', 'g']),
  '4': new Set(['b', 'c', 'f', 'g']),
  '5': new Set(['a', 'c', 'd', 'f', 'g']),
  '6': new Set(['a', 'c', 'd', 'e', 'f', 'g']),
  '7': new Set(['a', 'b', 'c']),
  '8': new Set(['a', 'b', 'c', 'd', 'e', 'f', 'g']),
  '9': new Set(['a', 'b', 'c', 'd', 'f', 'g']),
};

const SEGMENT_POLYGONS: Record<SegmentKey, string> = {
  a: '6,2 30,2 27,7 9,7',
  b: '34,5 34,27 32,29 29,26 29,8',
  c: '32,31 34,33 34,55 29,52 29,34',
  d: '9,53 27,53 30,58 6,58',
  e: '4,31 7,34 7,52 2,55 2,33',
  f: '2,5 7,8 7,26 4,29 2,27',
  g: '7,27.5 29,27.5 32,30 29,32.5 7,32.5 4,30',
};

const SEGMENT_KEYS: SegmentKey[] = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];

interface SevenSegmentDigitProps {
  digit: string;
  className?: string;
}

const SevenSegmentDigit: React.FC<SevenSegmentDigitProps> = ({
  digit,
  className = 'h-9 w-[22px] sm:h-10 sm:w-[25px]',
}) => {
  const active = DIGIT_SEGMENTS[digit];
  return (
    <svg
      viewBox="-3 0 42 60"
      className={className}
      aria-hidden="true"
    >
      <g transform="translate(18, 30) skewX(-5) translate(-18, -30)">
        {SEGMENT_KEYS.map((key) => {
          const isOn = active?.has(key) ?? false;
          return (
            <polygon
              key={key}
              points={SEGMENT_POLYGONS[key]}
              fill="currentColor"
              className="transition-opacity duration-150"
              style={{ opacity: isOn ? 1 : 0.09 }}
            />
          );
        })}
      </g>
    </svg>
  );
};

interface SevenSegmentClockProps {
  hours: string;
  minutes: string;
  seconds: string;
  period: string;
}

export const SevenSegmentClock: React.FC<SevenSegmentClockProps> = ({
  hours,
  minutes,
  seconds,
  period,
}) => {
  const [h1, h2] = hours.padStart(2, '0').split('');
  const [m1, m2] = minutes.padStart(2, '0').split('');
  const [s1, s2] = seconds.padStart(2, '0').split('');

  return (
    <div
      className="flex items-center gap-2.5 pr-4 border-r border-[#E2E0D8]"
      aria-label={`${hours}:${minutes}:${seconds} ${period}`}
    >
      <div className="flex items-center gap-1 text-[#1C1C1E]">
        <SevenSegmentDigit digit={h1} />
        <SevenSegmentDigit digit={h2} />

        {/* 7-segment style colon */}
        <svg
          viewBox="0 0 12 60"
          className="h-9 w-2.5 sm:h-10 sm:w-3 text-[#0A5386] animate-pulse"
          aria-hidden="true"
        >
          <g transform="translate(6, 30) skewX(-5) translate(-6, -30)">
            <rect x="3.5" y="17" width="5" height="5" rx="1" fill="currentColor" />
            <rect x="3.5" y="38" width="5" height="5" rx="1" fill="currentColor" />
          </g>
        </svg>

        <SevenSegmentDigit digit={m1} />
        <SevenSegmentDigit digit={m2} />
      </div>

      <div className="flex flex-col items-start justify-between h-9 sm:h-10 py-0.5">
        <span className="inline-flex items-center gap-0.5 px-1.5 py-1 rounded-md bg-[#0A5386]/10 text-[#0A5386] leading-none">
          <SevenSegmentDigit digit={s1} className="h-3 w-[7.5px]" />
          <SevenSegmentDigit digit={s2} className="h-3 w-[7.5px]" />
        </span>
        <span className="text-[10px] font-bold tracking-wider text-[#8E8E93] leading-none pl-0.5">
          {period}
        </span>
      </div>
    </div>
  );
};
