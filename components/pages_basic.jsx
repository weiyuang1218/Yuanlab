// Home, Research, Join Us, Contact pages

function HomePage() {
  const { lang, t, setRoute } = useApp();
  const D = window.LAB_DATA;
  const featuredPubs = D.publications.filter(p => p.featured).slice(0, 3);
  const news = D.news.slice(0, 3);

  return (
    <div className="page-fade">
      {/* Hero */}
      <section style={{ padding: "80px 0 64px", borderBottom: "1px solid var(--line)" }}>
        <div className="container">
          <div className="eyebrow" style={{ marginBottom: 24 }}>
            {D.lab.affiliation[lang]}
          </div>
          <h1 style={{ maxWidth: "20ch", marginBottom: 32 }}>
            {lang === "en" ? (
              <>Hormone-driven cancer, <em style={{ fontStyle: "italic", color: "var(--accent)" }}>rewired</em> by aging — and the molecules that intervene.</>
            ) : (
              <>激素依赖肿瘤、<em style={{ fontStyle: "italic", color: "var(--accent)" }}>衰老调控</em> 与靶向干预的分子图谱。</>
            )}
          </h1>
          <p className="lead" style={{ maxWidth: "65ch", marginBottom: 40 }}>
            {D.lab.mission[lang]}
          </p>
          <div style={{ display: "flex", gap: 12 }}>
            <button className="btn btn-primary" onClick={() => setRoute("research")}>
              {lang === "en" ? "Explore research" : "研究方向"} <Icon.arrow />
            </button>
            <button className="btn btn-ghost" onClick={() => setRoute("publications")}>
              {lang === "en" ? "Publications" : "代表性论文"}
            </button>
          </div>
        </div>
      </section>

      {/* Hero figure: composite team placeholder */}
      <section style={{ padding: "0", borderBottom: "1px solid var(--line)" }}>
        <div className="container" style={{ padding: "32px 32px 0" }}>
          <div className="placeholder" style={{ height: 360, fontSize: 12 }}>
            LAB GROUP PHOTO · 1920 × 720 · DROP HERE
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-3)", letterSpacing: "0.06em" }}>
            <span>FIG · YUAN LAB / 2026 SPRING</span>
            <span>SHANGHAI · 上海</span>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section style={{ padding: "56px 0", borderBottom: "1px solid var(--line)" }}>
        <div className="container" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 0 }}>
          {[
            [D.members.length, t.home.labFigures.members],
            [D.publications.length, t.home.labFigures.publications],
            [4, t.home.labFigures.funded],
            [D.lab.established, t.home.labFigures.years],
          ].map(([num, label], i) => (
            <div key={i} style={{ padding: "0 24px", borderLeft: i === 0 ? "none" : "1px solid var(--line)" }}>
              <div style={{ fontFamily: "var(--serif)", fontSize: 56, fontWeight: 400, lineHeight: 1, letterSpacing: "-0.02em" }}>{num}</div>
              <div style={{ marginTop: 8, fontSize: 12.5, color: "var(--ink-2)", textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: "var(--mono)" }}>
                {label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Two-col: Research + News */}
      <section style={{ padding: "80px 0" }}>
        <div className="container" style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 64 }}>
          <div>
            <SectionHeader eyebrow="01 / Research" title={t.home.sectionResearch} action={
              <button className="btn btn-text btn-sm" onClick={() => setRoute("research")}>
                {t.home.viewAll} <Icon.arrow />
              </button>
            } />
            <div style={{ display: "flex", flexDirection: "column" }}>
              {D.research.map((r, i) => (
                <div key={r.id} style={{ padding: "20px 0", borderBottom: i === D.research.length - 1 ? "none" : "1px solid var(--line)", display: "grid", gridTemplateColumns: "60px 1fr", gap: 16, cursor: "pointer" }}
                  onClick={() => setRoute("research")}>
                  <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-3)", letterSpacing: "0.08em", paddingTop: 4 }}>
                    {String(i + 1).padStart(2, "0")}
                  </div>
                  <div>
                    <h3 style={{ fontSize: 19, marginBottom: 6 }}>{r.title[lang]}</h3>
                    <p style={{ fontSize: 14, marginBottom: 8 }}>{r.summary[lang]}</p>
                    <div className="tags">
                      {r.keywords.slice(0, 4).map(k => <span key={k} className="chip">{k}</span>)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <SectionHeader eyebrow="02 / News" title={t.home.latestNews} action={null} />
            <div style={{ display: "flex", flexDirection: "column" }}>
              {news.map((n, i) => (
                <div key={i} style={{ padding: "16px 0", borderBottom: "1px solid var(--line)" }}>
                  <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-3)", letterSpacing: "0.06em", marginBottom: 6 }}>{n.date}</div>
                  <p style={{ fontSize: 14, color: "var(--ink)", margin: 0, lineHeight: 1.5 }}>{n[lang]}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Featured pubs */}
      <section style={{ padding: "0 0 80px" }}>
        <div className="container">
          <SectionHeader eyebrow="03 / Selected" title={t.home.sectionPubs} action={
            <button className="btn btn-text btn-sm" onClick={() => setRoute("publications")}>
              {t.home.viewAll} <Icon.arrow />
            </button>
          } />
          <div style={{ display: "flex", flexDirection: "column" }}>
            {featuredPubs.map((p, i) => (
              <PubRow key={p.id} pub={p} index={i + 1} />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function PubRow({ pub, index }) {
  return (
    <article style={{ display: "grid", gridTemplateColumns: "60px 1fr 200px", gap: 24, padding: "24px 0", borderBottom: "1px solid var(--line)", alignItems: "start" }}>
      <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-3)", letterSpacing: "0.08em" }}>
        {pub.year} · {String(index).padStart(2, "0")}
      </div>
      <div>
        <h3 style={{ fontSize: 19, marginBottom: 8, lineHeight: 1.35, maxWidth: "70ch" }}>{pub.title}</h3>
        <p style={{ fontSize: 13.5, color: "var(--ink-2)", margin: 0 }}>{pub.authors}</p>
        <p style={{ fontSize: 13, color: "var(--ink-3)", margin: "4px 0 0", fontStyle: "italic" }}>{pub.journal} · {pub.volume}</p>
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
        <span className="chip accent">{pub.tag}</span>
        {pub.doi && <a href="#" onClick={(e) => e.preventDefault()} className="btn btn-text btn-sm" style={{ fontSize: 12 }}>DOI <Icon.external /></a>}
      </div>
    </article>
  );
}

// ---------- Research ----------
function ResearchPage() {
  const { lang, t } = useApp();
  const D = window.LAB_DATA;
  return (
    <div className="page-fade container" style={{ padding: "64px 32px 0" }}>
      <div className="eyebrow" style={{ marginBottom: 16 }}>Research</div>
      <h1 style={{ maxWidth: "20ch", marginBottom: 24 }}>
        {lang === "en" ? "Four directions, one question." : "四个方向，一个问题。"}
      </h1>
      <p className="lead" style={{ marginBottom: 64, maxWidth: "60ch" }}>
        {lang === "en"
          ? "How do hormones, aging, and the genome co-author the biology of cancer — and where does that give us new ways to intervene?"
          : "激素、衰老与基因组如何共同书写肿瘤生物学？这其中又孕育着哪些新的干预可能？"}
      </p>
      <div style={{ display: "flex", flexDirection: "column" }}>
        {D.research.map((r, i) => (
          <article key={r.id} style={{
            display: "grid", gridTemplateColumns: "120px 1fr 1fr", gap: 32,
            padding: "40px 0", borderTop: "1px solid var(--ink)",
            borderBottom: i === D.research.length - 1 ? "1px solid var(--ink)" : "none"
          }}>
            <div style={{ fontFamily: "var(--mono)", fontSize: 12, letterSpacing: "0.1em", color: "var(--ink-3)" }}>
              {String(i + 1).padStart(2, "0")} / {String(D.research.length).padStart(2, "0")}
            </div>
            <div>
              <h2 style={{ fontSize: 28, marginBottom: 16 }}>{r.title[lang]}</h2>
              <p style={{ fontSize: 15, color: "var(--ink-2)" }}>{r.summary[lang]}</p>
              <div className="tags" style={{ marginTop: 16 }}>
                {r.keywords.map(k => <span key={k} className="chip">{k}</span>)}
              </div>
            </div>
            <div className="placeholder" style={{ height: 200, fontSize: 11 }}>
              FIG · {r.title.en.toUpperCase()} · CONCEPT
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

// ---------- Join Us ----------
function JoinPage() {
  const { lang, t } = useApp();
  const D = window.LAB_DATA;
  const items = D.joinUs[lang];
  return (
    <div className="page-fade container-narrow" style={{ padding: "64px 32px 0" }}>
      <div className="eyebrow" style={{ marginBottom: 16 }}>Join Us · 招生</div>
      <h1 style={{ marginBottom: 24 }}>{lang === "en" ? "We are hiring." : "我们正在招生。"}</h1>
      <p className="lead" style={{ marginBottom: 56 }}>
        {lang === "en"
          ? "Yuan Lab is recruiting curious, persistent scientists who want to work at the boundary of cancer biology and integrative medicine."
          : "袁富文课题组招聘对肿瘤生物学与中西医结合交叉领域抱有持续好奇心的研究者。"}
      </p>
      <div style={{ display: "flex", flexDirection: "column" }}>
        {items.map((item, i) => (
          <div key={i} style={{ padding: "28px 0", borderTop: "1px solid var(--line)", display: "grid", gridTemplateColumns: "60px 1fr", gap: 24 }}>
            <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-3)", letterSpacing: "0.08em", paddingTop: 6 }}>
              {String(i + 1).padStart(2, "0")}
            </div>
            <div>
              <h3 style={{ fontSize: 21, marginBottom: 8 }}>{item.title}</h3>
              <p style={{ fontSize: 14.5, margin: 0 }}>{item.body}</p>
            </div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 48, padding: 32, background: "var(--bg-2)", borderLeft: "3px solid var(--accent)", borderRadius: "0 4px 4px 0" }}>
        <h4 style={{ marginBottom: 8 }}>{lang === "en" ? "How to apply" : "申请方式"}</h4>
        <p style={{ margin: 0, fontSize: 14 }}>
          {lang === "en"
            ? <>Email a CV, transcripts, and a one-paragraph statement of interest to <a href={"mailto:" + D.lab.email} style={{ color: "var(--accent)", borderBottom: "1px solid var(--accent)" }}>{D.lab.email}</a>.</>
            : <>请将简历、成绩单与一段研究意向陈述发送至 <a href={"mailto:" + D.lab.email} style={{ color: "var(--accent)", borderBottom: "1px solid var(--accent)" }}>{D.lab.email}</a>。</>}
        </p>
      </div>
    </div>
  );
}

// ---------- Contact ----------
function ContactPage() {
  const { lang } = useApp();
  const D = window.LAB_DATA;
  return (
    <div className="page-fade container" style={{ padding: "64px 32px 0" }}>
      <div className="eyebrow" style={{ marginBottom: 16 }}>Contact</div>
      <h1 style={{ marginBottom: 56 }}>{lang === "en" ? "Get in touch." : "与我们联系。"}</h1>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 48 }}>
        <div>
          <div style={{ borderTop: "1px solid var(--ink)", padding: "20px 0", borderBottom: "1px solid var(--line)" }}>
            <div className="eyebrow" style={{ marginBottom: 6 }}>Address · 地址</div>
            <p style={{ margin: 0, fontSize: 15 }}>{D.lab.address[lang]}</p>
          </div>
          <div style={{ padding: "20px 0", borderBottom: "1px solid var(--line)" }}>
            <div className="eyebrow" style={{ marginBottom: 6 }}>Email · 邮箱</div>
            <p style={{ margin: 0, fontSize: 15 }}><a href={"mailto:" + D.lab.email} style={{ color: "var(--accent)" }}>{D.lab.email}</a></p>
          </div>
          <div style={{ padding: "20px 0", borderBottom: "1px solid var(--line)" }}>
            <div className="eyebrow" style={{ marginBottom: 6 }}>PI · 课题组负责人</div>
            <p style={{ margin: 0, fontSize: 15 }}>{D.pi.name[lang]} — <a href={"mailto:" + D.pi.email} style={{ color: "var(--accent)" }}>{D.pi.email}</a></p>
          </div>
          <div style={{ padding: "20px 0" }}>
            <div className="eyebrow" style={{ marginBottom: 6 }}>Visiting · 来访</div>
            <p style={{ margin: 0, fontSize: 14, color: "var(--ink-2)" }}>
              {lang === "en"
                ? "Take Metro Line 13 to Zhangjiang Road station; SHUTCM main campus is a 10-min walk. Building Z3, Floor 4."
                : "地铁 13 号线张江路站，步行 10 分钟至上海中医药大学主校区，Z3 楼 4 层。"}
            </p>
          </div>
        </div>
        <div className="placeholder" style={{ minHeight: 360 }}>
          MAP · ZHANGJIANG · SHUTCM CAMPUS
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { HomePage, ResearchPage, JoinPage, ContactPage, PubRow });
