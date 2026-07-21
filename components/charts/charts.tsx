'use client'

import { useRef, useState } from 'react'

// Shared SVG/CSS chart primitives (extracted from WhoopTab).
// SVG presentation attributes can't take var(--token) — colors go through
// style={} where needed; C mirrors the Aurora tokens used by the charts.
const C = {
  card: 'var(--surface)', dim: 'var(--text-dim)', faint: 'var(--text-faint)',
  border: 'var(--border)', borderHi: 'var(--border-hi)', accent: '#00d26a',
}
const mono = 'var(--font-jetbrains-mono, monospace)'

const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n)

// Compact numeric fallback when a chart isn't given pre-formatted valueLabels.
function fmtNum(v: number): string {
  if (!Number.isFinite(v)) return '—'
  return Math.abs(v) >= 100 ? String(Math.round(v)) : String(Math.round(v * 10) / 10)
}

export function ChartTitle({ title, right }: { title: string; right?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
      <span style={{ fontFamily: mono, fontSize: 10, color: C.dim, textTransform: 'uppercase', letterSpacing: 1 }}>{title}</span>
      {right}
    </div>
  )
}

export function AxisRow({ first, last }: { first: string; last: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontFamily: mono, fontSize: 9, color: C.faint }}>
      <span>{first}</span><span>{last}</span>
    </div>
  )
}

// ─── Tooltip ──────────────────────────────────────────────────────────────────
// HTML overlay (var() resolves fine here, unlike SVG/canvas). Anchored to the
// plot area and horizontally clamped so it never clips at the edges.
type TipRow = { color?: string; label?: string; value: string }

function ChartTooltip({ left, header, rows }: { left: number; header?: string; rows: TipRow[] }) {
  const leftPct = Math.min(88, Math.max(12, left * 100))
  return (
    <div
      style={{
        position: 'absolute', top: 2, left: `${leftPct}%`, transform: 'translateX(-50%)',
        pointerEvents: 'none', zIndex: 5, whiteSpace: 'nowrap',
        background: 'var(--surface)', border: '1px solid var(--border-hi)', borderRadius: 8,
        padding: '5px 8px', fontFamily: mono, fontSize: 10, lineHeight: 1.45,
        color: 'var(--text)', boxShadow: '0 4px 14px rgba(0,0,0,0.30)',
      }}
    >
      {header && <div style={{ color: 'var(--text-faint)', fontSize: 9, marginBottom: 2 }}>{header}</div>}
      {rows.map((r, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {r.color && <span style={{ width: 7, height: 7, borderRadius: '50%', background: r.color, flex: '0 0 auto' }} />}
          {r.label && <span style={{ color: 'var(--text-dim)' }}>{r.label}</span>}
          <span style={{ fontWeight: 600, marginLeft: r.label ? 'auto' : 0, paddingLeft: r.label ? 12 : 0 }}>{r.value}</span>
        </div>
      ))}
    </div>
  )
}

// Y-axis gutter: max on top, min on the bottom, matched to the plot height.
function YAxis({ top, bottom, height }: { top: string; bottom: string; height: number }) {
  return (
    <div
      style={{
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        height, fontFamily: mono, fontSize: 9, color: C.faint, textAlign: 'right',
        minWidth: 22, flex: '0 0 auto', paddingBottom: 1,
      }}
    >
      <span>{top}</span>
      <span>{bottom}</span>
    </div>
  )
}

// Shared pointer→index tracking for the plot area.
function usePlotHover(count: number) {
  const ref = useRef<HTMLDivElement>(null)
  const [hover, setHover] = useState<number | null>(null)
  function onMove(e: React.PointerEvent, mode: 'point' | 'band' = 'point') {
    const el = ref.current
    if (!el || count === 0) return
    const rect = el.getBoundingClientRect()
    const f = clamp01((e.clientX - rect.left) / rect.width)
    const idx = mode === 'band'
      ? Math.min(count - 1, Math.floor(f * count))
      : Math.round(f * (count - 1))
    setHover(idx)
  }
  const clear = () => setHover(null)
  return { ref, hover, onMove, clear }
}

