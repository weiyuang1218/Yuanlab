// Resources (members-only gating) + Admin console

function isUUID(id) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(id || ""));
}
// For seed data with non-UUID ids (p1, m1…), we still attempt the DB call
// using a sentinel that won't match anything — the real fix is the insert path below
function dbId(id) { return isUUID(id) ? id : null; }

const RESOURCE_CATEGORIES = {
  internalProtocols: "Internal Protocols",
  externalProtocols: "External Protocols",
  databases: "Databases and Datasets",
};

const RESOURCE_CATEGORY_OPTIONS = [
  RESOURCE_CATEGORIES.internalProtocols,
  RESOURCE_CATEGORIES.externalProtocols,
  "Literature PPT",
  RESOURCE_CATEGORIES.databases,
  "Duty Roster",
  "Lab Meeting",
  "Reagent Inventory",
  "Reading Group",
];

function normalizeResourceCategory(category) {
  if (category === "Protocols") return RESOURCE_CATEGORIES.internalProtocols;
  if (category === "Reference Protocols") return RESOURCE_CATEGORIES.externalProtocols;
  return category || "";
}

function isDatabaseResource(file) {
  return file.category === RESOURCE_CATEGORIES.databases;
}

function protocolNameCompare(a, b, lang, dir) {
  const locale = lang === "cn" ? "zh-Hans-CN" : "en";
  const result = String(a.name || "").localeCompare(String(b.name || ""), locale, {
    numeric: true,
    sensitivity: "base",
  });
  return dir === "desc" ? -result : result;
}

