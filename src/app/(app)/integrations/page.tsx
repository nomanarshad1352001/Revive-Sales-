"use client";

import { motion } from "framer-motion";
import {
  ArrowRightLeft,
  BadgeCheck,
  CloudCog,
  Download,
  FileSpreadsheet,
  Info,
  Mail,
  Plug,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Button, Card, CardHeader, Chip } from "@/components/ui";
import { useAppStore } from "@/lib/store";
import { cn, fmtDate, fmtMoney, relTime } from "@/lib/utils";

export default function IntegrationsPage() {
  const accounts = useAppStore((s) => s.accounts);
  const activities = useAppStore((s) => s.activities);
  const contacts = useAppStore((s) => s.contacts);
  const nuvueLastSync = useAppStore((s) => s.nuvueLastSync);
  const runNuvueSync = useAppStore((s) => s.runNuvueSync);
  const me = useAppStore((s) => s.users.find((u) => u.id === s.currentUserId));
  const addAudit = useAppStore((s) => s.addAudit);

  const [syncing, setSyncing] = useState(false);
  const [syncDone, setSyncDone] = useState(false);

  const pending = useMemo(() => {
    const pendingAccounts = accounts.filter((a) => a.crmStatus !== "synced");
    const pendingActivities = nuvueLastSync ? activities.filter((a) => a.at > nuvueLastSync) : activities;
    return { accounts: pendingAccounts.length, activities: pendingActivities.length };
  }, [accounts, activities, nuvueLastSync]);

  function runSync() {
    setSyncing(true);
    setSyncDone(false);
    setTimeout(() => {
      runNuvueSync();
      if (me) addAudit({ actorId: me.id, action: "sync-run", detail: `Nuvue simulated sync — pushed ${pending.accounts} accounts and ${pending.activities} activity records` });
      setSyncing(false);
      setSyncDone(true);
    }, 1400);
  }

  function downloadCsv(kind: "accounts" | "activities") {
    const esc = (v: string | number | undefined | null) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    let header = "";
    let rows: string[] = [];
    if (kind === "accounts") {
      header = "name,specialty,address,city,state,zip,phone,website,stage,priority,opportunity,owner,lastContact,lastVisit,crmStatus";
      rows = accounts.map((a) =>
        [a.name, a.specialty, a.address, a.city, a.state, a.zip, a.phone, a.website, a.stage, a.priority, a.opportunity, a.ownerId, a.lastContactAt ? new Date(a.lastContactAt).toISOString() : "", a.lastVisitAt ? new Date(a.lastVisitAt).toISOString() : "", a.crmStatus].map(esc).join(",")
      );
    } else {
      header = "at,type,accountId,userId,summary,outcome";
      rows = activities.map((a) => [new Date(a.at).toISOString(), a.type, a.accountId, a.userId, a.summary, a.outcome ?? ""].map(esc).join(","));
    }
    const blob = new Blob([[header, ...rows].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `revive-${kind}-export.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const wonValue = accounts.filter((a) => a.stage === "won").reduce((s, a) => s + a.opportunity, 0);

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[0.72rem] font-bold uppercase tracking-[0.22em] text-[var(--brand)]">Section 11 · Integrations</p>
        <h1 className="font-display mt-1 text-[clamp(1.6rem,2.6vw,2.2rem)] font-semibold">CRM &amp; Email Integrations</h1>
        <p className="mt-1 max-w-3xl text-[0.88rem] text-[var(--ink-2)]">
          Nuvue remains the <span className="font-bold">official system of record</span>. Revive Sales Command is the field layer — it is designed to sync into Nuvue, not replace it.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        {/* Nuvue card */}
        <Card className="xl:col-span-2">
          <CardHeader
            title="Nuvue CRM Connector"
            sub="Simulated integration — clearly labeled"
            action={<Chip tone="gold"><ShieldAlert size={11} /> Simulated</Chip>}
          />
          <div className="space-y-4 px-5 pb-5">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat label="Last sync" value={nuvueLastSync ? relTime(nuvueLastSync) : "Never"} />
              <Stat label="Accounts pending" value={String(pending.accounts)} warn={pending.accounts > 0} />
              <Stat label="Activities pending" value={String(pending.activities)} warn={pending.activities > 0} />
              <Stat label="Won (simulated)" value={fmtMoney(wonValue)} />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={runSync} disabled={syncing}>
                <RefreshCw size={15} className={syncing ? "animate-spin" : ""} /> {syncing ? "Syncing…" : "Run sync now (simulated)"}
              </Button>
              <Button variant="secondary" onClick={() => downloadCsv("accounts")}>
                <Download size={14} /> Accounts CSV
              </Button>
              <Button variant="secondary" onClick={() => downloadCsv("activities")}>
                <Download size={14} /> Activities CSV
              </Button>
              {syncDone && (
                <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="inline-flex items-center gap-1.5 text-[0.78rem] font-bold text-[var(--brand)]">
                  <BadgeCheck size={14} /> Sync complete — all records marked synced
                </motion.span>
              )}
            </div>

            <div className="rounded-xl bg-[var(--surface-2)] p-4 ring-1 ring-inset ring-[var(--line)]">
              <p className="flex items-center gap-1.5 text-[0.72rem] font-extrabold uppercase tracking-wide text-[var(--ink-3)]">
                <ArrowRightLeft size={11} /> Source-of-truth rules (draft for IT review)
              </p>
              <ul className="mt-2 grid grid-cols-1 gap-1.5 text-[0.78rem] leading-relaxed text-[var(--ink-2)] md:grid-cols-2">
                <li>· <span className="font-bold">Nuvue owns:</span> account identity, ownership, contact records, won/lost outcomes, invoicing data.</li>
                <li>· <span className="font-bold">Sales Command owns:</span> field activity capture (visits, calls, notes), route plans, research freshness, equipment intelligence.</li>
                <li>· <span className="font-bold">Push:</span> activities, follow-up tasks, stage changes, new prospects → Nuvue (on sync).</li>
                <li>· <span className="font-bold">Pull:</span> account assignment, opportunity edits made in Nuvue → Sales Command.</li>
                <li>· <span className="font-bold">Conflicts:</span> Nuvue wins account ownership &amp; outcome fields; field layer wins activity logs. EVP visibility stays in Nuvue.</li>
                <li>· <span className="font-bold">Audit:</span> every sync writes an audit entry (actor, record counts, direction).</li>
              </ul>
            </div>
          </div>
        </Card>

        {/* Investigation notes */}
        <Card>
          <CardHeader title="Connector Investigation" sub="Due diligence findings" action={<Info size={16} className="text-[var(--ink-3)]" />} />
          <div className="space-y-3 px-5 pb-5 text-[0.8rem] leading-relaxed text-[var(--ink-2)]">
            <p>
              <span className="font-bold text-[var(--ink)]">Public API: not verified.</span> No public developer documentation for a Nuvue CRM REST/GraphQL API was found at build time. Any "Claude connector" runs inside the Claude assistant environment — it does <span className="font-bold">not</span> automatically grant this web application access, tokens, or endpoints.
            </p>
            <p>
              <span className="font-bold text-[var(--ink)]">Path to production:</span> request from Nuvue/IT — (1) API availability &amp; docs, (2) auth model (OAuth2/API key), (3) read/write scopes for accounts, activities, opportunities, (4) sandbox access, (5) rate limits.
            </p>
            <p>
              <span className="font-bold text-[var(--ink)]">Interim bridge (works today):</span> scheduled CSV exports from this app + CSV import on the Nuvue side, or authorized exports from Nuvue imported here — fully auditable, no scraping.
            </p>
          </div>
        </Card>
      </div>

      {/* Microsoft Graph + data bridge */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader title="Microsoft 365 / Outlook" sub="Microsoft Graph — preferred, subject to IT approval" action={<Mail size={16} className="text-[var(--ink-3)]" />} />
          <div className="space-y-3 px-5 pb-5">
            <div className="rounded-xl bg-[var(--gold-soft)] p-3.5 ring-1 ring-inset ring-[#e6d5b5]">
              <p className="text-[0.78rem] font-extrabold text-[#8a6a33]">Not connected — simulated concierge active</p>
              <p className="mt-1 text-[0.72rem] leading-relaxed text-[#7d6030]">The Email Concierge currently creates drafts &amp; simulated sends only. Nothing authenticates against Microsoft.</p>
            </div>
            <ul className="space-y-1.5 text-[0.78rem] leading-relaxed text-[var(--ink-2)]">
              <li className="flex items-start gap-2"><ShieldCheck size={13} className="mt-0.5 shrink-0 text-[var(--brand)]" /> Azure AD app registration (IT-admin consent)</li>
              <li className="flex items-start gap-2"><ShieldCheck size={13} className="mt-0.5 shrink-0 text-[var(--brand)]" /> Delegated scopes: <code className="rounded bg-[var(--surface-2)] px-1 font-mono text-[0.68rem]">Mail.Send</code>, <code className="rounded bg-[var(--surface-2)] px-1 font-mono text-[0.68rem]">Mail.ReadWrite</code>, <code className="rounded bg-[var(--surface-2)] px-1 font-mono text-[0.68rem]">Calendars.ReadWrite</code></li>
              <li className="flex items-start gap-2"><ShieldCheck size={13} className="mt-0.5 shrink-0 text-[var(--brand)]" /> Per-rep OAuth consent — reps send as themselves, credentials never stored here</li>
              <li className="flex items-start gap-2"><ShieldCheck size={13} className="mt-0.5 shrink-0 text-[var(--brand)]" /> Opt-out, suppression list and audit tables already modeled in this prototype</li>
            </ul>
          </div>
        </Card>

        <Card>
          <CardHeader title="Bridging Data Today" sub="Authorized export paths while APIs are pending" action={<FileSpreadsheet size={16} className="text-[var(--ink-3)]" />} />
          <div className="space-y-2.5 px-5 pb-5">
            {[
              { t: "Accounts export", d: `${accounts.length} records · stage, priority, value, ownership, visit dates`, kind: "accounts" as const },
              { t: "Activities export", d: `${activities.length} records · calls, visits, demos, emails with outcomes`, kind: "activities" as const },
            ].map((x) => (
              <button key={x.kind} onClick={() => downloadCsv(x.kind)} className="flex w-full items-center gap-3 rounded-xl border border-[var(--line)] bg-[var(--surface-2)] px-4 py-3.5 text-left transition-all hover:border-[var(--brand)] hover:bg-[var(--brand-softer)]">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-white text-[var(--brand-deep)] ring-1 ring-inset ring-[var(--line)]"><Download size={16} /></span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[0.86rem] font-bold">{x.t}</span>
                  <span className="block text-[0.72rem] font-semibold text-[var(--ink-2)]">{x.d}</span>
                </span>
                <span className="text-[0.68rem] font-extrabold uppercase text-[var(--brand)]">CSV</span>
              </button>
            ))}
            <p className="text-[0.7rem] leading-relaxed text-[var(--ink-3)]">
              {contacts.length} contacts can be exported on request. All exports are generated client-side from the demo dataset — wire to the company data platform when credentials are issued.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}

function Stat({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className={cn("rounded-xl px-3.5 py-3 ring-1 ring-inset", warn ? "bg-[var(--gold-soft)] ring-[#e6d5b5]" : "bg-[var(--surface-2)] ring-[var(--line-2)]")}>
      <p className="text-[0.62rem] font-extrabold uppercase tracking-wider text-[var(--ink-3)]">{label}</p>
      <p className={cn("font-display mt-0.5 text-[1.15rem] font-semibold tabular-nums leading-none", warn ? "text-[#8a6a33]" : "text-[var(--ink)]")}>{value}</p>
    </div>
  );
}