// ─── BigSpark ─────────────────────────────────────────────────────────────────
export function BigSpark({
  data,
  color = C.accent,
  colorByValue = false,
  height = 80,
  labels,
  valueLabels,
  unit,
}: {
  data: number[]
  color?: string
  colorByValue?: boolean
  height?: number
  /** Per-point x label (e.g. dates) for the hover tooltip header. */
  labels?: string[]
  /** Per-point pre-formatted value for the tooltip + axis (serializable). */
  valueLabels?: string[]
  /** Appended to the numeric fallback in the tooltip when no valueLabels given. */
  unit?: string
}) {
  const { ref, hover, onMove, clear } = usePlotHover(data.length)
  if (data.length < 2) return <div style={{ height }} />

  const W = 320
  const H = height
  const pad = { t: 8, r: 8, b: 8, l: 8 }
  const iW = W - pad.l - pad.r
  const iH = H - pad.t - pad.b

  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1

  const pts = data.map((v, i) => {
    const x = pad.l + (i / (data.length - 1)) * iW
    const y = pad.t + (1 - (v - min) / range) * iH
    return [x, y] as [number, number]
  })

  const polylinePoints = pts.map(([x, y]) => `${x},${y}`).join(' ')

  const fillPoints = [
    `${pts[0][0]},${pad.t + iH}`,
    ...pts.map(([x, y]) => `${x},${y}`),
    `${pts[pts.length - 1][0]},${pad.t + iH}`,
  ].join(' ')

  function dotColor(v: number): string {
    if (v >= 67) return '#00d26a'
    if (v >= 34) return '#f59e0b'
    return '#ef4444'
  }

  const y34 = pad.t + (1 - (34 - min) / range) * iH
  const y67 = pad.t + (1 - (67 - min) / range) * iH

  // Axis labels: peak value sits at the top, trough at the bottom.
  const argMax = data.indexOf(max)
  const argMin = data.indexOf(min)
  const topLabel = valueLabels ? valueLabels[argMax] : fmtNum(max)
  const bottomLabel = valueLabels ? valueLabels[argMin] : fmtNum(min)

  const hoveredColor = hover != null && colorByValue ? dotColor(data[hover]) : color

  return (
    <div style={{ display: 'flex', gap: 6 }}>
      <YAxis top={topLabel} bottom={bottomLabel} height={H} />
      <div
        ref={ref}
        style={{ position: 'relative', flex: 1, minWidth: 0 }}
        onPointerMove={(e) => onMove(e)}
        onPointerDown={(e) => onMove(e)}
        onPointerLeave={clear}
      >
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none" style={{ display: 'block', overflow: 'visible' }}>
          {/* Faint baseline + ceiling gridlines frame the plot as an axis. */}
          <line x1={pad.l} y1={pad.t} x2={pad.l + iW} y2={pad.t} style={{ stroke: C.border }} strokeWidth={0.6} />
          <line x1={pad.l} y1={pad.t + iH} x2={pad.l + iW} y2={pad.t + iH} style={{ stroke: C.border }} strokeWidth={0.6} />
          <polygon
            points={fillPoints}
            style={{ fill: colorByValue ? 'var(--ink-04)' : color }}
            fillOpacity={colorByValue ? 1 : 0.08}
          />
          {colorByValue && min < 67 && max > 34 && (
            <>
              {y34 >= pad.t && y34 <= pad.t + iH && (
                <line x1={pad.l} y1={y34} x2={pad.l + iW} y2={y34} stroke="#f59e0b" strokeWidth={0.8} strokeDasharray="4 3" opacity={0.5} />
              )}
              {y67 >= pad.t && y67 <= pad.t + iH && (
                <line x1={pad.l} y1={y67} x2={pad.l + iW} y2={y67} stroke="#00d26a" strokeWidth={0.8} strokeDasharray="4 3" opacity={0.5} />
              )}
            </>
          )}
          {/* var(--token) is invalid in SVG presentation attributes — use style */}
          <polyline
            points={polylinePoints}
            fill="none"
            style={{ stroke: colorByValue ? C.dim : color }}
            strokeWidth={1.5}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {pts.map(([x, y], i) => (
            <circle
              key={i}
              cx={x}
              cy={y}
              r={3}
              style={{ fill: colorByValue ? dotColor(data[i]) : color, stroke: C.card }}
              strokeWidth={1}
            />
          ))}
          {hover != null && (
            <>
              <line
                x1={pts[hover][0]} y1={pad.t} x2={pts[hover][0]} y2={pad.t + iH}
                style={{ stroke: C.borderHi }} strokeWidth={1} strokeDasharray="3 3"
              />
              <circle
                cx={pts[hover][0]} cy={pts[hover][1]} r={4.5}
                style={{ fill: hoveredColor, stroke: C.card }} strokeWidth={1.5}
              />
            </>
          )}
        </svg>
        {hover != null && (
          <ChartTooltip
            left={hover / (data.length - 1)}
            header={labels?.[hover]}
            rows={[{
              color: colorByValue ? dotColor(data[hover]) : color,
              value: valueLabels?.[hover] ?? `${fmtNum(data[hover])}${unit ? ` ${unit}` : ''}`,
            }]}
          />
        )}
      </div>
    </div>
  )
}