function ResourcesPage() {
  const { lang, t, user, openLogin, addToast, dbReady } = useApp();
  const D = window.LAB_DATA;
  const [files, setFiles] = useState(D.resources.map(f => ({ ...f, category: normalizeResourceCategory(f.category) })));
  const [activeCat, setActiveCat] = useState(RESOURCE_CATEGORIES.internalProtocols);
  const [showUpload, setShowUpload] = useState(false);
  const [detail, setDetail] = useState(null);       // file being viewed
  const [editing, setEditing] = useState(null);     // file being edited
  const [sortBy, setSortBy] = useState("uploaded"); // "uploaded" | "date"
  const [sortDir, setSortDir] = useState("desc");

  const allCats = useMemo(() => {
    const fromFiles = files.map(f => normalizeResourceCategory(f.category));
    return Array.from(new Set([...RESOURCE_CATEGORY_OPTIONS, ...fromFiles]));
  }, [files]);
  const visibleCats = user.role === "guest" ? ["Lab Meeting"] : allCats;
  const cats = visibleCats;
  const isLitPPT = activeCat === "Literature PPT";

  useEffect(() => {
    if (visibleCats.length > 0 && !visibleCats.includes(activeCat)) {
      setActiveCat(visibleCats[0]);
    }
  }, [activeCat, visibleCats]);

  // Re-sync files list when DB data finishes loading (after seed data)
  useEffect(() => {
    setFiles(D.resources.map(f => ({ ...f, category: normalizeResourceCategory(f.category) })));
  }, [dbReady]);

  const visible = useMemo(() => {
    let list = files.filter(f =>
      visibleCats.includes(f.category) && f.category === activeCat
    );
    // Sort
    list = [...list].sort((a, b) => {
      let av, bv;
      if (sortBy === "date") {
        av = a.presentationDate || a.uploaded || "";
        bv = b.presentationDate || b.uploaded || "";
      } else if (sortBy === "presenter") {
        av = a.presenter || a.uploader || "";
        bv = b.presenter || b.uploader || "";
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
    else { setSortBy(field); setSortDir(field === "presenter" ? "asc" : "desc"); }
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
    if (rawFile && fileData.category !== RESOURCE_CATEGORIES.databases) {
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
    if (fileData.category === RESOURCE_CATEGORIES.databases && fileData.databaseUrl) {
      fileUrl = fileData.databaseUrl;
    }
    const dbPayload = {
      title: fileData.name, category: fileData.category,
      file_type: fileData.type, file_url: fileUrl,
      is_public: false, description: fileData.description || "",
      uploader: user.name,
      presenter: fileData.presenter || "",
      paper_title: fileData.paperTitle || "",
      research_field: fileData.researchField || "",
      presentation_date: fileData.presentationDate || null,
      source: fileData.source || "",
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
      source: fileData.source || "",
      description: fileData.description || "",
    };
    D.resources.unshift(newFile);
    setFiles([...D.resources]);
    try { localStorage.setItem("yuanlab.resources", JSON.stringify(D.resources)); } catch (e) {}
    addToast((lang === "en" ? "Uploaded · " : "已上传 · ") + fileData.name);
    setShowUpload(false);
  }

  // Save edited detail (members & admin)
  async function saveDetail(updated) {
    const dbPayload = {
      title: updated.name,
      file_url: updated.url || "",
      description: updated.description || "",
      presenter: updated.presenter || "",
      paper_title: updated.paperTitle || "",
      research_field: updated.researchField || "",
      presentation_date: updated.presentationDate || null,
      source: updated.source || "",
    };
    if (isUUID(updated.id)) {
      try { await window.SUPABASE.update("resources", updated.id, dbPayload); } catch (e) {}
    }
    const newFiles = files.map(f => f.id === updated.id ? { ...f, ...updated } : f);
    D.resources = newFiles;
    setFiles(newFiles);
    try { localStorage.setItem("yuanlab.resources", JSON.stringify(D.resources)); } catch (e) {}
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
                  {files.filter(f => f.category === c).length}
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
          {isLitPPT ? (
            visible.length === 0 ? (
              <div style={{ padding: 64, textAlign: "center", color: "var(--ink-3)", border: "1px dashed var(--line-2)", borderRadius: 4 }}>
                {lang === "en" ? "No files in this category." : "暂无文件。"}
              </div>
            ) : (
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: "28%" }}>{lang === "en" ? "Session name" : "文件名"}</th>
                  <th><SortBtn field="date" label={lang === "en" ? "Presentation date" : "汇报日期"} /></th>
                  <th><SortBtn field="presenter" label={lang === "en" ? "Presenter" : "汇报人"} /></th>
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
                    <td style={{ fontFamily: "var(--mono)", fontSize: 12.5, color: "var(--ink-2)" }}>{f.presentationDate || "—"}</td>
                    <td style={{ fontSize: 13 }}>{f.presenter || f.uploader || "—"}</td>
                    <td style={{ fontSize: 12.5, color: "var(--ink-2)" }}>{f.researchField || "—"}</td>
                    <td style={{ textAlign: "right", fontFamily: "var(--mono)", fontSize: 12, color: "var(--ink-3)" }}>{f.uploaded}</td>
                    <td style={{ textAlign: "right" }} onClick={e => e.stopPropagation()}>
                      <button className="btn btn-text btn-sm" onClick={() => download(f)}><Icon.download /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            )
          ) : (activeCat === RESOURCE_CATEGORIES.internalProtocols || activeCat === RESOURCE_CATEGORIES.externalProtocols) ? (
            <ProtocolCollectionsView
              files={files} visibleCats={visibleCats} activeCat={activeCat}
              onDetail={setDetail} onDownload={download}
              lang={lang}
            />
          ) : visible.length === 0 ? (
            <div style={{ padding: 64, textAlign: "center", color: "var(--ink-3)", border: "1px dashed var(--line-2)", borderRadius: 4 }}>
              {lang === "en" ? "No files in this category." : "暂无文件。"}
            </div>
          ) : (
            <DefaultFileTable visible={visible} onDetail={setDetail} onDownload={download} t={t} SortBtn={SortBtn} lang={lang} />
          )}
        </div>
      </div>

      {showUpload && <UploadModal onClose={() => setShowUpload(false)} onUpload={handleUpload} defaultCat={activeCat} />}

      {detail && !editing && (
        <ResourceDetailModal
          file={detail}
          canEdit={user.role === "member" || user.role === "admin"}
          onEdit={() => setEditing({ ...detail })}
          onDownload={() => download(detail)}
          onClose={() => setDetail(null)}
          lang={lang}
        />
      )}

      {editing && (
        <ResourceEditModal
          file={editing}
          onSave={saveDetail}
          onClose={() => setEditing(null)}
          lang={lang}
        />
      )}
    </div>
  );
}

/* ── Internal / external protocol collections ── */
function ProtocolCollectionsView({ files, visibleCats, activeCat, onDetail, onDownload, lang }) {
  const [protocolSortField, setProtocolSortField] = useState("name");
  const [protocolSortDir, setProtocolSortDir] = useState("asc");
  const allProtocolFiles = files.filter(f => visibleCats.includes(f.category) &&
    (f.category === RESOURCE_CATEGORIES.internalProtocols || f.category === RESOURCE_CATEGORIES.externalProtocols));
  const internalProtocolFiles = allProtocolFiles.filter(f => f.category === RESOURCE_CATEGORIES.internalProtocols);
  const externalProtocolFiles = allProtocolFiles.filter(f => f.category === RESOURCE_CATEGORIES.externalProtocols);
  const showInternalProtocols = activeCat === RESOURCE_CATEGORIES.internalProtocols;
  const showExternalProtocols = activeCat === RESOURCE_CATEGORIES.externalProtocols;

  function toggleProtocolSort(field) {
    if (protocolSortField === field) setProtocolSortDir(d => d === "desc" ? "asc" : "desc");
    else { setProtocolSortField(field); setProtocolSortDir(field === "name" ? "asc" : "desc"); }
  }

  function ProtocolSortBtn({ field, label }) {
    const active = protocolSortField === field;
    return (
      <span onClick={() => toggleProtocolSort(field)} style={{
        cursor: "pointer", userSelect: "none",
        color: active ? "var(--ink)" : "var(--ink-3)",
        display: "inline-flex", alignItems: "center", gap: 3,
      }}>
        {label}
        <span style={{ fontSize: 10 }}>{active ? (protocolSortDir === "desc" ? "↓" : "↑") : "↕"}</span>
      </span>
    );
  }

  function ProtoTable({ items, emptyMsg }) {
    const sortedItems = [...items].sort((a, b) => {
      if (protocolSortField === "uploaded") {
        const result = String(a.uploaded || "").localeCompare(String(b.uploaded || ""));
        return protocolSortDir === "desc" ? -result : result;
      }
      return protocolNameCompare(a, b, lang, protocolSortDir);
    });
    if (items.length === 0) return (
      <div style={{ padding: "20px 0", color: "var(--ink-3)", fontSize: 13.5 }}>{emptyMsg}</div>
    );
    return (
      <table className="table">
        <thead>
          <tr>
            <th style={{ width: "42%" }}>
              <ProtocolSortBtn field="name" label={lang === "en" ? "Protocol name" : "方案名称"} />
            </th>
            <th>{lang === "en" ? "Type" : "类型"}</th>
            <th>{lang === "en" ? "By" : "上传者"}</th>
            <th><ProtocolSortBtn field="uploaded" label={lang === "en" ? "Updated" : "更新时间"} /></th>
            <th style={{ textAlign: "right" }}>{lang === "en" ? "Downloads" : "下载"}</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {sortedItems.map(f => (
            <tr key={f.id} style={{ cursor: "pointer" }} onClick={() => onDetail(f)}>
              <td>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{
                    width: 32, height: 32, background: "var(--bg-3)", borderRadius: 3,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontFamily: "var(--mono)", fontSize: 9, fontWeight: 600, color: "var(--ink-2)", flexShrink: 0,
                  }}>{f.type}</span>
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 500 }}>{f.name}</div>
                    {f.source && (
                      <div style={{ fontSize: 11.5, color: "var(--accent-2)", marginTop: 2 }}>
                        <span style={{ fontFamily: "var(--mono)", fontSize: 10 }}>SRC </span>{f.source}
                      </div>
                    )}
                    {f.size && <div style={{ fontSize: 11.5, color: "var(--ink-3)", fontFamily: "var(--mono)", marginTop: 1 }}>{f.size}</div>}
                  </div>
                </div>
              </td>
              <td><span className="chip">{f.type}</span></td>
              <td style={{ fontSize: 13 }}>{f.uploader || "—"}</td>
              <td style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--ink-3)" }}>{f.uploaded}</td>
              <td style={{ textAlign: "right", fontFamily: "var(--mono)", fontSize: 12.5, color: "var(--ink-3)" }}>{f.downloads}</td>
              <td style={{ textAlign: "right" }} onClick={e => e.stopPropagation()}>
                <button className="btn btn-text btn-sm" onClick={() => onDownload(f)}><Icon.download /></button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 56 }}>
      {showInternalProtocols && (
        <div>
          <div style={{ display: "flex", alignItems: "center", marginBottom: 12, paddingBottom: 12, borderBottom: "1px solid var(--ink)" }}>
            <div>
              <h3 style={{ fontSize: 20, margin: 0 }}>{lang === "en" ? "Internal protocols" : "组内实验方案"}</h3>
            </div>
            <span className="chip accent" style={{ marginLeft: "auto" }}>{internalProtocolFiles.length} {lang === "en" ? "files" : "个"}</span>
          </div>
          <p style={{ fontSize: 13.5, color: "var(--ink-2)", marginBottom: 16 }}>
            {lang === "en"
              ? "Protocols developed, optimized, and maintained by Yuan Lab members — reflecting our actual experimental conditions."
              : "由组内成员自主开发、优化和维护的实验方案，反映本课题组的实际实验条件。"}
          </p>
          <ProtoTable items={internalProtocolFiles} emptyMsg={lang === "en" ? "No internal protocols yet. Upload one to get started." : "暂无组内方案，点击右上角上传。"} />
        </div>
      )}
      {showExternalProtocols && (
        <div>
          <div style={{ display: "flex", alignItems: "center", marginBottom: 12, paddingBottom: 12, borderBottom: "1px solid var(--ink)" }}>
            <div>
              <h3 style={{ fontSize: 20, margin: 0 }}>{lang === "en" ? "External protocols" : "外部来源方案"}</h3>
            </div>
            <span className="chip" style={{ marginLeft: "auto" }}>{externalProtocolFiles.length} {lang === "en" ? "files" : "个"}</span>
          </div>
          <p style={{ fontSize: 13.5, color: "var(--ink-2)", marginBottom: 16 }}>
            {lang === "en"
              ? "Established protocols from reagent manufacturers (e.g. CST, Abcam), published papers, or other labs. Source noted per file."
              : "来自试剂商（如 CST、Abcam）、已发表文献或其他课题组的成熟方案，每个文件均标注来源。"}
          </p>
          <ProtoTable items={externalProtocolFiles} emptyMsg={lang === "en" ? "No external protocols yet." : "暂无外部方案。"} />
        </div>
      )}
    </div>
  );
}

/* ── Default file table ── */
function DefaultFileTable({ visible, onDetail, onDownload, t, SortBtn, lang }) {
  return (
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
          <tr key={f.id} style={{ cursor: "pointer" }} onClick={() => onDetail(f)}>
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
              <button className="btn btn-text btn-sm" onClick={(e) => { e.stopPropagation(); onDownload(f); }}>
                {isDatabaseResource(f) ? <Icon.external /> : <Icon.download />}
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/* ── Unified resource detail modal ── */
function ResourceDetailModal({ file, canEdit, onEdit, onDownload, onClose, lang }) {
  const isLit = file.category === "Literature PPT";
  const isExternalProtocol = file.category === RESOURCE_CATEGORIES.externalProtocols;
  const isDatabase = isDatabaseResource(file);
  const rows = isLit ? [
    [lang === "en" ? "Paper title" : "文献标题", file.paperTitle],
    [lang === "en" ? "Presenter" : "汇报人", file.presenter || file.uploader],
    [lang === "en" ? "Presentation date" : "汇报日期", file.presentationDate],
    [lang === "en" ? "Research field" : "研究领域", file.researchField],
    [lang === "en" ? "File size" : "文件大小", file.size],
    [lang === "en" ? "Uploaded by" : "上传者", file.uploader],
    [lang === "en" ? "Upload date" : "上传日期", file.uploaded],
  ] : isDatabase ? [
    [lang === "en" ? "Category" : "分类", file.category],
    [lang === "en" ? "Database URL" : "数据库网址", file.url],
    [lang === "en" ? "Description" : "详细信息", file.description],
    [lang === "en" ? "Source" : "来源", file.source],
    [lang === "en" ? "Research field" : "研究领域", file.researchField],
    [lang === "en" ? "Uploaded by" : "上传者", file.uploader],
    [lang === "en" ? "Upload date" : "上传日期", file.uploaded],
  ] : [
    [lang === "en" ? "Category" : "分类", file.category],
    ...(isExternalProtocol ? [[lang === "en" ? "Source" : "来源", file.source]] : []),
    [lang === "en" ? "File size" : "文件大小", file.size],
    [lang === "en" ? "Uploaded by" : "上传者", file.uploader],
    [lang === "en" ? "Upload date" : "上传日期", file.uploaded],
  ];
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 660 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{
              width: 36, height: 36, background: "var(--bg-3)", borderRadius: 3,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: "var(--mono)", fontSize: 10, fontWeight: 600, color: "var(--ink-2)",
            }}>{file.type}</span>
            <div>
              <h3 style={{ fontSize: 18 }}>{file.name}</h3>
              <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--ink-3)", fontFamily: "var(--mono)" }}>{file.category}</p>
            </div>
          </div>
          <button className="btn btn-text" onClick={onClose}><Icon.close /></button>
        </div>
        <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {rows.map(([label, val]) => val ? (
            <div key={label} style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: 12, alignItems: "start" }}>
              <span className="eyebrow" style={{ paddingTop: 2 }}>{label}</span>
              <span style={{ fontSize: 14, color: "var(--ink)", lineHeight: 1.55 }}>{val}</span>
            </div>
          ) : null)}
          <div style={{ marginTop: 8, paddingTop: 20, borderTop: "1px solid var(--line)" }}>
            <DiscussionSection resourceId={file.id} />
          </div>
        </div>
        <div className="modal-footer" style={{ justifyContent: "space-between" }}>
          {canEdit && (
            <button className="btn btn-ghost btn-sm" onClick={onEdit}>
              <Icon.edit /> {lang === "en" ? "Edit details" : "编辑信息"}
            </button>
          )}
          <button className="btn btn-primary btn-sm" onClick={onDownload}>
            {isDatabase ? <Icon.external /> : <Icon.download />}
            {isDatabase ? (lang === "en" ? "Open database" : "打开数据库") : (lang === "en" ? "Download" : "下载")}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Unified resource edit modal ── */
