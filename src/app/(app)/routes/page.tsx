"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  CalendarCheck,
  Check,
  CheckCircle2,
  ExternalLink,
  MapPin,
  Navigation,
  Phone,
  Plus,
  Route as RouteIcon,
  Save,
  Settings2,
  Trash2,
  Truck,
  Wand2,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { LogActivityModal } from "@/components/forms";
import { Button, Card, CardHeader, Chip, Field, Modal, PriorityBadge } from "@/components/ui";
import { haversineMiles, OK_OUTLINE, optimizeOrder, project, routeMileage, START_POINTS, TX_OUTLINE } from "@/lib/geo";
import { roleLabel, useAppStore } from "@/lib/store";
import { cn, fmtMoney, relTime, uid } from "@/lib/utils";
import type { Account, Role, RoutePlan, RouteStop } from "@/lib/types";

const MW = 680;
const MH = 560;

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/* ─── Route map with polyline ─────────────────────────────────────────── */
function RouteMap({ route, accounts }: { route: { startLat: number; startLng: number; startLabel: string; stops: RouteStop[] }; accounts: Account[] }) {
  const outline = (pts: [number, number][]) =>
    pts.map(([lng, lat], i) => {
      const p = project(lng, lat, MW, MH);
      return `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`;
    }).join(" ") + " Z";

  const pts = useMemo(() => {
    const start = project(route.startLng, route.startLat, MW, MH);
    const stops = route.stops
      .map((st) => {
        const a = accounts.find((x) => x.id === st.accountId);
        if (!a) return null;
        return { st, a, p: project(a.lng, a.lat, MW, MH) };
      })
      .filter(Boolean) as { st: RouteStop; a: Account; p: { x: number; y: number } }[];
    return { start, stops };
  }, [route, accounts]);

  const pathD =
    pts.stops.length > 0
      ? `M${pts.start.x},${pts.start.y} ` + pts.stops.map((s) => `L${s.p.x},${s.p.y}`).join(" ")
      : "";

  return (
    <svg viewBox={`0 0 ${MW} ${MH}`} className="w-full">
      <path d={outline(TX_OUTLINE)} fill="#eef0e6" stroke="#c4cbb8" strokeWidth="1.3" />
      <path d={outline(OK_OUTLINE)} fill="#eef0e6" stroke="#c4cbb8" strokeWidth="1.3" />
      {pathD && <path d={pathD} fill="none" stroke="#0C6B4F" strokeWidth="2.4" strokeDasharray="7 5" strokeLinecap="round" opacity="0.6" />}
      <g>
        <circle cx={pts.start.x} cy={pts.start.y} r="9" fill="#17261F" stroke="#fff" strokeWidth="2.5" />
        <text x={pts.start.x} y={pts.start.y + 3.4} textAnchor="middle" fontSize="9.5" fontWeight="800" fill="#fff">S</text>
        <text x={pts.start.x} y={pts.start.y - 13} textAnchor="middle" fontSize="10" fontWeight="800" fill="#52645A">{route.startLabel}</text>
      </g>
      {pts.stops.map(({ st, a, p }, i) => (
        <g key={st.id}>
          <circle cx={p.x} cy={p.y} r="10" fill={st.status === "done" ? "#0F7A36" : st.status === "skipped" ? "#64748B" : "#C29A5B"} stroke="#fff" strokeWidth="2.5" />
          <text x={p.x} y={p.y + 3.6} textAnchor="middle" fontSize="10.5" fontWeight="800" fill="#fff">{i + 1}</text>
          <text x={p.x} y={p.y + 24} textAnchor="middle" fontSize="9.5" fontWeight="700" fill="#37463D">{a.name.split(" ").slice(0, 3).join(" ")}</text>
        </g>
      ))}
    </svg>
  );
}

