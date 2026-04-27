// Resources (members-only gating) + Admin console

function ResourcesPage() {
  const { lang, t, user, openLogin, addToast } = useApp();
  const D = window.LAB_DATA;
  const [files, setFiles] = useState(D.resources);
  const [activeCat, setActiveCat] = useState("All");

  // Categories: visitors only see Lab Meeting (sample public).
  const allCats = useMemo(() => Array.from(new Set(files.map(f => f.category))), [files]);
  const visibleCats = user.role === "guest" ? ["Lab Meeting"] : allCats;
  const cats = ["All", ...visibleCats];

  const visible = files.filter(f =>
    visibleCats.includes(f.category) && (activeCat === "All" || f.category === activeCat)
  );

  function download(f) {
    setFiles(prev => prev.map(x => x.id === f.id ? { ...x, downloads: x.downloads + 1 } : x));
    addToast(`${lang === "en" ? "Downloaded" : "已下载"} · ${f.name}`);
  }

  return (
    <div className="page-fade container" style={{ padding: "64px 32px 0" }}>
      <div className="eyebrow" style={{ marginBottom: 16 }}>Resources · 共享资源</div>
      <h1 style={{ marginBottom: 24 }}>{lang === "en" ? "Shared lab resources." : "组内共享资源。"}</h1>
      <p className="lead" style={{ marginBottom: 40 }}>
        {lang === "en"
          ? "Protocols, journal-club presentations, schedules, and inventories — maintained by the lab, for the lab."
          : "实验方法、文献汇报、排班、库存清单 —— 由组内维护，服务组内。"}
      </p>

      {/* Gate banner */}
      {user.role === "guest" && (
        <div style={{
          padding: 24,
          background: "var(--bg-2)",
          border: "1px solid var(--line)",
          borderLeft: "3px solid var(--brick)",
          borderRadius: "0 4px 4px 0",
          marginBottom: 40,
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
        {/* Sidebar */}
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
                  {c === "All" ? files.filter(f => visibleCats.includes(f.category)).length : files.filter(f => f.category === c).length}
                </span>
              </button>
            ))}
          </div>
          {user.role !== "guest" && (
            <div style={{ marginTop: 32, padding: 16, background: "var(--bg-2)", borderRadius: 4, border: "1px solid var(--line)" }}>
              <div className="eyebrow" style={{ marginBottom: 6 }}>Logged in as</div>
              <p style={{ fontSize: 13, fontWeight: 500, margin: 0 }}>{user.name}</p>
              <p style={{ fontSize: 11.5, color: "var(--ink-3)", margin: "2px 0 0", fontFamily: "var(--mono)", letterSpacing: "0.04em", textTransform: "uppercase" }}>
                {user.role}
              </p>
            </div>
          )}
        </aside>

        {/* File table */}
        <div>
          {visible.length === 0 ? (
            <div style={{ padding: 64, textAlign: "center", color: "var(--ink-3)", border: "1px dashed var(--line-2)", borderRadius: 4 }}>
              {lang === "en" ? "No files in this category." : "暂无文件。"}
            </div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: "40%" }}>{lang === "en" ? "File" : "文件"}</th>
                  <th>{lang === "en" ? "Type" : "类型"}</th>
                  <th>{t.resources.uploaded}</th>
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
                          fontFamily: "var(--mono)", fontSize: 9, fontWeight: 600, color: "var(--ink-2)",
                          letterSpacing: "0.04em"
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
                      <button className="btn btn-text btn-sm" onClick={() => download(f)} title={t.resources.download}>
                        <Icon.download />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
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

function AdminPubs() {
  const { lang, addToast } = useApp();
  const D = window.LAB_DATA;
  const [pubs, setPubs] = useState([...D.publications]);
  const [editing, setEditing] = useState(null);

  function save(p) {
    if (p.id) {
      const i = D.publications.findIndex(x => x.id === p.id);
      if (i >= 0) D.publications[i] = p;
    } else {
      D.publications.unshift({ ...p, id: "p" + Date.now() });
    }
    setPubs([...D.publications]);
    addToast(lang === "en" ? "Saved" : "已保存");
    setEditing(null);
  }
  function remove(id) {
    const i = D.publications.findIndex(p => p.id === id);
    if (i >= 0) D.publications.splice(i, 1);
    setPubs([...D.publications]);
    addToast(lang === "en" ? "Deleted" : "已删除");
  }

  return (
    <div>
      <SectionHeader eyebrow="Publications" title={lang === "en" ? "Manage publications" : "管理论文"} action={
        <button className="btn btn-primary btn-sm" onClick={() => setEditing({ year: new Date().getFullYear(), authors: "", title: "", journal: "", volume: "", tag: "First", featured: false, doi: "" })}>
          <Icon.plus /> {lang === "en" ? "Add" : "添加"}
        </button>
      } />
      <table className="table">
        <thead>
          <tr><th style={{ width: 60 }}>Year</th><th>Title</th><th style={{ width: 100 }}>Tag</th><th style={{ width: 80 }}></th></tr>
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
                <button className="btn btn-text btn-sm" onClick={() => setEditing(p)}><Icon.edit /></button>
                <button className="btn btn-text btn-sm" onClick={() => remove(p.id)} style={{ color: "var(--danger)" }}><Icon.trash /></button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {editing && <EditPubModal pub={editing} onSave={save} onClose={() => setEditing(null)} />}
    </div>
  );
}

function EditPubModal({ pub, onSave, onClose }) {
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
                <option>First</option><option>Corresponding</option><option>First/Co-corresponding</option><option>Co-author</option><option>Book · Lead Editor</option>
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
              <input className="input" value={p.volume} onChange={e => setP({ ...p, volume: e.target.value })} />
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
          <button className="btn btn-primary btn-sm" onClick={() => onSave(p)}><Icon.check /> {lang === "en" ? "Save" : "保存"}</button>
        </div>
      </div>
    </div>
  );
}

function AdminMembers() {
  const { lang, addToast } = useApp();
  const D = window.LAB_DATA;
  const [members, setMembers] = useState([...D.members]);
  const [editing, setEditing] = useState(null);

  function save(m) {
    if (m.id) {
      const i = D.members.findIndex(x => x.id === m.id);
      if (i >= 0) D.members[i] = m;
    } else {
      D.members.push({ ...m, id: "m" + Date.now() });
    }
    setMembers([...D.members]);
    addToast(lang === "en" ? "Saved" : "已保存");
    setEditing(null);
  }
  function remove(id) {
    const i = D.members.findIndex(m => m.id === id);
    if (i >= 0) D.members.splice(i, 1);
    setMembers([...D.members]);
    addToast(lang === "en" ? "Deleted" : "已删除");
  }

  return (
    <div>
      <SectionHeader eyebrow="Members" title={lang === "en" ? "Manage members" : "管理成员"} action={
        <button className="btn btn-primary btn-sm" onClick={() => setEditing({ name: "", nameCn: "", role: "PhD Student", roleCn: "博士生", focus: "", focusCn: "", year: new Date().getFullYear(), email: "", group: "current" })}>
          <Icon.plus /> {lang === "en" ? "Add member" : "添加成员"}
        </button>
      } />
      <table className="table">
        <thead><tr><th>Name</th><th>Role</th><th>Focus</th><th>Joined</th><th>Status</th><th></th></tr></thead>
        <tbody>
          {members.map(m => (
            <tr key={m.id}>
              <td><strong>{m.name}</strong> <span style={{ color: "var(--ink-3)", marginLeft: 8 }}>{m.nameCn}</span></td>
              <td style={{ fontSize: 13 }}>{m.role}</td>
              <td style={{ fontSize: 13, color: "var(--ink-2)", maxWidth: 280 }}>{m.focus}</td>
              <td style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--ink-3)" }}>{m.year}</td>
              <td><span className="chip">{m.group || "current"}</span></td>
              <td style={{ textAlign: "right" }}>
                <button className="btn btn-text btn-sm" onClick={() => setEditing(m)}><Icon.edit /></button>
                <button className="btn btn-text btn-sm" onClick={() => remove(m.id)} style={{ color: "var(--danger)" }}><Icon.trash /></button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {editing && <EditMemberModal member={editing} onSave={save} onClose={() => setEditing(null)} />}
    </div>
  );
}

function EditMemberModal({ member, onSave, onClose }) {
  const { lang } = useApp();
  const [m, setM] = useState(member);
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
          <input className="input" value={m.focus} onChange={e => setM({ ...m, focus: e.target.value })} />
          <div style={{ height: 12 }} />
          <label className="label">研究方向（中文）</label>
          <input className="input" value={m.focusCn} onChange={e => setM({ ...m, focusCn: e.target.value })} />
          <div style={{ height: 12 }} />
          <div style={{ display: "grid", gridTemplateColumns: "100px 1fr 140px", gap: 12 }}>
            <div><label className="label">Year</label><input className="input" type="number" value={m.year} onChange={e => setM({ ...m, year: Number(e.target.value) })} /></div>
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
          <button className="btn btn-primary btn-sm" onClick={() => onSave(m)} disabled={!m.name}><Icon.check /> {lang === "en" ? "Save" : "保存"}</button>
        </div>
      </div>
    </div>
  );
}

function AdminResources() {
  const { lang, addToast } = useApp();
  const D = window.LAB_DATA;
  const [files, setFiles] = useState([...D.resources]);
  const [showUpload, setShowUpload] = useState(false);

  function remove(id) {
    const i = D.resources.findIndex(f => f.id === id);
    if (i >= 0) D.resources.splice(i, 1);
    setFiles([...D.resources]);
  }
  function upload(file) {
    D.resources.unshift({ ...file, id: "f" + Date.now(), downloads: 0, uploaded: new Date().toISOString().slice(0, 10) });
    setFiles([...D.resources]);
    addToast((lang === "en" ? "Uploaded · " : "已上传 · ") + file.name);
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
              <td style={{ fontWeight: 500, fontSize: 13.5 }}>{f.name}</td>
              <td><span className="chip">{f.category}</span></td>
              <td style={{ fontFamily: "var(--mono)", fontSize: 11.5 }}>{f.type}</td>
              <td style={{ fontFamily: "var(--mono)", fontSize: 11.5, color: "var(--ink-3)" }}>{f.size}</td>
              <td style={{ fontFamily: "var(--mono)", fontSize: 11.5, color: "var(--ink-3)" }}>{f.uploaded}</td>
              <td style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--ink-3)" }}>{f.downloads}</td>
              <td style={{ textAlign: "right" }}>
                <button className="btn btn-text btn-sm" onClick={() => { remove(f.id); addToast("Deleted " + f.name); }} style={{ color: "var(--danger)" }}><Icon.trash /></button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {showUpload && <UploadModal onClose={() => setShowUpload(false)} onUpload={upload} />}
    </div>
  );
}

function UploadModal({ onClose, onUpload }) {
  const { lang, user } = useApp();
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Protocols");
  const [type, setType] = useState("PDF");
  const [drag, setDrag] = useState(false);
  const fakeSize = ["240 KB", "1.2 MB", "3.4 MB", "8.1 MB"][Math.floor(Math.random() * 4)];

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{lang === "en" ? "Upload file" : "上传文件"}</h3>
          <button className="btn btn-text" onClick={onClose}><Icon.close /></button>
        </div>
        <div className="modal-body">
          <div onDragOver={e => { e.preventDefault(); setDrag(true); }}
               onDragLeave={() => setDrag(false)}
               onDrop={e => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f) { setName(f.name); setType((f.name.split('.').pop() || 'BIN').toUpperCase()); } }}
               style={{
                 padding: 32, border: `1.5px dashed ${drag ? "var(--accent)" : "var(--line-2)"}`,
                 borderRadius: 6, textAlign: "center", background: drag ? "var(--accent-soft)" : "var(--bg-2)",
                 marginBottom: 20, transition: "all 0.15s",
               }}>
            <Icon.upload />
            <p style={{ marginTop: 12, marginBottom: 4, fontSize: 14 }}>
              {lang === "en" ? "Drop file here or" : "拖拽文件至此处，或"}
              {" "}<a href="#" onClick={(e) => { e.preventDefault(); setName("uploaded_" + Math.floor(Math.random() * 999) + ".pdf"); setType("PDF"); }} style={{ color: "var(--accent)", borderBottom: "1px solid var(--accent)" }}>{lang === "en" ? "browse" : "选择文件"}</a>
            </p>
            <p style={{ fontSize: 11.5, color: "var(--ink-3)", margin: 0, fontFamily: "var(--mono)" }}>PDF · DOCX · PPTX · XLSX · ZIP · max 50 MB</p>
          </div>
          <label className="label">{lang === "en" ? "Display name" : "显示名称"}</label>
          <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. RNA-seq library prep v3.2" />
          <div style={{ height: 12 }} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label className="label">{lang === "en" ? "Category" : "分类"}</label>
              <select className="select" value={category} onChange={e => setCategory(e.target.value)}>
                <option>Protocols</option><option>Literature PPT</option><option>Duty Roster</option><option>Lab Meeting</option><option>Reagent Inventory</option><option>Reading Group</option>
              </select>
            </div>
            <div>
              <label className="label">{lang === "en" ? "Type" : "类型"}</label>
              <select className="select" value={type} onChange={e => setType(e.target.value)}>
                <option>PDF</option><option>DOCX</option><option>PPTX</option><option>XLSX</option><option>ZIP</option>
              </select>
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost btn-sm" onClick={onClose}>{lang === "en" ? "Cancel" : "取消"}</button>
          <button className="btn btn-primary btn-sm" disabled={!name}
            onClick={() => onUpload({ name, category, type, size: fakeSize, uploader: user.name })}>
            <Icon.upload /> {lang === "en" ? "Upload" : "上传"}
          </button>
        </div>
      </div>
    </div>
  );
}

