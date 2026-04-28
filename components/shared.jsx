// Shared UI: nav, footer, login modal, toasts, icons.

const { useState, useEffect, useRef, useMemo, createContext, useContext } = React;

// ---------- App context ----------
const AppCtx = createContext(null);
function useApp() { return useContext(AppCtx); }

// ---------- Icons (minimal stroke set) ----------
const Icon = {
  search: (p) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>,
  arrow: (p) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M5 12h14M13 5l7 7-7 7"/></svg>,
  arrowDown: (p) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="m6 9 6 6 6-6"/></svg>,
  download: (p) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 3v12M7 10l5 5 5-5M5 21h14"/></svg>,
  upload: (p) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 21V9M7 14l5-5 5 5M5 3h14"/></svg>,
  user: (p) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-7 8-7s8 3 8 7"/></svg>,
  lock: (p) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>,
  plus: (p) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 5v14M5 12h14"/></svg>,
  edit: (p) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M3 21h4l11-11-4-4L3 17z"/><path d="M14 6l4 4"/></svg>,
  trash: (p) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M6 6l1 14a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-14"/></svg>,
  close: (p) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M18 6 6 18M6 6l12 12"/></svg>,
  check: (p) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="m5 12 5 5 9-11"/></svg>,
  external: (p) => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M14 4h6v6M10 14 20 4M19 13v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h5"/></svg>,
  globe: (p) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></svg>,
  mail: (p) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>,
  filter: (p) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M3 5h18l-7 9v6l-4-2v-4z"/></svg>,
  doc: (p) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6"/></svg>,
  sparkle: (p) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 3v6M12 15v6M3 12h6M15 12h6"/></svg>,
  logout: (p) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>,
};

// ---------- Logo ----------
function Logo({ size = 28 }) {
  // Plain: a thin square ring + a pin-stamp serif "Y"
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{
        width: size, height: size,
        border: "1px solid var(--ink)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "var(--serif)", fontSize: size * 0.62, fontWeight: 500,
        color: "var(--ink)", borderRadius: 2, letterSpacing: "-0.04em",
      }}>Y</div>
      <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.05 }}>
        <span style={{ fontFamily: "var(--serif)", fontSize: 17, fontWeight: 500, letterSpacing: "-0.01em" }}>Yuan Lab</span>
        <span style={{ fontFamily: "var(--mono)", fontSize: 9, letterSpacing: "0.14em", color: "var(--ink-3)", textTransform: "uppercase" }}>SHUTCM</span>
      </div>
    </div>
  );
}