// ─── DualSpark ────────────────────────────────────────────────────────────────
export function DualSpark({
  dataA,
  dataB,
  colorA = '#3b82f6',
  colorB = '#f97316',
  height = 80,
  labels,
  valueLabelsA,
  valueLabelsB,
  nameA,
  nameB,
}: {
  dataA: number[]
  dataB: number[]
  colorA?: string
  colorB?: string
  height?: number
  /** Per-point x label (shared index) for the tooltip header. */
  labels?: string[]
  valueLabelsA?: string[]
  valueLabelsB?: string[]
  nameA?: string
  nameB?: string
}) {
  const len = Math.min(dataA.length, dataB.length)
  const { ref, hover, onMove, clear } = usePlotHover(len)
  if (len < 2) return <div style={{ height }} />

  const W = 320
  const H = height
  const pad = { t: 8, r: 8, b: 8, l: 8 }
  const iW = W - pad.l - pad.r
  const iH = H - pad.t - pad.b

  function normalize(arr: number[]) {
    const mn = Math.min(...arr)
    const mx = Math.max(...arr)
    const rng = mx - mn || 1
    return arr.map((v, i) => {
      const x = pad.l + (i / (arr.length - 1)) * iW
      const y = pad.t + (1 - (v - mn) / rng) * iH
      return [x, y] as [number, number]
    })
  }

  const ptsA = normalize(dataA.slice(0, len))
  const ptsB = normalize(dataB.slice(0, len))

  function toPolyline(pts: [number, number][]) {
    return pts.map(([x, y]) => `${x},${y}`).join(' ')
  }

  const tipRows: TipRow[] = hover != null
    ? [
        { color: colorA, label: nameA, value: valueLabelsA?.[hover] ?? fmtNum(dataA[hover]) },
        { color: colorB, label: nameB, value: valueLabelsB?.[hover] ?? fmtNum(dataB[hover]) },
      ]
    : []

  return (
    <div
      ref={ref}
      style={{ position: 'relative' }}
      onPointerMove={(e) => onMove(e)}
      onPointerDown={(e) => onMove(e)}
      onPointerLeave={clear}
    >
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none" style={{ display: 'block', overflow: 'visible' }}>
        <polyline points={toPolyline(ptsA)} fill="none" stroke={colorA} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
        <polyline points={toPolyline(ptsB)} fill="none" stroke={colorB} strokeWidth={1.5} strokeDasharray="5 3" strokeLinejoin="round" strokeLinecap="round" />
        {ptsA.map(([x, y], i) => (
          <circle key={`a${i}`} cx={x} cy={y} r={2.5} fill={colorA} style={{ stroke: C.card }} strokeWidth={1} />
        ))}
        {ptsB.map(([x, y], i) => (
          <circle key={`b${i}`} cx={x} cy={y} r={2.5} fill={colorB} style={{ stroke: C.card }} strokeWidth={1} />
        ))}
        {hover != null && (
          <>
            <line
              x1={ptsA[hover][0]} y1={pad.t} x2={ptsA[hover][0]} y2={pad.t + iH}
              style={{ stroke: C.borderHi }} strokeWidth={1} strokeDasharray="3 3"
            />
            <circle cx={ptsA[hover][0]} cy={ptsA[hover][1]} r={4} fill={colorA} style={{ stroke: C.card }} strokeWidth={1.5} />
            <circle cx={ptsB[hover][0]} cy={ptsB[hover][1]} r={4} fill={colorB} style={{ stroke: C.card }} strokeWidth={1.5} />
          </>
        )}
      </svg>
      {hover != null && (
        <ChartTooltip left={hover / (len - 1)} header={labels?.[hover]} rows={tipRows} />
      )}
    </div>
  )
}

