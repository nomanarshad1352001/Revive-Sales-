"use client";

import { motion } from "framer-motion";
import { AlertTriangle, BarChart3, KanbanSquare, ListFilter, Pencil, ShieldAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Avatar, Button, Card, CardHeader, Chip, Field, Modal, PriorityBadge } from "@/components/ui";
import { roleLabel, useAppStore } from "@/lib/store";
import type { Account, DemoStatus, FinancingStatus, Stage } from "@/lib/types";
import { cn, fmtDate, fmtMoney, relTime, stageMeta, STAGES } from "@/lib/utils";

const COLUMNS: Stage[] = ["prospect", "contacted", "meeting", "demo", "proposal", "negotiation"];
const OPEN_STAGES: Stage[] = COLUMNS;

const DEMO_META: Record<DemoStatus, string> = { none: "—", scheduled: "Scheduled", completed: "Completed" };
const FIN_META: Record<FinancingStatus, string> = { none: "—", review: "In review", approved: "Approved", declined: "Declined" };

export default function PipelinePage() {
  const router = useRouter();
  const accounts = useAppStore((s) => s.accounts);
  const users = useAppStore((s) => s.users);
  const products = useAppStore((s) => s.products);
  const setStage = useAppStore((s) => s.setStage);
  const me = useAppStore((s) => s.users.find((u) => u.id === s.currentUserId));
  const isLeader = me?.role === "RSM" || me?.role === "ADMIN";

  const [tab, setTab] = useState<"board" | "opps" | "forecast">("board");
  const [ownerFilter, setOwnerFilter] = useState<string>(isLeader ? "all" : (me?.id ?? "all"));
  const [dragOver, setDragOver] = useState<Stage | null>(null);
  const [editOpp, setEditOpp] = useState<Account | null>(null);

  const rows = useMemo(() => accounts.filter((a) => ownerFilter === "all" || a.ownerId === ownerFilter), [accounts, ownerFilter]);
  const open = useMemo(() => rows.filter((a) => OPEN_STAGES.includes(a.stage)), [rows]);
  const closed = useMemo(() => rows.filter((a) => a.stage === "won" || a.stage === "lost"), [rows]);
  const openValue = open.reduce((s, a) => s + a.opportunity, 0);
  const weighted = open.reduce((s, a) => s + (a.opportunity * (a.probability ?? 10)) / 100, 0);
  const wonValue = closed.filter((a) => a.stage === "won").reduce((s, a) => s + a.opportunity, 0);

  function onDrop(e: React.DragEvent, stage: Stage) {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain");
    if (id) setStage(id, stage);
    setDragOver(null);
  }

  // Analytics data
  const byRep = useMemo(() => {
    const m = new Map<string, { value: number; count: number }>();
    for (const a of open) m.set(a.ownerId, { value: (m.get(a.ownerId)?.value ?? 0) + a.opportunity, count: (m.get(a.ownerId)?.count ?? 0) + 1 });
    return [...m.entries()].map(([id, v]) => ({ user: users.find((u) => u.id === id), ...v })).sort((a, b) => b.value - a.value);
  }, [open, users]);

  const byProduct = useMemo(() => {
    const m = new Map<string, { value: number; count: number }>();
    for (const a of open) {
      const key = a.primaryProductId ?? "unassigned";
      m.set(key, { value: (m.get(key)?.value ?? 0) + a.opportunity, count: (m.get(key)?.count ?? 0) + 1 });
    }
    return [...m.entries()].map(([id, v]) => ({ product: products.find((p) => p.id === id), id, ...v })).sort((a, b) => b.value - a.value);
  }, [open, products]);

  const byMonth = useMemo(() => {
    const m = new Map<string, { value: number; count: number; label: string; quarter: string }>();
    for (const a of open) {
      if (!a.expectedCloseAt) continue;
      const d = new Date(a.expectedCloseAt);
      const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, "0")}`;
      const label = d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
      const quarter = `Q${Math.floor(d.getMonth() / 3) + 1} ’${String(d.getFullYear()).slice(2)}`;
      const cur = m.get(key) ?? { value: 0, count: 0, label, quarter };
      cur.value += (a.opportunity * (a.probability ?? 10)) / 100;
      cur.count += 1;
      m.set(key, cur);
    }
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([k, v]) => ({ key: k, ...v }));
  }, [open]);

  const quarters = useMemo(() => {
    const m = new Map<string, { value: number; count: number }>();
    for (const a of open) {
      if (!a.expectedCloseAt) continue;
      const d = new Date(a.expectedCloseAt);
      const q = `Q${Math.floor(d.getMonth() / 3) + 1} ${d.getFullYear()}`;
      m.set(q, { value: (m.get(q)?.value ?? 0) + (a.opportunity * (a.probability ?? 10)) / 100, count: (m.get(q)?.count ?? 0) + 1 });
    }
    return [...m.entries()];
  }, [open]);

  const overdue = open.filter((a) => a.expectedCloseAt && a.expectedCloseAt < Date.now());
  const noNextStep = open.filter((a) => !a.nextStep);

  const maxMonth = Math.max(...byMonth.map((m) => m.value), 1);
  const maxRep = Math.max(...byRep.map((r) => r.value), 1);
  const maxProd = Math.max(...byProduct.map((p) => p.value), 1);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[0.72rem] font-bold uppercase tracking-[0.22em] text-[var(--brand)]">Section 12 · Pipeline &amp; Forecast</p>
          <h1 className="font-display mt-1 text-[clamp(1.6rem,2.6vw,2.2rem)] font-semibold">Deal Board &amp; Forecast</h1>
          <p className="mt-1 text-[0.88rem] text-[var(--ink-2)]">
            <span className="font-bold text-[var(--ink)]">{fmtMoney(openValue)}</span> open · <span className="font-bold text-[var(--ink)]">{fmtMoney(Math.round(weighted))}</span> probability-weighted · <span className="font-bold text-[#0F7A36]">{fmtMoney(wonValue)}</span> closed-won (simulated data)
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex rounded-xl bg-[var(--surface-2)] p-1 ring-1 ring-inset ring-[var(--line)]">
            {([["board", KanbanSquare, "Board"], ["opps", ListFilter, "Opportunities"], ["forecast", BarChart3, "Forecast"]] as const).map(([id, Icon, label]) => (
              <button key={id} onClick={() => setTab(id)} className={cn("flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[0.76rem] font-bold transition-all", tab === id ? "bg-white text-[var(--ink)] shadow-sm" : "text-[var(--ink-3)] hover:text-[var(--ink)]")}>
                <Icon size={13} /> {label}
              </button>
            ))}
          </div>
          <select className="field !w-auto !py-2 !text-[0.78rem]" value={ownerFilter} onChange={(e) => setOwnerFilter(e.target.value)}>
            <option value="all">Whole region</option>
            {users.filter((u) => u.active && u.role !== "ADMIN").map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </div>
      </div>

      <p className="flex items-center gap-2 rounded-xl bg-[var(--gold-soft)] px-4 py-2.5 text-[0.75rem] font-bold text-[#7d6030] ring-1 ring-inset ring-[#e6d5b5]">
        <ShieldAlert size={13} /> Demo dataset — simulated pipeline values for evaluation only; not actual company financials. Nuvue stays the revenue source of truth once connected.
      </p>

      {tab === "board" && (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-6">
            {COLUMNS.map((stage) => {
              const meta = stageMeta(stage);
              const cards = rows.filter((a) => a.stage === stage);
              const colValue = cards.reduce((s, a) => s + a.opportunity, 0);
              return (
                <div
                  key={stage}
                  className={cn("kanban-col min-h-[260px] rounded-2xl border border-[var(--line)] bg-[var(--surface-2)] p-2.5 transition-colors", dragOver === stage && "drag-over")}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(stage); }}
                  onDragLeave={() => setDragOver((d) => (d === stage ? null : d))}
                  onDrop={(e) => onDrop(e, stage)}
                >
                  <div className="mb-2 flex items-center justify-between px-1.5 pt-1">
                    <div className="flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: meta.color }} />
                      <span className="text-[0.72rem] font-extrabold uppercase tracking-wide text-[var(--ink-2)]">{meta.short}</span>
                    </div>
                    <span className="rounded-full bg-white px-2 py-0.5 text-[0.68rem] font-bold text-[var(--ink-2)] ring-1 ring-inset ring-[var(--line)]">{cards.length}</span>
                  </div>
                  <p className="mb-2 px-1.5 text-[0.68rem] font-bold text-[var(--ink-3)]">{fmtMoney(colValue)}</p>
                  <div className="space-y-2">
                    {cards.map((a, i) => {
                      const owner = users.find((u) => u.id === a.ownerId);
                      return (
                        <motion.div key={a.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.04, 0.4) }}>
                          <div
                            draggable
                            onDragStart={(e) => { e.dataTransfer.setData("text/plain", a.id); e.dataTransfer.effectAllowed = "move"; }}
                            className="kanban-card group"
                          >
                            <Card className="!shadow-none border-[var(--line)] p-3 transition-shadow hover:shadow-md">
                              <div className="flex items-start justify-between gap-2">
                                <button onClick={() => router.push(`/accounts/${a.id}`)} className="text-left text-[0.8rem] font-bold leading-tight group-hover:text-[var(--brand)]">{a.name}</button>
                                <div className="flex items-center gap-1">
                                  <button onClick={() => setEditOpp(a)} className="rounded p-0.5 text-[var(--ink-3)] opacity-0 transition-opacity hover:text-[var(--brand)] group-hover:opacity-100" title="Opportunity details"><Pencil size={11} /></button>
                                  {owner && <Avatar name={owner.name} color={owner.color} size={20} />}
                                </div>
                              </div>
                              <p className="mt-0.5 text-[0.68rem] font-semibold text-[var(--ink-2)]">{a.city}, {a.state}{a.primaryProductId ? ` · ${products.find((p) => p.id === a.primaryProductId)?.name ?? ""}` : ""}</p>
                              <div className="mt-2 flex items-center justify-between">
                                <span className="text-[0.78rem] font-extrabold tabular-nums text-[var(--brand-deep)]">{fmtMoney(a.opportunity)}</span>
                                <span className="text-[0.62rem] font-extrabold text-[var(--ink-3)]">{a.probability ?? 10}%</span>
                              </div>
                              {a.expectedCloseAt && <p className="mt-1 text-[0.64rem] font-semibold text-[var(--ink-3)]">close ~{fmtDate(a.expectedCloseAt)}</p>}
                            </Card>
                          </div>
                        </motion.div>
                      );
                    })}
                    {cards.length === 0 && <div className="rounded-xl border-2 border-dashed border-[var(--line)] px-3 py-6 text-center text-[0.7rem] font-bold text-[var(--ink-3)]">Drop accounts here</div>}
                  </div>
                </div>
              );
            })}
          </div>
          <ClosedList closed={closed} onOpen={(id) => router.push(`/accounts/${id}`)} />
        </>
      )}

      {tab === "opps" && (
        <Card className="overflow-hidden">
          <CardHeader title="Opportunity Register" sub={`${open.length} open opportunities · click a row to open the account`} />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1080px] text-left">
              <thead>
                <tr className="border-b border-[var(--line)] bg-[var(--surface-2)]">
                  {["Account", "Product", "Rep", "Value", "Stage", "Prob.", "Expected close", "Demo", "Financing", "Next step", "Last touch"].map((h) => (
                    <th key={h} className="px-3.5 py-2.5 text-[0.62rem] font-extrabold uppercase tracking-wider text-[var(--ink-3)]">{h}</th>
                  ))}
                  <th className="px-3.5 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {open.map((a) => {
                  const owner = users.find((u) => u.id === a.ownerId);
                  const over = a.expectedCloseAt && a.expectedCloseAt < Date.now();
                  return (
                    <tr key={a.id} className="cursor-pointer border-b border-[var(--line-2)] transition-colors hover:bg-[var(--brand-softer)]" onClick={() => router.push(`/accounts/${a.id}`)}>
                      <td className="px-3.5 py-2.5">
                        <p className="text-[0.82rem] font-bold leading-tight">{a.name}</p>
                        <p className="text-[0.66rem] font-semibold text-[var(--ink-2)]">{a.city}, {a.state}</p>
                      </td>
                      <td className="px-3.5 py-2.5 text-[0.74rem] font-semibold text-[var(--ink-2)]">{a.primaryProductId ? products.find((p) => p.id === a.primaryProductId)?.name : <span className="text-[var(--ink-3)]">—</span>}</td>
                      <td className="px-3.5 py-2.5">{owner && <span className="inline-flex items-center gap-1.5"><Avatar name={owner.name} color={owner.color} size={20} /><span className="text-[0.74rem] font-bold">{owner.name.split(" ")[0]}</span></span>}</td>
                      <td className="px-3.5 py-2.5 text-[0.82rem] font-extrabold tabular-nums">{fmtMoney(a.opportunity)}</td>
                      <td className="px-3.5 py-2.5"><span className="rounded-md px-1.5 py-0.5 text-[0.66rem] font-bold" style={{ background: `${stageMeta(a.stage).color}14`, color: stageMeta(a.stage).color }}>{stageMeta(a.stage).short}</span></td>
                      <td className="px-3.5 py-2.5 text-[0.76rem] font-bold tabular-nums">{a.probability ?? 10}%</td>
                      <td className={cn("px-3.5 py-2.5 text-[0.74rem] font-bold", over ? "text-[var(--danger)]" : "text-[var(--ink-2)]")}>{a.expectedCloseAt ? fmtDate(a.expectedCloseAt) : "—"}{over && " ⚠"}</td>
                      <td className="px-3.5 py-2.5 text-[0.74rem] font-semibold text-[var(--ink-2)]">{DEMO_META[a.demoStatus]}</td>
                      <td className="px-3.5 py-2.5 text-[0.74rem] font-semibold text-[var(--ink-2)]">{FIN_META[a.financingStatus]}</td>
                      <td className="max-w-[220px] px-3.5 py-2.5"><p className={cn("truncate text-[0.74rem] font-semibold", a.nextStep ? "text-[var(--ink-2)]" : "text-[var(--danger)]")}>{a.nextStep ?? "No next step ⚠"}</p></td>
                      <td className="px-3.5 py-2.5 text-[0.72rem] font-semibold text-[var(--ink-3)]">{relTime(a.lastContactAt)}</td>
                      <td className="px-3.5 py-2.5">
                        <button onClick={(e) => { e.stopPropagation(); setEditOpp(a); }} className="rounded-lg bg-white p-1.5 text-[var(--ink-3)] ring-1 ring-inset ring-[var(--line)] hover:text-[var(--brand)]" title="Edit opportunity">
                          <Pencil size={12} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {tab === "forecast" && (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          <Card>
            <CardHeader title="Weighted Forecast by Month" sub="Opportunity × stage probability, by expected close" />
            <div className="space-y-3 px-5 pb-5">
              {byMonth.length === 0 && <p className="text-[0.82rem] text-[var(--ink-2)]">No expected close dates set — edit opportunities to add close dates.</p>}
              {byMonth.map((m, i) => (
                <div key={m.key}>
                  <div className="flex items-baseline justify-between text-[0.78rem]">
                    <span className="font-bold text-[var(--ink-2)]">{m.label} <span className="text-[var(--ink-3)]">· {m.count} deals</span></span>
                    <span className="font-extrabold tabular-nums">{fmtMoney(Math.round(m.value))}</span>
                  </div>
                  <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-[var(--line-2)]">
                    <motion.div className="h-full rounded-full bg-[var(--brand)]" initial={{ width: 0 }} animate={{ width: `${(m.value / maxMonth) * 100}%` }} transition={{ duration: 0.8, delay: i * 0.06 }} />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <div className="space-y-5">
            <Card>
              <CardHeader title="Forecast by Quarter" sub="Probability-weighted" />
              <div className="grid grid-cols-2 gap-2.5 px-5 pb-5">
                {quarters.map(([q, v]) => (
                  <div key={q} className="rounded-xl bg-[var(--surface-2)] p-4">
                    <p className="text-[0.66rem] font-extrabold uppercase tracking-wide text-[var(--ink-3)]">{q}</p>
                    <p className="font-display mt-1 text-[1.4rem] font-semibold tabular-nums">{fmtMoney(Math.round(v.value))}</p>
                    <p className="text-[0.72rem] font-semibold text-[var(--ink-2)]">{v.count} deals expected</p>
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <CardHeader title="Pipeline by Rep" sub={`${roleLabel(me?.role ?? "TM")} view`} />
              <div className="space-y-2.5 px-5 pb-5">
                {byRep.map((r) => (
                  <div key={r.user?.id} className="flex items-center gap-3">
                    {r.user && <Avatar name={r.user.name} color={r.user.color} size={26} />}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between text-[0.76rem]">
                        <span className="font-bold">{r.user?.name} <span className="font-semibold text-[var(--ink-3)]">· {r.count}</span></span>
                        <span className="font-extrabold tabular-nums">{fmtMoney(r.value)}</span>
                      </div>
                      <div className="mt-1 h-2 overflow-hidden rounded-full bg-[var(--line-2)]">
                        <div className="h-full rounded-full" style={{ width: `${(r.value / maxRep) * 100}%`, background: r.user?.color ?? "#0C6B4F" }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <CardHeader title="Pipeline by Product" sub="Primary product interest per opportunity" />
              <div className="space-y-2.5 px-5 pb-5">
                {byProduct.map((p) => (
                  <div key={p.id} className="flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between text-[0.76rem]">
                        <span className="truncate font-bold">{p.product?.name ?? "Product TBD"} <span className="font-semibold text-[var(--ink-3)]">· {p.count}</span></span>
                        <span className="font-extrabold tabular-nums">{fmtMoney(p.value)}</span>
                      </div>
                      <div className="mt-1 h-2 overflow-hidden rounded-full bg-[var(--line-2)]">
                        <div className="h-full rounded-full bg-[var(--gold)]" style={{ width: `${(p.value / maxProd) * 100}%` }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <Card className="xl:col-span-2">
            <CardHeader title="Hygiene Alerts" sub="Deals that need management attention" action={<AlertTriangle size={16} className="text-[var(--amber)]" />} />
            <div className="grid grid-cols-1 gap-4 px-5 pb-5 md:grid-cols-3">
              <div>
                <p className="text-[0.72rem] font-extrabold uppercase tracking-wide text-[var(--danger)]">Overdue expected close ({overdue.length})</p>
                <ul className="mt-2 space-y-1.5">
                  {overdue.slice(0, 6).map((a) => (
                    <li key={a.id} className="flex cursor-pointer items-center justify-between gap-2 rounded-lg bg-[var(--danger-soft)] px-3 py-2 text-[0.76rem] font-semibold text-[#8a2e20]" onClick={() => router.push(`/accounts/${a.id}`)}>
                      {a.name} <span className="tabular-nums">{fmtDate(a.expectedCloseAt)}</span>
                    </li>
                  ))}
                  {overdue.length === 0 && <li className="text-[0.76rem] text-[var(--ink-3)]">None — all close dates current.</li>}
                </ul>
              </div>
              <div>
                <p className="text-[0.72rem] font-extrabold uppercase tracking-wide text-[#8a6a33]">No next step defined ({noNextStep.length})</p>
                <ul className="mt-2 space-y-1.5">
                  {noNextStep.slice(0, 6).map((a) => (
                    <li key={a.id} className="flex cursor-pointer items-center justify-between gap-2 rounded-lg bg-[var(--gold-soft)] px-3 py-2 text-[0.76rem] font-semibold text-[#7d6030]" onClick={() => router.push(`/accounts/${a.id}`)}>
                      {a.name} <span className="tabular-nums">{fmtMoney(a.opportunity)}</span>
                    </li>
                  ))}
                  {noNextStep.length === 0 && <li className="text-[0.76rem] text-[var(--ink-3)]">Every open deal has a next step.</li>}
                </ul>
              </div>
              <div>
                <p className="text-[0.72rem] font-extrabold uppercase tracking-wide text-[var(--brand)]">Recent stage movement</p>
                <ul className="mt-2 space-y-1.5">
                  {rows
                    .flatMap((a) => (a.stageHistory ?? []).slice(-1).map((h) => ({ a, h })))
                    .filter((x) => x.h.at > Date.now() - 14 * 86_400_000)
                    .sort((x, y) => y.h.at - x.h.at)
                    .slice(0, 6)
                    .map(({ a, h }) => (
                      <li key={a.id + h.at} className="flex items-center justify-between rounded-lg bg-[var(--brand-softer)] px-3 py-2 text-[0.76rem] font-semibold text-[var(--brand-deep)]">
                        <span className="truncate">{a.name} → {stageMeta(h.stage).short}</span>
                        <span>{relTime(h.at)}</span>
                      </li>
                    ))}
                </ul>
              </div>
            </div>
          </Card>
        </div>
      )}

      <OpportunityEditor account={editOpp} onClose={() => setEditOpp(null)} />
    </div>
  );
}

function ClosedList({ closed, onOpen }: { closed: Account[]; onOpen: (id: string) => void }) {
  const [show, setShow] = useState(false);
  return (
    <Card>
      <button onClick={() => setShow((s) => !s)} className="flex w-full items-center justify-between p-4">
        <p className="text-[0.88rem] font-bold">Closed accounts ({closed.length})</p>
        <span className="text-[0.72rem] font-bold text-[var(--ink-3)]">{show ? "Hide" : "Show"}</span>
      </button>
      {show && (
        <div className="grid grid-cols-1 gap-2 px-5 pb-5 md:grid-cols-2 xl:grid-cols-3">
          {closed.map((a) => (
            <button key={a.id} onClick={() => onOpen(a.id)} className="flex items-center justify-between gap-3 rounded-xl border border-[var(--line)] px-4 py-3 text-left transition-colors hover:bg-[var(--surface-2)]">
              <div className="min-w-0">
                <p className="truncate text-[0.84rem] font-bold">{a.name}</p>
                <p className="text-[0.7rem] font-semibold text-[var(--ink-2)]">{a.city}, {a.state} · {fmtMoney(a.opportunity)}</p>
              </div>
              <Chip tone={a.stage === "won" ? "brand" : "neutral"}>{a.stage === "won" ? "Won" : "Lost"}</Chip>
            </button>
          ))}
        </div>
      )}
    </Card>
  );
}

function OpportunityEditor({ account, onClose }: { account: Account | null; onClose: () => void }) {
  const products = useAppStore((s) => s.products);
  const updateAccount = useAppStore((s) => s.updateAccount);
  const [form, setForm] = useState({
    productId: "",
    value: 0,
    probability: 10,
    closeDate: "",
    nextStep: "",
    demoStatus: "none" as DemoStatus,
    financingStatus: "none" as FinancingStatus,
  });

  useMemo(() => {
    if (!account) return;
    setForm({
      productId: account.primaryProductId ?? "",
      value: account.opportunity,
      probability: account.probability ?? 10,
      closeDate: account.expectedCloseAt ? new Date(account.expectedCloseAt).toISOString().slice(0, 10) : "",
      nextStep: account.nextStep ?? "",
      demoStatus: account.demoStatus,
      financingStatus: account.financingStatus,
    });
  }, [account]);

  if (!account) return null;
  return (
    <Modal open={!!account} onClose={onClose} title={`Opportunity — ${account.name}`}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Primary product interest">
            <select className="field" value={form.productId} onChange={(e) => setForm((f) => ({ ...f, productId: e.target.value }))}>
              <option value="">Not determined</option>
              {products.filter((p) => p.status === "active").map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Estimated deal value ($)">
            <input type="number" className="field" value={form.value} onChange={(e) => setForm((f) => ({ ...f, value: Number(e.target.value) }))} />
          </Field>
          <Field label={`Win probability: ${form.probability}%`}>
            <input type="range" min={0} max={100} step={5} className="w-full accent-[var(--brand)]" value={form.probability} onChange={(e) => setForm((f) => ({ ...f, probability: Number(e.target.value) }))} />
          </Field>
          <Field label="Expected close date">
            <input type="date" className="field" value={form.closeDate} onChange={(e) => setForm((f) => ({ ...f, closeDate: e.target.value }))} />
          </Field>
          <Field label="Demo status">
            <select className="field" value={form.demoStatus} onChange={(e) => setForm((f) => ({ ...f, demoStatus: e.target.value as DemoStatus }))}>
              <option value="none">No demo</option>
              <option value="scheduled">Demo scheduled</option>
              <option value="completed">Demo completed</option>
            </select>
          </Field>
          <Field label="Financing status">
            <select className="field" value={form.financingStatus} onChange={(e) => setForm((f) => ({ ...f, financingStatus: e.target.value as FinancingStatus }))}>
              <option value="none">—</option>
              <option value="review">In review</option>
              <option value="approved">Approved</option>
              <option value="declined">Declined</option>
            </select>
          </Field>
        </div>
        <Field label="Next step">
          <input className="field" value={form.nextStep} onChange={(e) => setForm((f) => ({ ...f, nextStep: e.target.value }))} placeholder="e.g. Confirm demo date with office manager" />
        </Field>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => {
              updateAccount(account.id, {
                primaryProductId: form.productId || undefined,
                opportunity: form.value,
                probability: form.probability,
                expectedCloseAt: form.closeDate ? new Date(form.closeDate + "T12:00:00").getTime() : null,
                nextStep: form.nextStep.trim() || undefined,
                demoStatus: form.demoStatus,
                financingStatus: form.financingStatus,
              });
              onClose();
            }}
          >
            Save opportunity
          </Button>
        </div>
      </div>
    </Modal>
  );
}
