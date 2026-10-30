// @vitest-environment happy-dom
import React from "react";
import { describe, expect, it, vi, beforeAll } from "vitest";
import { render } from "@testing-library/react";
import { act } from "react";

// ─── Next.js navigation mocks (pages under test are pure client comps) ──
let mockPathname = "/";
let mockParams: Record<string, string> = {};
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn(), refresh: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => mockPathname,
  useSearchParams: () => new URLSearchParams(),
  useParams: () => mockParams,
  useSelectedLayoutSegment: () => null,
  notFound: () => undefined,
  redirect: () => undefined,
}));

vi.mock("next/link", () => ({
  default: ({ children, href, ...rest }: any) => React.createElement("a", { href: typeof href === "string" ? href : "#", ...rest }, children),
}));

window.matchMedia =
  window.matchMedia ??
  ((q: string) => ({ matches: false, media: q, onchange: null, addListener: () => {}, removeListener: () => {}, addEventListener: () => {}, removeEventListener: () => {}, dispatchEvent: () => false }) as MediaQueryList);

const { useAppStore } = await import("@/lib/store");

const PAGES: { name: string; path: string; params?: Record<string, string>; load: () => Promise<{ default: React.ComponentType }> }[] = [
  { name: "dashboard", path: "/dashboard", load: () => import("@/app/(app)/dashboard/page") },
  { name: "radar", path: "/radar", load: () => import("@/app/(app)/radar/page") },
  { name: "coverage", path: "/coverage", load: () => import("@/app/(app)/coverage/page") },
  { name: "accounts", path: "/accounts", load: () => import("@/app/(app)/accounts/page") },
  { name: "account-detail", path: "/accounts/acc_001", params: { id: "acc_001" }, load: () => import("@/app/(app)/accounts/[id]/page") },
  { name: "routes", path: "/routes", load: () => import("@/app/(app)/routes/page") },
  { name: "pipeline", path: "/pipeline", load: () => import("@/app/(app)/pipeline/page") },
  { name: "email", path: "/email", load: () => import("@/app/(app)/email/page") },
  { name: "activities", path: "/activities", load: () => import("@/app/(app)/activities/page") },
  { name: "scorecard", path: "/scorecard", load: () => import("@/app/(app)/scorecard/page") },
  { name: "reports", path: "/reports", load: () => import("@/app/(app)/reports/page") },
  { name: "products", path: "/products", load: () => import("@/app/(app)/products/page") },
  { name: "integrations", path: "/integrations", load: () => import("@/app/(app)/integrations/page") },
  { name: "team", path: "/team", load: () => import("@/app/(app)/team/page") },
  { name: "contacts", path: "/contacts", load: () => import("@/app/(app)/contacts/page") },
  { name: "assistant", path: "/assistant", load: () => import("@/app/(app)/assistant/page") },
  { name: "settings", path: "/settings", load: () => import("@/app/(app)/settings/page") },
];

beforeAll(() => {
  useAppStore.getState().resetDemo();
  useAppStore.setState({ currentUserId: "u_elena" });
});

describe("page smoke render (client-side)", () => {
  for (const p of PAGES) {
    it(`renders ${p.name} (${p.path}) without crashing`, async () => {
      mockPathname = p.path;
      mockParams = p.params ?? {};
      const mod = await p.load();
      const Page = mod.default;
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      let container: HTMLElement | null = null;
      try {
        await act(async () => {
          const r = render(React.createElement(Page));
          container = r.container;
        });
        // give pending effects a tick
        await act(async () => {
          await new Promise((r) => setTimeout(r, 50));
        });
        expect(container!.textContent!.length).toBeGreaterThan(40);
      } finally {
        consoleSpy.mockRestore();
      }
    });
  }
});