// ─── BarChart ─────────────────────────────────────────────────────────────────
export function BarChart({
  data,
  color = '#a78bfa',
  colors,
  height = 80,
  maxVal,
  labels,
  valueLabels,
  unit,
  showAxis = false,
}: {
  data: number[]
  color?: string
  colors?: string[]
  height?: number
  maxVal?: number
  labels?: string[]
  valueLabels?: string[]
  unit?: string
  /** Show a y-axis gutter (max / 0). Off by default to preserve compact bars. */
  showAxis?: boolean
}) {
  const { ref, hover, onMove, clear } = usePlotHover(data.length)
  if (data.length === 0) return <div style={{ height }} />
  const mx = maxVal ?? Math.max(...data, 1)

  const bars = (
    <div
      ref={ref}
      style={{ position: 'relative', flex: 1, minWidth: 0 }}
      onPointerMove={(e) => onMove(e, 'band')}
      onPointerDown={(e) => onMove(e, 'band')}
      onPointerLeave={clear}
    >
      <div style={{ display: 'flex', alignItems: 'flex-end', height, gap: 2 }}>
        {data.map((v, i) => {
          const pct = Math.min(v / mx, 1) * 100
          const bg = colors ? colors[i] : color
          const active = hover === i
          return (
            <div
              key={i}
              style={{
                flex: 1,
                height: `${Math.max(pct, 2)}%`,
                backgroundColor: bg,
                borderRadius: '3px 3px 0 0',
                opacity: active ? 1 : 0.85,
                outline: active ? '1px solid var(--border-hi)' : 'none',
                outlineOffset: -1,
                transition: 'opacity 80ms ease',
              }}
            />
          )
        })}
      </div>
      {hover != null && (
        <ChartTooltip
          left={(hover + 0.5) / data.length}
          header={labels?.[hover]}
          rows={[{
            color: colors ? colors[hover] : color,
            value: valueLabels?.[hover] ?? `${fmtNum(data[hover])}${unit ? ` ${unit}` : ''}`,
          }]}
        />
      )}
    </div>
  )

  if (!showAxis) return bars

  return (
    <div style={{ display: 'flex', gap: 6 }}>
      <YAxis top={fmtNum(mx)} bottom="0" height={height} />
      {bars}
    </div>
  )
}

// ─── Legend ───────────────────────────────────────────────────────────────────
export function Legend({ items }: { items: { label: string; color: string; dashed?: boolean }[] }) {
  return (
    <div style={{ display: 'flex', gap: 14, marginTop: 8 }}>
      {items.map(item => (
        <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          {item.dashed
            ? <div style={{ width: 20, height: 0, border: `1px dashed ${item.color}`, borderRadius: 1 }} />
            : <div style={{ width: 20, height: 2, background: item.color, borderRadius: 1 }} />
          }
          <span style={{ fontFamily: mono, fontSize: 9, color: C.dim }}>{item.label}</span>
        </div>
      ))}
    </div>
  )
}