// ---------- Top nav ----------
function Nav() {
  const { route, setRoute, lang, setLang, user, signOut, openLogin, openAdmin, t } = useApp();
  const items = [
    ["home",         t.nav.home],
    ["people",       t.nav.people],
    ["research",     t.nav.research],
    ["publications", t.nav.publications],
    ["resources",    t.nav.resources],
    ["join",         t.nav.join],
    ["contact",      t.nav.contact],
  ];
  return (
    <nav style={{
      position: "sticky", top: 0, zIndex: 50,
      background: "oklch(0.974 0.008 85 / 0.85)",
      backdropFilter: "blur(10px)",
      borderBottom: "1px solid var(--line)",
    }}>
      <div className="container" style={{ display: "flex", alignItems: "center", height: 64, gap: 32 }}>
        <a href="#" onClick={(e) => { e.preventDefault(); setRoute("home"); }} style={{ flexShrink: 0 }}>
          <Logo />
        </a>
        <div style={{ display: "flex", gap: 4, marginLeft: "auto", alignItems: "center" }}>
          {items.map(([k, label]) => (
            <a key={k} href="#" onClick={(e) => { e.preventDefault(); setRoute(k); }}
              style={{
                padding: "8px 12px", fontSize: 13.5, fontWeight: 500,
                color: route === k ? "var(--ink)" : "var(--ink-2)",
                borderBottom: route === k ? "1px solid var(--ink)" : "1px solid transparent",
                transition: "all 0.15s",
              }}>{label}</a>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, paddingLeft: 16, borderLeft: "1px solid var(--line)" }}>
          <button className="btn btn-text btn-sm" onClick={() => setLang(lang === "en" ? "cn" : "en")} title="Toggle language">
            <Icon.globe />
            <span style={{ fontFamily: "var(--mono)", fontSize: 11, letterSpacing: "0.08em" }}>
              {lang === "en" ? "EN / 中" : "中 / EN"}
            </span>
          </button>
          {user.role === "admin" && (
            <button className="btn btn-ghost btn-sm" onClick={openAdmin}>
              <Icon.sparkle /> Admin
            </button>
          )}
          {user.role === "guest" ? (
            <button className="btn btn-primary btn-sm" onClick={openLogin}>
              <Icon.user /> {t.actions.signin}
            </button>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{
                width: 28, height: 28, borderRadius: 100,
                background: "var(--accent-soft)", color: "var(--accent-2)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 12, fontWeight: 600, letterSpacing: "0.02em",
              }}>{(user.name || "?").split(" ").map(s => s[0]).slice(0, 2).join("")}</span>
              <button className="btn btn-text btn-sm" onClick={signOut} title={t.actions.signout}>
                <Icon.logout />
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}

// ---------- Footer ----------
function Footer() {
  const { lang, t, setRoute } = useApp();
  const D = window.LAB_DATA;
  return (
    <footer style={{ borderTop: "1px solid var(--line)", marginTop: 80, padding: "56px 0 40px", background: "var(--bg-2)" }}>
      <div className="container" style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr 1fr", gap: 48, marginBottom: 40 }}>
        <div>
          <Logo />
          <p style={{ marginTop: 16, fontSize: 13.5, color: "var(--ink-2)", maxWidth: 320 }}>
            {D.lab.affiliation[lang]}
          </p>
          <p style={{ fontSize: 13, color: "var(--ink-3)", marginTop: 8 }}>{D.lab.address[lang]}</p>
        </div>
        <FooterCol title="Lab" items={[
          [t.nav.people, "people"],
          [t.nav.research, "research"],
          [t.nav.publications, "publications"],
        ]} setRoute={setRoute} />
        <FooterCol title="Internal" items={[
          [t.nav.resources, "resources"],
          [t.nav.join, "join"],
          [t.nav.contact, "contact"],
        ]} setRoute={setRoute} />
        <div>
          <h4 style={{ fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--ink-3)", fontWeight: 500, marginBottom: 12, fontFamily: "var(--mono)" }}>
            Contact
          </h4>
          <p style={{ fontSize: 13.5, color: "var(--ink-2)", marginBottom: 4 }}>{D.lab.email}</p>
          <p style={{ fontSize: 13, color: "var(--ink-3)" }}>{D.pi.name[lang]} · PI</p>
        </div>
      </div>
      <div className="container" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 24, borderTop: "1px solid var(--line)" }}>
        <span style={{ fontSize: 12, color: "var(--ink-3)", fontFamily: "var(--mono)", letterSpacing: "0.04em" }}>
          © 2024–2026 Yuan Lab · SHUTCM
        </span>
        <span style={{ fontSize: 12, color: "var(--ink-3)", fontFamily: "var(--mono)", letterSpacing: "0.04em" }}>
          v1.0 · last updated 2026-04-27
        </span>
      </div>
    </footer>
  );
}
function FooterCol({ title, items, setRoute }) {
  return (
    <div>
      <h4 style={{ fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--ink-3)", fontWeight: 500, marginBottom: 12, fontFamily: "var(--mono)" }}>{title}</h4>
      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8 }}>
        {items.map(([label, route]) => (
          <li key={route}>
            <a href="#" onClick={(e) => { e.preventDefault(); setRoute(route); }} style={{ fontSize: 13.5, color: "var(--ink-2)" }}>
              {label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------- Login modal ----------
function LoginModal() {
  const { showLogin, closeLogin, signIn, t, lang } = useApp();
  const [u, setU] = useState("");
  const [p, setP] = useState("");
  const [err, setErr] = useState("");
  useEffect(() => { if (showLogin) { setU(""); setP(""); setErr(""); } }, [showLogin]);
  if (!showLogin) return null;

  function submit(e) {
    e.preventDefault();
    const ok = signIn(u.trim(), p);
    if (!ok) setErr(lang === "en" ? "Invalid credentials." : "账号或密码错误。");
    else closeLogin();
  }
  return (
    <div className="modal-backdrop" onClick={closeLogin}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 440 }}>
        <div className="modal-header">
          <div>
            <div className="eyebrow" style={{ marginBottom: 4 }}>Yuan Lab · SHUTCM</div>
            <h3 style={{ fontSize: 22 }}>{t.auth.signinTitle}</h3>
          </div>
          <button className="btn btn-text" onClick={closeLogin}><Icon.close /></button>
        </div>
        <form className="modal-body" onSubmit={submit}>
          <label className="label">{t.auth.username}</label>
          <input className="input" value={u} onChange={(e) => setU(e.target.value)} autoFocus placeholder="admin / member" />
          <div style={{ height: 14 }} />
          <label className="label">{t.auth.password}</label>
          <input className="input" type="password" value={p} onChange={(e) => setP(e.target.value)} placeholder="•••••" />
          {err && <div style={{ marginTop: 12, padding: "8px 12px", background: "oklch(0.95 0.04 25)", color: "var(--danger)", fontSize: 13, borderRadius: 4 }}>{err}</div>}
          <div style={{ marginTop: 18 }}>
            <button className="btn btn-primary" type="submit" style={{ justifyContent: "center", width: "100%" }}>
              {t.actions.signin} <Icon.arrow />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ---------- Toast stack ----------
function ToastStack() {
  const { toasts } = useApp();
  return (
    <div className="toast-stack">
      {toasts.map(tt => (
        <div key={tt.id} className="toast">
          <Icon.check />
          <span>{tt.text}</span>
        </div>
      ))}
    </div>
  );
}

// ---------- Section header ----------
function SectionHeader({ eyebrow, title, action }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 32, paddingBottom: 16, borderBottom: "1px solid var(--ink)" }}>
      <div>
        {eyebrow && <div className="eyebrow" style={{ marginBottom: 8 }}>{eyebrow}</div>}
        <h2>{title}</h2>
      </div>
      {action}
    </div>
  );
}

// expose
Object.assign(window, { Icon, Logo, Nav, Footer, LoginModal, ToastStack, SectionHeader, AppCtx, useApp });
