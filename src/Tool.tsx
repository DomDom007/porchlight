// Porchlight: asks happy customers for a review at the right moment, with a one-tap link sent over WhatsApp.
import { useEffect, useState } from "react";
import { waLink } from "./lib/share";
import { uid, useStored } from "./lib/store";
import { Section, Stat, Stats } from "./ui/kit";

const T = "porchlight";
type Visit = { id: string; name: string; phone: string; service: string; at: number; sent?: number; reviewed?: boolean; skip?: boolean };
const TRADES: Record<string, { label: string; delayMin: number; why: string }> = {
  salon: { label: "Salon or barber", delayMin: 20, why: "People check their hair in a mirror at home within the hour." },
  garage: { label: "Garage", delayMin: 24 * 60, why: "Ask after the first day of driving, once the fix has proven itself." },
  dentist: { label: "Dentist or clinic", delayMin: 3 * 60, why: "Wait until the numbness wears off." },
  restaurant: { label: "Restaurant or cafe", delayMin: 45, why: "Ask while the meal is still a fresh memory." },
  trades: { label: "Plumber or electrician", delayMin: 2 * 60, why: "Ask once they have used the fixed thing." },
  shop: { label: "Shop", delayMin: 10, why: "Ask right after the purchase." },
};

export default function Porchlight() {
  const [biz, setBiz] = useStored(T, "biz", "Salon Yasmine");
  const [link, setLink] = useStored(T, "link", "https://g.page/r/your-review-link");
  const [trade, setTrade] = useStored(T, "trade", "salon");
  const [cc, setCc] = useStored(T, "cc", "216");
  const [tpl, setTpl] = useStored(T, "tpl", "Hi {name}, thank you for visiting {business} today! If you have a minute, a short review would really help us: {link}");
  const [visits, setVisits] = useStored<Visit[]>(T, "visits", [
    { id: "v1", name: "Amel", phone: "22111222", service: "Colour", at: Date.now() - 50 * 60000 },
    { id: "v2", name: "Rym", phone: "98123456", service: "Cut", at: Date.now() - 5 * 60000 },
    { id: "v3", name: "Salma", phone: "55123123", service: "Blow dry", at: Date.now() - 26 * 3600000, sent: Date.now() - 25 * 3600000, reviewed: true },
  ]);
  const [d, setD] = useState({ name: "", phone: "", service: "" });
  const [, tick] = useState(0);
  useEffect(() => { const id = setInterval(() => tick(x => x + 1), 30000); return () => clearInterval(id); }, []);

  const delay = TRADES[trade].delayMin * 60000;
  const phone = (p: string) => { const x = p.replace(/\D/g, ""); return x.length > 9 ? x : cc + x; };
  const text = (v: Visit) => tpl.replace(/\{name\}/g, v.name.split(" ")[0]).replace(/\{business\}/g, biz).replace(/\{link\}/g, link).replace(/\{service\}/g, v.service);
  const set = (id: string, p: Partial<Visit>) => setVisits(vs => vs.map(v => (v.id === id ? { ...v, ...p } : v)));
  const pending = visits.filter(v => !v.sent && !v.skip);
  const ready = pending.filter(v => Date.now() - v.at >= delay);
  const later = pending.filter(v => Date.now() - v.at < delay);
  const sent = visits.filter(v => v.sent);
  const rate = sent.length ? Math.round((sent.filter(v => v.reviewed).length / sent.length) * 100) : 0;
  const inMin = (v: Visit) => Math.ceil((v.at + delay - Date.now()) / 60000);
  const human = (m: number) => m >= 120 ? `${Math.round(m / 60)} h` : `${m} min`;

  return (
    <div className="stack">
      <Section title={biz}>
        <Stats><Stat value={ready.length} label="Ready to ask now" tone={ready.length ? "warn" : undefined} /><Stat value={later.length} label="Waiting for the right moment" /><Stat value={sent.length} label="Asked" /><Stat value={`${rate}%`} label="Left a review" tone="good" /></Stats>
      </Section>

      <div className="grid2">
        <Section title="Log a visit">
          <form className="stack" style={{ gap: 10 }} onSubmit={e => { e.preventDefault(); if (!d.name.trim() || !d.phone.trim()) return; setVisits([{ id: uid(), ...d, name: d.name.trim(), at: Date.now() }, ...visits]); setD({ name: "", phone: "", service: "" }); }}>
            <div className="row">
              <label className="field"><span>Customer</span><input id="pl-name" className="input" value={d.name} onChange={e => setD({ ...d, name: e.target.value })} /></label>
              <label className="field"><span>WhatsApp number</span><input id="pl-phone" className="input" inputMode="tel" value={d.phone} onChange={e => setD({ ...d, phone: e.target.value })} /></label>
            </div>
            <div className="row" style={{ alignItems: "flex-end" }}>
              <label className="field"><span>Service (optional)</span><input id="pl-svc" className="input" value={d.service} onChange={e => setD({ ...d, service: e.target.value })} /></label>
              <button className="btn primary" type="submit">Log visit</button>
            </div>
          </form>
          <p className="note" style={{ marginTop: 10 }}>Only ask customers who agreed to hear from you. Ask everyone the same way, not only the happy ones, so reviews stay honest.</p>
        </Section>
        <Section title="Settings">
          <div className="stack" style={{ gap: 10 }}>
            <div className="row"><label className="field"><span>Business</span><input id="pl-biz" className="input" value={biz} onChange={e => setBiz(e.target.value)} /></label>
              <label className="field"><span>Type</span><select id="pl-trade" className="input" value={trade} onChange={e => setTrade(e.target.value)}>{Object.entries(TRADES).map(([k, t]) => <option key={k} value={k}>{t.label}</option>)}</select></label></div>
            <p className="note">Best moment: {human(TRADES[trade].delayMin)} after the visit. {TRADES[trade].why}</p>
            <div className="row"><label className="field" style={{ flexGrow: 3 }}><span>Your review link</span><input id="pl-link" className="input" value={link} onChange={e => setLink(e.target.value)} /></label>
              <label className="field"><span>Country code</span><input id="pl-cc" className="input num" value={cc} onChange={e => setCc(e.target.value.replace(/\D/g, ""))} /></label></div>
            <label className="field"><span>Message ({"{name} {business} {link} {service}"})</span><textarea id="pl-tpl" className="input" rows={3} value={tpl} onChange={e => setTpl(e.target.value)} /></label>
          </div>
        </Section>
      </div>

      <Section title="Ask now">
        {ready.length === 0 ? <p className="empty-note">Nobody is ready yet.</p> : ready.map(v => (
          <div key={v.id} className="pl-row">
            <div style={{ flex: 1, minWidth: 0 }}><strong>{v.name}</strong> {v.service && <span className="pill">{v.service}</span>}<p className="note">{text(v)}</p></div>
            <a className="btn primary small" href={waLink(text(v), phone(v.phone))} target="_blank" rel="noreferrer" onClick={() => set(v.id, { sent: Date.now() })}>Send on WhatsApp</a>
            <button className="btn ghost small" onClick={() => set(v.id, { skip: true })}>Skip</button>
          </div>
        ))}
      </Section>
      <div className="grid2">
        <Section title="Coming up">
          {later.length === 0 ? <p className="empty-note">No one waiting.</p> : later.map(v => (
            <div key={v.id} className="pl-row"><strong style={{ flex: 1 }}>{v.name}</strong><span className="pill">in {human(inMin(v))}</span><button className="btn ghost small" onClick={() => set(v.id, { at: Date.now() - delay })}>Ask now</button></div>
          ))}
        </Section>
        <Section title="Asked">
          {sent.length === 0 ? <p className="empty-note">No requests sent yet.</p> : sent.slice(0, 30).map(v => (
            <div key={v.id} className="pl-row"><span style={{ flex: 1 }}>{v.name} <span className="note">{new Date(v.sent!).toLocaleDateString()}</span></span>
              <label className="check note"><input type="checkbox" checked={!!v.reviewed} onChange={e => set(v.id, { reviewed: e.target.checked })} />Reviewed</label></div>
          ))}
        </Section>
      </div>
      <style>{`.pl-row{display:flex;gap:12px;align-items:center;padding:10px 0;border-bottom:1px solid var(--line);flex-wrap:wrap}`}</style>
    </div>
  );
}
