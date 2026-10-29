"use client";

import { motion } from "framer-motion";
import { ArrowLeftRight, CircleDollarSign, Mail, Phone, Radar, ShieldCheck, UserPlus, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { Avatar, Button, Card, CardHeader, Field, Modal } from "@/components/ui";
import { roleLabel, useAppStore } from "@/lib/store";
import { cn, fmtMoney } from "@/lib/utils";
import type { Role } from "@/lib/types";

const ROLE_META: Record<Role, { color: string; desc: string }> = {
  RSM: { color: "#0C6B4F", desc: "Oversees all territories, reviews performance & forecasts" },
  ASM: { color: "#27698F", desc: "Manages assigned region accounts, pipeline & routing" },
  TM: { color: "#6B4FA1", desc: "Field prospecting, visits & follow-ups in assigned geography" },
  ADMIN: { color: "#B97A1A", desc: "Users, roles, product content & system configuration" },
};

export default function TeamPage() {
  const users = useAppStore((s) => s.users);
  const accounts = useAppStore((s) => s.accounts);
  const activities = useAppStore((s) => s.activities);
  const tasks = useAppStore((s) => s.tasks);
  const addUser = useAppStore((s) => s.addUser);
  const updateUser = useAppStore((s) => s.updateUser);
  const reassignAccounts = useAppStore((s) => s.reassignAccounts);
  const me = useAppStore((s) => s.users.find((u) => u.id === s.currentUserId));
  const canManage = me?.role === "ADMIN" || me?.role === "RSM";

  const [addOpen, setAddOpen] = useState(false);
  const [reassignId, setReassignId] = useState<string | null>(null);

  const [form, setForm] = useState({ name: "", email: "", role: "TM" as Role, title: "", territory: "", phone: "" });

  const statsFor = (id: string) => {
    const mine = accounts.filter((a) => a.ownerId === id && a.stage !== "won" && a.stage !== "lost");
    const won = accounts.filter((a) => a.ownerId === id && a.stage === "won");
    return {
      accounts: mine.length,
      pipeline: mine.reduce((s, a) => s + a.opportunity, 0),
      wonValue: won.reduce((s, a) => s + a.opportunity, 0),
      touches7d: activities.filter((a) => a.userId === id && a.at > Date.now() - 7 * 86_400_000).length,
      openTasks: tasks.filter((t) => t.userId === id && !t.done).length,
    };
  };

  const reassignTarget = users.find((u) => u.id === reassignId);

  function submit() {
    if (!form.name.trim() || !form.email.trim()) return;
    addUser({
      name: form.name.trim(),
      email: form.email.trim(),
      role: form.role,
      title: form.title.trim() || roleLabel(form.role),
      territory: form.territory.trim() || "Unassigned",
      phone: form.phone.trim() || "—",
      active: true,
    });
    setForm({ name: "", email: "", role: "TM", title: "", territory: "", phone: "" });
    setAddOpen(false);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[0.72rem] font-bold uppercase tracking-[0.22em] text-[var(--brand)]">Team &amp; Territory</p>
          <h1 className="font-display mt-1 text-[clamp(1.6rem,2.6vw,2.2rem)] font-semibold">Sales Organization</h1>
          <p className="mt-1 text-[0.88rem] text-[var(--ink-2)]">
            {users.filter((u) => u.active).length} active users · roles are dynamic — add, deactivate, and reassign without touching code
          </p>
        </div>
        {canManage && (
          <Button onClick={() => setAddOpen(true)}>
            <UserPlus size={16} /> Add User
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {users.map((u, i) => {
          const s = statsFor(u.id);
          const meta = ROLE_META[u.role];
          return (
            <motion.div key={u.id} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card className={cn("p-5", !u.active && "opacity-60")}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3.5">
                    <Avatar name={u.name} color={u.active ? u.color : "#9AA5AB"} size={46} />
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-display text-[1.1rem] font-semibold leading-tight">{u.name}</h3>
                        <span className="rounded-lg px-2 py-0.5 text-[0.62rem] font-extrabold uppercase tracking-[0.12em] text-white" style={{ background: meta.color }}>
                          {u.role}
                        </span>
                        {!u.active && <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-[0.62rem] font-extrabold uppercase text-slate-500">Deactivated</span>}
                      </div>
                      <p className="mt-0.5 text-[0.78rem] font-semibold text-[var(--ink-2)]">{u.title}</p>
                      <p className="mt-0.5 text-[0.72rem] font-bold text-[var(--brand)]">{u.territory}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-3 text-[0.72rem] font-semibold text-[var(--ink-3)]">
                        <span className="inline-flex items-center gap-1"><Mail size={11} /> {u.email}</span>
                        <span className="inline-flex items-center gap-1"><Phone size={11} /> {u.phone}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {u.role !== "ADMIN" && (
                  <div className="mt-4 grid grid-cols-4 gap-2">
                    <Mini label="Open accts" value={String(s.accounts)} />
                    <Mini label="Pipeline" value={fmtMoney(s.pipeline)} />
                    <Mini label="Won value" value={fmtMoney(s.wonValue)} />
                    <Mini label="Touches · 7d" value={String(s.touches7d)} />
                  </div>
                )}

                {canManage && u.id !== me?.id && (
                  <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[var(--line-2)] pt-3.5">
                    <Button
                      variant="secondary"
                      className="!px-3 !py-1.5 !text-[0.72rem]"
                      onClick={() => setReassignId(u.id)}
                    >
                      <ArrowLeftRight size={12} /> Reassign accounts
                    </Button>
                    <Button
                      variant={u.active ? "danger" : "secondary"}
                      className="!px-3 !py-1.5 !text-[0.72rem]"
                      onClick={() => updateUser(u.id, { active: !u.active })}
                    >
                      {u.active ? "Deactivate" : "Reactivate"}
                    </Button>
                  </div>
                )}
              </Card>
            </motion.div>
          );
        })}
      </div>

      <Card>
        <CardHeader title="Role Definitions" sub="Field sales hierarchy for Revive Regenerative" action={<ShieldCheck size={17} className="text-[var(--ink-3)]" />} />
        <div className="grid grid-cols-1 gap-2.5 px-5 pb-5 sm:grid-cols-2 xl:grid-cols-4">
          {(Object.keys(ROLE_META) as Role[]).map((r) => (
            <div key={r} className="rounded-xl border border-[var(--line)] bg-[var(--surface-2)] p-4">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full" style={{ background: ROLE_META[r].color }} />
                <p className="text-[0.8rem] font-extrabold uppercase tracking-wide" style={{ color: ROLE_META[r].color }}>{r}</p>
              </div>
              <p className="mt-1.5 text-[0.78rem] font-bold">{roleLabel(r)}</p>
              <p className="mt-1 text-[0.72rem] leading-relaxed text-[var(--ink-2)]">{ROLE_META[r].desc}</p>
              <p className="mt-2 text-[0.68rem] font-bold text-[var(--ink-3)]">
                {users.filter((u) => u.role === r && u.active).length} active
              </p>
            </div>
          ))}
        </div>
      </Card>

      {/* Add user modal */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add Team Member">
        <div className="space-y-4">
          <Field label="Full name">
            <input className="field" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Jordan Meyers" />
          </Field>
          <Field label="Work email">
            <input className="field" type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="jordan.meyers@reviveregen.com" />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Role">
              <select className="field" value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as Role }))}>
                <option value="TM">TM — Territory Manager</option>
                <option value="ASM">ASM — Area Sales Manager</option>
                <option value="RSM">RSM — Regional Sales Manager</option>
                <option value="ADMIN">ADMIN — Administrator</option>
              </select>
            </Field>
            <Field label="Phone">
              <input className="field" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="(512) 555-0100" />
            </Field>
          </div>
          <Field label="Job title">
            <input className="field" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder={`Defaults to "${roleLabel(form.role)}"`} />
          </Field>
          <Field label="Territory">
            <input className="field" value={form.territory} onChange={(e) => setForm((f) => ({ ...f, territory: e.target.value }))} placeholder="e.g. West Texas — Lubbock, Amarillo, Midland" />
          </Field>
          <p className="rounded-xl bg-[var(--brand-softer)] px-4 py-3 text-[0.76rem] font-semibold text-[var(--brand-deep)]">
            New users can log in immediately with the demo password <code className="rounded bg-white px-1.5 py-0.5 font-mono text-[0.7rem] font-bold">demo1234</code>.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={submit} disabled={!form.name.trim() || !form.email.trim()}>Create user</Button>
          </div>
        </div>
      </Modal>

      {/* Reassign modal */}
      <Modal open={!!reassignTarget} onClose={() => setReassignId(null)} title={`Reassign ${reassignTarget?.name ?? ""} accounts`}>
        {reassignTarget && <ReassignBody from={reassignTarget} onDone={() => setReassignId(null)} />}
      </Modal>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-[var(--surface-2)] px-3 py-2.5">
      <p className="text-[0.6rem] font-extrabold uppercase tracking-[0.1em] text-[var(--ink-3)]">{label}</p>
      <p className="mt-0.5 text-[1rem] font-extrabold tabular-nums text-[var(--ink)]">{value}</p>
    </div>
  );
}

function ReassignBody({ from, onDone }: { from: { id: string; name: string }; onDone: () => void }) {
  const users = useAppStore((s) => s.users);
  const accounts = useAppStore((s) => s.accounts);
  const reassignAccounts = useAppStore((s) => s.reassignAccounts);
  const [to, setTo] = useState("");
  const count = accounts.filter((a) => a.ownerId === from.id).length;
  return (
    <div className="space-y-4">
      <p className="rounded-xl bg-[var(--gold-soft)] px-4 py-3 text-[0.8rem] font-semibold text-[#7d6030]">
        {from.name} owns <span className="font-extrabold">{count} accounts</span>. All accounts and open follow-ups will move to the selected teammate.
      </p>
      <Field label="Transfer to">
        <select className="field" value={to} onChange={(e) => setTo(e.target.value)}>
          <option value="">Select teammate…</option>
          {users.filter((u) => u.id !== from.id && u.active && u.role !== "ADMIN").map((u) => (
            <option key={u.id} value={u.id}>{u.name} — {roleLabel(u.role)}</option>
          ))}
        </select>
      </Field>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onDone}>Cancel</Button>
        <Button
          disabled={!to}
          onClick={() => {
            reassignAccounts(from.id, to);
            onDone();
          }}
        >
          Transfer {count} accounts
        </Button>
      </div>
    </div>
  );
}
