// People + Publications

function PeoplePage() {
  const { lang, t, addToast, dbReady } = useApp();
  const D = window.LAB_DATA;
  const [selected, setSelected] = useState(null);
  const [imageRev, setImageRev] = useState(0);

  // Apply locally-stored member photos after each DB load (covers Supabase-unavailable case)
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("yuanlab.memberPhotos") || "{}");
      let changed = false;
      D.members.forEach((m, i) => {
        if (stored[m.id] && !m.photo_url) {
          D.members[i] = { ...D.members[i], photo_url: stored[m.id] };
          changed = true;
        }
      });
      if (changed) setImageRev(r => r + 1);
    } catch (e) {}
  }, [dbReady]);

  // Split by active field (DB-driven) — fall back to D.alumni for seed data
  function memberSortValue(m) {
    const role = `${m.role || ""} ${m.roleCn || ""}`.toLowerCase();
    if (role.includes("phd") || role.includes("博士")) return 0;
    if (role.includes("master") || role.includes("硕士")) return 1;
    return 2;
  }
  function memberYearValue(m) {
    const year = parseInt(String(m.year || m.role || m.roleCn || "").match(/\d{4}/)?.[0] || "", 10);
    return Number.isFinite(year) ? year : 9999;
  }

  const currentMembers = D.members
    .filter(m => m.active !== false)
    .sort((a, b) =>
      memberSortValue(a) - memberSortValue(b) ||
      memberYearValue(a) - memberYearValue(b) ||
      String(a.name || "").localeCompare(String(b.name || ""))
    );
  const dbAlumni = D.members.filter(m => m.active === false);
  const seedAlumni = D.alumni || [];
  // Merge: db alumni + seed alumni (avoid duplicates by name)
  const allAlumni = [
    ...dbAlumni.map(m => ({ name: m.name, nameCn: m.nameCn, role: m.role, next: m.next || "" })),
    ...seedAlumni.filter(a => !dbAlumni.find(m => m.name === a.name)),
  ];

  async function uploadMemberPhoto(member, file) {
    if (!file) return;
    try {
      const safeName = file.name.replace(/\s+/g, "_");
      // Build local data URL first — works even if Supabase Storage is unavailable
      const dataUrl = await resizeImageToDataUrl(file, 400);
      let photoUrl = dataUrl;
      try {
        photoUrl = await window.SUPABASE.uploadFile("lab-images", `members/${member.id}_${Date.now()}_${safeName}`, file);
      } catch (e) {
        console.warn("[MemberPhoto] Storage upload failed, using local data URL:", e.message);
      }
      // Update in-memory member
      const index = D.members.findIndex(m => m.id === member.id);
      if (index >= 0) D.members[index] = { ...D.members[index], photo_url: photoUrl };
      // Persist to localStorage so photo survives page refresh
      try {
        const stored = JSON.parse(localStorage.getItem("yuanlab.memberPhotos") || "{}");
        stored[member.id] = photoUrl;
        localStorage.setItem("yuanlab.memberPhotos", JSON.stringify(stored));
      } catch (e) {}
      // Always write URL to DB (even data URL) for cross-device persistence
      if (isUUID(member.id)) {
        window.SUPABASE.update("members", member.id, { photo_url: photoUrl }).catch(() => {});
      }
      setImageRev(r => r + 1);
      addToast(lang === "en" ? "Photo uploaded" : "照片已上传");
    } catch (e) {
      addToast(lang === "en" ? "Photo upload failed" : "照片上传失败");
    }
  }

  return (
    <div className="page-fade container" style={{ padding: "64px 32px 0" }}>
      <div className="eyebrow" style={{ marginBottom: 16 }}>People · 成员</div>
      <h1 style={{ marginBottom: 56 }}>{lang === "en" ? "The lab." : "课题组成员。"}</h1>

      {/* PI */}
      <section style={{ marginBottom: 80 }}>
        <SectionHeader eyebrow="01" title={t.people.pi} action={null} />
        <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 48 }}>
          <div>
            <AdminImage slot="people.piPortrait" label={D.pi.name.en} style={{ aspectRatio: "3 / 4", marginBottom: 16 }} placeholderStyle={{ fontSize: 11 }}>
              PI PORTRAIT · 600 × 800
            </AdminImage>
            <h3 style={{ marginBottom: 4 }}>{D.pi.name[lang]}</h3>
            <p style={{ fontSize: 13.5, color: "var(--ink-2)", margin: 0 }}>{D.pi.title[lang]}</p>
            <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 6 }}>
              <a href={"mailto:" + D.pi.email} style={{ fontSize: 13, color: "var(--ink-2)", display: "flex", alignItems: "center", gap: 8 }}>
                <Icon.mail /> {D.pi.email}
              </a>
              <span style={{ fontSize: 13, color: "var(--ink-3)", fontFamily: "var(--mono)" }}>ORCID · {D.pi.orcid}</span>
            </div>
          </div>
          <div>
            <p style={{ fontSize: 15, lineHeight: 1.7, color: "var(--ink)" }}>{D.pi.bio[lang]}</p>

            <div style={{ marginTop: 32, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>
              <div>
                <div className="eyebrow" style={{ marginBottom: 12 }}>Education · 教育</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {D.pi.education.map((e, i) => (
                    <div key={i} style={{ display: "grid", gridTemplateColumns: "80px 1fr", gap: 12, fontSize: 13.5 }}>
                      <span style={{ fontFamily: "var(--mono)", color: "var(--ink-3)", fontSize: 12 }}>{e.year}</span>
                      <span style={{ color: "var(--ink-2)" }}>{lang === "en" ? e.place : e.placeCn}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div className="eyebrow" style={{ marginBottom: 12 }}>Honors · 荣誉</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {D.pi.awards.map((a, i) => (
                    <div key={i} style={{ display: "grid", gridTemplateColumns: "16px 1fr", gap: 8, fontSize: 13.5, color: "var(--ink-2)" }}>
                      <span style={{ color: "var(--accent)" }}>·</span>
                      <span>{a[lang]}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Members */}
      <section style={{ marginBottom: 80 }}>
        <SectionHeader eyebrow="02" title={t.people.current} action={null} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 1, background: "var(--line)", border: "1px solid var(--line)" }}>
          {currentMembers.map(m => (
            <button key={m.id} onClick={() => setSelected(m)} style={{
              background: "var(--bg)", border: "none", textAlign: "left", padding: 20, cursor: "pointer",
              display: "flex", flexDirection: "row", alignItems: "center", gap: 0,
              transition: "background 0.15s", minHeight: 120,
            }}
              onMouseEnter={e => e.currentTarget.style.background = "var(--bg-2)"}
              onMouseLeave={e => e.currentTarget.style.background = "var(--bg)"}>
              {/* Avatar — left ~40% */}
              <div style={{ flexShrink: 0, width: "40%", display: "flex", justifyContent: "center", alignItems: "center", paddingRight: 16 }}>
                <MemberPhoto member={m} imageRev={imageRev} onUpload={uploadMemberPhoto} />
              </div>
              {/* Info — right ~60% */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <h4 style={{ fontSize: 15, marginBottom: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {lang === "en" ? m.name : m.nameCn}
                </h4>
                <p style={{ fontSize: 11.5, color: "var(--ink-3)", margin: 0, fontFamily: "var(--mono)", letterSpacing: "0.04em" }}>
                  {lang === "en" ? m.role : m.roleCn}
                </p>
                {(lang === "en" ? m.focus : m.focusCn) && (
                  <p style={{ fontSize: 12.5, color: "var(--ink-2)", margin: "8px 0 0", lineHeight: 1.45,
                    display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                    {lang === "en" ? m.focus : m.focusCn}
                  </p>
                )}
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Alumni */}
      <section>
        <SectionHeader eyebrow="03" title={t.people.alumni} action={null} />
        <div style={{ display: "flex", flexDirection: "column" }}>
          {allAlumni.map((a, i) => (
            <div key={i} style={{ padding: "16px 0", borderBottom: "1px solid var(--line)", display: "grid", gridTemplateColumns: "1fr 1fr 2fr", gap: 24, fontSize: 14 }}>
              <span style={{ fontWeight: 500 }}>{lang === "en" ? a.name : a.nameCn}</span>
              <span style={{ color: "var(--ink-3)", fontFamily: "var(--mono)", fontSize: 12 }}>{a.role}</span>
              <span style={{ color: "var(--ink-2)" }}>{a.next}</span>
            </div>
          ))}
        </div>
      </section>

      {selected && <MemberModal member={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function MemberPhoto({ member, imageRev, onUpload }) {
  const { user, lang } = useApp();
  const inputRef = useRef(null);
  const initials = member.name.split(" ").map(s => s[0]).slice(0, 2).join("");
  return (
    <div style={{ position: "relative", width: 88, height: 88, flexShrink: 0 }}>
      {member.photo_url ? (
        <img src={member.photo_url} alt={member.name}
          style={{ width: 88, height: 88, borderRadius: "50%", objectFit: "cover", border: "1px solid var(--line)" }} />
      ) : (
        <div style={{
          width: 88, height: 88, borderRadius: "50%",
          background: "var(--bg-3)", border: "1px solid var(--line-2)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: "var(--serif)", fontSize: 26, color: "var(--ink-3)",
          letterSpacing: "-0.02em",
        }}>
          {initials}
        </div>
      )}
      {user.role === "admin" && (
        <>
          <input ref={inputRef} type="file" accept="image/*" style={{ display: "none" }}
            onClick={e => e.stopPropagation()}
            onChange={e => onUpload(member, e.target.files && e.target.files[0])} />
          <button className="btn btn-ghost btn-sm" type="button"
            onClick={e => { e.stopPropagation(); inputRef.current && inputRef.current.click(); }}
            title={lang === "en" ? "Upload photo" : "上传照片"}
            style={{ position: "absolute", right: -6, bottom: -6, padding: "4px 6px", background: "var(--bg)", boxShadow: "var(--shadow-sm)" }}>
            <Icon.upload />
          </button>
        </>
      )}
    </div>
  );
}

function MemberModal({ member, onClose }) {
  const { lang } = useApp();
  const initials = member.name.split(" ").map(s => s[0]).slice(0, 2).join("");
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            {member.photo_url ? (
              <img src={member.photo_url} alt={member.name}
                style={{ width: 56, height: 56, borderRadius: "50%", objectFit: "cover", border: "1px solid var(--line)" }} />
            ) : (
              <div className="placeholder" style={{ width: 56, height: 56, borderRadius: 100, fontFamily: "var(--serif)", fontSize: 18, padding: 0 }}>
                {initials}
              </div>
            )}
            <div>
              <h3>{lang === "en" ? member.name : member.nameCn}</h3>
              <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--ink-3)", fontFamily: "var(--mono)" }}>
                {lang === "en" ? member.role : member.roleCn}
              </p>
            </div>
          </div>
          <button className="btn btn-text" onClick={onClose}><Icon.close /></button>
        </div>
        <div className="modal-body">
          <div className="eyebrow" style={{ marginBottom: 6 }}>Joined</div>
          <p style={{ marginBottom: 20, fontSize: 14 }}>{member.year}</p>
          <div className="eyebrow" style={{ marginBottom: 6 }}>Research focus</div>
          <p style={{ marginBottom: 20, fontSize: 14 }}>{lang === "en" ? member.focus : member.focusCn}</p>
          <div className="eyebrow" style={{ marginBottom: 6 }}>Email</div>
          <p style={{ margin: 0, fontSize: 14 }}><a href={"mailto:" + member.email} style={{ color: "var(--accent)" }}>{member.email}</a></p>
        </div>
      </div>
    </div>
  );
}

// ---------- Publications ----------
function PublicationsPage() {
  const { lang, t } = useApp();
  const D = window.LAB_DATA;
  const [year, setYear] = useState("all");
  const [q, setQ] = useState("");

  const years = useMemo(() => Array.from(new Set(D.publications.map(p => p.year))).sort((a, b) => b - a), [D.publications]);

  const filtered = useMemo(() => {
    return D.publications.filter(p => {
      if (year !== "all" && p.year !== year) return false;
      if (q) {
        const s = q.toLowerCase();
        if (!p.title.toLowerCase().includes(s) && !p.authors.toLowerCase().includes(s) && !p.journal.toLowerCase().includes(s)) return false;
      }
      return true;
    });
  }, [year, q]);

  // group by year
  const grouped = useMemo(() => {
    const g = {};
    filtered.forEach(p => { (g[p.year] = g[p.year] || []).push(p); });
    return Object.entries(g).sort((a, b) => b[0] - a[0]);
  }, [filtered]);

  return (
    <div className="page-fade container" style={{ padding: "64px 32px 0" }}>
      <div className="eyebrow" style={{ marginBottom: 16 }}>Publications · 论文</div>
      <h1 style={{ marginBottom: 24 }}>{lang === "en" ? "Selected work, in print." : "代表性论文。"}</h1>
      <p className="lead" style={{ marginBottom: 56 }}>
        {lang === "en"
          ? "Peer-reviewed papers, books, and patents. * indicates corresponding author."
          : "已发表的代表性论文、专著与专利。* 表示通讯作者。"}
      </p>

      {/* Filter bar */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 32, flexWrap: "wrap", paddingBottom: 16, borderBottom: "1px solid var(--ink)" }}>
        <div style={{ position: "relative", flex: "1 1 280px", maxWidth: 360 }}>
          <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--ink-3)" }}>
            <Icon.search />
          </span>
          <input className="input" placeholder={t.pubs.searchPlaceholder} value={q} onChange={e => setQ(e.target.value)}
            style={{ paddingLeft: 36 }} />
        </div>
        <select className="select" value={year} onChange={e => setYear(e.target.value === "all" ? "all" : Number(e.target.value))} style={{ width: "auto", minWidth: 120 }}>
          <option value="all">{lang === "en" ? "All years" : "全部年份"}</option>
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <span style={{ marginLeft: "auto", fontFamily: "var(--mono)", fontSize: 12, color: "var(--ink-3)" }}>
          {filtered.length} / {D.publications.length}
        </span>
      </div>

      {/* List grouped by year */}
      <div style={{ display: "flex", flexDirection: "column", gap: 56 }}>
        {grouped.map(([yr, pubs]) => (
          <section key={yr}>
            <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 32 }}>
              <div style={{ fontFamily: "var(--serif)", fontSize: 36, fontWeight: 400, color: "var(--ink)", letterSpacing: "-0.02em", lineHeight: 1, paddingTop: 8, position: "sticky", top: 80 }}>
                {yr}
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                {pubs.map((p, i) => <PubRow key={p.id} pub={p} index={i + 1} />)}
              </div>
            </div>
          </section>
        ))}
        {grouped.length === 0 && (
          <div style={{ padding: 48, textAlign: "center", color: "var(--ink-3)" }}>
            {lang === "en" ? "No publications match your filters." : "没有匹配的论文。"}
          </div>
        )}
      </div>
    </div>
  );
}

Object.assign(window, { PeoplePage, PublicationsPage, MemberModal });
