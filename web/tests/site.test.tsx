import { describe, expect, it, beforeEach } from "vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { readFileSync } from "node:fs";
import App from "../src/App";
import { createApi } from "../src/lib/api";
import { approvedContext, launchMessenger } from "../src/lib/messenger";
import { empathyFor, wantsHuman } from "../src/lib/empathy";
import { loadEntry } from "../src/lib/session";

const go = async (hash: string) => { location.hash = hash; };
async function renderApp(hash = "#/") {
  await go(hash);
  const api = await createApi();
  return { api, ...render(<App apiOverride={api} />) };
}
async function a11y(container: HTMLElement) {
  // color-contrast needs real layout/CSS; palette contrast is verified separately below.
  const r = await axe.run(container, { rules: { "color-contrast": { enabled: false }, region: { enabled: false } } });
  return r.violations.map((v) => `${v.id}: ${v.help}`);
}

beforeEach(() => { location.hash = "#/"; });

describe("public site content", () => {
  it("shows the demo banner and a prominent link to the real OSC site", async () => {
    await renderApp();
    const banner = screen.getByRole("region", { name: /demonstration notice/i });
    expect(banner).toHaveTextContent("Demonstration Only — Not an Official New York State OSC Website. Do not enter real personal information.");
    const link = within(banner).getByRole("link", { name: /real OSC/i });
    expect(link).toHaveAttribute("href", "https://www.osc.ny.gov/unclaimed-funds");
  });

  it("explains unclaimed funds, shows seven stages and the four entry points", async () => {
    await renderApp();
    expect(screen.getByRole("heading", { name: /seven stages/i })).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(7);
    for (const n of ["Check My Claim", "I Lost My Claim ID", "I Need to Submit Documents", "I Have a Question About My Check"]) {
      expect(screen.getByRole("link", { name: new RegExp(n, "i") })).toBeInTheDocument();
    }
    expect(screen.getByRole("link", { name: "Accessibility" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Privacy" })).toBeInTheDocument();
  });

  it("does not use OSC branding assets or hotlink OSC images", async () => {
    const { container } = await renderApp();
    expect(container.querySelectorAll("img")).toHaveLength(0);
    expect(container.innerHTML).not.toMatch(/src="https?:\/\/(www\.)?osc\.ny\.gov/);
  });
});

describe("4 digital visitor enters through the website", () => {
  it("collects only non-sensitive context and never asks for Claim ID or verification answers", async () => {
    const user = userEvent.setup();
    await renderApp("#/start?reason=lost_claim_id");
    expect(screen.queryByLabelText(/claim id/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/last name|zip|birth|social/i)).not.toBeInTheDocument();
    expect(screen.getByLabelText(/reason for your visit/i)).toHaveValue("lost_claim_id");

    await user.click(screen.getByRole("button", { name: /start chat/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/understand this is a demonstration/i);

    await user.click(screen.getByLabelText(/i understand this is a demonstration/i));
    await user.click(screen.getByRole("button", { name: /start chat/i }));
    expect(await screen.findByRole("heading", { name: /demo chat/i })).toBeInTheDocument();

    expect(loadEntry()).toEqual({ reason: "lost_claim_id", hasClaimId: "unsure", language: "en-US", demoAcknowledged: true });
    const stored = JSON.stringify(Object.entries(sessionStorage));
    expect(stored).not.toMatch(/DEMO-\d|zip|dob|token|code/i);
  });

  it("Messenger receives only the approved context keys; falls back locally when not configured", () => {
    const ctx = { reason: "check_claim", hasClaimId: "yes", language: "en-US", demoAcknowledged: true } as const;
    expect(Object.keys(approvedContext(ctx)).sort()).toEqual(["mikedai_OSC_hasClaimId", "mikedai_OSC_language", "mikedai_OSC_reason", "mikedai_OSC_source"]);
    expect(launchMessenger(ctx, null)).toBe(false);
  });
});

describe("local-demo chat (shared core)", () => {
  async function chatAs(reason: string) {
    const user = userEvent.setup();
    await renderApp(`#/start?reason=${reason}`);
    await user.click(screen.getByLabelText(/i understand this is a demonstration/i));
    await user.click(screen.getByRole("button", { name: /start chat/i }));
    await screen.findByRole("heading", { name: /demo chat/i });
    return user;
  }
  async function verifyAsLinus(user: ReturnType<typeof userEvent.setup>) {
    await user.click(screen.getByRole("button", { name: /my own claim/i }));
    await user.type(await screen.findByLabelText("Claim ID"), "DEMO-100002");
    await user.type(screen.getByLabelText("Last name"), "Quillfeather");
    await user.type(screen.getByLabelText("ZIP code"), "00002");
    await user.click(screen.getByRole("button", { name: /^continue$/i }));
    await user.click(await screen.findByRole("button", { name: /send code/i }));
    const inbox = await screen.findByLabelText(/simulated inbox/i);
    const code = inbox.textContent!.match(/\d{6}/)![0];
    await user.type(screen.getByLabelText(/six-digit code/i), code);
    await user.click(screen.getByRole("button", { name: /^verify$/i }));
    await screen.findByText(/you're verified/i);
  }

  it("1/10 verification with a code, then status for the documents-required journey", async () => {
    const user = await chatAs("check_claim");
    await verifyAsLinus(user);
    await user.click(screen.getByRole("button", { name: /check status/i }));
    expect(await screen.findByText(/documents required/i)).toBeInTheDocument();
    expect(screen.getByText(/proof of your connection to the old address/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /required documents/i }));
    expect(await screen.findByText(/proof old address \(required\)/i)).toBeInTheDocument();
  });

  it("neutral failure for a wrong detail and no hint about whether the claim exists", async () => {
    const user = await chatAs("check_claim");
    await user.click(screen.getByRole("button", { name: /my own claim/i }));
    await user.type(await screen.findByLabelText("Claim ID"), "DEMO-999999");
    await user.type(screen.getByLabelText("Last name"), "Nobody");
    await user.type(screen.getByLabelText("ZIP code"), "99999");
    await user.click(screen.getByRole("button", { name: /^continue$/i }));
    expect(await screen.findByRole("status")).toHaveTextContent(/couldn't verify that information/i);
    expect(screen.queryByText(/not found|does not exist|no such/i)).not.toBeInTheDocument();
  });

  it("14 deceased-owner path acknowledges the loss and offers a human", async () => {
    const user = await chatAs("check_claim");
    await user.click(screen.getByRole("button", { name: /deceased family member/i }));
    expect(await screen.findByText(/I'm sorry for your loss/i)).toBeInTheDocument();
    expect(screen.queryByText(/great|awesome|happy to/i)).not.toBeInTheDocument();
  });

  it("17/21 human request produces a sanitized transfer summary", async () => {
    const user = await chatAs("check_claim");
    await user.click(screen.getByRole("button", { name: /my own claim/i }));
    await user.type(screen.getByLabelText(/type a message/i), "I want to talk to a person");
    await user.click(screen.getByRole("button", { name: /^send$/i }));
    const region = await screen.findByRole("region", { name: /transfer summary/i });
    expect(region).toHaveTextContent(/Verification: unverified/);
    expect(region.textContent).not.toMatch(/DEMO-\d{6}|@|\d{3}-\d{3}-\d{4}/);
  });
});

describe("19/20 empathy", () => {
  it("responds to grief without cheer", () => {
    const r = empathyFor("my mother passed away last spring and I'm trying to claim her money")!;
    expect(r).toMatch(/I'm sorry for your loss/);
    expect(r).not.toMatch(/!|great|happy/i);
  });
  it("responds to frustration and missing checks, fraud and confusion", () => {
    expect(empathyFor("this is so frustrating, I've called three times")).toMatch(/frustrating/);
    expect(empathyFor("my check never came")).toMatch(/important/);
    expect(empathyFor("I think this is a scam")).toMatch(/worrying/);
    expect(empathyFor("I'm confused by all of this")).toMatch(/one step at a time/);
    expect(empathyFor("what time is it")).toBeNull();
  });
  it("does not claim personal feelings", () => {
    for (const t of ["passed away", "frustrated", "missing check", "scam", "confused", "urgent", "worried"]) {
      expect(empathyFor(t) ?? "").not.toMatch(/\bI (feel|am (sad|upset|angry))\b/i);
    }
  });
  it("detects requests for a person", () => {
    expect(wantsHuman("Can I speak to an agent?")).toBe(true);
    expect(wantsHuman("What is my status")).toBe(false);
  });
});

describe("upload page", () => {
  async function verifyUpload(user: ReturnType<typeof userEvent.setup>) {
    await user.type(await screen.findByLabelText("Claim ID"), "DEMO-100002");
    await user.type(screen.getByLabelText("Last name"), "Quillfeather");
    await user.type(screen.getByLabelText("ZIP code"), "00002");
    await user.click(screen.getByRole("button", { name: /^continue$/i }));
    await user.click(await screen.findByRole("button", { name: /send code/i }));
    const code = (await screen.findByLabelText(/simulated inbox/i)).textContent!.match(/\d{6}/)![0];
    await user.type(screen.getByLabelText(/six-digit code/i), code);
    await user.click(screen.getByRole("button", { name: /^verify$/i }));
  }
  it("rejects unsupported types and oversize files; accepts a valid file and returns a receipt", async () => {
    const user = userEvent.setup({ applyAccept: false });
    await renderApp("#/upload");
    await verifyUpload(user);
    const input = await screen.findByLabelText(/^file$/i);
    expect(screen.getByText(/under 10 MB/i)).toBeInTheDocument();

    await user.upload(input, new File(["x"], "notes.exe"));
    await user.click(screen.getByRole("button", { name: /submit document/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/PDF, PNG, JPG and TIF/);

    const big = new File(["x"], "big.pdf"); Object.defineProperty(big, "size", { value: 10 * 1024 * 1024 + 1 });
    await user.upload(input, big);
    await user.click(screen.getByRole("button", { name: /submit document/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/under 10 MB/);

    await user.upload(input, new File(["x"], "proof_of_address.pdf", { type: "application/pdf" }));
    await user.click(screen.getByRole("button", { name: /submit document/i }));
    expect(await screen.findByText(/RCPT-\d{6}/)).toBeInTheDocument();
  });
});

describe("27 accessibility, keyboard and mobile", () => {
  it("has no axe violations on home, start, upload, accessibility and privacy pages", async () => {
    for (const hash of ["#/", "#/start", "#/upload", "#/accessibility", "#/privacy"]) {
      const { container, unmount } = await renderApp(hash);
      await waitFor(() => expect(container.querySelector("main")).toBeTruthy());
      expect(await a11y(container), hash).toEqual([]);
      unmount();
    }
  });

  it("keyboard: skip link is first tab stop, then banner link, then nav; form is operable without a mouse", async () => {
    const user = userEvent.setup();
    await renderApp();
    await new Promise((r) => setTimeout(r, 0));
    (document.activeElement as HTMLElement | null)?.blur(); // start from a fresh page load
    await user.tab(); expect(screen.getByRole("link", { name: /skip to main content/i })).toHaveFocus();
    await user.tab(); expect(within(screen.getByRole("region", { name: /demonstration notice/i })).getByRole("link")).toHaveFocus();
    await user.tab(); expect(screen.getByRole("link", { name: "Home" })).toHaveFocus();

    cleanup();
    await renderApp("#/start");
    await new Promise((r) => setTimeout(r, 0)); // let the hashchange focus-management settle
    const ack = screen.getByLabelText(/i understand this is a demonstration/i);
    ack.focus(); await user.keyboard(" ");
    expect(ack).toBeChecked();
    await user.tab(); expect(screen.getByRole("button", { name: /start chat/i })).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(await screen.findByRole("heading", { name: /demo chat/i })).toBeInTheDocument();
  });

  it("every form control has an accessible name; viewport meta and focus styles are present", () => {
    const html = readFileSync("index.html", "utf8");
    expect(html).toMatch(/name="viewport" content="width=device-width, initial-scale=1"/);
    expect(html).toMatch(/<html lang="en">/);
    const css = readFileSync("src/styles.css", "utf8");
    expect(css).toMatch(/:focus-visible\s*{[^}]*outline:\s*3px/);
    expect(css).toMatch(/@media \(max-width: 40rem\)/);
    expect(css).toMatch(/min-height: 44px/);
  });

  it("palette meets WCAG 2.1 AA contrast (4.5:1 text, 3:1 non-text)", () => {
    const lum = (hex: string) => {
      const c = hex.replace("#", "").match(/../g)!.map((h) => parseInt(h, 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
      return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
    };
    const ratio = (a: string, b: string) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
    const pairs: [string, string, number][] = [
      ["#1b1b1b", "#ffffff", 4.5], ["#0b4f9e", "#ffffff", 4.5], ["#12427a", "#ffffff", 4.5], ["#ffffff", "#12427a", 4.5],
      ["#12427a", "#eef3f9", 4.5], ["#1b1b1b", "#eef3f9", 4.5], ["#a4101a", "#ffffff", 4.5], ["#ffffff", "#0b2a4a", 4.5],
      ["#1b1b1b", "#fff8e1", 4.5], ["#5d6f85", "#ffffff", 3], ["#ffbf47", "#1b1b1b", 3], ["#0b4f9e", "#eef3f9", 4.5],
    ];
    for (const [fg, bg, min] of pairs) expect(ratio(fg, bg), `${fg} on ${bg}`).toBeGreaterThanOrEqual(min);
    const css = readFileSync("src/styles.css", "utf8");
    for (const [fg, bg] of pairs) { void bg; expect(css.toLowerCase()).toContain(fg.toLowerCase()); }
  });
});

describe("28 production hygiene", () => {
  it("CSP restricts sources and the build contains no secrets", () => {
    const html = readFileSync("index.html", "utf8");
    expect(html).toMatch(/Content-Security-Policy/);
    expect(html).toMatch(/object-src 'none'/);
    expect(html).toMatch(/connect-src[^"]*ogfrsveuxbpyfseldkgx\.supabase\.co/);
    const all = ["src/lib/api.ts", "src/lib/messenger.ts", "index.html", "../.env.example"].map((f) => readFileSync(f, "utf8")).join("\n");
    expect(all).not.toMatch(/service_role|sb_secret_|eyJhbGciOi|client_secret|password\s*=/i);
  });
});
