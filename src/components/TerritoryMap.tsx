"use client";

import { useMemo, useState } from "react";
import { OK_OUTLINE, project, TX_OUTLINE } from "@/lib/geo";
import { PRIORITIES, stageMeta } from "@/lib/utils";
import type { Account } from "@/lib/types";

const W = 680;
const H = 560;

function outlinePath(points: [number, number][]) {
  return points
    .map(([lng, lat], i) => {
      const { x, y } = project(lng, lat, W, H);
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ") + " Z";
}

export type MapMode = "priority" | "stage";

export default function TerritoryMap({
  accounts,
  mode = "priority",
  compact = false,
  onSelect,
  colorFor,
  pulseIds,
  legend,
  markers,
}: {
  accounts: Account[];
  mode?: MapMode;
  compact?: boolean;
  onSelect?: (acc: Account) => void;
  colorFor?: (a: Account) => string;
  pulseIds?: Set<string>;
  legend?: { c: string; l: string }[];
  markers?: { lat: number; lng: number; label: string; color: string }[];
}) {
  const [hover, setHover] = useState<Account | null>(null);
  const txPath = useMemo(() => outlinePath(TX_OUTLINE), []);
  const okPath = useMemo(() => outlinePath(OK_OUTLINE), []);

  const dots = useMemo(
    () =>
      accounts.map((a) => {
        const { x, y } = project(a.lng, a.lat, W, H);
        const color = colorFor
          ? colorFor(a)
          : mode === "priority"
            ? PRIORITIES.find((p) => p.id === a.priority)!.dot
            : stageMeta(a.stage).bar;
        return { a, x, y, color };
      }),
    [accounts, mode, colorFor]
  );

  const hoverPos = hover ? project(hover.lng, hover.lat, W, H) : null;

  return (
    <div className="relative w-full">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Texas and Oklahoma account map">
        <defs>
          <linearGradient id="landFill" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#eef0e6" />
            <stop offset="100%" stopColor="#e4e9dc" />
          </linearGradient>
          <radialGradient id="seaFade" cx="80%" cy="100%" r="70%">
            <stop offset="0%" stopColor="#dbe7e4" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#dbe7e4" stopOpacity="0" />
          </radialGradient>
        </defs>

        <rect x="0" y="0" width={W} height={H} fill="url(#seaFade)" />

        <path d={txPath} fill="url(#landFill)" stroke="#c4cbb8" strokeWidth="1.4" strokeLinejoin="round" />
        <path d={okPath} fill="url(#landFill)" stroke="#c4cbb8" strokeWidth="1.4" strokeLinejoin="round" />

        {/* Metro cluster labels */}
        {!compact &&
          [
            { label: "DFW", lng: -96.8, lat: 33.15 },
            { label: "Austin", lng: -97.74, lat: 30.05 },
            { label: "San Antonio", lng: -98.49, lat: 29.12 },
            { label: "Houston", lng: -95.37, lat: 29.45 },
            { label: "OKC", lng: -97.52, lat: 35.68 },
            { label: "Tulsa", lng: -95.99, lat: 36.34 },
            { label: "El Paso", lng: -106.49, lat: 31.55 },
          ].map((m) => {
            const p = project(m.lng, m.lat, W, H);
            return (
              <text
                key={m.label}
                x={p.x}
                y={p.y}
                textAnchor="middle"
                fontSize="10.5"
                fontWeight="800"
                letterSpacing="0.14em"
                fill="#97a38f"
                style={{ textTransform: "uppercase", fontFamily: "var(--font-sans)" }}
              >
                {m.label.toUpperCase()}
              </text>
            );
          })}

        {(markers ?? []).map((m) => {
          const p = project(m.lng, m.lat, W, H);
          return (
            <g key={m.label}>
              <circle cx={p.x} cy={p.y} r="7" fill={m.color} stroke="#fff" strokeWidth="2.4" />
              <text x={p.x} y={p.y + 2.6} textAnchor="middle" fontSize="7.5" fontWeight="800" fill="#fff">
                {m.label.slice(0, 2)}
              </text>
            </g>
          );
        })}

        {dots.map(({ a, x, y, color }) => (
          <g key={a.id} className="cursor-pointer" onClick={() => onSelect?.(a)} onMouseEnter={() => setHover(a)} onMouseLeave={() => setHover(null)}>
            {(a.priority === "A" || pulseIds?.has(a.id)) && <circle cx={x} cy={y} r="4" fill="none" stroke={color} strokeWidth="1.6" className="dot-ping" />}
            <circle cx={x} cy={y} r={compact ? 4.5 : 5.5} fill={color} stroke="#fff" strokeWidth="1.8" opacity={hover && hover.id !== a.id ? 0.55 : 1} />
            {hover?.id === a.id && <circle cx={x} cy={y} r="10" fill="none" stroke={color} strokeWidth="1.4" opacity="0.5" />}
          </g>
        ))}
      </svg>

      {/* Tooltip */}
      {hover && hoverPos && (
        <div
          className="pointer-events-none absolute z-10 w-[220px] -translate-x-1/2 rounded-xl border border-[var(--line)] bg-white/95 p-3 shadow-lg backdrop-blur-sm"
          style={{
            left: `${(hoverPos.x / W) * 100}%`,
            top: `${(hoverPos.y / H) * 100}%`,
            transform: `translate(-50%, ${hoverPos.y / H > 0.55 ? "calc(-100% - 14px)" : "14px"})`,
          }}
        >
          <p className="text-[0.82rem] font-bold leading-tight">{hover.name}</p>
          <p className="mt-0.5 text-[0.7rem] font-semibold text-[var(--ink-2)]">
            {hover.city}, {hover.state} · {hover.specialty}
          </p>
          <div className="mt-1.5 flex items-center gap-1.5 text-[0.68rem] font-bold">
            <span className="rounded-md px-1.5 py-0.5" style={{ background: `${stageMeta(hover.stage).color}14`, color: stageMeta(hover.stage).color }}>
              {stageMeta(hover.stage).short}
            </span>
            <span className="text-[var(--gold)]">${(hover.opportunity / 1000).toFixed(0)}K opp.</span>
          </div>
        </div>
      )}

      {/* Legend */}
      {!compact && (
        <div className="absolute bottom-2 left-2 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl bg-white/85 px-3 py-2 ring-1 ring-[var(--line)] backdrop-blur-sm">
          {(legend ?? (mode === "priority"
            ? PRIORITIES.map((p) => ({ c: p.dot, l: `Priority ${p.id}` }))
            : [
                { c: "#8DA398", l: "Prospect" },
                { c: "#4D8FB5", l: "Contacted" },
                { c: "#D69A35", l: "Meeting" },
                { c: "#8C6FC0", l: "Demo" },
                { c: "#2E8A6A", l: "Proposal" },
                { c: "#D77A45", l: "Negotiation" },
              ]
          )).map((x) => (
            <span key={x.l} className="inline-flex items-center gap-1.5 text-[0.66rem] font-bold text-[var(--ink-2)]">
              <span className="h-2.5 w-2.5 rounded-full ring-2 ring-white" style={{ background: x.c }} />
              {x.l}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
