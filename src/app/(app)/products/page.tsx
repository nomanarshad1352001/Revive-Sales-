"use client";

import { motion } from "framer-motion";
import { AlertTriangle, FlaskConical, Package, Pencil, Plus, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { Button, Card, CardHeader, Chip, Field, Modal } from "@/components/ui";
import { roleLabel, useAppStore } from "@/lib/store";
import { cn, fmtMoney } from "@/lib/utils";
import type { Product, ProductStatus } from "@/lib/types";

const CATEGORIES = [
  "RF Microneedling",
  "Skin Tightening / RFAL",
  "Ultrasonic Fat Emulsification",
  "Fractional CO2 Laser",
  "IPL / Photofacial",
  "Picosecond Pigment & Tattoo",
  "Hydradermabrasion & Skin Health",
  "Other",
];

const DEVICE_CATEGORIES = [
  { id: "rf-microneedling", label: "RF Microneedling (competes w/ Morpheus8-class devices)" },
  { id: "tightening", label: "Skin Tightening (competes w/ Ultherapy/Thermage-class)" },
  { id: "fat-reduction", label: "Fat Reduction (competes w/ CoolSculpting-class)" },
  { id: "muscle-sculpting", label: "Muscle Sculpting (competes w/ Emsculpt-class)" },
  { id: "co2", label: "Ablative Laser (competes w/ Fraxel/UltraPulse-class)" },
  { id: "ipl", label: "IPL (competes w/ M22/BBL-class)" },
  { id: "pico", label: "Picosecond Laser (competes w/ PicoSure-class)" },
  { id: "hydraderm", label: "Hydradermabrasion (competes w/ HydraFacial-class)" },
  { id: "other", label: "Other / uncategorized" },
];

export default function ProductsPage() {
  const products = useAppStore((s) => s.products);
  const addProduct = useAppStore((s) => s.addProduct);
  const updateProduct = useAppStore((s) => s.updateProduct);
  const me = useAppStore((s) => s.users.find((u) => u.id === s.currentUserId));
  const canEdit = me?.role === "ADMIN" || me?.role === "RSM";

  const [editing, setEditing] = useState<Product | null>(null);
  const [adding, setAdding] = useState(false);

  const active = products.filter((p) => p.status === "active");
  const discontinued = products.filter((p) => p.status === "discontinued");

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[0.72rem] font-bold uppercase tracking-[0.22em] text-[var(--brand)]">Section 5 · Portfolio Library</p>
          <h1 className="font-display mt-1 text-[clamp(1.6rem,2.6vw,2.2rem)] font-semibold">Product Library</h1>
          <p className="mt-1 max-w-2xl text-[0.88rem] text-[var(--ink-2)]">
            The approved internal portfolio. Gap intelligence and briefing recommendations read from this library at runtime — nothing is hard-coded into the AI engine. {canEdit ? "You can edit entries as " + roleLabel(me.role) + "." : "Editing is reserved for administrators and the RSM."}
          </p>
        </div>
        {canEdit && (
          <Button onClick={() => setAdding(true)}>
            <Plus size={16} /> Add Product
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {active.map((p, i) => (
          <ProductCard key={p.id} p={p} i={i} canEdit={canEdit} onEdit={() => setEditing(p)} />
        ))}
      </div>

      {discontinued.length > 0 && (
        <Card className="border-[#ecd2c8]">
          <CardHeader
            title="Discontinued Lines"
            sub="Retained for historical context — excluded from all active recommendations"
            action={<AlertTriangle size={16} className="text-[#b4541e]" />}
          />
          <div className="grid grid-cols-1 gap-2.5 px-5 pb-5 md:grid-cols-2">
            {discontinued.map((p) => (
              <div key={p.id} className="flex items-center justify-between rounded-xl bg-[#fdf0e8] px-4 py-3">
                <div>
                  <p className="text-[0.88rem] font-extrabold text-[#8a4a22] line-through decoration-2">{p.name}</p>
                  <p className="text-[0.72rem] font-semibold text-[#b4541e]">{p.category} · {p.pitch}</p>
                </div>
                <span className="rounded-full bg-white/70 px-2.5 py-1 text-[0.62rem] font-extrabold uppercase tracking-wide text-[#b4541e]">Discontinued</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card>
        <CardHeader title="How the Library Drives Intelligence" sub="Data flow" action={<FlaskConical size={16} className="text-[var(--ink-3)]" />} />
        <div className="grid grid-cols-1 gap-2.5 px-5 pb-5 md:grid-cols-3">
          {[
            { t: "1 · Fit keywords", d: "Each product carries fit keywords matched against a practice's published services — phrases like 'glp-1' or 'resurfacing'." },
            { t: "2 · Device category", d: "The taxonomy key tells the engine which competitor platforms (Morpheus8, BBL…) overlap with this product — driving replacement vs gap hypotheses." },
            { t: "3 · Discovery questions", d: 'Curated questions per product appear in pre-call briefs and account intelligence panels, so "ask first" is baked into every hypothesis.' },
          ].map((x) => (
            <div key={x.t} className="rounded-xl bg-[var(--surface-2)] p-4">
              <p className="text-[0.82rem] font-extrabold text-[var(--brand-deep)]">{x.t}</p>
              <p className="mt-1.5 text-[0.76rem] leading-relaxed text-[var(--ink-2)]">{x.d}</p>
            </div>
          ))}
        </div>
      </Card>

      <ProductEditor
        open={adding || !!editing}
        edit={editing}
        onClose={() => { setAdding(false); setEditing(null); }}
        onSave={(p) => {
          if (editing) updateProduct(editing.id, p);
          else addProduct(p);
          setAdding(false);
          setEditing(null);
        }}
      />
    </div>
  );
}

function ProductCard({ p, i, canEdit, onEdit }: { p: Product; i: number; canEdit: boolean; onEdit: () => void }) {
  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
      <Card className="flex h-full flex-col p-5" lift>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-[var(--brand-soft)] text-[var(--brand-deep)]">
              <Package size={19} />
            </span>
            <div>
              <p className="font-display text-[1.1rem] font-semibold leading-tight">{p.name}</p>
              <p className="text-[0.68rem] font-bold uppercase tracking-wide text-[var(--brand)]">{p.category}</p>
            </div>
          </div>
          <span className="rounded-lg bg-[var(--surface-2)] px-2.5 py-1.5 text-[0.8rem] font-extrabold tabular-nums ring-1 ring-inset ring-[var(--line)]">
            {fmtMoney(p.price)}
          </span>
        </div>
        <p className="mt-3 flex-1 text-[0.8rem] leading-relaxed text-[var(--ink-2)]">{p.pitch}</p>
        <div className="mt-3 flex flex-wrap gap-1">
          {p.fitKeywords.slice(0, 6).map((k) => (
            <Chip key={k}>{k}</Chip>
          ))}
          {p.fitKeywords.length > 6 && <Chip>+{p.fitKeywords.length - 6}</Chip>}
        </div>
        <div className="mt-4 flex items-center justify-between border-t border-[var(--line-2)] pt-3">
          <span className="text-[0.68rem] font-semibold text-[var(--ink-3)]">{p.discoveryQuestions.length} discovery questions</span>
          {canEdit && (
            <Button variant="ghost" className="!px-3 !py-1.5 !text-[0.72rem]" onClick={onEdit}>
              <Pencil size={12} /> Edit
            </Button>
          )}
        </div>
      </Card>
    </motion.div>
  );
}

function ProductEditor({
  open,
  edit,
  onClose,
  onSave,
}: {
  open: boolean;
  edit: Product | null;
  onClose: () => void;
  onSave: (p: Omit<Product, "id">) => void;
}) {
  const [form, setForm] = useState({
    name: "",
    category: CATEGORIES[0],
    deviceCategory: "rf-microneedling",
    price: 75000,
    status: "active" as ProductStatus,
    pitch: "",
    fitKeywords: "",
    discoveryQuestions: "",
  });

  useEffect(() => {
    if (!open) return;
    if (edit) {
      setForm({
        name: edit.name,
        category: edit.category,
        deviceCategory: edit.deviceCategory,
        price: edit.price,
        status: edit.status,
        pitch: edit.pitch,
        fitKeywords: edit.fitKeywords.join(", "),
        discoveryQuestions: edit.discoveryQuestions.join("\n"),
      });
    } else {
      setForm({ name: "", category: CATEGORIES[0], deviceCategory: "rf-microneedling", price: 75000, status: "active", pitch: "", fitKeywords: "", discoveryQuestions: "" });
    }
  }, [open, edit]);

  return (
    <Modal open={open} onClose={onClose} title={edit ? `Edit ${edit.name}` : "Add Product"} wide>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Product name">
          <input className="field" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Vitania Body" />
        </Field>
        <Field label="Status">
          <select className="field" value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as ProductStatus }))}>
            <option value="active">Active — recommendable</option>
            <option value="discontinued">Discontinued — excluded from recommendations</option>
          </select>
        </Field>
        <Field label="Portfolio category">
          <select className="field" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>
            {CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </Field>
        <Field label="List price ($)">
          <input className="field" type="number" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: Number(e.target.value) }))} />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Competitive device category" hint="Determines which rival platforms trigger a 'replacement' hypothesis for this product">
            <select className="field" value={form.deviceCategory} onChange={(e) => setForm((f) => ({ ...f, deviceCategory: e.target.value }))}>
              {DEVICE_CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
          </Field>
        </div>
        <div className="sm:col-span-2">
          <Field label="Value pitch">
            <textarea className="field min-h-[64px] resize-y" value={form.pitch} onChange={(e) => setForm((f) => ({ ...f, pitch: e.target.value }))} placeholder="One-line positioning used in briefings and proposals" />
          </Field>
        </div>
        <Field label="Fit keywords" hint="Comma-separated — matched against advertised services">
          <input className="field" value={form.fitKeywords} onChange={(e) => setForm((f) => ({ ...f, fitKeywords: e.target.value }))} placeholder="med spa, tightening, glp-1" />
        </Field>
        <Field label="Discovery questions" hint="One per line">
          <textarea className="field min-h-[96px] resize-y" value={form.discoveryQuestions} onChange={(e) => setForm((f) => ({ ...f, discoveryQuestions: e.target.value }))} placeholder={"Which platform do you run today?\nWhat does your service contract cost annually?"} />
        </Field>
      </div>
      <div className="mt-5 flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-[0.7rem] font-semibold text-[var(--ink-3)]">
          <ShieldCheck size={12} /> Approved content — appears in all briefings immediately
        </p>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            disabled={!form.name.trim()}
            onClick={() =>
              onSave({
                name: form.name.trim(),
                category: form.category,
                deviceCategory: form.deviceCategory,
                price: Number(form.price) || 0,
                status: form.status,
                pitch: form.pitch.trim() || "—",
                fitKeywords: form.fitKeywords.split(",").map((x) => x.trim().toLowerCase()).filter(Boolean),
                discoveryQuestions: form.discoveryQuestions.split("\n").map((x) => x.trim()).filter(Boolean),
              })
            }
          >
            {edit ? "Save changes" : "Add to library"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
