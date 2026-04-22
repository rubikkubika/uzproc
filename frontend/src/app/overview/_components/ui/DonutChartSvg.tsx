'use client';

import React from 'react';

const R = 61;
const CX = 70;
const CY = 70;
const SW = 18;
const CIRC = 2 * Math.PI * R;

export interface DonutSegment {
  value: number;
  color: string;
  label: string;
}

interface Props {
  segments: DonutSegment[];
  centerValue: number;
  centerLabel: string;
}

export function DonutChartSvg({ segments, centerValue, centerLabel }: Props) {
  const total = segments.reduce((s, seg) => s + seg.value, 0);

  const arcs = (() => {
    if (total === 0) return segments.map(() => ({ len: 0, offset: CIRC * 0.25 }));
    let cumOffset = CIRC * 0.25;
    return segments.map((seg) => {
      const len = (seg.value / total) * CIRC;
      const offset = cumOffset;
      cumOffset -= len;
      return { len, offset };
    });
  })();

  return (
    <svg width={140} height={140} viewBox="0 0 140 140">
      {total === 0 ? (
        <circle
          cx={CX} cy={CY} r={R}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={SW}
        />
      ) : (
        arcs.map((arc, i) => (
          arc.len > 0 && (
            <circle
              key={i}
              cx={CX} cy={CY} r={R}
              fill="none"
              stroke={segments[i].color}
              strokeWidth={SW}
              strokeDasharray={`${arc.len} ${CIRC - arc.len}`}
              strokeDashoffset={arc.offset}
              strokeLinecap="butt"
            />
          )
        ))
      )}
      <text x={CX} y={CY - 6} textAnchor="middle" dominantBaseline="middle"
        style={{ fontSize: 20, fontWeight: 600, fill: '#111827' }}>
        {centerValue}
      </text>
      <text x={CX} y={CY + 12} textAnchor="middle" dominantBaseline="middle"
        style={{ fontSize: 10, fontWeight: 500, fill: '#6b7280', letterSpacing: '0.05em' }}>
        {centerLabel.toUpperCase()}
      </text>
    </svg>
  );
}