function ResourceEditModal({ file, onSave, onClose, lang }) {
  const [form, setForm] = useState({ ...file });
  const [saving, setSaving] = useState(false);
  const isLit = form.category === "Literature PPT";
  const isExternalProtocol = form.category === RESOURCE_CATEGORIES.externalProtocols;
  const isDatabase = isDatabaseResource(form);
  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }
  async function handleSave() { setSaving(true); await onSave(form); setSaving(false); }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{lang === "en" ? "Edit file details" : "编辑文件信息"}</h3>
          <button className="btn btn-text" onClick={onClose}><Icon.close /></button>
        </div>
        <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label className="label">{lang === "en" ? "Display name" : "显示名称"}</label>
            <input className="input" value={form.name} onChange={e => set("name", e.target.value)} />
          </div>
          {isLit && (<>
            <div>
              <label className="label">{lang === "en" ? "Paper title" : "文献标题"}</label>
              <textarea className="textarea" value={form.paperTitle || ""} onChange={e => set("paperTitle", e.target.value)} style={{ minHeight: 72 }} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label className="label">{lang === "en" ? "Presenter" : "汇报人"}</label>
                <input className="input" value={form.presenter || ""} onChange={e => set("presenter", e.target.value)} />
              </div>
              <div>
                <label className="label">{lang === "en" ? "Presentation date" : "汇报日期"}</label>
                <input className="input" type="date" value={form.presentationDate || ""} onChange={e => set("presentationDate", e.target.value)} />
              </div>
            </div>
            <div>
              <label className="label">{lang === "en" ? "Research field" : "研究领域"}</label>
              <input className="input" value={form.researchField || ""} onChange={e => set("researchField", e.target.value)}
                placeholder={lang === "en" ? "e.g. Prostate cancer, RNA biology…" : "例如：前列腺癌、RNA 生物学…"} />
            </div>
          </>)}
          {isExternalProtocol && (
            <div>
              <label className="label">{lang === "en" ? "Source" : "来源"}</label>
              <input className="input" value={form.source || ""} onChange={e => set("source", e.target.value)}
                placeholder={lang === "en" ? "e.g. CST #9102, Abcam, PMID:12345678…" : "例如：CST #9102、Abcam、PMID:12345678…"} />
            </div>
          )}
          {isDatabase && (<>
            <div>
              <label className="label">{lang === "en" ? "Database URL" : "数据库网址"}</label>
              <input className="input" value={form.url || ""} onChange={e => set("url", e.target.value)}
                placeholder="https://example.org/database" />
            </div>
            <div>
              <label className="label">{lang === "en" ? "Description" : "详细信息"}</label>
              <textarea className="textarea" value={form.description || ""} onChange={e => set("description", e.target.value)} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label className="label">{lang === "en" ? "Source" : "来源"}</label>
                <input className="input" value={form.source || ""} onChange={e => set("source", e.target.value)} />
              </div>
              <div>
                <label className="label">{lang === "en" ? "Research field" : "研究领域"}</label>
                <input className="input" value={form.researchField || ""} onChange={e => set("researchField", e.target.value)} />
              </div>
            </div>
          </>)}
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


// ── Discussion / Comment System ────────────────────────────────────────────────

const COMMENTS_KEY = "yuanlab.comments";

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function fmtTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const diff = now - d;
  if (diff < 0) return "just now";
  if (diff < 60000) return Math.floor(diff / 1000) + "s ago";
  if (diff < 3600000) return Math.floor(diff / 60000) + "m ago";
  if (diff < 86400000) return Math.floor(diff / 3600000) + "h ago";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function loadCommentStore() {
  try { return JSON.parse(localStorage.getItem(COMMENTS_KEY) || "{}"); } catch (e) { return {}; }
}
function saveCommentStore(data) {
  try { localStorage.setItem(COMMENTS_KEY, JSON.stringify(data)); } catch (e) {}
}

function getResourceComments(resourceId) {
  const store = loadCommentStore();
  return store[resourceId] || [];
}

function putComment(resourceId, comment) {
  const store = loadCommentStore();
  if (!store[resourceId]) store[resourceId] = [];
  const idx = store[resourceId].findIndex(c => c.id === comment.id);
  if (idx >= 0) store[resourceId][idx] = comment;
  else store[resourceId].push(comment);
  saveCommentStore(store);
}

async function syncCommentToSupabase(comment) {
  try {
    await window.SUPABASE.insert("resource_comments", {
      id: comment.id, resource_id: comment.resourceId,
      parent_id: comment.parentId, author: comment.author,
      author_username: comment.authorUsername, content: comment.content,
      likes: comment.likes, liked_by: comment.likedBy,
      created_at: comment.createdAt,
    });
  } catch (e) {}
}

async function syncLikeToSupabase(comment) {
  try {
    await window.SUPABASE.update("resource_comments", comment.id, {
      likes: comment.likes, liked_by: comment.likedBy,
    });
  } catch (e) {}
}

async function loadSupabaseComments(resourceId) {
  try {
    const records = await window.SUPABASE.query("resource_comments", {
      filter: `resource_id=eq.${resourceId}`, order: "created_at.asc"
    });
    if (!records || records.length === 0) return null;
    return records.map(r => ({
      id: r.id, resourceId: r.resource_id, parentId: r.parent_id,
      author: r.author, authorUsername: r.author_username,
      content: r.content, likes: r.likes || 0,
      likedBy: r.liked_by || [], createdAt: r.created_at,
    }));
  } catch (e) { return null; }
}

