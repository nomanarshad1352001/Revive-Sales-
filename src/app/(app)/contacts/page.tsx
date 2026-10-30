"use client";

import { motion } from "framer-motion";
import { Mail, Pencil, Phone, Search, Trash2, UserPlus } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ContactModal, ContactModalGlobal } from "@/components/forms";
import { Avatar, Button, Card, Chip, EmptyState } from "@/components/ui";
import { useAppStore } from "@/lib/store";
import { cn, relTime } from "@/lib/utils";
import type { ContactRole } from "@/lib/types";

const ROLE_META: Record<ContactRole, { label: string; cls: string }> = {
  "decision-maker": { label: "Decision maker", cls: "bg-[var(--brand-soft)] text-[var(--brand-deep)] ring-[#bcd4c8]" },
  influencer: { label: "Influencer", cls: "bg-sky-50 text-sky-700 ring-sky-200" },
  champion: { label: "Champion", cls: "bg-[var(--gold-soft)] text-[#8a6a33] ring-[#e6d5b5]" },
  user: { label: "Daily user", cls: "bg-slate-100 text-slate-600 ring-slate-200" },
};

export default function ContactsPage() {
  const contacts = useAppStore((s) => s.contacts);
  const accounts = useAppStore((s) => s.accounts);
  const products = useAppStore((s) => s.products);
  const deleteContact = useAppStore((s) => s.deleteContact);

  const [q, setQ] = useState("");
  const [roleF, setRoleF] = useState("all");
  const [productF, setProductF] = useState("all");
  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<string | null>(null);

  const rows = useMemo(() => {
    const ql = q.trim().toLowerCase();
    return contacts
      .map((c) => ({ c, acc: accounts.find((a) => a.id === c.accountId) }))
      .filter((x) => x.acc)
      .filter((x) => {
        if (roleF !== "all" && x.c.role !== roleF) return false;
        if (productF !== "all" && !x.c.interests.includes(productF)) return false;
        if (ql) {
          const hay = `${x.c.name} ${x.c.title} ${x.acc!.name} ${x.acc!.city} ${x.c.email ?? ""}`.toLowerCase();
          if (!hay.includes(ql)) return false;
        }
        return true;
      })
      .sort((a, b) => (b.c.lastContactAt ?? 0) - (a.c.lastContactAt ?? 0));
  }, [contacts, accounts, q, roleF, productF]);

  const editContact = contacts.find((c) => c.id === editTarget) ?? null;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[0.72rem] font-bold uppercase tracking-[0.22em] text-[var(--brand)]">Contacts</p>
          <h1 className="font-display mt-1 text-[clamp(1.6rem,2.6vw,2.2rem)] font-semibold">Contacts Directory</h1>
          <p className="mt-1 text-[0.88rem] text-[var(--ink-2)]">
            <span className="font-bold text-[var(--ink)]">{contacts.length}</span> people across {new Set(contacts.map((c) => c.accountId)).size} practices · roles, preferences & product interests
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <UserPlus size={16} /> Add Contact
        </Button>
      </div>

      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative min-w-[220px] flex-1">
            <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--ink-3)]" />
            <input className="field pl-10" placeholder="Search names, titles, practices, cities…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <select className="field w-auto" value={roleF} onChange={(e) => setRoleF(e.target.value)}>
            <option value="all">All roles</option>
            <option value="decision-maker">Decision makers</option>
            <option value="influencer">Influencers</option>
            <option value="champion">Champions</option>
            <option value="user">Daily users</option>
          </select>
          <select className="field w-auto" value={productF} onChange={(e) => setProductF(e.target.value)}>
            <option value="all">Any product interest</option>
            {products.filter((p) => p.status === "active").map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left">
            <thead>
              <tr className="border-b border-[var(--line)] bg-[var(--surface-2)]">
                {["Contact", "Practice", "Role", "Reach", "Product interests", "Last touch", ""].map((h) => (
                  <th key={h} className="px-4 py-3 text-[0.66rem] font-extrabold uppercase tracking-wider text-[var(--ink-3)]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(({ c, acc }, i) => (
                <motion.tr key={c.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: Math.min(i * 0.02, 0.5) }} className="border-b border-[var(--line-2)] last:border-none hover:bg-[var(--brand-softer)]">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={c.name} size={34} />
                      <div className="min-w-0">
                        <p className="truncate text-[0.86rem] font-bold">{c.name}</p>
                        <p className="truncate text-[0.7rem] font-semibold text-[var(--ink-2)]">{c.title}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/accounts/${acc!.id}`} className="text-[0.82rem] font-bold text-[var(--brand-deep)] hover:underline">{acc!.name}</Link>
                    <p className="text-[0.68rem] font-semibold text-[var(--ink-2)]">{acc!.city}, {acc!.state}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn("rounded-full px-2 py-0.5 text-[0.64rem] font-extrabold uppercase tracking-wide ring-1 ring-inset", ROLE_META[c.role].cls)}>
                      {ROLE_META[c.role].label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[0.74rem] font-semibold text-[var(--ink-2)]">
                    {c.email && <p className="flex max-w-[180px] items-center gap-1 truncate"><Mail size={10} className="shrink-0" /> {c.email}</p>}
                    {c.phone && <p className="flex items-center gap-1"><Phone size={10} className="shrink-0" /> {c.phone}</p>}
                    <p className="mt-0.5 text-[0.64rem] font-bold uppercase text-[var(--ink-3)]">Prefers {c.preference}</p>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {c.interests.slice(0, 2).map((pid) => (
                        <Chip key={pid} tone="brand">{products.find((p) => p.id === pid)?.name ?? pid}</Chip>
                      ))}
                      {c.interests.length === 0 && <span className="text-[0.72rem] text-[var(--ink-3)]">—</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[0.76rem] font-bold text-[var(--ink-2)]">{relTime(c.lastContactAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => setEditTarget(c.id)} className="rounded-lg p-1.5 text-[var(--ink-3)] hover:bg-white hover:text-[var(--brand)]" title="Edit">
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => deleteContact(c.id)} className="rounded-lg p-1.5 text-[var(--ink-3)] hover:bg-white hover:text-[var(--danger)]" title="Delete">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && <EmptyState icon={<Search size={18} />} title="No contacts match" sub="Try a different search or filter." />}
        </div>
      </Card>

      <ContactModalGlobal open={addOpen} onClose={() => setAddOpen(false)} />
      {editContact && (
        <ContactModal open onClose={() => setEditTarget(null)} accountId={editContact.accountId} edit={editContact} />
      )}
    </div>
  );
}
