import React, { useMemo } from 'react';

/**
 * AssessmentSpeedometer - A colorful semicircular gauge showing chance of passing NCLEX
 *
 * Zones (left to right):
 *   Very Low   0-35%   Red    (#ef4444)
 *   Low       35-55%   Orange (#f97316)
 *   High      55-70%   Yellow (#eab308)
 *   Very High 70-100%  Green  (#22c55e)
 *
 * Props:
 *   percentage: number  (0-100)
 *   size?: number       (default 260)
 */
const AssessmentSpeedometer = ({ percentage, size = 260 }) => {
  const clampedPct = Math.max(0, Math.min(100, Number(percentage) || 0));

  const zoneInfo = useMemo(() => {
    if (clampedPct < 35) return { label: 'Very Low', sublabel: 'Chance of Passing', color: '#ef4444' };
    if (clampedPct < 55) return { label: 'Low', sublabel: 'Chance of Passing', color: '#f97316' };
    if (clampedPct < 70) return { label: 'High', sublabel: 'Chance of Passing', color: '#eab308' };
    return { label: 'Very High', sublabel: 'Chance of Passing', color: '#22c55e' };
  }, [clampedPct]);

  // SVG dimensions
  const svgSize = size;
  const cx = svgSize / 2;
  const cy = svgSize / 2;
  const outerR = svgSize / 2 - 16;
  const innerR = outerR - 26;

  // Zone boundaries as percentages of the 180-degree arc
  const zones = [
    { start: 0, end: 35, color: '#ef4444' },   // Very Low
    { start: 35, end: 55, color: '#f97316' },   // Low
    { start: 55, end: 70, color: '#eab308' },   // High
    { start: 70, end: 100, color: '#22c55e' },  // Very High
  ];

  // Convert a percentage (0-100) to an angle in radians on the semicircle
  // 0% -> 180deg (left), 100% -> 0deg (right)
  const pctToAngle = (pct) => {
    return ((180 - (pct / 100) * 180) * Math.PI) / 180;
  };

  // Create SVG arc path for a zone
  const createArcPath = (pctStart, pctEnd) => {
    const a1 = pctToAngle(pctStart);
    const a2 = pctToAngle(pctEnd);

    const x1 = cx + outerR * Math.cos(a1);
    const y1 = cy - outerR * Math.sin(a1);
    const x2 = cx + outerR * Math.cos(a2);
    const y2 = cy - outerR * Math.sin(a2);

    const ix1 = cx + innerR * Math.cos(a1);
    const iy1 = cy - innerR * Math.sin(a1);
    const ix2 = cx + innerR * Math.cos(a2);
    const iy2 = cy - innerR * Math.sin(a2);

    const largeArc = (pctEnd - pctStart) > 50 ? 1 : 0;

    return [
      `M ${x1} ${y1}`,
      `A ${outerR} ${outerR} 0 ${largeArc} 0 ${x2} ${y2}`,
      `L ${ix2} ${iy2}`,
      `A ${innerR} ${innerR} 0 ${largeArc} 1 ${ix1} ${iy1}`,
      'Z'
    ].join(' ');
  };

  // Needle calculation
  const needleAngle = pctToAngle(clampedPct);
  const needleLen = innerR - 6;
  const needleTipX = cx + needleLen * Math.cos(needleAngle);
  const needleTipY = cy - needleLen * Math.sin(needleAngle);
  const needleBaseWidth = 5;
  const perpAngle = needleAngle + Math.PI / 2;
  const nbx1 = cx + needleBaseWidth * Math.cos(perpAngle);
  const nby1 = cy - needleBaseWidth * Math.sin(perpAngle);
  const nbx2 = cx - needleBaseWidth * Math.cos(perpAngle);
  const nby2 = cy + needleBaseWidth * Math.sin(perpAngle);

  // Tick marks for the gauge
  const majorTicks = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
  const tickStartR = outerR + 2;
  const tickEndR = outerR + 10;

  // Zone labels along the outer edge
  const zoneLabelData = [
    { pct: 17.5, label: 'Very Low', color: '#ef4444' },
    { pct: 45, label: 'Low', color: '#f97316' },
    { pct: 62.5, label: 'High', color: '#eab308' },
    { pct: 85, label: 'Very High', color: '#22c55e' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '8px 0' }}>
      <svg
        width={svgSize}
        height={svgSize * 0.65}
        viewBox={`0 0 ${svgSize} ${svgSize}`}
        style={{ overflow: 'visible', display: 'block' }}
      >
        {/* Colored arc segments */}
        <g>
          {zones.map((zone, idx) => (
            <path
              key={`zone-${idx}`}
              d={createArcPath(zone.start, zone.end)}
              fill={zone.color}
              opacity={0.85}
              style={{
                filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.15))',
              }}
            />
          ))}
        </g>

        {/* Thin white separator lines between zones */}
        {[35, 55, 70].map((pct) => {
          const angle = pctToAngle(pct);
          const sx = cx + innerR * Math.cos(angle);
          const sy = cy - innerR * Math.sin(angle);
          const ex = cx + outerR * Math.cos(angle);
          const ey = cy - outerR * Math.sin(angle);
          return (
            <line
              key={`sep-${pct}`}
              x1={sx} y1={sy}
              x2={ex} y2={ey}
              stroke="#fff"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          );
        })}

        {/* Tick marks */}
        {majorTicks.map((tick) => {
          const angle = pctToAngle(tick);
          const x1 = cx + tickStartR * Math.cos(angle);
          const y1 = cy - tickStartR * Math.sin(angle);
          const x2 = cx + tickEndR * Math.cos(angle);
          const y2 = cy - tickEndR * Math.sin(angle);
          const isMajor = tick % 10 === 0;
          return (
            <line
              key={`tick-${tick}`}
              x1={x1} y1={y1}
              x2={x2} y2={y2}
              stroke={isMajor ? '#94a3b8' : '#cbd5e1'}
              strokeWidth={isMajor ? 2 : 1}
              strokeLinecap="round"
            />
          );
        })}

        {/* Tick labels (percentages) */}
        {[0, 25, 50, 75, 100].map((tick) => {
          const angle = pctToAngle(tick);
          const labelR = tickEndR + 14;
          const lx = cx + labelR * Math.cos(angle);
          const ly = cy - labelR * Math.sin(angle);
          return (
            <text
              key={`tick-label-${tick}`}
              x={lx}
              y={ly}
              textAnchor="middle"
              dominantBaseline="central"
              style={{
                fontSize: '11px',
                fill: '#64748b',
                fontWeight: 600,
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              }}
            >
              {tick}
            </text>
          );
        })}

        {/* Needle */}
        <g style={{ filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.25))' }}>
          <polygon
            points={`${nbx1},${nby1} ${needleTipX},${needleTipY} ${nbx2},${nby2}`}
            fill="#1e293b"
          />
        </g>

        {/* Center circle (pivot) */}
        <circle cx={cx} cy={cy} r={10} fill="#1e293b" />
        <circle cx={cx} cy={cy} r={6} fill="#f8fafc" />

        {/* Zone labels along the arc */}
        {zoneLabelData.map((z) => {
          const angle = pctToAngle(z.pct);
          const labelR = outerR - 13;
          const lx = cx + labelR * Math.cos(angle);
          const ly = cy - labelR * Math.sin(angle);
          return (
            <text
              key={`zone-label-${z.label}`}
              x={lx}
              y={ly}
              textAnchor="middle"
              dominantBaseline="central"
              style={{
                fontSize: '8px',
                fill: '#fff',
                fontWeight: 700,
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                letterSpacing: '0.3px',
                textShadow: '0 1px 2px rgba(0,0,0,0.3)',
              }}
            >
              {z.label.toUpperCase()}
            </text>
          );
        })}
      </svg>

      {/* Percentage display */}
      <div style={{
        marginTop: '-20px',
        textAlign: 'center',
        position: 'relative',
        zIndex: 1,
      }}>
        <div style={{
          fontSize: size < 200 ? '2.2rem' : '2.8rem',
          fontWeight: 800,
          lineHeight: 1,
          color: zoneInfo.color,
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        }}>
          {clampedPct}%
        </div>
        <div style={{
          fontSize: '1.05rem',
          fontWeight: 700,
          color: '#334155',
          marginTop: '4px',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        }}>
          {zoneInfo.label}
        </div>
        <div style={{
          fontSize: '0.82rem',
          color: '#64748b',
          marginTop: '2px',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        }}>
          {zoneInfo.sublabel}
        </div>
      </div>
    </div>
  );
};

export default AssessmentSpeedometer;