function DiscussionSection({ resourceId }) {
  const { user, lang, addToast } = useApp();
  const [comments, setComments] = useState(() => getResourceComments(resourceId));
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState(null);
  const [replyText, setReplyText] = useState("");

  // Best-effort merge from Supabase on mount
  useEffect(() => {
    loadSupabaseComments(resourceId).then(db => {
      if (!db || db.length === 0) return;
      const local = getResourceComments(resourceId);
      const seen = new Set(local.map(c => c.id));
      const merged = [...local];
      for (const c of db) {
        if (!seen.has(c.id)) { merged.push(c); seen.add(c.id); }
      }
      merged.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      setComments(merged);
      const store = loadCommentStore();
      store[resourceId] = merged;
      saveCommentStore(store);
    }).catch(() => {});
  }, [resourceId]);

  function postComment() {
    if (!text.trim()) return;
    const c = { id: genId(), resourceId, parentId: null,
      author: user.name, authorUsername: user.username,
      content: text.trim(), likes: 0, likedBy: [], createdAt: new Date().toISOString() };
    putComment(resourceId, c);
    setComments(getResourceComments(resourceId));
    setText("");
    syncCommentToSupabase(c);
    addToast(lang === "en" ? "Comment posted" : "评论已发布");
  }

  function postReply(parentId) {
    if (!replyText.trim()) return;
    const c = { id: genId(), resourceId, parentId,
      author: user.name, authorUsername: user.username,
      content: replyText.trim(), likes: 0, likedBy: [], createdAt: new Date().toISOString() };
    putComment(resourceId, c);
    setComments(getResourceComments(resourceId));
    setReplyText(""); setReplyTo(null);
    syncCommentToSupabase(c);
  }

  function toggleLike(commentId) {
    const store = loadCommentStore();
    const list = store[resourceId] || [];
    const idx = list.findIndex(c => c.id === commentId);
    if (idx < 0) return;
    const c = list[idx];
    const already = c.likedBy.includes(user.username);
    c.likes = already ? c.likes - 1 : c.likes + 1;
    c.likedBy = already ? c.likedBy.filter(u => u !== user.username) : [...c.likedBy, user.username];
    saveCommentStore(store);
    setComments([...list]);
    syncLikeToSupabase(c);
  }

  function deleteComment(commentId) {
    if (!window.confirm(lang === "en" ? "Delete this comment?" : "确认删除此评论？")) return;
    // Remove the comment and all its replies from store
    const store = loadCommentStore();
    const list = store[resourceId] || [];
    const idsToRemove = new Set([commentId]);
    list.forEach(c => { if (c.parentId === commentId) idsToRemove.add(c.id); });
    const filtered = list.filter(c => !idsToRemove.has(c.id));
    store[resourceId] = filtered;
    saveCommentStore(store);
    setComments(filtered);
    // Best-effort Supabase delete
    idsToRemove.forEach(id => {
      try { window.SUPABASE.remove("resource_comments", id).catch(() => {}); } catch (e) {}
    });
  }

  const topLevel = comments.filter(c => !c.parentId);

  return (
    <div>
      <div className="eyebrow" style={{ marginBottom: 12 }}>
        {lang === "en" ? "Discussion" : "讨论区"} {topLevel.length > 0 ? `(${topLevel.length})` : ""}
      </div>

      {user.role !== "guest" ? (
        <div style={{ marginBottom: 20 }}>
          <textarea className="textarea" value={text} onChange={e => setText(e.target.value)}
            placeholder={lang === "en" ? "Share your thoughts..." : "分享你的想法..."}
            style={{ minHeight: 56, fontSize: 13.5 }} />
          <div style={{ textAlign: "right", marginTop: 8 }}>
            <button className="btn btn-primary btn-sm" onClick={postComment} disabled={!text.trim()}>
              {lang === "en" ? "Post comment" : "发布评论"}
            </button>
          </div>
        </div>
      ) : (
        <p style={{ fontSize: 13, color: "var(--ink-3)", fontStyle: "italic", marginBottom: 16 }}>
          {lang === "en" ? "Sign in to join the discussion." : "登录后可参与讨论。"}
        </p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {topLevel.length === 0 && (
          <p style={{ fontSize: 13.5, color: "var(--ink-3)", textAlign: "center", padding: 20 }}>
            {lang === "en" ? "No comments yet. Be the first to share!" : "暂无评论，快来第一个发言吧！"}
          </p>
        )}
        {topLevel.map(c => (
          <CommentCard
            key={c.id} comment={c}
            replies={comments.filter(r => r.parentId === c.id)}
            replyTo={replyTo} replyText={replyText}
            setReplyTo={setReplyTo} setReplyText={setReplyText}
            onReply={postReply} onLike={toggleLike} onDelete={deleteComment} user={user} lang={lang}
          />
        ))}
      </div>
    </div>
  );
}

function CommentCard({ comment, replies, replyTo, replyText, setReplyTo, setReplyText, onReply, onLike, onDelete, user, lang }) {
  const isReplying = replyTo === comment.id;
  const liked = user?.username && comment.likedBy?.includes(user.username);

  return (
    <div style={{ padding: 12, background: "var(--bg)", borderRadius: "var(--radius)", border: "1px solid var(--line)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <span style={{
          width: 24, height: 24, borderRadius: 100, flexShrink: 0,
          background: "var(--accent-soft)", color: "var(--accent-2)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 10, fontWeight: 600,
        }}>{(comment.author || "?").split(" ").map(s => s[0]).slice(0, 2).join("")}</span>
        <span style={{ fontSize: 13, fontWeight: 500 }}>{comment.author}</span>
        <span style={{ fontSize: 11, color: "var(--ink-3)", fontFamily: "var(--mono)" }}>{fmtTime(comment.createdAt)}</span>
      </div>
      <p style={{ fontSize: 13.5, color: "var(--ink)", margin: "0 0 8px", lineHeight: 1.5, wordBreak: "break-word" }}>
        {comment.content}
      </p>
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <button className="btn btn-text btn-sm" onClick={() => onLike(comment.id)}
          style={{ color: liked ? "var(--brick)" : "var(--ink-3)", fontSize: 12, padding: "2px 0" }}>
          <span style={{ marginRight: 3 }}>{liked ? "♡" : "♡"}</span> {comment.likes || 0}
        </button>
        {user.role !== "guest" && (
          <button className="btn btn-text btn-sm" onClick={() => setReplyTo(isReplying ? null : comment.id)}
            style={{ fontSize: 12, padding: "2px 0", color: "var(--ink-3)" }}>
            {lang === "en" ? "Reply" : "回复"}
          </button>
        )}
        {user.role === "admin" && (
          <button className="btn btn-text btn-sm" onClick={() => onDelete(comment.id)}
            style={{ fontSize: 12, padding: "2px 0", color: "var(--danger)", marginLeft: "auto" }}>
            <Icon.trash />
          </button>
        )}
      </div>

      {isReplying && (
        <div style={{ marginTop: 10 }}>
          <textarea className="textarea" value={replyText} onChange={e => setReplyText(e.target.value)}
            placeholder={lang === "en" ? "Write a reply..." : "写下回复..."}
            style={{ minHeight: 48, fontSize: 13 }} />
          <div style={{ marginTop: 6, display: "flex", gap: 6, justifyContent: "flex-end" }}>
            <button className="btn btn-ghost btn-sm" onClick={() => { setReplyTo(null); setReplyText(""); }}>
              {lang === "en" ? "Cancel" : "取消"}
            </button>
            <button className="btn btn-primary btn-sm" onClick={() => onReply(comment.id)} disabled={!replyText.trim()}>
              {lang === "en" ? "Reply" : "回复"}
            </button>
          </div>
        </div>
      )}

      {replies.length > 0 && (
        <div style={{ marginTop: 10, paddingLeft: 24, borderLeft: "2px solid var(--line)", display: "flex", flexDirection: "column", gap: 10 }}>
          {replies.map(r => (
            <div key={r.id} style={{ padding: 10, background: "var(--bg-2)", borderRadius: "var(--radius)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                <span style={{
                  width: 20, height: 20, borderRadius: 100, flexShrink: 0,
                  background: "var(--accent-soft)", color: "var(--accent-2)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 8, fontWeight: 600,
                }}>{(r.author || "?").split(" ").map(s => s[0]).slice(0, 2).join("")}</span>
                <span style={{ fontSize: 12, fontWeight: 500 }}>{r.author}</span>
                <span style={{ fontSize: 10, color: "var(--ink-3)", fontFamily: "var(--mono)" }}>{fmtTime(r.createdAt)}</span>
              </div>
              <p style={{ fontSize: 13, color: "var(--ink)", margin: "0 0 4px", lineHeight: 1.45, wordBreak: "break-word" }}>
                {r.content}
              </p>
              <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <button className="btn btn-text btn-sm" onClick={() => onLike(r.id)}
                  style={{ color: r.likedBy?.includes(user?.username) ? "var(--brick)" : "var(--ink-3)", fontSize: 11, padding: "1px 0" }}>
                  <span style={{ marginRight: 2 }}>{r.likedBy?.includes(user?.username) ? "♡" : "♡"}</span> {r.likes || 0}
                </button>
                {user.role === "admin" && (
                  <button className="btn btn-text btn-sm" onClick={() => onDelete(r.id)}
                    style={{ fontSize: 10, padding: "1px 0", color: "var(--danger)" }}>
                    <Icon.trash />
                  </button>
                )}
              </span>
            </div>
          ))}
        </div>
      )}
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
    ["calendar", lang === "en" ? "Calendar" : "日程"],
    ["pages", lang === "en" ? "Pages" : "页面"],
    ["join", lang === "en" ? "Join Us" : "招生"],
    ["messages", lang === "en" ? "Messages" : "留言"],
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
          {tab === "calendar" && <AdminCalendar />}
          {tab === "pages" && <AdminPages />}
          {tab === "join" && <AdminJoinUs />}
          {tab === "messages" && <AdminMessages />}
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
      try { localStorage.setItem("yuanlab.publications", JSON.stringify(D.publications)); } catch (e) {}
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
    try { localStorage.setItem("yuanlab.publications", JSON.stringify(D.publications)); } catch (e) {}
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
  function sortMembers(list) {
    function degreeRank(m) {
      const role = `${m.role || ""} ${m.roleCn || ""}`.toLowerCase();
      if (role.includes("phd") || role.includes("博士")) return 0;
      if (role.includes("master") || role.includes("硕士")) return 1;
      return 2;
    }
    function joinedYear(m) {
      const year = parseInt(String(m.year || m.role || m.roleCn || "").match(/\d{4}/)?.[0] || "", 10);
      return Number.isFinite(year) ? year : 9999;
    }
    return [...list].sort((a, b) =>
      degreeRank(a) - degreeRank(b) ||
      joinedYear(a) - joinedYear(b) ||
      String(a.name || "").localeCompare(String(b.name || ""))
    );
  }

  const [members, setMembers] = useState(sortMembers(D.members));
  const [alumni, setAlumni] = useState([...(D.alumni || [])]);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  function refresh() {
    setMembers(sortMembers(D.members));
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
      photo_url: m.photo_url || "",
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
              D.members.push({ ...m, photo_url: m.photo_url || "", active: true, year: yearInt ? yearInt + "–" : "" });
            }
          } else if (fromMembers >= 0) {
            D.members[fromMembers] = { ...m, photo_url: m.photo_url || "", active: true };
          }
        }
      } else {
        const result = await window.SUPABASE.insert("members", payload);
        const newId = Array.isArray(result) && result[0] ? result[0].id : ("m" + Date.now());
        const newMember = { ...m, id: newId, photo_url: m.photo_url || "", year: yearInt ? yearInt + "–" : "", active: !isAlumni };
        if (isAlumni) {
          if (!D.alumni) D.alumni = [];
          D.alumni.push({ id: newId, name: m.name, nameCn: m.nameCn, role: m.role, next: "", active: false });
        } else {
          D.members.push(newMember);
        }
      }
      refresh();
      try { localStorage.setItem("yuanlab.members", JSON.stringify(D.members)); } catch (e) {}
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
    try { localStorage.setItem("yuanlab.members", JSON.stringify(D.members)); } catch (e) {}
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
  const { lang, addToast } = useApp();
  const yearNum = parseInt(String(member.year).replace(/[^0-9]/g, "")) || new Date().getFullYear();
  const [m, setM] = useState({ ...member, year: yearNum });
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const photoInputRef = useRef(null);

  async function uploadPhoto(file) {
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const safeName = file.name.replace(/\s+/g, "_");
      const path = `members/${m.id || "new"}_${Date.now()}_${safeName}`;
      const dataUrl = await resizeImageToDataUrl(file, 400);
      let photoUrl = dataUrl;
      try {
        photoUrl = await window.SUPABASE.uploadFile("lab-images", path, file);
      } catch (e) {
        console.warn("[EditMemberModal] Storage upload failed, using local data URL:", e.message);
      }
      setM(prev => ({ ...prev, photo_url: photoUrl }));
      addToast(lang === "en" ? "Photo uploaded" : "照片已上传");
    } catch (e) {
      addToast(lang === "en" ? "Photo upload failed" : "照片上传失败");
    } finally {
      setUploadingPhoto(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 640 }}>
        <div className="modal-header">
          <h3>{member.id ? (lang === "en" ? "Edit member" : "编辑成员") : (lang === "en" ? "New member" : "新增成员")}</h3>
          <button className="btn btn-text" onClick={onClose}><Icon.close /></button>
        </div>
        <div className="modal-body">
          <div style={{ display: "grid", gridTemplateColumns: "96px 1fr", gap: 16, alignItems: "center", marginBottom: 16 }}>
            <div>
              {m.photo_url ? (
                <img src={m.photo_url} alt={m.name || "Member"}
                  style={{ width: 80, height: 80, borderRadius: "50%", objectFit: "cover", border: "1px solid var(--line)" }} />
              ) : (
                <div className="placeholder" style={{ width: 80, height: 80, borderRadius: "50%", fontFamily: "var(--serif)", fontSize: 22, padding: 0 }}>
                  {(m.name || "?").split(" ").map(s => s[0]).slice(0, 2).join("")}
                </div>
              )}
            </div>
            <div>
              <label className="label">{lang === "en" ? "Member photo" : "成员照片"}</label>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input ref={photoInputRef} type="file" accept="image/*" style={{ display: "none" }}
                  onChange={e => uploadPhoto(e.target.files && e.target.files[0])} />
                <button className="btn btn-ghost btn-sm" type="button" disabled={uploadingPhoto}
                  onClick={() => photoInputRef.current && photoInputRef.current.click()}>
                  <Icon.upload /> {uploadingPhoto ? (lang === "en" ? "Uploading" : "上传中") : (lang === "en" ? "Upload photo" : "上传照片")}
                </button>
                {m.photo_url && (
                  <button className="btn btn-text btn-sm" type="button" onClick={() => setM({ ...m, photo_url: "" })}>
                    {lang === "en" ? "Remove" : "移除"}
                  </button>
                )}
              </div>
            </div>
          </div>
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
  const { lang, user, addToast, dbReady } = useApp();
  const D = window.LAB_DATA;
  const [files, setFiles] = useState(D.resources.map(f => ({ ...f, category: normalizeResourceCategory(f.category) })));
  const [showUpload, setShowUpload] = useState(false);

  // Re-sync when DB data loads
  useEffect(() => {
    setFiles(D.resources.map(f => ({ ...f, category: normalizeResourceCategory(f.category) })));
  }, [dbReady]);

  async function remove(id) {
    if (!window.confirm(lang === "en" ? "Delete this file record?" : "确认删除此文件记录？")) return;
    const i = D.resources.findIndex(f => f.id === id);
    if (i >= 0) D.resources.splice(i, 1);
    setFiles([...D.resources]);
    try { localStorage.setItem("yuanlab.resources", JSON.stringify(D.resources)); } catch (e) {}
    if (isUUID(id)) {
      try { await window.SUPABASE.remove("resources", id); } catch (e) {}
    }
    addToast(lang === "en" ? "Deleted" : "已删除");
  }

  async function upload(fileData, rawFile) {
    let fileUrl = "";
    let size = "";

    if (rawFile && fileData.category !== RESOURCE_CATEGORIES.databases) {
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

    if (fileData.category === RESOURCE_CATEGORIES.databases && fileData.databaseUrl) {
      fileUrl = fileData.databaseUrl;
    }

    // Use correct DB field names: title, file_url, file_type
    const dbPayload = {
      title: fileData.name,
      category: fileData.category,
      file_type: fileData.type,
      file_url: fileUrl,
      is_public: false,
      description: fileData.description || "",
      uploader: user.name,
      source: fileData.source || "",
      research_field: fileData.researchField || "",
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
      source: fileData.source || "",
      researchField: fileData.researchField || "",
      description: fileData.description || "",
    };
    D.resources.unshift(newFile);
    setFiles([...D.resources]);
    try { localStorage.setItem("yuanlab.resources", JSON.stringify(D.resources)); } catch (e) {}
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
  const [category, setCategory] = useState(defaultCat || RESOURCE_CATEGORIES.internalProtocols);
  const [type, setType] = useState("PDF");
  const [drag, setDrag] = useState(false);
  const [rawFile, setRawFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [presenter, setPresenter] = useState("");
  const [paperTitle, setPaperTitle] = useState("");
  const [researchField, setResearchField] = useState("");
  const [presentationDate, setPresentationDate] = useState("");
  const [source, setSource] = useState("");
  const [databaseUrl, setDatabaseUrl] = useState("");
  const [description, setDescription] = useState("");
  const fileInputRef = React.useRef(null);
  const isLitPPT = category === "Literature PPT";
  const isExternalProtocol = category === RESOURCE_CATEGORIES.externalProtocols;
  const isDatabase = category === RESOURCE_CATEGORIES.databases;

  useEffect(() => {
    if (!isDatabase) return;
    if (type !== "LINK") setType("LINK");
    if (rawFile) setRawFile(null);
  }, [isDatabase, type, rawFile]);

  function handleFile(f) {
    if (!f) return;
    setRawFile(f);
    setName(f.name.replace(/\.[^.]+$/, ""));
    setType((f.name.split(".").pop() || "BIN").toUpperCase().slice(0, 8));
  }

  async function doUpload() {
    if (!name) return;
    setUploading(true);
    await onUpload({ name, category, type, presenter, paperTitle, researchField, presentationDate, source, databaseUrl, description }, rawFile);
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
            onDrop={e => { e.preventDefault(); setDrag(false); if (!isDatabase) handleFile(e.dataTransfer.files[0]); }}
            onClick={() => !isDatabase && fileInputRef.current && fileInputRef.current.click()}
            style={{
              padding: 32, border: `1.5px dashed ${drag ? "var(--accent)" : "var(--line-2)"}`,
              borderRadius: 6, textAlign: "center",
              background: rawFile ? "var(--accent-soft)" : drag ? "var(--accent-soft)" : "var(--bg-2)",
              marginBottom: 20, transition: "all 0.15s", cursor: isDatabase ? "default" : "pointer",
            }}>
            <Icon.upload />
            {rawFile ? (
              <p style={{ marginTop: 12, marginBottom: 4, fontSize: 14, color: "var(--accent)", fontWeight: 500 }}>
                ✓ {rawFile.name}
              </p>
            ) : (
              <>
                <p style={{ marginTop: 12, marginBottom: 4, fontSize: 14 }}>
                  {isDatabase
                    ? (lang === "en" ? "Use the database URL field below" : "请在下方填写数据库网址")
                    : (lang === "en" ? "Drop file here or click to browse" : "拖拽文件至此处，或点击选择文件")}
                </p>
                <p style={{ fontSize: 11.5, color: "var(--ink-3)", margin: 0, fontFamily: "var(--mono)" }}>
                  {isDatabase ? "URL · required" : "PDF · DOCX · PPTX · XLSX · ZIP · max 50 MB"}
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
                {RESOURCE_CATEGORY_OPTIONS.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="label">{lang === "en" ? "Type" : "类型"}</label>
              <select className="select" value={type} onChange={e => setType(e.target.value)}>
                <option>PDF</option><option>DOCX</option><option>PPTX</option><option>XLSX</option><option>ZIP</option><option>LINK</option>
              </select>
            </div>
          </div>

          {/* External Protocols source field */}
          {isExternalProtocol && (
            <div style={{ marginTop: 16, padding: 16, background: "var(--bg-2)", borderRadius: 6, border: "1px solid var(--line)" }}>
              <div className="eyebrow" style={{ marginBottom: 8 }}>{lang === "en" ? "External details" : "外部方案信息"}</div>
              <label className="label">{lang === "en" ? "Source" : "来源"}</label>
              <input className="input" value={source} onChange={e => setSource(e.target.value)}
                placeholder={lang === "en" ? "e.g. CST #9102, Abcam ab12345, PMID:12345678, Nature Protocols 2023…" : "例如：CST #9102、Abcam ab12345、PMID:12345678…"} />
            </div>
          )}

          {isDatabase && (
            <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 12, padding: 16, background: "var(--bg-2)", borderRadius: 6, border: "1px solid var(--line)" }}>
              <div className="eyebrow" style={{ marginBottom: 4 }}>{lang === "en" ? "Database details" : "数据库信息"}</div>
              <div>
                <label className="label">{lang === "en" ? "Database URL" : "数据库网址"}</label>
                <input className="input" value={databaseUrl} onChange={e => setDatabaseUrl(e.target.value)}
                  placeholder="https://example.org/database" />
              </div>
              <div>
                <label className="label">{lang === "en" ? "Description" : "详细信息"}</label>
                <textarea className="textarea" value={description} onChange={e => setDescription(e.target.value)}
                  style={{ minHeight: 64 }} placeholder={lang === "en" ? "Scope, access notes, version, or useful context" : "收录范围、访问说明、版本或备注"} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label className="label">{lang === "en" ? "Source" : "来源"}</label>
                  <input className="input" value={source} onChange={e => setSource(e.target.value)} />
                </div>
                <div>
                  <label className="label">{lang === "en" ? "Research field" : "研究领域"}</label>
                  <input className="input" value={researchField} onChange={e => setResearchField(e.target.value)} />
                </div>
              </div>
            </div>
          )}

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
          <button className="btn btn-primary btn-sm" disabled={!name || (isDatabase && !databaseUrl) || uploading} onClick={doUpload}>
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
      try { localStorage.setItem("yuanlab.news", JSON.stringify(D.news)); } catch (e) {}
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
      try { localStorage.setItem("yuanlab.news", JSON.stringify(D.news)); } catch (e) {}
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

// ── Calendar ──────────────────────────────────────────────────────────────────

const PRIORITY_OPTIONS = [
  [1, "High", "高"],
  [2, "Medium", "中"],
  [3, "Low", "低"],
];
const REPEAT_OPTIONS = [
  ["none", "None", "不重复"],
  ["daily", "Daily", "每天"],
  ["weekly", "Weekly", "每周"],
  ["biweekly", "Every 2 weeks", "每两周"],
  ["monthly", "Monthly", "每月"],
];

function AdminCalendar() {
  const { lang, addToast } = useApp();
  const D = window.LAB_DATA;
  const [events, setEvents] = useState([...D.events]);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  function genId() { return "e" + Date.now().toString(36); }

  function persist(list) {
    D.events = list;
    setEvents([...list]);
    try { localStorage.setItem("yuanlab.events", JSON.stringify(list)); } catch (e) {}
  }

  async function save(data) {
    setSaving(true);
    const list = [...events];
    if (data.id && list.find(e => e.id === data.id)) {
      const idx = list.findIndex(e => e.id === data.id);
      list[idx] = data;
    } else {
      list.push({ ...data, id: data.id || genId() });
    }
    // Sort by date then time
    list.sort((a, b) => a.date.localeCompare(b.date) || (a.startTime || "").localeCompare(b.startTime || ""));
    persist(list);
    try { await window.SUPABASE.insert("events", data).catch(() => {}); } catch (e) {}
    addToast(lang === "en" ? "Saved" : "已保存");
    setEditing(null);
    setSaving(false);
  }

  function remove(id) {
    if (!window.confirm(lang === "en" ? "Delete this event?" : "确认删除此日程？")) return;
    const list = events.filter(e => e.id !== id);
    persist(list);
    try { window.SUPABASE.remove("events", id).catch(() => {}); } catch (e) {}
    addToast(lang === "en" ? "Deleted" : "已删除");
  }

  function priorityBadge(p) {
    const opt = PRIORITY_OPTIONS.find(o => o[0] === p);
    if (!opt) return null;
    const label = lang === "en" ? opt[1] : opt[2];
    const color = p === 1 ? "var(--brick)" : p === 2 ? "var(--accent)" : "var(--ink-3)";
    return <span className="chip" style={{ background: color + "18", color, border: "none" }}>{label}</span>;
  }

  return (
    <div>
      <SectionHeader eyebrow="Calendar" title={lang === "en" ? "Manage events" : "管理日程"} action={
        <button className="btn btn-primary btn-sm" onClick={() => setEditing({ title: "", date: "", startTime: "", endTime: "", location: "", people: "", priority: 2, description: "", repeat: "none" })}>
          <Icon.plus /> {lang === "en" ? "Add event" : "添加日程"}
        </button>
      } />
      {events.length === 0 ? (
        <div style={{ padding: 48, textAlign: "center", color: "var(--ink-3)", border: "1px dashed var(--line-2)", borderRadius: 4 }}>
          {lang === "en" ? "No events yet." : "暂无日程。"}
        </div>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>{lang === "en" ? "Date" : "日期"}</th>
              <th>{lang === "en" ? "Time" : "时间"}</th>
              <th style={{ width: 100 }}>{lang === "en" ? "Repeat" : "重复"}</th>
              <th>{lang === "en" ? "Title" : "标题"}</th>
              <th>{lang === "en" ? "Location" : "地点"}</th>
              <th>{lang === "en" ? "Priority" : "优先级"}</th>
              <th style={{ width: 80 }}></th>
            </tr>
          </thead>
          <tbody>
            {events.map(e => (
              <tr key={e.id}>
                <td style={{ fontFamily: "var(--mono)", fontSize: 12.5, color: "var(--ink-2)" }}>{e.date}</td>
                <td style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--ink-3)" }}>{e.startTime || "—"}</td>
                <td style={{ fontSize: 12, color: "var(--ink-3)", fontFamily: "var(--mono)" }}>{e.repeat && e.repeat !== "none" ? REPEAT_OPTIONS.find(([v]) => v === e.repeat)?.[lang === "en" ? 1 : 2] : "—"}</td>
                <td style={{ fontWeight: 500, fontSize: 13.5 }}>{e.title}</td>
                <td style={{ fontSize: 12.5, color: "var(--ink-2)" }}>{e.location || "—"}</td>
                <td>{priorityBadge(e.priority)}</td>
                <td style={{ textAlign: "right" }}>
                  <button className="btn btn-text btn-sm" onClick={() => setEditing({ ...e })}><Icon.edit /></button>
                  <button className="btn btn-text btn-sm" onClick={() => remove(e.id)} style={{ color: "var(--danger)" }}><Icon.trash /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {editing && (
        <EventFormModal data={editing} onSave={save} onClose={() => setEditing(null)} saving={saving} />
      )}
    </div>
  );
}

function EventFormModal({ data, onSave, onClose, saving }) {
  const { lang } = useApp();
  const [form, setForm] = useState(data);
  const isNew = !data.id;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{isNew ? (lang === "en" ? "New event" : "新增日程") : (lang === "en" ? "Edit event" : "编辑日程")}</h3>
          <button className="btn btn-text" onClick={onClose}><Icon.close /></button>
        </div>
        <div className="modal-body">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label className="label">{lang === "en" ? "Date *" : "日期 *"}</label>
              <input className="input" type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
            </div>
            <div>
              <label className="label">{lang === "en" ? "Priority" : "优先级"}</label>
              <select className="select" value={form.priority} onChange={e => setForm({ ...form, priority: Number(e.target.value) })}>
                {PRIORITY_OPTIONS.map(([v, en, cn]) => <option key={v} value={v}>{lang === "en" ? en : cn}</option>)}
              </select>
            </div>
          </div>
          <div style={{ height: 12 }} />
          <label className="label">{lang === "en" ? "Title *" : "标题 *"}</label>
          <input className="input" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Lab meeting" />
          <div style={{ height: 12 }} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label className="label">{lang === "en" ? "Start time" : "开始时间"}</label>
              <input className="input" type="time" value={form.startTime || ""} onChange={e => setForm({ ...form, startTime: e.target.value })} />
            </div>
            <div>
              <label className="label">{lang === "en" ? "End time" : "结束时间"}</label>
              <input className="input" type="time" value={form.endTime || ""} onChange={e => setForm({ ...form, endTime: e.target.value })} />
            </div>
          </div>
          <div style={{ height: 12 }} />
          <label className="label">{lang === "en" ? "Repeat" : "重复"}</label>
          <select className="select" value={form.repeat || "none"} onChange={e => setForm({ ...form, repeat: e.target.value })}>
            {REPEAT_OPTIONS.map(([v, en, cn]) => <option key={v} value={v}>{lang === "en" ? en : cn}</option>)}
          </select>
          <div style={{ height: 12 }} />
          <label className="label">{lang === "en" ? "Location" : "地点"}</label>
          <input className="input" value={form.location || ""} onChange={e => setForm({ ...form, location: e.target.value })} placeholder="e.g. Room 401" />
          <div style={{ height: 12 }} />
          <label className="label">{lang === "en" ? "People" : "人员"}</label>
          <input className="input" value={form.people || ""} onChange={e => setForm({ ...form, people: e.target.value })} placeholder="e.g. All members" />
          <div style={{ height: 12 }} />
          <label className="label">{lang === "en" ? "Description" : "描述"}</label>
          <textarea className="textarea" value={form.description || ""} onChange={e => setForm({ ...form, description: e.target.value })} style={{ minHeight: 64 }} />
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost btn-sm" onClick={onClose}>{lang === "en" ? "Cancel" : "取消"}</button>
          <button className="btn btn-primary btn-sm" onClick={() => onSave(form)} disabled={saving || !form.title || !form.date}>
            {saving ? "…" : <><Icon.check /> {lang === "en" ? "Save" : "保存"}</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Pages ─────────────────────────────────────────────────────────────────────

function AdminPages() {
  const { lang, addToast } = useApp();
  const D = window.LAB_DATA;

  // Load persisted home content from localStorage
  useState(() => {
    try {
      const stored = localStorage.getItem("yuanlab.home");
      if (stored) { Object.assign(D.home || (D.home = {}), JSON.parse(stored)); }
    } catch (e) {}
  });

  const [heroEn, setHeroEn] = useState(D.home?.hero?.en || "");
  const [heroCn, setHeroCn] = useState(D.home?.hero?.cn || "");
  const [joinLeadEn, setJoinLeadEn] = useState(D.home?.joinLead?.en || "");
  const [joinLeadCn, setJoinLeadCn] = useState(D.home?.joinLead?.cn || "");
  const [missionEn, setMissionEn] = useState(D.lab.mission.en);
  const [missionCn, setMissionCn] = useState(D.lab.mission.cn);

  function save() {
    if (!D.home) D.home = {};
    D.home.hero = { en: heroEn, cn: heroCn };
    D.home.joinLead = { en: joinLeadEn, cn: joinLeadCn };
    D.lab.mission.en = missionEn;
    D.lab.mission.cn = missionCn;
    try { localStorage.setItem("yuanlab.home", JSON.stringify(D.home)); } catch (e) {}
    try { localStorage.setItem("yuanlab.mission", JSON.stringify(D.lab.mission)); } catch (e) {}
    addToast(lang === "en" ? "Saved" : "已保存");
  }

  return (
    <div>
      <SectionHeader eyebrow="Pages" title={lang === "en" ? "Edit page content" : "编辑页面内容"} action={
        <button className="btn btn-primary btn-sm" onClick={save}>
          <Icon.check /> {lang === "en" ? "Save all" : "全部保存"}
        </button>
      } />

      {/* Hero headline */}
      <div className="card" style={{ marginBottom: 24 }}>
        <h4 style={{ marginBottom: 16 }}>{lang === "en" ? "Home · Hero headline" : "首页 · 主标题"}</h4>
        <label className="label">English</label>
        <textarea className="textarea" value={heroEn} onChange={e => setHeroEn(e.target.value)} style={{ minHeight: 64 }} />
        <div style={{ height: 12 }} />
        <label className="label">中文</label>
        <textarea className="textarea" value={heroCn} onChange={e => setHeroCn(e.target.value)} style={{ minHeight: 64 }} />
      </div>

      {/* Lab mission */}
      <div className="card" style={{ marginBottom: 24 }}>
        <h4 style={{ marginBottom: 16 }}>{lang === "en" ? "Home · Lab mission" : "首页 · 课题组使命"}</h4>
        <label className="label">English</label>
        <textarea className="textarea" value={missionEn} onChange={e => setMissionEn(e.target.value)} />
        <div style={{ height: 12 }} />
        <label className="label">中文</label>
        <textarea className="textarea" value={missionCn} onChange={e => setMissionCn(e.target.value)} />
      </div>

      {/* Join Us lead */}
      <div className="card">
        <h4 style={{ marginBottom: 16 }}>{lang === "en" ? "Join Us · lead text" : "招生 · 引导文字"}</h4>
        <label className="label">English</label>
        <textarea className="textarea" value={joinLeadEn} onChange={e => setJoinLeadEn(e.target.value)} style={{ minHeight: 64 }} />
        <div style={{ height: 12 }} />
        <label className="label">中文</label>
        <textarea className="textarea" value={joinLeadCn} onChange={e => setJoinLeadCn(e.target.value)} style={{ minHeight: 64 }} />
      </div>
    </div>
  );
}

// ── Users ─────────────────────────────────────────────────────────────────────

function AdminUsers() {
  const { lang, addToast } = useApp();
  const D = window.LAB_DATA;
  const [users, setUsers] = useState(D.accounts.filter(a => a.role !== "guest"));
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  function persist(list) {
    D.accounts = list;
    setUsers(list.filter(a => a.role !== "guest"));
    try { localStorage.setItem("yuanlab.accounts", JSON.stringify(list)); } catch (e) {}
  }

  async function save(form) {
    setSaving(true);
    const list = [...D.accounts];
    if (form._remove) {
      const idx = list.findIndex(a => a.username === form.username);
      if (idx >= 0) list.splice(idx, 1);
      persist(list);
      try { await window.SUPABASE.remove("accounts", form.username); } catch (e) {}
      addToast(lang === "en" ? "User removed" : "用户已移除");
    } else {
      const payload = {
        username: form.username, password: form.password,
        role: form.role, name: form.name, name_cn: form.nameCn || "",
      };
      const idx = list.findIndex(a => a.username === form.username);
      if (idx >= 0) {
        list[idx] = { ...list[idx], ...form };
        try { await window.SUPABASE.update("accounts", form.username, payload); } catch (e) {}
      } else {
        list.push({ ...form });
        try { await window.SUPABASE.insert("accounts", payload); } catch (e) {}
      }
      persist(list);
      addToast(lang === "en" ? "User saved" : "用户已保存");
    }
    setEditing(null);
    setSaving(false);
  }

  return (
    <div>
      <SectionHeader eyebrow="Users" title={lang === "en" ? "User accounts" : "用户账号"} action={
        <button className="btn btn-primary btn-sm" onClick={() => setEditing({ username: "", password: "", name: "", nameCn: "", role: "member" })}>
          <Icon.plus /> {lang === "en" ? "Invite" : "邀请"}
        </button>
      } />
      {users.length === 0 ? (
        <div style={{ padding: 48, textAlign: "center", color: "var(--ink-3)", border: "1px dashed var(--line-2)", borderRadius: 4 }}>
          {lang === "en" ? "No users yet." : "暂无用户。"}
        </div>
      ) : (
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
                <button className="btn btn-text btn-sm" onClick={() => setEditing({ ...u })}><Icon.edit /></button>
                <button className="btn btn-text btn-sm" onClick={() => setEditing({ ...u, _remove: true })} style={{ color: "var(--danger)" }}><Icon.trash /></button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      )}

      {editing && (
        <UserFormModal
          data={editing}
          onSave={save}
          onClose={() => setEditing(null)}
          saving={saving}
        />
      )}
    </div>
  );
}

function UserFormModal({ data, onSave, onClose, saving }) {
  const { lang } = useApp();
  const isNew = !data._remove && !data.password && !data.username;
  const isDelete = !!data._remove;
  const [form, setForm] = useState({ ...data });
  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{isDelete ? (lang === "en" ? "Remove user" : "删除用户")
            : isNew ? (lang === "en" ? "Invite user" : "邀请用户")
            : (lang === "en" ? "Edit user" : "编辑用户")}</h3>
          <button className="btn btn-text" onClick={onClose}><Icon.close /></button>
        </div>
        {isDelete ? (
          <div className="modal-body">
            <p style={{ fontSize: 14, marginBottom: 16 }}>
              {lang === "en"
                ? "Are you sure you want to remove user "
                : "确认删除用户 "}<strong>{data.name || data.username}</strong>?
            </p>
          </div>
        ) : (
        <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label className="label">{lang === "en" ? "Username *" : "用户名 *"}</label>
              <input className="input" value={form.username}
                onChange={e => set("username", e.target.value)}
                disabled={!isNew}
                placeholder="e.g. zhangsan" />
            </div>
            <div>
              <label className="label">{lang === "en" ? "Password *" : "密码 *"}</label>
              <input className="input" type="password" value={form.password}
                onChange={e => set("password", e.target.value)}
                placeholder="•••••" />
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label className="label">{lang === "en" ? "Name" : "姓名（英）"}</label>
              <input className="input" value={form.name}
                onChange={e => set("name", e.target.value)}
                placeholder="e.g. San Zhang" />
            </div>
            <div>
              <label className="label">{lang === "en" ? "Name (CN)" : "中文姓名"}</label>
              <input className="input" value={form.nameCn || ""}
                onChange={e => set("nameCn", e.target.value)}
                placeholder="张三" />
            </div>
          </div>
          <div>
            <label className="label">{lang === "en" ? "Role" : "角色"}</label>
            <select className="select" value={form.role} onChange={e => set("role", e.target.value)}>
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        </div>
        )}
        <div className="modal-footer">
          <button className="btn btn-ghost btn-sm" onClick={onClose}>
            {lang === "en" ? "Cancel" : "取消"}
          </button>
          <button className={isDelete ? "btn btn-danger btn-sm" : "btn btn-primary btn-sm"}
            onClick={() => onSave(form)}
            disabled={saving || (isNew && (!form.username || !form.password))}>
            {saving ? "…" : isDelete
              ? (lang === "en" ? "Remove" : "删除")
              : <><Icon.check /> {lang === "en" ? "Save" : "保存"}</>}
          </button>
        </div>
      </div>
    </div>
  );
}
function AdminMessages() {
  const { lang, addToast } = useApp();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  function loadLocalMessages() {
    try { return JSON.parse(localStorage.getItem("yuanlab.messages") || "[]"); } catch (e) { return []; }
  }

  async function loadMessages() {
    setLoading(true);
    const local = loadLocalMessages();
    const all = [...local];
    try {
      const db = await window.SUPABASE.query("messages", { order: "created_at.desc", limit: 500 });
      if (db && db.length > 0) {
        const seen = new Set(local.map(m => m.id || m._localId));
        for (const m of db) {
          const id = m.id || "";
          if (!seen.has(id)) {
            all.push({
              id, name: m.name, email: m.email,
              subject: m.subject, body: m.body,
              createdAt: m.created_at,
            });
            seen.add(id);
          }
        }
      }
    } catch (e) {}
    all.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    setMessages(all);
    setLoading(false);
  }

  useEffect(() => { loadMessages(); }, []);

  async function removeMsg(id) {
    if (!window.confirm(lang === "en" ? "Delete this message?" : "确认删除此留言？")) return;
    const local = loadLocalMessages();
    const filtered = local.filter(m => (m.id || m._localId) !== id);
    try { localStorage.setItem("yuanlab.messages", JSON.stringify(filtered)); } catch (e) {}
    setMessages(prev => prev.filter(m => (m.id || m._localId) !== id));
    try { await window.SUPABASE.remove("messages", id); } catch (e) {}
  }

  return (
    <div>
      <SectionHeader eyebrow="Messages" title={lang === "en" ? "Contact form inbox" : "联系表单留言箱"} action={
        <button className="btn btn-ghost btn-sm" onClick={loadMessages} disabled={loading}>
          {loading ? (lang === "en" ? "Loading…" : "加载中…") : (lang === "en" ? "Refresh" : "刷新")}
        </button>
      } />
      {messages.length === 0 && !loading && (
        <div style={{ padding: 48, textAlign: "center", color: "var(--ink-3)", border: "1px dashed var(--line-2)", borderRadius: 4 }}>
          {lang === "en" ? "No messages yet." : "暂无留言。"}
        </div>
      )}
      {loading && messages.length === 0 && (
        <div style={{ padding: 48, textAlign: "center", color: "var(--ink-3)" }}>
          {lang === "en" ? "Loading messages…" : "加载留言中…"}
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column" }}>
        {messages.map((m, i) => (
          <div key={m.id || i} style={{ borderBottom: "1px solid var(--line)", padding: "16px 0" }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>{m.name}</span>
                  <a href={"mailto:" + m.email} style={{ fontSize: 12.5, color: "var(--accent)", fontFamily: "var(--mono)" }}>{m.email}</a>
                  {m.createdAt && (
                    <span style={{ fontSize: 11, color: "var(--ink-3)", fontFamily: "var(--mono)", marginLeft: "auto" }}>
                      {m.createdAt.slice(0, 10)}
                    </span>
                  )}
                </div>
                {m.subject && (
                  <div style={{ fontSize: 13, color: "var(--ink-2)", fontWeight: 500, marginBottom: 4 }}>
                    {m.subject}
                  </div>
                )}
              </div>
              <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                <button className="btn btn-text btn-sm" onClick={() => setExpanded(expanded === (m.id || i) ? null : (m.id || i))}>
                  {expanded === (m.id || i) ? (lang === "en" ? "Hide" : "收起") : (lang === "en" ? "View" : "查看")}
                </button>
                <button className="btn btn-text btn-sm" onClick={() => removeMsg(m.id)} style={{ color: "var(--danger)" }}>
                  <Icon.trash />
                </button>
              </div>
            </div>
            {expanded === (m.id || i) && (
              <div style={{ marginTop: 10, padding: 12, background: "var(--bg-2)", borderRadius: "var(--radius)", fontSize: 13.5, lineHeight: 1.55, whiteSpace: "pre-wrap" }}>
                {m.body || (lang === "en" ? "(No content)" : "（无内容）")}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, { ResourcesPage, AdminPage, AdminJoinUs, AdminMessages, AdminCalendar });

// ── Join Us positions ─────────────────────────────────────────────────────────

function AdminJoinUs() {
  const { lang, addToast } = useApp();
  const D = window.LAB_DATA;

  // Load persisted data
  useState(() => {
    try {
      const stored = localStorage.getItem("yuanlab.joinUs");
      if (stored) { Object.assign(D.joinUs, JSON.parse(stored)); }
    } catch (e) {}
  });

  const [itemsEn, setItemsEn] = useState([...D.joinUs.en]);
  const [itemsCn, setItemsCn] = useState([...D.joinUs.cn]);
  const [editing, setEditing] = useState(null); // { index, title, body, titleCn, bodyCn } | null
  const [saving, setSaving] = useState(false);

  function persist(data) {
    D.joinUs = data;
    try { localStorage.setItem("yuanlab.joinUs", JSON.stringify(data)); } catch (e) {}
  }

  function savePosition() {
    if (!editing || !editing.title) return;
    setSaving(true);
    const newEn = [...itemsEn];
    const newCn = [...itemsCn];
    const entry = { title: editing.title, body: editing.body };
    const entryCn = { title: editing.titleCn || editing.title, body: editing.bodyCn || editing.body };
    if (editing.index !== null && editing.index !== undefined) {
      newEn[editing.index] = entry;
      newCn[editing.index] = entryCn;
    } else {
      newEn.push(entry);
      newCn.push(entryCn);
    }
    const data = { en: newEn, cn: newCn };
    setItemsEn(newEn);
    setItemsCn(newCn);
    persist(data);
    addToast(lang === "en" ? "Saved" : "已保存");
    setEditing(null);
    setSaving(false);
  }

  function remove(index) {
    if (!window.confirm(lang === "en" ? "Delete this position?" : "确认删除此职位？")) return;
    const newEn = itemsEn.filter((_, i) => i !== index);
    const newCn = itemsCn.filter((_, i) => i !== index);
    setItemsEn(newEn);
    setItemsCn(newCn);
    persist({ en: newEn, cn: newCn });
    addToast(lang === "en" ? "Deleted" : "已删除");
  }

  return (
    <div>
      <SectionHeader eyebrow="Join Us" title={lang === "en" ? "Manage positions" : "管理招生信息"} action={
        <button className="btn btn-primary btn-sm" onClick={() => setEditing({ index: null, title: "", body: "", titleCn: "", bodyCn: "" })}>
          <Icon.plus /> {lang === "en" ? "Add position" : "添加职位"}
        </button>
      } />

      {itemsEn.length === 0 ? (
        <div style={{ padding: 48, textAlign: "center", color: "var(--ink-3)", border: "1px dashed var(--line-2)", borderRadius: 4 }}>
          {lang === "en" ? "No positions yet. Click \"Add position\" to get started." : "暂无职位信息，点击「添加职位」开始。"}
        </div>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th style={{ width: "18%" }}>{lang === "en" ? "Title (EN)" : "英文标题"}</th>
              <th style={{ width: "24%" }}>{lang === "en" ? "Description (EN)" : "英文描述"}</th>
              <th style={{ width: "18%" }}>{lang === "en" ? "Title (CN)" : "中文标题"}</th>
              <th style={{ width: "24%" }}>{lang === "en" ? "Description (CN)" : "中文描述"}</th>
              <th style={{ width: 80 }}></th>
            </tr>
          </thead>
          <tbody>
            {itemsEn.map((item, i) => (
              <tr key={i}>
                <td style={{ fontWeight: 500, fontSize: 13 }}>{item.title}</td>
                <td style={{ fontSize: 12.5, color: "var(--ink-2)", maxWidth: 200 }}>{item.body.length > 70 ? item.body.slice(0, 70) + "…" : item.body}</td>
                <td style={{ fontWeight: 500, fontSize: 13 }}>{itemsCn[i]?.title || "—"}</td>
                <td style={{ fontSize: 12.5, color: "var(--ink-2)", maxWidth: 200 }}>{(itemsCn[i]?.body?.length > 70 ? itemsCn[i].body.slice(0, 70) + "…" : itemsCn[i]?.body) || "—"}</td>
                <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                  <button className="btn btn-text btn-sm" onClick={() => setEditing({ index: i, title: item.title, body: item.body, titleCn: itemsCn[i]?.title || "", bodyCn: itemsCn[i]?.body || "" })}>
                    <Icon.edit />
                  </button>
                  <button className="btn btn-text btn-sm" onClick={() => remove(i)} style={{ color: "var(--danger)" }}>
                    <Icon.trash />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {editing && (
        <EditJoinPositionModal
          item={editing}
          onSave={savePosition}
          onClose={() => setEditing(null)}
          saving={saving}
        />
      )}
    </div>
  );
}

function EditJoinPositionModal({ item, onSave, onClose, saving }) {
  const { lang } = useApp();
  const [form, setForm] = useState(item);
  const isNew = item.index === null || item.index === undefined;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 640 }}>
        <div className="modal-header">
          <h3>{isNew ? (lang === "en" ? "New position" : "新增职位") : (lang === "en" ? "Edit position" : "编辑职位")}</h3>
          <button className="btn btn-text" onClick={onClose}><Icon.close /></button>
        </div>
        <div className="modal-body">
          <label className="label">Title (English)</label>
          <input className="input" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. PhD students (2026)" />
          <div style={{ height: 12 }} />
          <label className="label">Description (English)</label>
          <textarea className="textarea" value={form.body} onChange={e => setForm({ ...form, body: e.target.value })} style={{ minHeight: 80 }} />
          <div style={{ height: 16 }} />
          <label className="label">Title (中文)</label>
          <input className="input" value={form.titleCn} onChange={e => setForm({ ...form, titleCn: e.target.value })} placeholder="例如：博士研究生（2026 级）" />
          <div style={{ height: 12 }} />
          <label className="label">Description (中文)</label>
          <textarea className="textarea" value={form.bodyCn} onChange={e => setForm({ ...form, bodyCn: e.target.value })} style={{ minHeight: 80 }} />
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost btn-sm" onClick={onClose}>{lang === "en" ? "Cancel" : "取消"}</button>
          <button className="btn btn-primary btn-sm" onClick={onSave} disabled={saving || !form.title}>
            {saving ? "…" : <><Icon.check /> {lang === "en" ? "Save" : "保存"}</>}
          </button>
        </div>
      </div>
    </div>
  );
}