/* ─── Main page ───────────────────────────────────────────────────────── */
function RoutesInner() {
  const params = useSearchParams();
  const accounts = useAppStore((s) => s.accounts);
  const users = useAppStore((s) => s.users);
  const tasks = useAppStore((s) => s.tasks);
  const activities = useAppStore((s) => s.activities);
  const routes = useAppStore((s) => s.routes);
  const settings = useAppStore((s) => s.settings);
  const me = useAppStore((s) => s.users.find((u) => u.id === s.currentUserId));
  const saveRoute = useAppStore((s) => s.saveRoute);
  const deleteRoute = useAppStore((s) => s.deleteRoute);
  const updateRoute = useAppStore((s) => s.updateRoute);

  const isLeader = me?.role === "RSM" || me?.role === "ADMIN";

  const [filterUser, setFilterUser] = useState("me");
  const [openRouteId, setOpenRouteId] = useState<string | null>(null);
  const [showBuilder, setShowBuilder] = useState(!!params.get("market"));
  const [targetsOpen, setTargetsOpen] = useState(false);

  // ── builder state ──
  const [bName, setBName] = useState("");
  const [bDate, setBDate] = useState(todayStr());
  const [bStart, setBStart] = useState(START_POINTS[0].label);
  const [bCustomLat, setBCustomLat] = useState("");
  const [bCustomLng, setBCustomLng] = useState("");
  const [bStops, setBStops] = useState<string[]>([]);
  const [bRadius, setBRadius] = useState(60);

  const startPt = bStart === "custom"
    ? { label: "Custom start", lat: Number(bCustomLat) || 0, lng: Number(bCustomLng) || 0 }
    : START_POINTS.find((s) => s.label === bStart)!;

  const openAccounts = useMemo(
    () => accounts.filter((a) => a.stage !== "won" && a.stage !== "lost"),
    [accounts]
  );

  // Meetings scheduled for route date (tasks of type meeting/demo)
  const scheduledTasks = useMemo(
    () =>
      tasks.filter((t) => {
        if (t.done) return false;
        const d = new Date(t.dueAt);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        return key === bDate && ["meeting", "demo"].includes(t.type);
      }),
    [tasks, bDate]
  );

  // Suggestion scoring
  const suggestions = useMemo(() => {
    if (!startPt.lat || !startPt.lng) return [];
    const near = openAccounts
      .map((a) => {
        const dist = haversineMiles(startPt.lat, startPt.lng, a.lat, a.lng);
        const scheduled = tasks.some(
          (t) => t.accountId === a.id && !t.done && ["meeting", "demo"].includes(t.type) &&
            new Date(t.dueAt).toDateString() === new Date(bDate + "T12:00:00").toDateString()
        );
        const neverVisited = !a.lastVisitAt;
        const daysContact = a.lastContactAt ? Math.floor((Date.now() - a.lastContactAt) / 86_400_000) : 999;
        const score =
          (a.priority === "A" ? 4 : a.priority === "B" ? 2.5 : 1) +
          (scheduled ? 5 : 0) +
          (neverVisited ? 2 : 0) +
          (daysContact > 21 ? 1.5 : 0) +
          Math.max(0, (bRadius - dist) / bRadius) * 2;
        return { a, dist, scheduled, neverVisited, score };
      })
      .filter((x) => x.dist <= bRadius)
      .sort((x, y) => y.score - x.score);
    return near;
  }, [openAccounts, startPt.lat, startPt.lng, bRadius, tasks, bDate]);

  const stopAccounts = useMemo(
    () => bStops.map((id) => accounts.find((a) => a.id === id)).filter(Boolean) as Account[],
    [bStops, accounts]
  );

  const mileage = useMemo(
    () =>
      startPt.lat && bStops.length
        ? routeMileage(startPt.lat, startPt.lng, stopAccounts.map((a) => ({ lat: a.lat, lng: a.lng })))
        : 0,
    [startPt, bStops, stopAccounts]
  );

  function optimize() {
    const order = optimizeOrder(
      startPt.lat,
      startPt.lng,
      stopAccounts.map((a) => ({ id: a.id, lat: a.lat, lng: a.lng }))
    );
    setBStops(order);
  }

  function toggleStop(id: string) {
    setBStops((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  function save() {
    const id = saveRoute({
      userId: me?.id ?? "u_elena",
      name: bName.trim() || `${startPt.label} field day`,
      date: bDate,
      startLabel: startPt.label,
      startLat: startPt.lat,
      startLng: startPt.lng,
      stops: bStops.map((accountId) => ({ id: uid("st"), accountId, status: "planned" as const })),
      mileage,
    });
    setShowBuilder(false);
    setBStops([]);
    setBName("");
    setOpenRouteId(id);
  }

  const filteredRoutes = useMemo(
    () =>
      routes
        .filter((r) => filterUser === "all" || (filterUser === "me" ? r.userId === me?.id : r.userId === filterUser))
        .sort((a, b) => b.updatedAt - a.updatedAt),
    [routes, filterUser, me?.id]
  );

  const openRoute = routes.find((r) => r.id === openRouteId) ?? null;

  // ── targets progress (today, logged only) ──
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const mineToday = activities.filter((a) => a.at >= start.getTime() && a.userId === me?.id);
  const targets = settings.targets[me?.role ?? "TM"];
  const progress = {
    meetings: mineToday.filter((a) => a.type === "meeting" || a.type === "demo").length,
    dropIns: mineToday.filter((a) => a.type === "visit").length,
    calls: mineToday.filter((a) => a.type === "call").length,
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[0.72rem] font-bold uppercase tracking-[0.22em] text-[var(--brand)]">Route Planning</p>
          <h1 className="font-display mt-1 text-[clamp(1.6rem,2.6vw,2.2rem)] font-semibold">Smart Daily Routes</h1>
          <p className="mt-1 max-w-2xl text-[0.88rem] text-[var(--ink-2)]">
            Build efficient field days from scheduled meetings and nearby prospects. <span className="font-bold">Planned stops are suggestions — they only count once you log the activity.</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => setTargetsOpen(true)}>
            <Settings2 size={15} /> Daily targets
          </Button>
          <Button onClick={() => setShowBuilder(true)}>
            <Plus size={16} /> New Route
          </Button>
        </div>
      </div>

      {/* Targets strip */}
      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--gold-soft)] text-[#8a6a33]"><Truck size={18} /></span>
            <div>
              <h3 className="font-display text-[1.05rem] font-semibold">Today's activity objectives</h3>
              <p className="text-[0.75rem] font-semibold text-[var(--ink-2)]">Your {roleLabel(me?.role ?? "TM")} defaults · measured on logged activity, never on planned stops</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2.5">
            {[
              { label: "Meetings / demos", got: progress.meetings, tgt: targets.meetings, icon: CalendarCheck },
              { label: "In-person drop-ins", got: progress.dropIns, tgt: targets.dropIns, icon: MapPin },
              { label: "Prospecting calls", got: progress.calls, tgt: targets.calls, icon: Phone },
            ].map((t) => (
              <div key={t.label} className="min-w-[150px] flex-1 rounded-xl bg-[var(--surface-2)] px-3.5 py-3 ring-1 ring-inset ring-[var(--line-2)] sm:flex-none">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[0.66rem] font-extrabold uppercase tracking-wide text-[var(--ink-3)]">{t.label}</span>
                  <t.icon size={12} className="text-[var(--ink-3)]" />
                </div>
                <p className="mt-1 text-[1.15rem] font-extrabold tabular-nums">
                  <span className={progress && t.got >= t.tgt && t.tgt > 0 ? "text-[var(--brand)]" : "text-[var(--ink)]"}>{t.got}</span>
                  <span className="text-[var(--ink-3)]"> / {t.tgt}</span>
                </p>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white">
                  <div
                    className={cn("h-full rounded-full", t.got >= t.tgt && t.tgt > 0 ? "bg-[var(--brand)]" : "bg-[var(--gold)]")}
                    style={{ width: `${t.tgt > 0 ? Math.min(100, (t.got / t.tgt) * 100) : 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        {/* Builder */}
        <AnimatePresence mode="popLayout">
          {showBuilder && (
            <motion.div key="builder" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8, height: 0, overflow: "hidden" }}>
              <Card>
                <CardHeader title="Route Builder" sub="Add stops, optimize order, save the plan" action={<Wand2 size={16} className="text-[var(--gold)]" />} />
                <div className="space-y-4 px-5 pb-5">
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Route date">
                      <input type="date" className="field" value={bDate} onChange={(e) => setBDate(e.target.value)} />
                    </Field>
                    <Field label="Starting point">
                      <select className="field" value={bStart} onChange={(e) => setBStart(e.target.value)}>
                        {START_POINTS.map((s) => (
                          <option key={s.label} value={s.label}>{s.label}</option>
                        ))}
                        <option value="custom">Custom lat/lng…</option>
                      </select>
                    </Field>
                  </div>
                  {bStart === "custom" && (
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Latitude"><input className="field" value={bCustomLat} onChange={(e) => setBCustomLat(e.target.value)} placeholder="30.27" /></Field>
                      <Field label="Longitude"><input className="field" value={bCustomLng} onChange={(e) => setBCustomLng(e.target.value)} placeholder="-97.74" /></Field>
                    </div>
                  )}
                  <Field label="Route name">
                    <input className="field" placeholder={`${startPt.label} field day`} value={bName} onChange={(e) => setBName(e.target.value)} />
                  </Field>
                  <div className="flex items-center gap-3">
                    <Field label={`Suggestion radius: ${bRadius} mi`}>
                      <input type="range" min={20} max={160} step={10} value={bRadius} onChange={(e) => setBRadius(Number(e.target.value))} className="w-full accent-[var(--brand)]" />
                    </Field>
                  </div>

                  {scheduledTasks.length > 0 && (
                    <div className="rounded-xl bg-[var(--brand-softer)] p-3 ring-1 ring-inset ring-[#d8e9e0]">
                      <p className="text-[0.7rem] font-extrabold uppercase tracking-wide text-[var(--brand-deep)]">
                        {scheduledTasks.length} scheduled meeting/demo on this date — anchor stops added first
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {scheduledTasks.map((t) => {
                          const a = accounts.find((x) => x.id === t.accountId);
                          if (!a) return null;
                          const on = bStops.includes(a.id);
                          return (
                            <button key={t.id} onClick={() => toggleStop(a.id)} className={cn("rounded-lg px-2.5 py-1.5 text-[0.72rem] font-bold ring-1 ring-inset transition-colors", on ? "bg-[var(--brand)] text-white" : "bg-white text-[var(--brand-deep)] ring-[#c8dfd4]")}>
                              {on && <Check size={10} className="mr-1 inline -mt-0.5" />}{a.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Suggestion pool */}
                  <div>
                    <p className="mb-2 text-[0.72rem] font-extrabold uppercase tracking-wide text-[var(--ink-3)]">
                      Nearby accounts within {bRadius} mi of {startPt.label} ({suggestions.length})
                    </p>
                    <div className="max-h-[300px] space-y-1.5 overflow-y-auto pr-1">
                      {suggestions.length === 0 && <p className="rounded-xl bg-[var(--surface-2)] px-4 py-3 text-[0.8rem] font-semibold text-[var(--ink-2)]">Nothing within range — widen the radius or move the start point.</p>}
                      {suggestions.slice(0, 20).map(({ a, dist, scheduled, neverVisited }) => {
                        const on = bStops.includes(a.id);
                        return (
                          <button
                            key={a.id}
                            onClick={() => toggleStop(a.id)}
                            className={cn(
                              "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left ring-1 ring-inset transition-all",
                              on ? "bg-[var(--brand-soft)] ring-[#bcd4c8]" : "bg-[var(--surface-2)] ring-transparent hover:ring-[var(--line)]"
                            )}
                          >
                            <span className={cn("grid h-5 w-5 shrink-0 place-items-center rounded-md border-2", on ? "border-[var(--brand)] bg-[var(--brand)] text-white" : "border-[var(--line)] bg-white")}>
                              {on && <Check size={12} strokeWidth={3} />}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-[0.82rem] font-bold">{a.name}</span>
                              <span className="block text-[0.68rem] font-semibold text-[var(--ink-2)]">
                                {a.city}, {a.state} · {dist.toFixed(0)} mi · last contact {relTime(a.lastContactAt)}
                              </span>
                            </span>
                            {scheduled && <Chip tone="brand">Scheduled</Chip>}
                            {neverVisited && <Chip tone="gold">Never visited</Chip>}
                            <PriorityBadge priority={a.priority} size="sm" />
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Ordered stops */}
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-[0.72rem] font-extrabold uppercase tracking-wide text-[var(--ink-3)]">Stops ({bStops.length}) · ≈{mileage} road mi</p>
                      {bStops.length > 1 && (
                        <Button variant="secondary" className="!px-3 !py-1.5 !text-[0.72rem]" onClick={optimize}>
                          <Wand2 size={12} /> Optimize order
                        </Button>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      {stopAccounts.map((a, i) => (
                        <div key={a.id} className="flex items-center gap-2.5 rounded-xl border border-[var(--line)] bg-white px-3 py-2">
                          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[var(--ink)] text-[0.66rem] font-extrabold text-white">{i + 1}</span>
                          <span className="min-w-0 flex-1 truncate text-[0.82rem] font-bold">{a.name}</span>
                          <span className="text-[0.68rem] font-bold text-[var(--ink-3)]">{a.city}</span>
                          <button onClick={() => toggleStop(a.id)} className="text-[var(--ink-3)] hover:text-[var(--danger)]" title="Remove stop">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ))}
                      {bStops.length === 0 && <p className="rounded-xl border-2 border-dashed border-[var(--line)] px-4 py-5 text-center text-[0.78rem] font-bold text-[var(--ink-3)]">Pick stops from the suggestion pool above</p>}
                    </div>
                  </div>

                  {bStops.length > 0 && (
                    <div className="overflow-hidden rounded-xl border border-[var(--line)]">
                      <RouteMap route={{ startLat: startPt.lat, startLng: startPt.lng, startLabel: startPt.label, stops: bStops.map((id) => ({ id, accountId: id, status: "planned" as const })) }} accounts={accounts} />
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-2 pt-1">
                    <p className="text-[0.68rem] font-semibold text-[var(--ink-3)]">Order auto-numbers stops; optimize uses nearest-neighbor from the start point.</p>
                    <div className="flex gap-2">
                      <Button variant="ghost" onClick={() => setShowBuilder(false)}>Discard</Button>
                      <Button onClick={save} disabled={bStops.length === 0}><Save size={14} /> Save route</Button>
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Saved routes + detail */}
        <Card className={cn(showBuilder ? "" : "xl:col-span-2")}>
          <CardHeader
            title={openRoute ? openRoute.name : "Saved Routes"}
            sub={openRoute ? `${openRoute.date} · starts ${openRoute.startLabel} · ≈${openRoute.mileage} road mi` : `${filteredRoutes.length} routes saved locally`}
            action={
              openRoute ? (
                <Button variant="ghost" className="!py-2 !text-[0.78rem]" onClick={() => setOpenRouteId(null)}>← All routes</Button>
              ) : (
                isLeader ? (
                  <select className="field !w-auto !py-2 !text-[0.78rem]" value={filterUser} onChange={(e) => setFilterUser(e.target.value)}>
                    <option value="all">Everyone</option>
                    <option value="me">Mine</option>
                    {users.filter((u) => u.active && u.role !== "ADMIN").map((u) => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                ) : undefined
              )
            }
          />
          <div className="px-5 pb-5">
            {!openRoute && (
              <div className="space-y-2">
                {filteredRoutes.length === 0 && (
                  <p className="rounded-xl border-2 border-dashed border-[var(--line)] px-4 py-8 text-center text-[0.82rem] font-bold text-[var(--ink-3)]">
                    No saved routes yet — build your first field day.
                  </p>
                )}
                {filteredRoutes.map((r) => {
                  const owner = users.find((u) => u.id === r.userId);
                  const done = r.stops.filter((s) => s.status === "done").length;
                  return (
                    <button key={r.id} onClick={() => setOpenRouteId(r.id)} className="flex w-full items-center gap-3 rounded-xl border border-[var(--line)] bg-[var(--surface-2)] px-4 py-3.5 text-left transition-all hover:border-[var(--brand)] hover:bg-[var(--brand-softer)]">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--brand)] text-white"><RouteIcon size={17} /></span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[0.9rem] font-bold">{r.name}</span>
                        <span className="block text-[0.72rem] font-semibold text-[var(--ink-2)]">
                          {r.date} · {r.stops.length} stops · ≈{r.mileage} mi · {owner?.name.split(" ")[0]}
                        </span>
                      </span>
                      <div className="text-right">
                        <span className="text-[0.72rem] font-extrabold text-[var(--brand)]">{done}/{r.stops.length} done</span>
                        <div className="mt-1 h-1.5 w-20 overflow-hidden rounded-full bg-white">
                          <div className="h-full rounded-full bg-[var(--brand)]" style={{ width: `${r.stops.length ? (done / r.stops.length) * 100 : 0}%` }} />
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
            {openRoute && <RouteDetail route={openRoute} onDelete={() => { deleteRoute(openRoute.id); setOpenRouteId(null); }} />}
          </div>
        </Card>
      </div>

      <TargetsModal open={targetsOpen} onClose={() => setTargetsOpen(false)} />
    </div>
  );
}

/* ─── Route execution detail ─────────────────────────────────────────── */
function RouteDetail({ route, onDelete }: { route: RoutePlan; onDelete: () => void }) {
  const accounts = useAppStore((s) => s.accounts);
  const updateRouteStop = useAppStore((s) => s.updateRouteStop);
  const addTask = useAppStore((s) => s.addTask);
  const me = useAppStore((s) => s.users.find((u) => u.id === s.currentUserId));
  const [completeStop, setCompleteStop] = useState<string | null>(null);
  const [collapseSkipped, setCollapseSkipped] = useState(false);

  const done = route.stops.filter((s) => s.status === "done").length;
  const planned = route.stops.filter((s) => s.status === "planned").length;

  // full Google Maps multi-stop directions URL
  const dirsUrl = useMemo(() => {
    const pts = [
      `${route.startLat},${route.startLng}`,
      ...route.stops
        .filter((s) => s.status !== "skipped")
        .map((s) => accounts.find((a) => a.id === s.accountId))
        .filter(Boolean)
        .map((a) => `${a!.lat},${a!.lng}`),
    ];
    return `https://www.google.com/maps/dir/${pts.map(encodeURIComponent).join("/")}`;
  }, [route, accounts]);

  function markSkipped(stopId: string, account: Account) {
    updateRouteStop(route.id, stopId, { status: "skipped", note: "Skipped on route day" });
    addTask({
      accountId: account.id,
      userId: route.userId,
      title: `Reschedule skipped route stop — ${account.name}`,
      type: "follow-up",
      dueAt: Date.now() + 86_400_000,
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <a href={dirsUrl} target="_blank" rel="noreferrer" className="no-underline">
          <Button variant="primary">
            <Navigation size={14} /> Open full route in Google Maps
          </Button>
        </a>
        <Chip tone="brand">{done} done</Chip>
        <Chip>{planned} remaining</Chip>
        <button onClick={onDelete} className="ml-auto inline-flex items-center gap-1.5 text-[0.75rem] font-bold text-[var(--danger)] hover:underline">
          <Trash2 size={13} /> Delete route
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-[var(--line)]">
        <RouteMap route={route} accounts={accounts} />
      </div>

      <div className="space-y-2">
        {route.stops.map((st, i) => {
          const a = accounts.find((x) => x.id === st.accountId);
          if (!a) return null;
          return (
            <div key={st.id} className={cn("flex flex-wrap items-center gap-3 rounded-xl border px-3.5 py-3 transition-all", st.status === "done" ? "border-[#c8dfd4] bg-[var(--brand-softer)]" : st.status === "skipped" ? "border-[var(--line)] bg-[var(--surface-2)] opacity-70" : "border-[var(--line)] bg-white")}>
              <span className={cn("grid h-7 w-7 shrink-0 place-items-center rounded-full text-[0.72rem] font-extrabold text-white", st.status === "done" ? "bg-[#0F7A36]" : st.status === "skipped" ? "bg-slate-400" : "bg-[var(--gold)]")}>
                {st.status === "done" ? <Check size={13} strokeWidth={3} /> : i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[0.86rem] font-bold">
                  {a.name}
                  <span className="ml-2 text-[0.7rem] font-semibold text-[var(--ink-2)]">{a.city}, {a.state} · {fmtMoney(a.opportunity)}</span>
                </p>
                {st.note && <p className="text-[0.7rem] font-semibold text-[var(--ink-3)]">{st.note}</p>}
              </div>
              <PriorityBadge priority={a.priority} size="sm" />
              {st.status === "planned" && (
                <div className="flex items-center gap-1.5">
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${a.lat},${a.lng}`)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 rounded-lg bg-[var(--surface-2)] px-2.5 py-1.5 text-[0.7rem] font-bold text-[var(--ink-2)] ring-1 ring-inset ring-[var(--line)] hover:bg-white"
                  >
                    <ExternalLink size={11} /> Directions
                  </a>
                  <button
                    onClick={() => setCompleteStop(st.id)}
                    className="inline-flex items-center gap-1 rounded-lg bg-[var(--brand)] px-2.5 py-1.5 text-[0.7rem] font-bold text-white hover:bg-[var(--brand-deep)]"
                  >
                    <CheckCircle2 size={11} /> Complete
                  </button>
                  <button
                    onClick={() => markSkipped(st.id, a)}
                    className="rounded-lg px-2.5 py-1.5 text-[0.7rem] font-bold text-[var(--ink-2)] ring-1 ring-inset ring-[var(--line)] hover:bg-[var(--surface-2)]"
                  >
                    Skip
                  </button>
                </div>
              )}
              {st.status === "skipped" && <span className="text-[0.68rem] font-extrabold uppercase text-slate-500">Skipped — rescheduled to tomorrow</span>}
              {st.status === "done" && <span className="text-[0.68rem] font-extrabold uppercase text-[#0F7A36]">Visit logged</span>}
            </div>
          );
        })}
      </div>
      <p className="text-[0.68rem] font-semibold leading-relaxed text-[var(--ink-3)]">
        Completing a stop opens the standard activity logger — the visit only counts toward coverage and daily targets once you save the log entry.
      </p>

      <LogActivityModal
        open={completeStop !== null}
        onClose={() => setCompleteStop(null)}
        onSaved={() => {
          if (completeStop) updateRouteStop(route.id, completeStop, { status: "done" });
        }}
        accountId={route.stops.find((s) => s.id === completeStop)?.accountId}
        defaultType="visit"
      />
    </div>
  );
}

/* ─── Targets config per role ────────────────────────────────────────── */
function TargetsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const settings = useAppStore((s) => s.settings);
  const updateTargets = useAppStore((s) => s.updateTargets);
  const [role, setRole] = useState<Role>("ASM");
  const t = settings.targets[role];
  const [form, setForm] = useState(t);
  useEffect(() => setForm(t), [t, role]);
  return (
    <Modal open={open} onClose={onClose} title="Daily Activity Targets">
      <p className="text-[0.84rem] leading-relaxed text-[var(--ink-2)]">
        Targets are configurable per role and measured against <span className="font-bold">logged, verified activity</span> — never planned route stops.
      </p>
      <div className="mt-4 flex gap-1.5">
        {(Object.keys(settings.targets) as Role[]).map((r) => (
          <button key={r} onClick={() => setRole(r)} className={cn("rounded-lg px-3 py-2 text-[0.76rem] font-extrabold", role === r ? "bg-[var(--ink)] text-white" : "bg-[var(--surface-2)] text-[var(--ink-2)]")}>
            {r}
          </button>
        ))}
      </div>
      <div className="mt-4 grid grid-cols-3 gap-3">
        {(["meetings", "dropIns", "calls"] as const).map((k) => (
          <Field key={k} label={k === "meetings" ? "Meetings" : k === "dropIns" ? "Drop-ins" : "Calls"}>
            <input type="number" min={0} max={60} className="field" value={form[k]} onChange={(e) => setForm((f) => ({ ...f, [k]: Number(e.target.value) }))} />
          </Field>
        ))}
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button onClick={() => { updateTargets(role, form); onClose(); }}>Save {role} targets</Button>
      </div>
    </Modal>
  );
}

export default function RoutesPage() {
  return (
    <Suspense>
      <RoutesInner />
    </Suspense>
  );
}