function AdminNews() {
  const { lang, addToast } = useApp();
  const D = window.LAB_DATA;
  const [news, setNews] = useState([...D.news]);
  const [draft, setDraft] = useState({ date: new Date().toISOString().slice(0, 10), en: "", cn: "" });
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
          <button className="btn btn-primary btn-sm" disabled={!draft.en && !draft.cn} onClick={() => {
            D.news.unshift(draft);
            setNews([...D.news]);
            setDraft({ date: new Date().toISOString().slice(0, 10), en: "", cn: "" });
            addToast(lang === "en" ? "Posted" : "已发布");
          }}>
            <Icon.plus /> {lang === "en" ? "Publish" : "发布"}
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
            <button className="btn btn-text btn-sm" onClick={() => { D.news.splice(i, 1); setNews([...D.news]); addToast("Deleted"); }} style={{ color: "var(--danger)" }}><Icon.trash /></button>
          </div>
        ))}
      </div>
    </div>
  );
}

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
          <button className="btn btn-primary btn-sm" onClick={() => { D.lab.mission.en = missionEn; D.lab.mission.cn = missionCn; addToast(lang === "en" ? "Saved" : "已保存"); }}><Icon.check /> {lang === "en" ? "Save" : "保存"}</button>
        </div>
      </div>
    </div>
  );
}

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
