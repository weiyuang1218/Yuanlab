// Resources (members-only gating) + Admin console

function isUUID(id) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(id || ""));
}
// For seed data with non-UUID ids (p1, m1…), we still attempt the DB call
// using a sentinel that won't match anything — the real fix is the insert path below
function dbId(id) { return isUUID(id) ? id : null; }

function ResourcesPage() {
  const { lang, t, user, openLogin, addToast } = useApp();
  const D = window.LAB_DATA;
  const [files, setFiles] = useState([...D.resources]);
  const [activeCat, setActiveCat] = useState("All");
  const [showUpload, setShowUpload] = useState(false);
  const [detail, setDetail] = useState(null);       // file being viewed
  const [editing, setEditing] = useState(null);     // file being edited
  const [sortBy, setSortBy] = useState("uploaded"); // "uploaded" | "date"
  const [sortDir, setSortDir] = useState("desc");

  const allCats = useMemo(() => Array.from(new Set(files.map(f => f.category))), [files]);
  const visibleCats = user.role === "guest" ? ["Lab Meeting"] : allCats;
  const cats = ["All", ...visibleCats];
  const isLitPPT = activeCat === "Literature PPT";

  const visible = useMemo(() => {
    let list = files.filter(f =>
      visibleCats.includes(f.category) && (activeCat === "All" || f.category === activeCat)
    );
    // Sort
    list = [...list].sort((a, b) => {
      let av, bv;
      if (sortBy === "date") {
        av = a.presentationDate || a.uploaded || "";
        bv = b.presentationDate || b.uploaded || "";
      } else {
        av = a.uploaded || "";
        bv = b.uploaded || "";
      }
      return sortDir === "desc" ? bv.localeCompare(av) : av.localeCompare(bv);
    });
    return list;
  }, [files, activeCat, visibleCats, sortBy, sortDir]);

  function toggleSort(field) {
    if (sortBy === field) setSortDir(d => d === "desc" ? "asc" : "desc");
    else { setSortBy(field); setSortDir("desc"); }
  }

  function download(f) {
    const newCount = (f.downloads || 0) + 1;
    const updated = files.map(x => x.id === f.id ? { ...x, downloads: newCount } : x);
    setFiles(updated); D.resources = updated;
    if (isUUID(f.id)) window.SUPABASE.update("resources", f.id, { downloads: newCount }).catch(() => {});
    if (f.url) window.open(f.url, "_blank");
    else addToast(`${lang === "en" ? "Downloaded" : "已下载"} · ${f.name}`);
  }

  async function handleUpload(fileData, rawFile) {
    let fileUrl = "", size = "";
    if (rawFile) {
      size = rawFile.size < 1024 * 1024
        ? Math.round(rawFile.size / 1024) + " KB"
        : (rawFile.size / 1024 / 1024).toFixed(1) + " MB";
      try {
        const safeName = rawFile.name.replace(/\s+/g, "_");
        fileUrl = await window.SUPABASE.uploadFile("lab-resources", `${Date.now()}_${safeName}`, rawFile);
      } catch (e) {
        addToast(lang === "en" ? "⚠ File upload failed — saving record only" : "⚠ 文件上传失败，仅保存记录");
      }
    }
    const dbPayload = {
      title: fileData.name, category: fileData.category,
      file_type: fileData.type, file_url: fileUrl,
      is_public: false, description: "",
      uploader: user.name,
      presenter: fileData.presenter || "",
      paper_title: fileData.paperTitle || "",
      research_field: fileData.researchField || "",
      presentation_date: fileData.presentationDate || null,
    };
    let newId = "f" + Date.now();
    try {
      const result = await window.SUPABASE.insert("resources", dbPayload);
      if (Array.isArray(result) && result[0]) newId = result[0].id;
    } catch (e) {}
    const newFile = {
      id: newId, name: fileData.name, category: fileData.category,
      type: fileData.type, size, url: fileUrl,
      uploader: user.name, downloads: 0,
      uploaded: new Date().toISOString().slice(0, 10),
      presenter: fileData.presenter || "",
      paperTitle: fileData.paperTitle || "",
      researchField: fileData.researchField || "",
      presentationDate: fileData.presentationDate || "",
    };
    D.resources.unshift(newFile);
    setFiles([...D.resources]);
    addToast((lang === "en" ? "Uploaded · " : "已上传 · ") + fileData.name);
    setShowUpload(false);
  }

  // Save edited detail (members & admin)
  async function saveDetail(updated) {
    const dbPayload = {
      title: updated.name,
      presenter: updated.presenter || "",
      paper_title: updated.paperTitle || "",
      research_field: updated.researchField || "",
      presentation_date: updated.presentationDate || null,
    };
    if (isUUID(updated.id)) {
      try { await window.SUPABASE.update("resources", updated.id, dbPayload); } catch (e) {}
    }
    const newFiles = files.map(f => f.id === updated.id ? { ...f, ...updated } : f);
    D.resources = newFiles;
    setFiles(newFiles);
    setEditing(null);
    setDetail(updated);
    addToast(lang === "en" ? "Saved" : "已保存");
  }

  function SortBtn({ field, label }) {
    const active = sortBy === field;
    return (
      <span onClick={() => toggleSort(field)} style={{
        cursor: "pointer", userSelect: "none",
        color: active ? "var(--ink)" : "var(--ink-3)",
        display: "inline-flex", alignItems: "center", gap: 3,
      }}>
        {label}
        <span style={{ fontSize: 10 }}>{active ? (sortDir === "desc" ? "↓" : "↑") : "↕"}</span>
      </span>
    );
  }

  return (
    <div className="page-fade container" style={{ padding: "64px 32px 0" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <div className="eyebrow" style={{ marginBottom: 16 }}>Resources · 共享资源</div>
          <h1 style={{ marginBottom: 0 }}>{lang === "en" ? "Shared lab resources." : "组内共享资源。"}</h1>
        </div>
        {(user.role === "member" || user.role === "admin") && (
          <button className="btn btn-primary btn-sm" style={{ marginTop: 8 }} onClick={() => setShowUpload(true)}>
            <Icon.upload /> {lang === "en" ? "Upload file" : "上传文件"}
          </button>
        )}
      </div>
      <p className="lead" style={{ marginBottom: 40 }}>
        {lang === "en"
          ? "Protocols, journal-club presentations, schedules, and inventories — maintained by the lab, for the lab."
          : "实验方法、文献汇报、排班、库存清单 —— 由组内维护，服务组内。"}
      </p>

      {user.role === "guest" && (
        <div style={{
          padding: 24, background: "var(--bg-2)",
          border: "1px solid var(--line)", borderLeft: "3px solid var(--brick)",
          borderRadius: "0 4px 4px 0", marginBottom: 40,
          display: "flex", alignItems: "center", gap: 24, justifyContent: "space-between", flexWrap: "wrap",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <Icon.lock />
            <div>
              <h4 style={{ marginBottom: 4 }}>{t.resources.gateTitle}</h4>
              <p style={{ margin: 0, fontSize: 13.5 }}>{t.resources.gateBody}</p>
            </div>
          </div>
          <button className="btn btn-primary" onClick={openLogin}>
            <Icon.user /> {t.actions.signin}
          </button>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 40 }}>
        <aside>
          <div className="eyebrow" style={{ marginBottom: 12 }}>{t.resources.categories}</div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {cats.map(c => (
              <button key={c} onClick={() => setActiveCat(c)} style={{
                padding: "10px 12px", textAlign: "left", background: "transparent",
                border: "none", borderLeft: activeCat === c ? "2px solid var(--ink)" : "2px solid var(--line)",
                color: activeCat === c ? "var(--ink)" : "var(--ink-2)",
                fontSize: 13.5, fontWeight: activeCat === c ? 500 : 400, cursor: "pointer",
                display: "flex", justifyContent: "space-between", alignItems: "center",
              }}>
                <span>{c}</span>
                <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-3)" }}>
                  {c === "All"
                    ? files.filter(f => visibleCats.includes(f.category)).length
                    : files.filter(f => f.category === c).length}
                </span>
              </button>
            ))}
          </div>
          {user.role !== "guest" && (
            <div style={{ marginTop: 32, padding: 16, background: "var(--bg-2)", borderRadius: 4, border: "1px solid var(--line)" }}>
              <div className="eyebrow" style={{ marginBottom: 6 }}>Logged in as</div>
              <p style={{ fontSize: 13, fontWeight: 500, margin: 0 }}>{user.name}</p>
              <p style={{ fontSize: 11.5, color: "var(--ink-3)", margin: "2px 0 0", fontFamily: "var(--mono)", letterSpacing: "0.04em", textTransform: "uppercase" }}>{user.role}</p>
            </div>
          )}
        </aside>

        <div>
          {visible.length === 0 ? (
            <div style={{ padding: 64, textAlign: "center", color: "var(--ink-3)", border: "1px dashed var(--line-2)", borderRadius: 4 }}>
              {lang === "en" ? "No files in this category." : "暂无文件。"}
            </div>
          ) : isLitPPT ? (
            /* ── Literature PPT special table ── */
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: "28%" }}>{lang === "en" ? "Session name" : "文件名"}</th>
                  <th><SortBtn field="date" label={lang === "en" ? "Presentation date" : "汇报日期"} /></th>
                  <th>{lang === "en" ? "Presenter" : "汇报人"}</th>
                  <th>{lang === "en" ? "Research field" : "研究领域"}</th>
                  <th style={{ textAlign: "right" }}><SortBtn field="uploaded" label={lang === "en" ? "Uploaded" : "上传"} /></th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {visible.map(f => (
                  <tr key={f.id} style={{ cursor: "pointer" }} onClick={() => setDetail(f)}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{
                          width: 32, height: 32, background: "var(--bg-3)", borderRadius: 3,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontFamily: "var(--mono)", fontSize: 9, fontWeight: 600, color: "var(--ink-2)", flexShrink: 0,
                        }}>{f.type}</span>
                        <div>
                          <div style={{ fontSize: 13.5, fontWeight: 500 }}>{f.name}</div>
                          {f.paperTitle && <div style={{ fontSize: 11.5, color: "var(--ink-3)", marginTop: 2 }}>{f.paperTitle.length > 50 ? f.paperTitle.slice(0, 50) + "…" : f.paperTitle}</div>}
                        </div>
                      </div>
                    </td>
                    <td style={{ fontFamily: "var(--mono)", fontSize: 12.5, color: "var(--ink-2)" }}>
                      {f.presentationDate || "—"}
                    </td>
                    <td style={{ fontSize: 13 }}>{f.presenter || f.uploader || "—"}</td>
                    <td style={{ fontSize: 12.5, color: "var(--ink-2)" }}>{f.researchField || "—"}</td>
                    <td style={{ textAlign: "right", fontFamily: "var(--mono)", fontSize: 12, color: "var(--ink-3)" }}>{f.uploaded}</td>
                    <td style={{ textAlign: "right" }} onClick={e => e.stopPropagation()}>
                      <button className="btn btn-text btn-sm" onClick={() => download(f)} title="Download"><Icon.download /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            /* ── Default table ── */
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: "40%" }}>{lang === "en" ? "File" : "文件"}</th>
                  <th>{lang === "en" ? "Type" : "类型"}</th>
                  <th><SortBtn field="uploaded" label={t.resources.uploaded} /></th>
                  <th>{t.resources.uploader}</th>
                  <th style={{ textAlign: "right" }}>{t.resources.downloads}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {visible.map(f => (
                  <tr key={f.id}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <span style={{
                          width: 32, height: 32, background: "var(--bg-3)", borderRadius: 3,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontFamily: "var(--mono)", fontSize: 9, fontWeight: 600, color: "var(--ink-2)", letterSpacing: "0.04em",
                        }}>{f.type}</span>
                        <div>
                          <div style={{ fontSize: 13.5, fontWeight: 500 }}>{f.name}</div>
                          <div style={{ fontSize: 11.5, color: "var(--ink-3)", fontFamily: "var(--mono)" }}>{f.category} · {f.size}</div>
                        </div>
                      </div>
                    </td>
                    <td><span className="chip">{f.type}</span></td>
                    <td style={{ fontSize: 12.5, color: "var(--ink-3)", fontFamily: "var(--mono)" }}>{f.uploaded}</td>
                    <td style={{ fontSize: 13 }}>{f.uploader}</td>
                    <td style={{ textAlign: "right", fontFamily: "var(--mono)", fontSize: 12.5, color: "var(--ink-3)" }}>{f.downloads}</td>
                    <td style={{ textAlign: "right" }}>
                      <button className="btn btn-text btn-sm" onClick={() => download(f)}><Icon.download /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Upload modal */}
      {showUpload && <UploadModal onClose={() => setShowUpload(false)} onUpload={handleUpload} defaultCat={activeCat !== "All" ? activeCat : ""} />}

      {/* Detail modal */}
      {detail && !editing && (
        <LitDetailModal
          file={detail}
          canEdit={user.role === "member" || user.role === "admin"}
          onEdit={() => setEditing({ ...detail })}
          onDownload={() => download(detail)}
          onClose={() => setDetail(null)}
          lang={lang}
        />
      )}

      {/* Edit modal */}
      {editing && (
        <LitEditModal
          file={editing}
          onSave={saveDetail}
          onClose={() => setEditing(null)}
          lang={lang}
        />
      )}
    </div>
  );
}

/* ── Literature PPT detail view modal ── */
function LitDetailModal({ file, canEdit, onEdit, onDownload, onClose, lang }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 640 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{
              width: 36, height: 36, background: "var(--bg-3)", borderRadius: 3,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: "var(--mono)", fontSize: 10, fontWeight: 600, color: "var(--ink-2)",
            }}>{file.type}</span>
            <div>
              <h3 style={{ fontSize: 18 }}>{file.name}</h3>
              <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--ink-3)", fontFamily: "var(--mono)" }}>
                {file.category}
              </p>
            </div>
          </div>
          <button className="btn btn-text" onClick={onClose}><Icon.close /></button>
        </div>
        <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {[
            [lang === "en" ? "Paper title" : "文献标题", file.paperTitle],
            [lang === "en" ? "Presenter" : "汇报人", file.presenter || file.uploader],
            [lang === "en" ? "Presentation date" : "汇报日期", file.presentationDate],
            [lang === "en" ? "Research field" : "研究领域", file.researchField],
            [lang === "en" ? "File size" : "文件大小", file.size],
            [lang === "en" ? "Uploaded by" : "上传者", file.uploader],
            [lang === "en" ? "Upload date" : "上传日期", file.uploaded],
          ].map(([label, val]) => val ? (
            <div key={label} style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: 12, alignItems: "start" }}>
              <span className="eyebrow" style={{ paddingTop: 2 }}>{label}</span>
              <span style={{ fontSize: 14, color: "var(--ink)", lineHeight: 1.5 }}>{val}</span>
            </div>
          ) : null)}
        </div>
        <div className="modal-footer" style={{ justifyContent: "space-between" }}>
          {canEdit && (
            <button className="btn btn-ghost btn-sm" onClick={onEdit}>
              <Icon.edit /> {lang === "en" ? "Edit details" : "编辑信息"}
            </button>
          )}
          <button className="btn btn-primary btn-sm" onClick={onDownload}>
            <Icon.download /> {lang === "en" ? "Download" : "下载"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Literature PPT edit modal ── */
function LitEditModal({ file, onSave, onClose, lang }) {
  const [form, setForm] = useState({ ...file });
  const [saving, setSaving] = useState(false);
  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  async function handleSave() {
    setSaving(true);
    await onSave(form);
    setSaving(false);
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{lang === "en" ? "Edit presentation details" : "编辑汇报信息"}</h3>
          <button className="btn btn-text" onClick={onClose}><Icon.close /></button>
        </div>
        <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label className="label">{lang === "en" ? "Session name" : "文件名"}</label>
            <input className="input" value={form.name} onChange={e => set("name", e.target.value)} />
          </div>
          <div>
            <label className="label">{lang === "en" ? "Paper title" : "文献标题"}</label>
            <textarea className="textarea" value={form.paperTitle || ""} onChange={e => set("paperTitle", e.target.value)} style={{ minHeight: 72 }} />
          </div>
          <div>
            <label className="label">{lang === "en" ? "Presenter" : "汇报人"}</label>
            <input className="input" value={form.presenter || ""} onChange={e => set("presenter", e.target.value)} />
          </div>
          <div>
            <label className="label">{lang === "en" ? "Presentation date" : "汇报日期"}</label>
            <input className="input" type="date" value={form.presentationDate || ""} onChange={e => set("presentationDate", e.target.value)} />
          </div>
          <div>
            <label className="label">{lang === "en" ? "Research field" : "研究领域"}</label>
            <input className="input" value={form.researchField || ""} onChange={e => set("researchField", e.target.value)}
              placeholder={lang === "en" ? "e.g. Prostate cancer, RNA biology…" : "例如：前列腺癌、RNA 生物学…"} />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost btn-sm" onClick={onClose}>{lang === "en" ? "Cancel" : "取消"}</button>
          <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>
            {saving ? "…" : (lang === "en" ? "Save" : "保存")}
          </button>
        </div>
      </div>
    </div>
  );
}

// ==================== Admin Console ====================

function AdminPage() {
  const { lang, user, addToast, closeAdmin } = useApp();
  const [tab, setTab] = useState("dashboard");
  const D = window.LAB_DATA;

  if (user.role !== "admin") {
    return (
      <div className="page-fade container" style={{ padding: "120px 32px", textAlign: "center" }}>
        <Icon.lock />
        <h2 style={{ marginTop: 16 }}>{lang === "en" ? "Admin only." : "仅管理员可访问"}</h2>
      </div>
    );
  }

  const tabs = [
    ["dashboard", lang === "en" ? "Dashboard" : "仪表盘"],
    ["publications", lang === "en" ? "Publications" : "论文"],
    ["members", lang === "en" ? "Members" : "成员"],
    ["resources", lang === "en" ? "Files" : "文件"],
    ["news", lang === "en" ? "News" : "动态"],
    ["pages", lang === "en" ? "Pages" : "页面"],
    ["users", lang === "en" ? "Users" : "用户"],
  ];

  return (
    <div className="page-fade" style={{ background: "var(--bg)", minHeight: "calc(100vh - 64px)" }}>
      <div style={{ background: "var(--ink)", color: "var(--bg)", padding: "16px 0" }}>
        <div className="container" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <span className="eyebrow" style={{ color: "oklch(0.7 0.014 80)" }}>Admin Console</span>
            <span style={{ fontSize: 13.5 }}>{lang === "en" ? "Editing as" : "当前管理员"} · <strong>{user.name}</strong></span>
          </div>
          <button className="btn btn-text btn-sm" style={{ color: "var(--bg)" }} onClick={closeAdmin}>
            <Icon.close /> {lang === "en" ? "Exit admin" : "退出后台"}
          </button>
        </div>
      </div>

      <div className="container" style={{ padding: "32px 32px 80px", display: "grid", gridTemplateColumns: "200px 1fr", gap: 40 }}>
        <aside style={{ position: "sticky", top: 80, alignSelf: "start" }}>
          <div className="eyebrow" style={{ marginBottom: 12 }}>Manage</div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {tabs.map(([k, l]) => (
              <button key={k} onClick={() => setTab(k)} style={{
                padding: "10px 12px", textAlign: "left", background: tab === k ? "var(--bg-2)" : "transparent",
                border: "none", borderLeft: tab === k ? "2px solid var(--ink)" : "2px solid var(--line)",
                color: tab === k ? "var(--ink)" : "var(--ink-2)",
                fontSize: 13.5, fontWeight: tab === k ? 500 : 400, cursor: "pointer",
              }}>{l}</button>
            ))}
          </div>
        </aside>
        <div>
          {tab === "dashboard" && <AdminDashboard />}
          {tab === "publications" && <AdminPubs />}
          {tab === "members" && <AdminMembers />}
          {tab === "resources" && <AdminResources />}
          {tab === "news" && <AdminNews />}
          {tab === "pages" && <AdminPages />}
          {tab === "users" && <AdminUsers />}
        </div>
      </div>
    </div>
  );
}

function AdminDashboard() {
  const { lang } = useApp();
  const D = window.LAB_DATA;
  const totalDl = D.resources.reduce((a, f) => a + f.downloads, 0);
  const stats = [
    [D.publications.length, lang === "en" ? "Publications" : "论文"],
    [D.members.length, lang === "en" ? "Members" : "成员"],
    [D.resources.length, lang === "en" ? "Files" : "文件"],
    [totalDl, lang === "en" ? "Total downloads" : "下载总数"],
  ];
  const recent = [...D.resources].sort((a, b) => b.downloads - a.downloads).slice(0, 5);
  return (
    <div>
      <h2 style={{ marginBottom: 32 }}>{lang === "en" ? "Overview" : "概览"}</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 48 }}>
        {stats.map(([n, l], i) => (
          <div key={i} className="card">
            <div style={{ fontFamily: "var(--serif)", fontSize: 40, fontWeight: 400, lineHeight: 1, letterSpacing: "-0.02em" }}>{n}</div>
            <div className="eyebrow" style={{ marginTop: 8 }}>{l}</div>
          </div>
        ))}
      </div>
      <SectionHeader eyebrow="Top files" title={lang === "en" ? "Most downloaded" : "下载最多的文件"} action={null} />
      <table className="table">
        <thead>
          <tr><th>{lang === "en" ? "File" : "文件"}</th><th>{lang === "en" ? "Category" : "分类"}</th><th style={{ textAlign: "right" }}>{lang === "en" ? "Downloads" : "下载"}</th></tr>
        </thead>
        <tbody>
          {recent.map(f => (
            <tr key={f.id}>
              <td>{f.name}</td>
              <td><span className="chip">{f.category}</span></td>
              <td style={{ textAlign: "right", fontFamily: "var(--mono)" }}>{f.downloads}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Publications ──────────────────────────────────────────────────────────────

function AdminPubs() {
  const { lang, addToast } = useApp();
  const D = window.LAB_DATA;
  const [pubs, setPubs] = useState([...D.publications]);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  async function save(p) {
    setSaving(true);
    const payload = {
      year: Number(p.year),
      title: p.title,
      authors: p.authors,
      journal: p.journal,
      tags: p.tag ? [p.tag] : [],
      featured: !!p.featured,
      doi: p.doi || "",
    };
    try {
      if (isUUID(p.id)) {
        await window.SUPABASE.update("publications", p.id, payload);
        const i = D.publications.findIndex(x => x.id === p.id);
        if (i >= 0) D.publications[i] = { ...p };
      } else {
        const result = await window.SUPABASE.insert("publications", payload);
        const newId = Array.isArray(result) && result[0] ? result[0].id : ("p" + Date.now());
        D.publications.unshift({ ...p, id: newId });
      }
      setPubs([...D.publications]);
      addToast(lang === "en" ? "Saved" : "已保存");
      setEditing(null);
    } catch (e) {
      addToast(lang === "en" ? "❌ Save failed — check Supabase permissions" : "❌ 保存失败，请检查数据库权限");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id) {
    if (!window.confirm(lang === "en" ? "Delete this publication?" : "确认删除此论文？")) return;
    // Always remove from memory first so UI updates immediately
    const i = D.publications.findIndex(p => p.id === id);
    if (i >= 0) D.publications.splice(i, 1);
    setPubs([...D.publications]);
    // Then sync to DB if it has a real UUID
    if (isUUID(id)) {
      try { await window.SUPABASE.remove("publications", id); } catch (e) {}
    }
    addToast(lang === "en" ? "Deleted" : "已删除");
  }

  return (
    <div>
      <SectionHeader eyebrow="Publications" title={lang === "en" ? "Manage publications" : "管理论文"} action={
        <button className="btn btn-primary btn-sm" onClick={() => setEditing({ year: new Date().getFullYear(), authors: "", title: "", journal: "", volume: "", tag: "Corresponding", featured: false, doi: "" })}>
          <Icon.plus /> {lang === "en" ? "Add" : "添加"}
        </button>
      } />
      <table className="table">
        <thead>
          <tr><th style={{ width: 60 }}>Year</th><th>Title</th><th style={{ width: 120 }}>Tag</th><th style={{ width: 80 }}></th></tr>
        </thead>
        <tbody>
          {pubs.map(p => (
            <tr key={p.id}>
              <td style={{ fontFamily: "var(--mono)", color: "var(--ink-3)" }}>{p.year}</td>
              <td>
                <div style={{ fontSize: 14, fontWeight: 500 }}>{p.title}</div>
                <div style={{ fontSize: 12, color: "var(--ink-3)", fontStyle: "italic", marginTop: 2 }}>{p.journal}</div>
              </td>
              <td>{p.featured ? <span className="chip accent">★ {p.tag}</span> : <span className="chip">{p.tag}</span>}</td>
              <td style={{ textAlign: "right" }}>
                <button className="btn btn-text btn-sm" onClick={() => setEditing({ ...p })}><Icon.edit /></button>
                <button className="btn btn-text btn-sm" onClick={() => remove(p.id)} style={{ color: "var(--danger)" }}><Icon.trash /></button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {editing && <EditPubModal pub={editing} onSave={save} onClose={() => setEditing(null)} saving={saving} />}
    </div>
  );
}

function EditPubModal({ pub, onSave, onClose, saving }) {
  const { lang } = useApp();
  const [p, setP] = useState(pub);
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 640 }}>
        <div className="modal-header">
          <h3>{pub.id ? (lang === "en" ? "Edit publication" : "编辑论文") : (lang === "en" ? "New publication" : "新增论文")}</h3>
          <button className="btn btn-text" onClick={onClose}><Icon.close /></button>
        </div>
        <div className="modal-body">
          <div style={{ display: "grid", gridTemplateColumns: "100px 1fr", gap: 12, marginBottom: 12 }}>
            <div>
              <label className="label">Year</label>
              <input className="input" type="number" value={p.year} onChange={e => setP({ ...p, year: Number(e.target.value) })} />
            </div>
            <div>
              <label className="label">Tag</label>
              <select className="select" value={p.tag} onChange={e => setP({ ...p, tag: e.target.value })}>
                <option>First</option>
                <option>Corresponding</option>
                <option>Co-corresponding</option>
                <option>First/Co-corresponding</option>
                <option>Co-author</option>
                <option>Book · Lead Editor</option>
              </select>
            </div>
          </div>
          <label className="label">Title</label>
          <input className="input" value={p.title} onChange={e => setP({ ...p, title: e.target.value })} />
          <div style={{ height: 12 }} />
          <label className="label">Authors</label>
          <input className="input" value={p.authors} onChange={e => setP({ ...p, authors: e.target.value })} placeholder="Yuan F*, Chen J, …" />
          <div style={{ height: 12 }} />
          <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 12 }}>
            <div>
              <label className="label">Journal</label>
              <input className="input" value={p.journal} onChange={e => setP({ ...p, journal: e.target.value })} />
            </div>
            <div>
              <label className="label">Volume / Pages</label>
              <input className="input" value={p.volume || ""} onChange={e => setP({ ...p, volume: e.target.value })} />
            </div>
          </div>
          <div style={{ height: 12 }} />
          <label className="label">DOI</label>
          <input className="input" value={p.doi} onChange={e => setP({ ...p, doi: e.target.value })} />
          <div style={{ height: 14 }} />
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14 }}>
            <input type="checkbox" checked={!!p.featured} onChange={e => setP({ ...p, featured: e.target.checked })} />
            {lang === "en" ? "Mark as featured (homepage)" : "标记为代表作（显示在首页）"}
          </label>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost btn-sm" onClick={onClose}>{lang === "en" ? "Cancel" : "取消"}</button>
          <button className="btn btn-primary btn-sm" onClick={() => onSave(p)} disabled={saving || !p.title}>
            {saving ? (lang === "en" ? "Saving…" : "保存中…") : <><Icon.check /> {lang === "en" ? "Save" : "保存"}</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Members ───────────────────────────────────────────────────────────────────

function AdminMembers() {
  const { lang, addToast } = useApp();
  const D = window.LAB_DATA;
  const [members, setMembers] = useState([...D.members]);
  const [alumni, setAlumni] = useState([...(D.alumni || [])]);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  function refresh() {
    setMembers([...D.members]);
    setAlumni([...(D.alumni || [])]);
  }

  async function save(m) {
    setSaving(true);
    const yearInt = parseInt(String(m.year).replace(/[^0-9]/g, "")) || null;
    const isAlumni = (m.group === "alumni");
    const payload = {
      name: m.name, name_cn: m.nameCn || "",
      role: m.role || "", role_cn: m.roleCn || "",
      research_interests: m.focus || "",
      bio: m.bio || "", bio_cn: m.bioCn || "",
      email: m.email || "",
      joined_year: yearInt,
      active: !isAlumni,
      sort_order: 0,
    };
    try {
      if (isUUID(m.id)) {
        await window.SUPABASE.update("members", m.id, payload);
        // Move between arrays in memory
        const fromMembers = D.members.findIndex(x => x.id === m.id);
        const fromAlumni = (D.alumni || []).findIndex(x => x.id === m.id);
        if (isAlumni) {
          if (fromMembers >= 0) {
            const moved = D.members.splice(fromMembers, 1)[0];
            if (!D.alumni) D.alumni = [];
            if (!D.alumni.find(a => a.id === m.id)) {
              D.alumni.push({ id: m.id, name: m.name, nameCn: m.nameCn, role: m.role, next: "", active: false });
            }
          }
        } else {
          if (fromAlumni >= 0) {
            D.alumni.splice(fromAlumni, 1);
            if (!D.members.find(x => x.id === m.id)) {
              D.members.push({ ...m, active: true, year: yearInt ? yearInt + "–" : "" });
            }
          } else if (fromMembers >= 0) {
            D.members[fromMembers] = { ...m, active: true };
          }
        }
      } else {
        const result = await window.SUPABASE.insert("members", payload);
        const newId = Array.isArray(result) && result[0] ? result[0].id : ("m" + Date.now());
        const newMember = { ...m, id: newId, year: yearInt ? yearInt + "–" : "", active: !isAlumni };
        if (isAlumni) {
          if (!D.alumni) D.alumni = [];
          D.alumni.push({ id: newId, name: m.name, nameCn: m.nameCn, role: m.role, next: "", active: false });
        } else {
          D.members.push(newMember);
        }
      }
      refresh();
      addToast(lang === "en" ? "Saved" : "已保存");
      setEditing(null);
    } catch (e) {
      addToast(lang === "en" ? "❌ Save failed" : "❌ 保存失败");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id) {
    if (!window.confirm(lang === "en" ? "Remove this member?" : "确认删除此成员？")) return;
    const fromMembers = D.members.findIndex(m => m.id === id);
    const fromAlumni = (D.alumni || []).findIndex(m => m.id === id);
    if (fromMembers >= 0) D.members.splice(fromMembers, 1);
    if (fromAlumni >= 0) D.alumni.splice(fromAlumni, 1);
    refresh();
    if (isUUID(id)) {
      try { await window.SUPABASE.remove("members", id); } catch (e) {}
    }
    addToast(lang === "en" ? "Deleted" : "已删除");
  }

  return (
    <div>
      <SectionHeader eyebrow="Members" title={lang === "en" ? "Manage members" : "管理成员"} action={
        <button className="btn btn-primary btn-sm" onClick={() => setEditing({ name: "", nameCn: "", role: "PhD Student", roleCn: "博士生", focus: "", focusCn: "", year: new Date().getFullYear(), email: "", group: "current" })}>
          <Icon.plus /> {lang === "en" ? "Add member" : "添加成员"}
        </button>
      } />

      {/* Current members */}
      <div className="eyebrow" style={{ marginBottom: 10 }}>{lang === "en" ? "Current members" : "当前成员"}</div>
      <table className="table" style={{ marginBottom: 48 }}>
        <thead><tr><th>Name</th><th>Role</th><th>Focus</th><th>Joined</th><th></th></tr></thead>
        <tbody>
          {members.map(m => (
            <tr key={m.id}>
              <td><strong>{m.name}</strong> <span style={{ color: "var(--ink-3)", marginLeft: 8 }}>{m.nameCn}</span></td>
              <td style={{ fontSize: 13 }}>{m.role}</td>
              <td style={{ fontSize: 13, color: "var(--ink-2)", maxWidth: 240 }}>{m.focus}</td>
              <td style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--ink-3)" }}>{m.year}</td>
              <td style={{ textAlign: "right" }}>
                <button className="btn btn-text btn-sm" onClick={() => setEditing({ ...m, group: "current" })}><Icon.edit /></button>
                <button className="btn btn-text btn-sm" onClick={() => remove(m.id)} style={{ color: "var(--danger)" }}><Icon.trash /></button>
              </td>
            </tr>
          ))}
          {members.length === 0 && <tr><td colSpan={5} style={{ color: "var(--ink-3)", textAlign: "center", padding: 24 }}>No current members</td></tr>}
        </tbody>
      </table>

      {/* Alumni */}
      <div className="eyebrow" style={{ marginBottom: 10 }}>{lang === "en" ? "Graduated members (Alumni)" : "已毕业成员"}</div>
      <table className="table" style={{ marginBottom: 32 }}>
        <thead><tr><th>Name</th><th>Role</th><th>Current position</th><th></th></tr></thead>
        <tbody>
          {alumni.map((a, i) => (
            <tr key={a.id || i}>
              <td><strong>{a.name}</strong> <span style={{ color: "var(--ink-3)", marginLeft: 8 }}>{a.nameCn}</span></td>
              <td style={{ fontSize: 13 }}>{a.role}</td>
              <td style={{ fontSize: 13, color: "var(--ink-2)" }}>{a.next || "—"}</td>
              <td style={{ textAlign: "right" }}>
                {a.id && isUUID(a.id) && (
                  <button className="btn btn-text btn-sm" onClick={() => setEditing({ ...a, group: "alumni", focus: "", focusCn: "", year: "", email: "" })}><Icon.edit /></button>
                )}
                <button className="btn btn-text btn-sm" onClick={() => remove(a.id || a.name)} style={{ color: "var(--danger)" }}><Icon.trash /></button>
              </td>
            </tr>
          ))}
          {alumni.length === 0 && <tr><td colSpan={4} style={{ color: "var(--ink-3)", textAlign: "center", padding: 24 }}>No alumni yet</td></tr>}
        </tbody>
      </table>

      {editing && <EditMemberModal member={editing} onSave={save} onClose={() => setEditing(null)} saving={saving} />}
    </div>
  );
}

function EditMemberModal({ member, onSave, onClose, saving }) {
  const { lang } = useApp();
  const yearNum = parseInt(String(member.year).replace(/[^0-9]/g, "")) || new Date().getFullYear();
  const [m, setM] = useState({ ...member, year: yearNum });
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 640 }}>
        <div className="modal-header">
          <h3>{member.id ? (lang === "en" ? "Edit member" : "编辑成员") : (lang === "en" ? "New member" : "新增成员")}</h3>
          <button className="btn btn-text" onClick={onClose}><Icon.close /></button>
        </div>
        <div className="modal-body">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div><label className="label">Name (English)</label><input className="input" value={m.name} onChange={e => setM({ ...m, name: e.target.value })} /></div>
            <div><label className="label">中文姓名</label><input className="input" value={m.nameCn} onChange={e => setM({ ...m, nameCn: e.target.value })} /></div>
          </div>
          <div style={{ height: 12 }} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div><label className="label">Role</label><input className="input" value={m.role} onChange={e => setM({ ...m, role: e.target.value })} placeholder="PhD Student" /></div>
            <div><label className="label">职位</label><input className="input" value={m.roleCn} onChange={e => setM({ ...m, roleCn: e.target.value })} placeholder="博士生" /></div>
          </div>
          <div style={{ height: 12 }} />
          <label className="label">Research focus (English)</label>
          <input className="input" value={m.focus || ""} onChange={e => setM({ ...m, focus: e.target.value })} />
          <div style={{ height: 12 }} />
          <label className="label">研究方向（中文）</label>
          <input className="input" value={m.focusCn || ""} onChange={e => setM({ ...m, focusCn: e.target.value })} />
          <div style={{ height: 12 }} />
          <div style={{ display: "grid", gridTemplateColumns: "100px 1fr 140px", gap: 12 }}>
            <div><label className="label">Year joined</label><input className="input" type="number" value={m.year} onChange={e => setM({ ...m, year: Number(e.target.value) })} /></div>
            <div><label className="label">Email</label><input className="input" value={m.email || ""} onChange={e => setM({ ...m, email: e.target.value })} /></div>
            <div><label className="label">Status</label>
              <select className="select" value={m.group || "current"} onChange={e => setM({ ...m, group: e.target.value })}>
                <option value="pi">PI</option><option value="current">Current</option><option value="alumni">Alumni</option>
              </select>
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost btn-sm" onClick={onClose}>{lang === "en" ? "Cancel" : "取消"}</button>
          <button className="btn btn-primary btn-sm" onClick={() => onSave(m)} disabled={saving || !m.name}>
            {saving ? (lang === "en" ? "Saving…" : "保存中…") : <><Icon.check /> {lang === "en" ? "Save" : "保存"}</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Resources ─────────────────────────────────────────────────────────────────

function AdminResources() {
  const { lang, user, addToast } = useApp();
  const D = window.LAB_DATA;
  const [files, setFiles] = useState([...D.resources]);
  const [showUpload, setShowUpload] = useState(false);

  async function remove(id) {
    if (!window.confirm(lang === "en" ? "Delete this file record?" : "确认删除此文件记录？")) return;
    const i = D.resources.findIndex(f => f.id === id);
    if (i >= 0) D.resources.splice(i, 1);
    setFiles([...D.resources]);
    if (isUUID(id)) {
      try { await window.SUPABASE.remove("resources", id); } catch (e) {}
    }
    addToast(lang === "en" ? "Deleted" : "已删除");
  }

  async function upload(fileData, rawFile) {
    let fileUrl = "";
    let size = "";

    if (rawFile) {
      size = rawFile.size < 1024 * 1024
        ? Math.round(rawFile.size / 1024) + " KB"
        : (rawFile.size / 1024 / 1024).toFixed(1) + " MB";
      try {
        const safeName = rawFile.name.replace(/\s+/g, "_");
        const path = `${Date.now()}_${safeName}`;
        fileUrl = await window.SUPABASE.uploadFile("lab-resources", path, rawFile);
      } catch (e) {
        addToast(lang === "en" ? "⚠ File upload failed — saving record only" : "⚠ 文件上传失败，仅保存记录");
      }
    }

    // Use correct DB field names: title, file_url, file_type
    const dbPayload = {
      title: fileData.name,
      category: fileData.category,
      file_type: fileData.type,
      file_url: fileUrl,
      is_public: false,
      description: "",
    };

    let newId = "f" + Date.now();
    try {
      const result = await window.SUPABASE.insert("resources", dbPayload);
      if (Array.isArray(result) && result[0]) newId = result[0].id;
    } catch (e) {
      addToast(lang === "en" ? "❌ Failed to save record" : "❌ 记录保存失败");
    }

    // Frontend object uses frontend field names
    const newFile = {
      id: newId,
      name: fileData.name,
      category: fileData.category,
      type: fileData.type,
      size,
      url: fileUrl,
      uploader: user.name,
      downloads: 0,
      uploaded: new Date().toISOString().slice(0, 10),
    };
    D.resources.unshift(newFile);
    setFiles([...D.resources]);
    addToast((lang === "en" ? "Uploaded · " : "已上传 · ") + fileData.name);
    setShowUpload(false);
  }

  return (
    <div>
      <SectionHeader eyebrow="Files" title={lang === "en" ? "Manage shared files" : "管理共享文件"} action={
        <button className="btn btn-primary btn-sm" onClick={() => setShowUpload(true)}>
          <Icon.upload /> {lang === "en" ? "Upload" : "上传"}
        </button>
      } />
      <table className="table">
        <thead><tr><th>File</th><th>Category</th><th>Type</th><th>Size</th><th>Uploaded</th><th>DL</th><th></th></tr></thead>
        <tbody>
          {files.map(f => (
            <tr key={f.id}>
              <td style={{ fontWeight: 500, fontSize: 13.5 }}>
                {f.url
                  ? <a href={f.url} target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)", textDecoration: "none" }}>{f.name}</a>
                  : f.name}
              </td>
              <td><span className="chip">{f.category}</span></td>
              <td style={{ fontFamily: "var(--mono)", fontSize: 11.5 }}>{f.type}</td>
              <td style={{ fontFamily: "var(--mono)", fontSize: 11.5, color: "var(--ink-3)" }}>{f.size}</td>
              <td style={{ fontFamily: "var(--mono)", fontSize: 11.5, color: "var(--ink-3)" }}>{f.uploaded}</td>
              <td style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--ink-3)" }}>{f.downloads}</td>
              <td style={{ textAlign: "right" }}>
                <button className="btn btn-text btn-sm" onClick={() => remove(f.id)} style={{ color: "var(--danger)" }}><Icon.trash /></button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {showUpload && <UploadModal onClose={() => setShowUpload(false)} onUpload={upload} />}
    </div>
  );
}

function UploadModal({ onClose, onUpload, defaultCat }) {
  const { lang } = useApp();
  const [name, setName] = useState("");
  const [category, setCategory] = useState(defaultCat || "Protocols");
  const [type, setType] = useState("PDF");
  const [drag, setDrag] = useState(false);
  const [rawFile, setRawFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [presenter, setPresenter] = useState("");
  const [paperTitle, setPaperTitle] = useState("");
  const [researchField, setResearchField] = useState("");
  const [presentationDate, setPresentationDate] = useState("");
  const fileInputRef = React.useRef(null);
  const isLitPPT = category === "Literature PPT";

  function handleFile(f) {
    if (!f) return;
    setRawFile(f);
    setName(f.name.replace(/\.[^.]+$/, ""));
    setType((f.name.split(".").pop() || "BIN").toUpperCase().slice(0, 8));
  }

  async function doUpload() {
    if (!name) return;
    setUploading(true);
    await onUpload({ name, category, type, presenter, paperTitle, researchField, presentationDate }, rawFile);
    setUploading(false);
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{lang === "en" ? "Upload file" : "上传文件"}</h3>
          <button className="btn btn-text" onClick={onClose}><Icon.close /></button>
        </div>
        <div className="modal-body">
          <input type="file" ref={fileInputRef} style={{ display: "none" }}
            onChange={e => handleFile(e.target.files[0])} />
          <div
            onDragOver={e => { e.preventDefault(); setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            onDrop={e => { e.preventDefault(); setDrag(false); handleFile(e.dataTransfer.files[0]); }}
            onClick={() => fileInputRef.current && fileInputRef.current.click()}
            style={{
              padding: 32, border: `1.5px dashed ${drag ? "var(--accent)" : "var(--line-2)"}`,
              borderRadius: 6, textAlign: "center",
              background: rawFile ? "var(--accent-soft)" : drag ? "var(--accent-soft)" : "var(--bg-2)",
              marginBottom: 20, transition: "all 0.15s", cursor: "pointer",
            }}>
            <Icon.upload />
            {rawFile ? (
              <p style={{ marginTop: 12, marginBottom: 4, fontSize: 14, color: "var(--accent)", fontWeight: 500 }}>
                ✓ {rawFile.name}
              </p>
            ) : (
              <>
                <p style={{ marginTop: 12, marginBottom: 4, fontSize: 14 }}>
                  {lang === "en" ? "Drop file here or click to browse" : "拖拽文件至此处，或点击选择文件"}
                </p>
                <p style={{ fontSize: 11.5, color: "var(--ink-3)", margin: 0, fontFamily: "var(--mono)" }}>
                  PDF · DOCX · PPTX · XLSX · ZIP · max 50 MB
                </p>
              </>
            )}
          </div>
          <label className="label">{lang === "en" ? "Display name" : "显示名称"}</label>
          <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Journal Club_20260428" />
          <div style={{ height: 12 }} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label className="label">{lang === "en" ? "Category" : "分类"}</label>
              <select className="select" value={category} onChange={e => setCategory(e.target.value)}>
                <option>Protocols</option>
                <option>Literature PPT</option>
                <option>Duty Roster</option>
                <option>Lab Meeting</option>
                <option>Reagent Inventory</option>
                <option>Reading Group</option>
              </select>
            </div>
            <div>
              <label className="label">{lang === "en" ? "Type" : "类型"}</label>
              <select className="select" value={type} onChange={e => setType(e.target.value)}>
                <option>PDF</option><option>DOCX</option><option>PPTX</option><option>XLSX</option><option>ZIP</option>
              </select>
            </div>
          </div>

          {/* Literature PPT extra fields */}
          {isLitPPT && (
            <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 12, padding: 16, background: "var(--bg-2)", borderRadius: 6, border: "1px solid var(--line)" }}>
              <div className="eyebrow" style={{ marginBottom: 4 }}>{lang === "en" ? "Literature PPT details" : "文献汇报信息"}</div>
              <div>
                <label className="label">{lang === "en" ? "Paper title" : "文献标题"}</label>
                <textarea className="textarea" value={paperTitle} onChange={e => setPaperTitle(e.target.value)}
                  style={{ minHeight: 64 }} placeholder={lang === "en" ? "Full title of the paper being presented" : "汇报文献的完整标题"} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label className="label">{lang === "en" ? "Presenter" : "汇报人"}</label>
                  <input className="input" value={presenter} onChange={e => setPresenter(e.target.value)} placeholder={lang === "en" ? "Name" : "姓名"} />
                </div>
                <div>
                  <label className="label">{lang === "en" ? "Presentation date" : "汇报日期"}</label>
                  <input className="input" type="date" value={presentationDate} onChange={e => setPresentationDate(e.target.value)} />
                </div>
              </div>
              <div>
                <label className="label">{lang === "en" ? "Research field" : "研究领域"}</label>
                <input className="input" value={researchField} onChange={e => setResearchField(e.target.value)}
                  placeholder={lang === "en" ? "e.g. Prostate cancer, RNA biology, CRISPR…" : "例如：前列腺癌、RNA 生物学、CRISPR…"} />
              </div>
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost btn-sm" onClick={onClose}>{lang === "en" ? "Cancel" : "取消"}</button>
          <button className="btn btn-primary btn-sm" disabled={!name || uploading} onClick={doUpload}>
            {uploading
              ? (lang === "en" ? "Uploading…" : "上传中…")
              : <><Icon.upload /> {lang === "en" ? "Upload" : "上传"}</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── News ──────────────────────────────────────────────────────────────────────

function AdminNews() {
  const { lang, addToast } = useApp();
  const D = window.LAB_DATA;
  const [news, setNews] = useState([...D.news]);
  const [draft, setDraft] = useState({ date: new Date().toISOString().slice(0, 10), en: "", cn: "" });
  const [posting, setPosting] = useState(false);

  async function post() {
    if (!draft.en && !draft.cn) return;
    setPosting(true);
    const payload = {
      published_at: draft.date,
      content: draft.en,
      content_cn: draft.cn,
      title: draft.en,
      title_cn: draft.cn,
    };
    try {
      const result = await window.SUPABASE.insert("news", payload);
      const newId = Array.isArray(result) && result[0] ? result[0].id : null;
      const newItem = { id: newId, date: draft.date, en: draft.en, cn: draft.cn };
      D.news.unshift(newItem);
      setNews([...D.news]);
      setDraft({ date: new Date().toISOString().slice(0, 10), en: "", cn: "" });
      addToast(lang === "en" ? "Posted" : "已发布");
    } catch (e) {
      addToast(lang === "en" ? "❌ Post failed — check Supabase permissions" : "❌ 发布失败，请检查数据库权限");
    } finally {
      setPosting(false);
    }
  }

  async function deleteItem(n, i) {
    try {
      if (n.id && isUUID(n.id)) {
        await window.SUPABASE.remove("news", n.id);
      }
      D.news.splice(i, 1);
      setNews([...D.news]);
      addToast(lang === "en" ? "Deleted" : "已删除");
    } catch (e) {
      addToast(lang === "en" ? "❌ Delete failed" : "❌ 删除失败");
    }
  }

  return (
    <div>
      <SectionHeader eyebrow="News" title={lang === "en" ? "Manage news" : "管理动态"} action={null} />
      <div className="card" style={{ marginBottom: 24 }}>
        <h4 style={{ marginBottom: 14 }}>{lang === "en" ? "Post new update" : "发布新动态"}</h4>
        <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: 12, marginBottom: 12 }}>
          <input className="input" type="date" value={draft.date} onChange={e => setDraft({ ...draft, date: e.target.value })} />
          <input className="input" placeholder="English headline" value={draft.en} onChange={e => setDraft({ ...draft, en: e.target.value })} />
        </div>
        <input className="input" placeholder="中文标题" value={draft.cn} onChange={e => setDraft({ ...draft, cn: e.target.value })} />
        <div style={{ marginTop: 14, textAlign: "right" }}>
          <button className="btn btn-primary btn-sm" disabled={(!draft.en && !draft.cn) || posting} onClick={post}>
            {posting ? (lang === "en" ? "Posting…" : "发布中…") : <><Icon.plus /> {lang === "en" ? "Publish" : "发布"}</>}
          </button>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        {news.map((n, i) => (
          <div key={i} style={{ padding: "16px 0", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", gap: 16 }}>
            <span style={{ fontFamily: "var(--mono)", fontSize: 11.5, color: "var(--ink-3)", width: 90 }}>{n.date}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13.5 }}>{n.en}</div>
              <div style={{ fontSize: 12.5, color: "var(--ink-3)" }}>{n.cn}</div>
            </div>
            <button className="btn btn-text btn-sm" onClick={() => deleteItem(n, i)} style={{ color: "var(--danger)" }}><Icon.trash /></button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Pages ─────────────────────────────────────────────────────────────────────

function AdminPages() {
  const { lang, addToast } = useApp();
  const D = window.LAB_DATA;
  const [missionEn, setMissionEn] = useState(D.lab.mission.en);
  const [missionCn, setMissionCn] = useState(D.lab.mission.cn);
  return (
    <div>
      <SectionHeader eyebrow="Pages" title={lang === "en" ? "Edit page content" : "编辑页面内容"} action={null} />
      <div className="card">
        <h4 style={{ marginBottom: 16 }}>{lang === "en" ? "Lab mission · homepage" : "课题组使命 · 首页"}</h4>
        <label className="label">English</label>
        <textarea className="textarea" value={missionEn} onChange={e => setMissionEn(e.target.value)} />
        <div style={{ height: 12 }} />
        <label className="label">中文</label>
        <textarea className="textarea" value={missionCn} onChange={e => setMissionCn(e.target.value)} />
        <div style={{ marginTop: 14, textAlign: "right" }}>
          <button className="btn btn-primary btn-sm" onClick={() => { D.lab.mission.en = missionEn; D.lab.mission.cn = missionCn; addToast(lang === "en" ? "Saved" : "已保存"); }}>
            <Icon.check /> {lang === "en" ? "Save" : "保存"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Users ─────────────────────────────────────────────────────────────────────

function AdminUsers() {
  const { lang, addToast } = useApp();
  const D = window.LAB_DATA;
  const [users, setUsers] = useState(D.accounts.filter(a => a.role !== "guest"));
  return (
    <div>
      <SectionHeader eyebrow="Users" title={lang === "en" ? "User accounts" : "用户账号"} action={
        <button className="btn btn-primary btn-sm" onClick={() => addToast("(Demo) Invite user")}>
          <Icon.plus /> {lang === "en" ? "Invite" : "邀请"}
        </button>
      } />
      <table className="table">
        <thead><tr><th>Username</th><th>Name</th><th>Role</th><th></th></tr></thead>
        <tbody>
          {users.map(u => (
            <tr key={u.username}>
              <td style={{ fontFamily: "var(--mono)", fontSize: 13 }}>{u.username}</td>
              <td>{u.name} <span style={{ color: "var(--ink-3)", marginLeft: 6 }}>{u.nameCn}</span></td>
              <td>
                <span className="chip" style={{ background: u.role === "admin" ? "var(--brick-soft)" : "var(--accent-soft)", color: u.role === "admin" ? "var(--brick)" : "var(--accent-2)", border: "none" }}>
                  {u.role}
                </span>
              </td>
              <td style={{ textAlign: "right" }}>
                <button className="btn btn-text btn-sm"><Icon.edit /></button>
                <button className="btn btn-text btn-sm" onClick={() => { setUsers(prev => prev.filter(x => x.username !== u.username)); addToast("Removed " + u.username); }} style={{ color: "var(--danger)" }}><Icon.trash /></button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

Object.assign(window, { ResourcesPage, AdminPage });
