"use client";

import { useState } from "react";

export function DemoRequestForm() {
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState("sending");
    setErrors({});
    const body = Object.fromEntries(new FormData(e.currentTarget).entries());
    if (!body.message) delete body.message;
    const res = await fetch("/api/demo-request", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (res.ok) return setState("done");
    const data = await res.json().catch(() => ({}));
    setErrors(Object.fromEntries((data.errors ?? []).map((x: { field: string; message: string }) => [x.field, x.message])));
    setState("error");
  }

  if (state === "done") {
    return (
      <div className="callout callout-verified" role="status">
        <div>
          <div className="strong">Thanks — we’ve received your request.</div>
          <div>A member of our team will reach out within one business day to schedule your demo.</div>
        </div>
      </div>
    );
  }

  const err = (f: string) => errors[f] && <div className="hint" style={{ color: "var(--red-700)" }}>{errors[f]}</div>;

  return (
    <form onSubmit={onSubmit} noValidate>
      <div className="field-row">
        <div className="field"><label htmlFor="name">Full name</label><input id="name" name="name" type="text" required autoComplete="name" />{err("name")}</div>
        <div className="field"><label htmlFor="email">Work email</label><input id="email" name="email" type="email" required autoComplete="email" />{err("email")}</div>
      </div>
      <div className="field"><label htmlFor="company">Company</label><input id="company" name="company" type="text" required autoComplete="organization" />{err("company")}</div>
      <div className="field-row">
        <div className="field">
          <label htmlFor="segment">Industry</label>
          <select id="segment" name="segment" defaultValue="consulting">
            <option value="consulting">Permit consulting</option>
            <option value="construction">Construction</option>
            <option value="retail">Retail</option>
            <option value="hospitality">Hospitality</option>
            <option value="enterprise">Enterprise / multi-industry</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="locations">Locations managed</label>
          <select id="locations" name="locations" defaultValue="2-10">
            <option value="1">1</option><option value="2-10">2–10</option><option value="11-50">11–50</option><option value="51-200">51–200</option><option value="200+">200+</option>
          </select>
        </div>
      </div>
      <div className="field"><label htmlFor="message">What would you like to see? <span className="muted">(optional)</span></label><textarea id="message" name="message" /></div>
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="sr-only" aria-hidden="true" />
      <button className="btn btn-primary btn-lg" style={{ width: "100%" }} disabled={state === "sending"}>{state === "sending" ? "Sending…" : "Request demo"}</button>
      {state === "error" && Object.keys(errors).length === 0 && <div className="hint" style={{ color: "var(--red-700)" }}>Something went wrong. Please try again.</div>}
      <p className="hint" style={{ marginTop: 12 }}>We use your details to arrange the demo and send related product information. You can opt out at any time.</p>
    </form>
  );
}
