"use client";

import { motion } from "framer-motion";
import { ChevronDown, ChevronUp, Plus, Radar, Search, SlidersHorizontal } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { AccountModal } from "@/components/forms";
import { Avatar, Button, Card, EmptyState, PriorityBadge, StageBadge } from "@/components/ui";
import { useAppStore } from "@/lib/store";
import { cn, fmtMoney, relTime, STAGES } from "@/lib/utils";
import type { Account } from "@/lib/types";

type SortKey = "name" | "opportunity" | "lastContact" | "priority";

function AccountsInner() {
  const router = useRouter();
  const params = useSearchParams();
  const accounts = useAppStore((s) => s.accounts);
  const users = useAppStore((s) => s.users);

  const [q, setQ] = useState(params.get("q") ?? "");
  const [state, setState] = useState("all");
  const [stage, setStage] = useState("all");
  const [priority, setPriority] = useState("all");
  const [owner, setOwner] = useState("all");
  const [specialty, setSpecialty] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("priority");
  const [sortDir, setSortDir] = useState<1 | -1>(1);
  const [newOpen, setNewOpen] = useState(false);

  useEffect(() => {
    if (params.get("new") === "1") setNewOpen(true);
  }, [params]);

  const specialties = useMemo(() => [...new Set(accounts.map((a) => a.specialty))].sort(), [accounts]);

  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase();
    const rows = accounts.filter((a) => {
      if (state !== "all" && a.state !== state) return false;
      if (stage !== "all" && a.stage !== stage) return false;
      if (priority !== "all" && a.priority !== priority) return false;
      if (owner !== "all" && a.ownerId !== owner) return false;
      if (specialty !== "all" && a.specialty !== specialty) return false;
      if (ql) {
        const hay = `${a.name} ${a.city} ${a.specialty} ${a.services.join(" ")} ${a.equipment.join(" ")} ${a.decisionMakers.map((d) => d.name).join(" ")}`.toLowerCase();
        if (!hay.includes(ql)) return false;
      }
      return true;
    });
    const prio = { A: 0, B: 1, C: 2 };
    rows.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "name") cmp = a.name.localeCompare(b.name);
      else if (sortKey === "opportunity") cmp = a.opportunity - b.opportunity;
      else if (sortKey === "lastContact") cmp = (a.lastContactAt ?? 0) - (b.lastContactAt ?? 0);
      else cmp = prio[a.priority] - prio[b.priority];
      return cmp * sortDir;
    });
    return rows;
  }, [accounts, q, state, stage, priority, owner, specialty, sortKey, sortDir]);

  const summary = useMemo(() => {
    const open = filtered.filter((a) => a.stage !== "won" && a.stage !== "lost");
    return {
      n: filtered.length,
      value: filtered.reduce((s, a) => s + a.opportunity, 0),
      open: open.length,
    };
  }, [filtered]);

  function toggleSort(k: SortKey) {
    if (sortKey === k) setSortDir((d) => (d === 1 ? -1 : 1));
    else {
      setSortKey(k);
      setSortDir(1);
    }
  }

  const SortIcon = ({ k }: { k: SortKey }) =>
    sortKey === k ? (sortDir === 1 ? <ChevronUp size={12} /> : <ChevronDown size={12} />) : null;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[0.72rem] font-bold uppercase tracking-[0.22em] text-[var(--brand)]">Accounts CRM</p>
          <h1 className="font-display mt-1 text-[clamp(1.6rem,2.6vw,2.2rem)] font-semibold">Prospect &amp; Customer Book</h1>
          <p className="mt-1 text-[0.88rem] text-[var(--ink-2)]">
            <span className="font-bold text-[var(--ink)]">{summary.n}</span> practices ·{" "}
            <span className="font-bold text-[var(--ink)]">{fmtMoney(summary.value)}</span> identified value ·{" "}
            <span className="font-bold text-[var(--ink)]">{summary.open}</span> open opportunities
          </p>
        </div>
        <Button onClick={() => setNewOpen(true)}>
          <Plus size={16} /> Add Account
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative min-w-[220px] flex-1">
            <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--ink-3)]" />
            <input
              className="field pl-10"
              placeholder="Search name, city, service, equipment, decision maker…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <select className="field w-auto" value={state} onChange={(e) => setState(e.target.value)}>
            <option value="all">All states</option>
            <option value="TX">Texas</option>
            <option value="OK">Oklahoma</option>
          </select>
          <select className="field w-auto" value={specialty} onChange={(e) => setSpecialty(e.target.value)}>
            <option value="all">All specialties</option>
            {specialties.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <select className="field w-auto" value={stage} onChange={(e) => setStage(e.target.value)}>
            <option value="all">All stages</option>
            {STAGES.map((s) => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>
          <select className="field w-auto" value={priority} onChange={(e) => setPriority(e.target.value)}>
            <option value="all">All priorities</option>
            <option value="A">A · Hot</option>
            <option value="B">B · Warm</option>
            <option value="C">C · Develop</option>
          </select>
          <select className="field w-auto" value={owner} onChange={(e) => setOwner(e.target.value)}>
            <option value="all">All reps</option>
            {users.filter((u) => u.active).map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
          {(q || state !== "all" || stage !== "all" || priority !== "all" || owner !== "all" || specialty !== "all") && (
            <Button variant="ghost" className="!px-3" onClick={() => { setQ(""); setState("all"); setStage("all"); setPriority("all"); setOwner("all"); setSpecialty("all"); }}>
              Clear
            </Button>
          )}
          <span className="ml-auto hidden items-center gap-1.5 text-[0.7rem] font-bold text-[var(--ink-3)] md:inline-flex">
            <SlidersHorizontal size={12} /> {filtered.length} shown
          </span>
        </div>
      </Card>

      {/* Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left">
            <thead>
              <tr className="border-b border-[var(--line)] bg-[var(--surface-2)]">
                <Th onClick={() => toggleSort("name")}>Practice <SortIcon k="name" /></Th>
                <Th>Specialty</Th>
                <Th>Stage</Th>
                <Th onClick={() => toggleSort("priority")}>Priority <SortIcon k="priority" /></Th>
                <Th onClick={() => toggleSort("lastContact")}>Last touch <SortIcon k="lastContact" /></Th>
                <Th onClick={() => toggleSort("opportunity")}>Opportunity <SortIcon k="opportunity" /></Th>
                <Th>Owner</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((a, i) => {
                const ownerUser = users.find((u) => u.id === a.ownerId);
                const silent = !a.lastContactAt || Date.now() - a.lastContactAt > 21 * 86_400_000;
                return (
                  <motion.tr
                    key={a.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: Math.min(i * 0.02, 0.5) }}
                    onClick={() => router.push(`/accounts/${a.id}`)}
                    className="cursor-pointer border-b border-[var(--line-2)] transition-colors last:border-none hover:bg-[var(--brand-softer)]"
                  >
                    <td className="px-4 py-3">
                      <p className="text-[0.86rem] font-bold leading-tight">{a.name}</p>
                      <p className="mt-0.5 text-[0.72rem] font-semibold text-[var(--ink-2)]">
                        {a.city}, {a.state} {a.locations > 1 && <span className="text-[var(--brand)]">· {a.locations} locations</span>}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[0.78rem] font-semibold text-[var(--ink-2)]">{a.specialty}</span>
                    </td>
                    <td className="px-4 py-3"><StageBadge stage={a.stage} size="sm" /></td>
                    <td className="px-4 py-3"><PriorityBadge priority={a.priority} size="sm" /></td>
                    <td className="px-4 py-3">
                      <span className={cn("text-[0.78rem] font-bold", silent ? "text-[var(--danger)]" : "text-[var(--ink-2)]")}>
                        {relTime(a.lastContactAt)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[0.84rem] font-bold tabular-nums">{fmtMoney(a.opportunity)}</span>
                    </td>
                    <td className="px-4 py-3">
                      {ownerUser && (
                        <span className="inline-flex items-center gap-2">
                          <Avatar name={ownerUser.name} color={ownerUser.color} size={24} />
                          <span className="text-[0.76rem] font-bold text-[var(--ink-2)]">{ownerUser.name.split(" ")[0]}</span>
                        </span>
                      )}
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <EmptyState
              icon={<Radar size={20} />}
              title="No accounts match those filters"
              sub="Try widening the search — or add a newly discovered prospect with the button above."
            />
          )}
        </div>
      </Card>

      <AccountModal open={newOpen} onClose={() => setNewOpen(false)} />
    </div>
  );
}

function Th({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <th
      onClick={onClick}
      className={cn(
        "px-4 py-3 text-[0.68rem] font-extrabold uppercase tracking-[0.1em] text-[var(--ink-3)]",
        onClick && "cursor-pointer select-none hover:text-[var(--brand-deep)]"
      )}
    >
      <span className="inline-flex items-center gap-1">{children}</span>
    </th>
  );
}

export default function AccountsPage() {
  return (
    <Suspense>
      <AccountsInner />
    </Suspense>
  );
}
