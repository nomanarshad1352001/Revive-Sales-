"use client";

import { motion } from "framer-motion";
import { X } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { avatarColor, cn, initials, PRIORITIES, stageMeta } from "@/lib/utils";
import type { Priority, Stage } from "@/lib/types";

/* ─── Card ──────────────────────────────────────────────────────────── */
export function Card({ children, className, lift }: { children: ReactNode; className?: string; lift?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-[var(--line)] bg-[var(--surface)] shadow-[0_1px_2px_rgba(23,38,31,0.05),0_8px_24px_-16px_rgba(23,38,31,0.12)]",
        lift && "card-lift",
        className
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({ title, sub, action }: { title: string; sub?: string; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 px-5 pt-5 pb-4">
      <div>
        <h3 className="font-display text-[1.05rem] font-semibold leading-tight text-[var(--ink)]">{title}</h3>
        {sub && <p className="mt-0.5 text-[0.8rem] text-[var(--ink-2)]">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

/* ─── Badges ────────────────────────────────────────────────────────── */
export function StageBadge({ stage, size = "md" }: { stage: Stage; size?: "sm" | "md" }) {
  const m = stageMeta(stage);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-semibold ring-1 ring-inset",
        size === "sm" ? "px-2 py-0.5 text-[0.68rem]" : "px-2.5 py-1 text-[0.75rem]",
        m.bg,
        m.text
      )}
      style={{ ["--tw-ring-color" as never]: `${m.color}30` }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: m.color }} />
      {m.label}
    </span>
  );
}

export function PriorityBadge({ priority, size = "md" }: { priority: Priority; size?: "sm" | "md" }) {
  const m = PRIORITIES.find((p) => p.id === priority)!;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-bold ring-1 ring-inset",
        size === "sm" ? "px-2 py-0.5 text-[0.68rem]" : "px-2.5 py-1 text-[0.75rem]",
        m.cls
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: m.dot }} />
      {m.label}
    </span>
  );
}

export function Chip({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "brand" | "gold" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[0.72rem] font-semibold",
        tone === "neutral" && "bg-[var(--surface-2)] text-[var(--ink-2)] ring-1 ring-inset ring-[var(--line)]",
        tone === "brand" && "bg-[var(--brand-soft)] text-[var(--brand-deep)] ring-1 ring-inset ring-[#c8dfd4]",
        tone === "gold" && "bg-[var(--gold-soft)] text-[#8a6a33] ring-1 ring-inset ring-[#e6d5b5]"
      )}
    >
      {children}
    </span>
  );
}

/* ─── Avatar ────────────────────────────────────────────────────────── */
export function Avatar({ name, color, size = 34 }: { name: string; color?: string; size?: number }) {
  return (
    <span
      className="grid shrink-0 place-items-center rounded-full font-bold text-white"
      style={{
        width: size,
        height: size,
        background: color ?? avatarColor(name),
        fontSize: size * 0.34,
        letterSpacing: "0.02em",
      }}
      title={name}
    >
      {initials(name)}
    </span>
  );
}

/* ─── Buttons ───────────────────────────────────────────────────────── */
export function Button({
  children,
  variant = "primary",
  className,
  onClick,
  type = "button",
  disabled,
  title,
}: {
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "danger" | "gold";
  className?: string;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
  title?: string;
}) {
  return (
    <button
      type={type}
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50",
        variant === "primary" &&
          "bg-[var(--brand)] text-white shadow-[0_6px_16px_-6px_rgba(12,107,79,0.5)] hover:bg-[var(--brand-deep)] hover:shadow-[0_8px_20px_-6px_rgba(12,107,79,0.55)] active:scale-[0.98]",
        variant === "secondary" &&
          "bg-[var(--surface)] text-[var(--ink)] ring-1 ring-inset ring-[var(--line)] hover:bg-[var(--surface-2)] hover:ring-[#d8d3c4] active:scale-[0.98]",
        variant === "ghost" && "text-[var(--ink-2)] hover:bg-[var(--brand-softer)] hover:text-[var(--brand-deep)]",
        variant === "danger" && "bg-[var(--danger-soft)] text-[var(--danger)] ring-1 ring-inset ring-[#ecc9c2] hover:bg-[#f6e0da]",
        variant === "gold" && "bg-[var(--gold)] text-white hover:bg-[#a8844a] active:scale-[0.98]",
        className
      )}
    >
      {children}
    </button>
  );
}

/* ─── Animated number ───────────────────────────────────────────────── */
export function CountUp({ value, format }: { value: number; format?: (v: number) => string }) {
  const [display, setDisplay] = useState(0);
  const raf = useRef<number>(0);
  useEffect(() => {
    const start = performance.now();
    const dur = 900;
    const from = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(from + (value - from) * eased);
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [value]);
  return <span className="tabular-nums">{format ? format(Math.round(display)) : Math.round(display).toLocaleString()}</span>;
}

/* ─── Stat card ─────────────────────────────────────────────────────── */
export function StatCard({
  label,
  value,
  icon,
  delta,
  deltaTone = "up",
  format,
  delay = 0,
}: {
  label: string;
  value: number;
  icon: ReactNode;
  delta?: string;
  deltaTone?: "up" | "down" | "warn";
  format?: (v: number) => string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      <Card className="p-5" lift>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[0.72rem] font-bold uppercase tracking-[0.12em] text-[var(--ink-3)]">{label}</p>
            <p className="font-display mt-1.5 text-[2rem] font-semibold leading-none text-[var(--ink)]">
              <CountUp value={value} format={format} />
            </p>
          </div>
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-[var(--brand-soft)] text-[var(--brand-deep)]">
            {icon}
          </span>
        </div>
        {delta && (
          <p
            className={cn(
              "mt-3 text-[0.75rem] font-semibold",
              deltaTone === "up" && "text-[var(--brand)]",
              deltaTone === "down" && "text-[var(--danger)]",
              deltaTone === "warn" && "text-[var(--amber)]"
            )}
          >
            {delta}
          </p>
        )}
      </Card>
    </motion.div>
  );
}

/* ─── Modal ─────────────────────────────────────────────────────────── */
export function Modal({
  open,
  onClose,
  title,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const fn = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto p-4 sm:p-8" role="dialog" aria-modal>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 bg-[rgba(23,38,31,0.45)] backdrop-blur-[2px]"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className={cn("relative mt-6 w-full rounded-2xl bg-[var(--surface)] p-6 shadow-2xl", wide ? "max-w-2xl" : "max-w-lg")}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-xl font-semibold">{title}</h3>
          <button onClick={onClose} className="rounded-lg p-1.5 text-[var(--ink-3)] hover:bg-[var(--surface-2)] hover:text-[var(--ink)]" aria-label="Close">
            <X size={18} />
          </button>
        </div>
        {children}
      </motion.div>
    </div>
  );
}

/* ─── Field helpers ─────────────────────────────────────────────────── */
export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[0.78rem] font-bold text-[var(--ink-2)]">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[0.7rem] text-[var(--ink-3)]">{hint}</span>}
    </label>
  );
}

/* ─── Empty state ───────────────────────────────────────────────────── */
export function EmptyState({ icon, title, sub }: { icon: ReactNode; title: string; sub?: string }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[var(--surface-2)] text-[var(--ink-3)]">{icon}</span>
      <p className="mt-3 font-display text-lg font-semibold text-[var(--ink)]">{title}</p>
      {sub && <p className="mt-1 max-w-sm text-sm text-[var(--ink-2)]">{sub}</p>}
    </div>
  );
}
