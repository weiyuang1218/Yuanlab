// Supabase 连接配置
const SUPABASE_URL = "https://njegvvkcjrmbfucbpfsx.supabase.co";
const SUPABASE_KEY = "sb_publishable_JKb4AOE23CDdJ2inbEV9-g_oKH-5-2a";

window.SUPABASE = {
  url: SUPABASE_URL,
  key: SUPABASE_KEY,

  async query(table, options = {}) {
    let url = `${SUPABASE_URL}/rest/v1/${table}?`;
    if (options.select) url += `select=${options.select}&`;
    if (options.filter) url += `${options.filter}&`;
    if (options.order) url += `order=${options.order}&`;
    if (options.limit) url += `limit=${options.limit}&`;
    const res = await fetch(url, {
      headers: {
        "apikey": SUPABASE_KEY,
        "Authorization": `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json"
      }
    });
    if (!res.ok) return [];
    return res.json();
  },

  async insert(table, data) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
      method: "POST",
      headers: {
        "apikey": SUPABASE_KEY,
        "Authorization": `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json",
        "Prefer": "return=representation"
      },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  async update(table, id, data) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
      method: "PATCH",
      headers: {
        "apikey": SUPABASE_KEY,
        "Authorization": `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json",
        "Prefer": "return=representation"
      },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  async remove(table, id) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
      method: "DELETE",
      headers: {
        "apikey": SUPABASE_KEY,
        "Authorization": `Bearer ${SUPABASE_KEY}`
      }
    });
    return res.ok;
  },

  async _getJWT() {
    if (this._cachedJWT) return this._cachedJWT;
    try {
      const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=anonymous`, {
        method: "POST",
        headers: {
          "apikey": SUPABASE_KEY,
          "Content-Type": "application/json"
        },
        body: "{}"
      });
      if (res.ok) {
        const data = await res.json();
        if (data.access_token) {
          this._cachedJWT = data.access_token;
          return this._cachedJWT;
        }
      }
    } catch (e) {}
    return SUPABASE_KEY;
  },

  async uploadFile(bucket, path, file) {
    const token = await this._getJWT();
    const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${bucket}/${path}`, {
      method: "POST",
      headers: {
        "apikey": SUPABASE_KEY,
        "Authorization": `Bearer ${token}`,
        "Content-Type": file.type || "application/octet-stream",
        "x-upsert": "true",
      },
      body: file,
    });
    if (!res.ok) {
      let detail = "";
      try { detail = await res.text(); } catch (_) {}
      console.error(`[Supabase Storage] upload failed — HTTP ${res.status} — bucket: ${bucket}, path: ${path}`, detail);
      throw new Error("Upload failed: " + res.status);
    }
    return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`;
  }
};

// ─── 从数据库加载动态数据，合并到 LAB_DATA ───────────────────────
// 调用时机：app.jsx 里 App() 组件挂载后调用一次
// 成功后触发 window.dispatchEvent(new Event("labdata:updated"))
window.SUPABASE.loadAll = async function () {
  try {
    const [allMembers, publications, news, projects, resources, accounts, events] = await Promise.all([
      window.SUPABASE.query("members", { order: "sort_order.asc,joined_year.asc" }),
      window.SUPABASE.query("publications", { order: "year.desc" }),
      window.SUPABASE.query("news", { order: "published_at.desc", limit: 10 }),
      window.SUPABASE.query("projects", { order: "start_year.desc" }),
      window.SUPABASE.query("resources", { order: "created_at.desc" }),
      window.SUPABASE.query("accounts", { order: "username.asc" }),
      window.SUPABASE.query("events", { order: "date.asc" }),
    ]);

    function mapMember(m) {
      return {
        id: m.id, name: m.name, nameCn: m.name_cn,
        role: m.role, roleCn: m.role_cn,
        focus: m.research_interests || "", focusCn: m.research_interests || "",
        bio: m.bio || "", bioCn: m.bio_cn || "",
        email: m.email || "",
        year: m.joined_year ? String(m.joined_year) + "–" : "",
        active: m.active !== false, // default true if null
        education: m.education || "",
        orcid: m.orcid || "",
        googleScholar: m.google_scholar || "",
        photo_url: m.photo_url || "",
      };
    }

    if (allMembers && allMembers.length > 0) {
      const mapped = allMembers.map(mapMember);
      // active members go to LAB_DATA.members
      window.LAB_DATA.members = mapped.filter(m => m.active !== false);
      // inactive members replace LAB_DATA.alumni
      const dbAlumni = mapped.filter(m => m.active === false);
      if (dbAlumni.length > 0) {
        window.LAB_DATA.alumni = dbAlumni.map(m => ({
          id: m.id, name: m.name, nameCn: m.nameCn,
          role: m.role, next: m.next || "", active: false,
        }));
      }
    }

    if (publications && publications.length > 0) {
      const existing = window.LAB_DATA.publications;
      const existingIds = new Set(existing.map(p => p.id));
      publications.forEach(p => {
        const mapped = {
          id: p.id, year: p.year, title: p.title,
          authors: p.authors, journal: p.journal,
          volume: "", tag: p.tags ? p.tags[0] : "",
          featured: p.featured, doi: p.doi,
        };
        const idx = existing.findIndex(e => e.id === p.id);
        if (idx >= 0) {
          existing[idx] = { ...existing[idx], ...mapped };
        } else if (!existingIds.has(p.id)) {
          existing.push(mapped);
          existingIds.add(p.id);
        }
      });
      window.LAB_DATA.publications = existing;
    }

    function normalizeResourceCategory(category) {
      if (category === "Protocols") return "Internal Protocols";
      if (category === "Reference Protocols") return "External Protocols";
      return category || "";
    }

    // Resources — map DB field names (title, file_url, file_type) to frontend names
    if (resources && resources.length > 0) {
      window.LAB_DATA.images = {
        ...(window.LAB_DATA.images || {}),
        ...resources
          .filter(r => r.category === "Site Images" && r.title && r.file_url)
          .reduce((acc, r) => {
            if (!acc[r.title]) acc[r.title] = r.file_url;
            return acc;
          }, {})
      };

      // Resources — merge with existing seed/localStorage data by ID, don't replace
      const existingR = window.LAB_DATA.resources;
      const existingRIds = new Set(existingR.map(r => r.id));
      resources.filter(r => r.category !== "Site Images").forEach(r => {
        const mapped = {
          id: r.id, name: r.title || r.name || "",
          category: normalizeResourceCategory(r.category),
          type: r.file_type || r.type || "", size: r.size || "",
          url: r.file_url || r.url || "", uploader: r.uploader || "",
          downloads: r.downloads || 0,
          uploaded: r.uploaded_at ? r.uploaded_at.slice(0, 10) : (r.created_at ? r.created_at.slice(0, 10) : ""),
          description: r.description || "",
          presenter: r.presenter || "", paperTitle: r.paper_title || "",
          researchField: r.research_field || "", presentationDate: r.presentation_date || "",
          source: r.source || "",
        };
        const idx = existingR.findIndex(e => e.id === r.id);
        if (idx >= 0) { existingR[idx] = { ...existingR[idx], ...mapped }; }
        else if (!existingRIds.has(r.id)) { existingR.push(mapped); existingRIds.add(r.id); }
      });
      window.LAB_DATA.resources = existingR;

    }

    if (news && news.length > 0) {
      const existingNews = window.LAB_DATA.news;
      const existingDates = new Set(existingNews.map(n => n.date + "|" + n.en));
      news.forEach(n => {
        const mapped = {
          date: n.published_at ? n.published_at.slice(0, 10) : "",
          en: n.content || n.title || "",
          cn: n.content_cn || n.title_cn || "",
          pinned: n.pinned, type: n.type,
        };
        const key = mapped.date + "|" + mapped.en;
        const idx = existingNews.findIndex(e => (e.date + "|" + e.en) === key);
        if (idx >= 0) {
          existingNews[idx] = { ...existingNews[idx], ...mapped };
        } else if (!existingDates.has(key)) {
          existingNews.push(mapped);
          existingDates.add(key);
        }
      });
      window.LAB_DATA.news = existingNews;
    }
    if (projects && projects.length > 0) {
      window.LAB_DATA.projects = projects;
    }

    // Accounts — merge from Supabase
    if (accounts && accounts.length > 0) {
      const existingAcc = window.LAB_DATA.accounts;
      const accUsernames = new Set(existingAcc.map(a => a.username));
      accounts.forEach(a => {
        const mapped = {
          username: a.username, password: a.password || "",
          role: a.role || "member", name: a.name || a.username,
          nameCn: a.name_cn || "",
        };
        const idx = existingAcc.findIndex(e => e.username === a.username);
        if (idx >= 0) existingAcc[idx] = { ...existingAcc[idx], ...mapped };
        else if (!accUsernames.has(a.username)) {
          existingAcc.push(mapped);
          accUsernames.add(a.username);
        }
      });
      window.LAB_DATA.accounts = existingAcc;
    }

    // Events — merge from Supabase (fallback when localStorage has gaps)
    if (events && events.length > 0) {
      const existingEv = window.LAB_DATA.events;
      const evIds = new Set(existingEv.map(e => e.id));
      events.forEach(e => {
        const idx = existingEv.findIndex(x => x.id === e.id);
        if (idx >= 0) existingEv[idx] = { ...existingEv[idx], ...e };
        else if (!evIds.has(e.id)) { existingEv.push(e); evIds.add(e.id); }
      });
      window.LAB_DATA.events = existingEv;
    }

    // Cache populated image URLs to localStorage for fast loading on next visit
    try {
      const imgStore = JSON.parse(localStorage.getItem("yuanlab.images") || "{}");
      Object.assign(imgStore, window.LAB_DATA.images || {});
      localStorage.setItem("yuanlab.images", JSON.stringify(imgStore));
    } catch (e) {}

    window.dispatchEvent(new Event("labdata:updated"));
  } catch (e) {
    console.warn("Supabase load failed, using seed data.", e);
  }
};

// ─── Seed 数据（数据库为空时的后备）────────────────────────────────

window.LAB_DATA = {
  lab: {
    name: { en: "Yuan Lab", cn: "袁富文课题组" },
    affiliation: {
      en: "School of Integrative Medicine · Shanghai University of Traditional Chinese Medicine",
      cn: "上海中医药大学 · 中西医结合学院"
    },
    mission: {
      en: "We study hormone-dependent cancers — particularly advanced prostate cancer — at the intersection of nucleolar biology, RNA regulation, and integrative medicine. Our goal: dissect the molecular logic of treatment resistance, and design new therapeutic strategies, including TCM-derived small molecules and CRISPR-based tools.",
      cn: "聚焦激素依赖性肿瘤（尤其是进展期前列腺癌），整合核仁生物学、RNA 调控与中西医结合手段，系统解析治疗耐药的分子机制，并致力于开发中药小分子与基于 CRISPR 的肿瘤治疗新策略。"
    },
    address: {
      en: "1200 Cailun Road, Pudong, Shanghai 201203, China",
      cn: "上海市浦东新区蔡伦路1200号 · 邮编 201203"
    },
    email: "yuanfuwen@shutcm.edu.cn",
    established: 2024
  },

  images: {},

  pi: {
    name: { en: "Fuwen Yuan", cn: "袁富文" },
    title: {
      en: "Principal Investigator · Professor · Doctoral Supervisor",
      cn: "研究员 · 博士生导师 · 上海市海外高层次人才"
    },
    bio: {
      en: "Dr. Fuwen Yuan received his BS, MS, and PhD from Peking University Health Science Center, followed by postdoctoral training at Duke University School of Medicine. His research focuses on hormone-targeted therapy for prostate cancer and the development of gene editing technologies. He is a recipient of the U.S. Department of Defense Early Investigator Research Award and the Young Investigator Award from the European journal Biomolecules. He has led grants from the U.S. DoD Prostate Cancer Research Program and the NIH, and has participated in multiple NSFC projects. He serves on the editorial boards of Science Advances, Oncology Letters, and other international journals, and has authored nearly twenty SCI papers in venues including Nucleic Acids Research and Genes & Diseases — nine as first author. He is the lead author of the monograph CSIG-NOLC1 Pathway in Cellular Senescence and Tumor Progression, selected for China's 13th Five-Year National Key Publishing Program.",
      cn: "本硕博毕业于北京大学医学部，后于美国杜克大学医学院从事博士后研究。主要研究方向为前列腺癌激素靶向治疗及基因编辑技术的研发应用。曾获美国国防部早期研究者研究奖、欧洲 Biomolecules 杂志青年研究者奖；先后主持美国国防部前列腺癌研究基金、美国国立卫生研究院及国防部资助课题，参与多项中国国家自然科学基金项目。担任 Science Advances、Oncology Letters 等国际期刊编委及审稿人，在 Nucleic Acids Res、Genes & Dis 等期刊发表 SCI 论文近二十篇，其中第一作者九篇。主编出版专著《CSIG-NOLC1 通路调控细胞衰老及肿瘤进程》，入选「十三五」国家重点出版规划项目青年学者优秀学术专著文库。"
    },
    education: [
      { year: "Postdoc", place: "Duke University School of Medicine", placeCn: "美国杜克大学医学院" },
      { year: "PhD", place: "Peking University Health Science Center", placeCn: "北京大学医学部" },
      { year: "BS", place: "Peking University Health Science Center", placeCn: "北京大学医学部" }
    ],
    awards: [
      { en: "DoD Prostate Cancer Early Investigator Research Award", cn: "美国国防部前列腺癌早期研究者研究奖" },
      { en: "Young Investigator Award · Biomolecules", cn: "Biomolecules 杂志青年研究者奖" },
      { en: "Shanghai Overseas High-level Talent", cn: "上海市海外高层次人才" }
    ],
    email: "yuanfuwen@shutcm.edu.cn",
    orcid: "0000-0002-XXXX-XXXX"
  },

  members: [
    { id: "m1", name: "Yuang Wei",     nameCn: "卫宇昂", role: "PhD · 2023 (Joint)",  roleCn: "2023 级博士（联合培养）", year: "2023–", focus: "Adipose tissue senescence and tumor progression", focusCn: "脂肪组织衰老与肿瘤进展", email: "", birthday: "05-04" },
    { id: "m2", name: "Siliang Wang",  nameCn: "王思亮", role: "PhD · 2025",          roleCn: "2025 级博士",            year: "2025–", focus: "", focusCn: "", email: "", birthday: "08-12" },
    { id: "m3", name: "Yunxiao Qiao",  nameCn: "乔云笑", role: "PhD · 2025",          roleCn: "2025 级博士",            year: "2025–", focus: "", focusCn: "", email: "", birthday: "03-22" },
    { id: "m4", name: "Xiaowen Song",  nameCn: "宋晓雯", role: "PhD · 2026",          roleCn: "2026 级博士",            year: "2026–", focus: "", focusCn: "", email: "", birthday: "05-15" },
    { id: "m5", name: "Chuang Xie",    nameCn: "谢 创",  role: "Master · 2024",       roleCn: "2024 级硕士",            year: "2024–", focus: "", focusCn: "", email: "" },
    { id: "m6", name: "Xinyi Xu",      nameCn: "许心怡", role: "Master · 2024",       roleCn: "2024 级硕士",            year: "2024–", focus: "", focusCn: "", email: "", birthday: "11-08" },
    { id: "m7", name: "Minghuang Xu",  nameCn: "徐明煌", role: "Master · 2025",       roleCn: "2025 级硕士",            year: "2025–", focus: "", focusCn: "", email: "" },
    { id: "m8", name: "Chunmei Zhou",  nameCn: "周春梅", role: "Master · 2025",       roleCn: "2025 级硕士",            year: "2025–", focus: "", focusCn: "", email: "" }
  ],

  alumni: [
    { name: "Xuehui Li",     nameCn: "李雪惠",  role: "Master · 2021 (Joint)", next: "" },
    { name: "Qianqian Zhou", nameCn: "周茜茜", role: "Master · 2021",         next: "" },
    { name: "Fanchen Wu",    nameCn: "吴范晨",  role: "Master · 2022",         next: "" }
  ],

  research: [
    {
      id: "r1",
      title: { en: "Targeting advanced prostate cancer", cn: "进展期前列腺癌的靶向治疗" },
      summary: {
        en: "We dissect the molecular determinants of androgen-receptor-driven transcription and resistance to second-generation AR antagonists. Recent work identifies new vulnerabilities in lethal-stage disease — including ezetimibe-engineered ferroptosis inducers (L14-8) and PLK1/TP53-SAT1 axis modulation.",
        cn: "解析雄激素受体驱动转录的分子决定因素及第二代 AR 拮抗剂的耐药机制。近期工作发现进展期前列腺癌的新型可成药靶点，包括依折麦布工程化分子 L14-8 经 PLK1/TP53-SAT1 轴诱导铁死亡。"
      },
      keywords: ["AR signaling", "enzalutamide resistance", "ferroptosis", "CRPC"]
    },
    {
      id: "r2",
      title: { en: "TCM-derived molecules in cancer", cn: "中药小分子的肿瘤药理" },
      summary: {
        en: "We screen and mechanistically characterize TCM-derived small molecules — Reynoutria multiflora extracts, Saikosaponin-D, Qingdai Decoction — for activity against lethal prostate cancer through cell-cycle arrest, oncogenic splicing reprogramming, and tumor-microenvironment modulation.",
        cn: "围绕中药来源的小分子（首乌提取物、柴胡皂苷 D、青黛汤等），系统解析其在致死性前列腺癌中的作用机制：包括细胞周期阻滞、致癌剪接重编程及肿瘤微环境调控。"
      },
      keywords: ["TCM small molecules", "cell cycle", "splicing", "tumor microenvironment"]
    },
    {
      id: "r3",
      title: { en: "Nucleolar biology, RNA & senescence", cn: "核仁生物学、RNA 调控与衰老" },
      summary: {
        en: "Building on our discovery of the CSIG–NOLC1 axis, we map how nucleolar proteins (NOLC1, TRF2) and RNA-level regulation — alternative polyadenylation, alternative splicing — couple cellular senescence to oncogenic transformation, particularly in hepatocellular and prostate cancers.",
        cn: "在 CSIG-NOLC1 通路基础上，研究核仁蛋白（NOLC1、TRF2）及 RNA 层面调控（可变多腺苷酸化、可变剪接）如何耦合细胞衰老与肿瘤转化，重点关注肝癌与前列腺癌。"
      },
      keywords: ["NOLC1", "nucleolar stress", "alternative polyadenylation", "senescence"]
    },
    {
      id: "r4",
      title: { en: "CRISPR-Cas13 platforms", cn: "CRISPR-Cas13 平台开发" },
      summary: {
        en: "We engineer programmable RNA-targeting Cas13 systems for therapeutic and diagnostic application — from in-vivo Cas13d knockdown of host factors in viral infection (Cas13d–Ctsl in SARS-CoV-2) to functional dissection of cancer-associated transcripts.",
        cn: "开发可编程 RNA 靶向 Cas13 系统用于治疗与诊断：从体内 Cas13d 敲低宿主因子治疗病毒感染（Cas13d-Ctsl 与 SARS-CoV-2），到对肿瘤相关转录本的功能解析。"
      },
      keywords: ["CRISPR-Cas13", "RNA targeting", "in vivo delivery", "diagnostics"]
    }
  ],

  publications: [
    { id: "p1",  year: 2025, authors: "Zhang Y, Song XW, Zhang N, Li XH, Wu FC, Wei YA, Xu DL, Xu LF, Yuan FW*", title: "Ezetimibe Engineered L14-8 Suppresses Advanced Prostate Cancer by Activating PLK1/TP53-SAT1-Induced Ferroptosis", journal: "Advanced Science", volume: "12(29): e04192", tag: "Corresponding", featured: true, doi: "10.1002/advs.202504192" },
    { id: "p2",  year: 2025, authors: "Li X, Shen Y, Zhang N, Lu D, Ding S, Wu F, Song X, Zhou X, Lin S, Xu H, Wang Z, Yuan F*", title: "Integrative high-throughput studies to develop novel targets and drugs for the treatment of advanced prostate cancer", journal: "Genes & Diseases", volume: "13(2): 101732", tag: "Corresponding", featured: true, doi: "10.1016/j.gendis.2025.101732" },
    { id: "p3",  year: 2025, authors: "Zhang X, Li X, Zhang F, Yang D, Sun Q, Wei Y, Yan R, Xu D, Lin S, Yuan F*, Wang W*", title: "Saikosaponin-D triggers cancer cell death by targeting the PIM1/c-Myc axis to reprogram oncogenic alternative splicing", journal: "Cell Death Discovery", volume: "11(1): 427", tag: "Co-corresponding", featured: true, doi: "10.1038/s41420-025-02729-w" },
    { id: "p4",  year: 2025, authors: "Wei Y, Hankey W, Xu D, Yuan F*", title: "Programmed Cell Death in Cancer", journal: "MedComm (2020)", volume: "6(9): e70357", tag: "Corresponding", featured: true, doi: "10.1002/mco2.70357" },
    { id: "p6",  year: 2024, authors: "Zhou Q, Wu F, Chen Y, Fu J, Zhou L, Xu Y, He F, Gong Z, Yuan F*", title: "Reynoutria multiflora (Thunb.) Moldenke and its ingredient suppress lethal prostate cancer growth by inducing CDC25B-CDK1 mediated cell cycle arrest", journal: "Bioorganic Chemistry", volume: "152: 107731", tag: "Corresponding", featured: true, doi: "10.1016/j.bioorg.2024.107731" },
    { id: "p7",  year: 2023, authors: "Chen Y, Zhou Q, Zhang H, Xu L, Lu L, Shu B, Zhou L, Yuan F*", title: "Qingdai Decoction suppresses prostate cancer growth in lethal-stage prostate cancer models", journal: "Journal of Ethnopharmacology", volume: "308: 116333", tag: "Corresponding", featured: true, doi: "10.1016/j.jep.2023.116333" },
    { id: "p8",  year: 2022, authors: "Chen Y, Zhou Q, Hankey W, Fang X, Yuan F*", title: "Second generation androgen receptor antagonists and challenges in prostate cancer treatment", journal: "Cell Death & Disease", volume: "13(7): 632", tag: "Corresponding", featured: true, doi: "10.1038/s41419-022-05084-1" },
    { id: "p9",  year: 2022, authors: "Zhou Q, Chen Y, Wang R, Jia F, He F, Yuan F*", title: "Advances of CRISPR-Cas13 system in COVID-19 diagnosis and treatment", journal: "Genes & Diseases", volume: "10(6): 2414–2424", tag: "Corresponding", featured: true, doi: "10.1016/j.gendis.2022.11.016" },
    { id: "p10", year: 2022, authors: "Cui Z, Zeng C, Huang F, Yuan F, Yan J, Zhao Y, Zhou Y, Hankey W, Jin VX, Huang J, Staats HF, Everitt JI, Sempowski GD, Wang H, Dong Y, Liu SL, Wang Q", title: "Cas13d knockdown of lung protease Ctsl prevents and treats SARS-CoV-2 infection", journal: "Nature Chemical Biology", volume: "18(10): 1056–1064", tag: "Co-author", featured: true, doi: "10.1038/s41589-022-01094-4" },
    { id: "p11", year: 2022, authors: "Chen Z, Ye Z, Soccio RE, Nakadai T, Hankey W, Zhao Y, Huang F, Yuan F, Wang H, et al.", title: "Phosphorylated MED1 links transcription recycling and cancer growth", journal: "Nucleic Acids Research", volume: "50(8): 4450–4463", tag: "Co-author", featured: false, doi: "10.1093/nar/gkac246" },
    { id: "p12", year: 2019, authors: "Yuan F, Hankey W, Wu D, Wang H, Somarelli J, Armstrong AJ, Huang J, Chen Z, Wang Q", title: "Molecular determinants for enzalutamide-induced transcription in prostate cancer", journal: "Nucleic Acids Research", volume: "47(19): 10104–10114", tag: "First", featured: true, doi: "10.1093/nar/gkz790" },
    { id: "p13", year: 2019, authors: "Yuan F, Hankey W, Wagner EJ, Li W, Wang Q", title: "Alternative polyadenylation of mRNA and its role in cancer", journal: "Genes & Diseases", volume: "8(1): 61–72", tag: "First", featured: false, doi: "10.1016/j.gendis.2019.10.011" },
    { id: "p14", year: 2018, authors: "Yuan F, Xu C, Li G, Tong T", title: "Nucleolar TRF2 attenuated nucleolus stress-induced HCC cell-cycle arrest by altering rRNA synthesis", journal: "Cell Death & Disease", volume: "9(5): 518", tag: "First", featured: false, doi: "10.1038/s41419-018-0572-3" },
    { id: "p15", year: 2017, authors: "Yuan F, Zhang Y, Ma L, Cheng Q, Li G, Tong T", title: "Enhanced NOLC1 promotes cell senescence and represses hepatocellular carcinoma cell proliferation by disturbing the organization of nucleolus", journal: "Aging Cell", volume: "16(4): 726–737", tag: "First", featured: true, doi: "10.1111/acel.12602" }
  ],

  news: [],

  projects: [],

  resources: [],

  accounts: [
    { username: "admin",    password: "admin",          role: "admin",  name: "Fuwen Yuan", nameCn: "袁富文" },
    { username: "weiyuang", password: "weiyuangat123",  role: "member", name: "Yuang Wei",  nameCn: "卫宇昂" },
    { username: "guest",    password: "",               role: "guest",  name: "Visitor",    nameCn: "访客" }
  ],

  home: {
    hero: {
      en: "Where traditional medicine meets molecular oncology.",
      cn: "传统中医药与现代分子肿瘤学的碰撞。"
    },
    joinLead: {
      en: "Yuan Lab is recruiting curious, persistent scientists who want to work at the boundary of cancer biology and integrative medicine.",
      cn: "袁富文课题组招聘对肿瘤生物学与中西医结合交叉领域抱有持续好奇心的研究者。"
    }
  },

  events: [
    { id: "e1", title: "Lab meeting", date: "2026-05-04", startTime: "14:00", endTime: "16:00", location: "Innovative Building 401", people: "All members", priority: 2, description: "Weekly group meeting · progress reports", repeat: "weekly" },
    { id: "e2", title: "Journal club", date: "2026-05-11", startTime: "15:00", endTime: "16:30", location: "Conference Room", people: "Yuang Wei, Siliang Wang", priority: 2, description: "Literature presentation and discussion", repeat: "biweekly" },
    { id: "e3", title: "Grant deadline", date: "2026-05-20", startTime: "", endTime: "", location: "", people: "", priority: 1, description: "NSFC grant submission deadline", repeat: "none" },
    { id: "e4", title: "Special seminar", date: "2026-05-22", startTime: "10:00", endTime: "11:30", location: "Lecture Hall", people: "Guest speaker", priority: 2, description: "CRISPR applications in cancer research", repeat: "none" },
    { id: "e5", title: "Monthly lab cleanup", date: "2026-05-29", startTime: "16:00", endTime: "17:00", location: "Lab", people: "Everyone", priority: 3, description: "Monthly lab organization and cleanup", repeat: "monthly" },
    { id: "e6", title: "Group meeting", date: "2026-05-25", startTime: "14:00", endTime: "16:00", location: "Innovative Building 401", people: "All members", priority: 2, description: "Weekly group meeting · data review", repeat: "weekly" },
    { id: "e7", title: "PhD defense", date: "2026-06-05", startTime: "09:00", endTime: "12:00", location: "Academic Hall", people: "Defense committee", priority: 1, description: "PhD thesis defense", repeat: "none" },
    { id: "e8", title: "Daily lab check", date: "2026-05-01", startTime: "09:00", endTime: "09:30", location: "Lab", people: "On-duty member", priority: 3, description: "Daily equipment and safety check", repeat: "daily" },
  ],

  joinUs: {
    en: [
      { title: "PhD students (2026)", body: "We accept ~2 PhD students per year through the SHUTCM unified admission. Strong background in molecular biology, biochemistry, or bioinformatics; demonstrated coding (R/Python) is a plus." },
      { title: "Master students", body: "1–2 master positions available each year. Applicants from clinical medicine, integrative medicine, biology, or pharmacology are welcome." },
      { title: "Postdoctoral fellows", body: "Open positions in (a) AR-targeted therapy, (b) gene editing toolkits, (c) computational oncology. Competitive package; SHUTCM postdoc fellowships available." },
      { title: "Rotation & visiting students", body: "We host short-term rotations (3–6 months) for motivated students. Email a CV and a one-paragraph statement of interest." }
    ],
    cn: [
      { title: "博士研究生（2026 级）", body: "通过上海中医药大学统一招生录取，每年招收约 2 名博士。要求具有较强的分子生物学、生物化学或生物信息学背景，有 R / Python 编程经验者优先。" },
      { title: "硕士研究生", body: "每年招收 1–2 名硕士。临床医学、中西医结合、生物学、药理学背景同学均可申请。" },
      { title: "博士后", body: "(a) AR 靶向治疗 (b) 基因编辑工具 (c) 计算肿瘤学 三个方向均开放岗位。提供具有竞争力的待遇及上海中医药大学博士后基金支持。" },
      { title: "轮转 / 访问学生", body: "面向 3–6 个月的短期轮转开放申请。请将 CV 和一段研究意向陈述发送至 yuanfuwen@shutcm.edu.cn。" }
    ]
  }
};

// Restore persisted page content from localStorage (overrides seed defaults)
try {
  const h = localStorage.getItem("yuanlab.home");
  if (h) Object.assign(window.LAB_DATA.home, JSON.parse(h));
} catch (e) {}
try {
  const j = localStorage.getItem("yuanlab.joinUs");
  if (j) Object.assign(window.LAB_DATA.joinUs, JSON.parse(j));
} catch (e) {}
try {
  const raw = localStorage.getItem("yuanlab.events");
  if (raw) {
    const stored = JSON.parse(raw);
    const evIds = new Set(window.LAB_DATA.events.map(x => x.id));
    stored.forEach(s => {
      const idx = window.LAB_DATA.events.findIndex(e => e.id === s.id);
      if (idx >= 0) window.LAB_DATA.events[idx] = s;
      else if (!evIds.has(s.id)) window.LAB_DATA.events.push(s);
    });
  }
} catch (_) {}

// Restore admin-editable content from localStorage (fallback when Supabase unavailable)
try {
  const m = localStorage.getItem("yuanlab.mission");
  if (m) Object.assign(window.LAB_DATA.lab.mission, JSON.parse(m));
} catch (e) {}
try {
  const p = localStorage.getItem("yuanlab.publications");
  if (p) {
    const stored = JSON.parse(p);
    const seedKeys = new Set(window.LAB_DATA.publications.map(x => x.doi || x.id));
    stored.forEach(s => {
      const key = s.doi || s.id;
      const idx = window.LAB_DATA.publications.findIndex(e => (e.doi || e.id) === key);
      if (idx >= 0) window.LAB_DATA.publications[idx] = s;
      else if (!seedKeys.has(key)) window.LAB_DATA.publications.push(s);
    });
  }
} catch (e) {}
try {
  const n = localStorage.getItem("yuanlab.news");
  if (n) {
    const stored = JSON.parse(n);
    const seedKeys = new Set(window.LAB_DATA.news.map(x => x.date + "|" + x.en));
    stored.forEach(s => {
      const key = s.date + "|" + s.en;
      const idx = window.LAB_DATA.news.findIndex(e => (e.date + "|" + e.en) === key);
      if (idx >= 0) window.LAB_DATA.news[idx] = s;
      else if (!seedKeys.has(key)) window.LAB_DATA.news.push(s);
    });
  }
} catch (e) {}
try {
  const r = localStorage.getItem("yuanlab.resources");
  if (r) {
    const stored = JSON.parse(r);
    const seedIds = new Set(window.LAB_DATA.resources.map(x => x.id));
    stored.forEach(s => {
      const idx = window.LAB_DATA.resources.findIndex(e => e.id === s.id);
      if (idx >= 0) window.LAB_DATA.resources[idx] = s;
      else if (!seedIds.has(s.id)) window.LAB_DATA.resources.push(s);
    });
  }
} catch (e) {}

try {
  const a = localStorage.getItem("yuanlab.accounts");
  if (a) {
    const stored = JSON.parse(a);
    const existingAcc = window.LAB_DATA.accounts;
    const usernames = new Set(existingAcc.map(x => x.username));
    stored.forEach(s => {
      const idx = existingAcc.findIndex(e => e.username === s.username);
      if (idx >= 0) existingAcc[idx] = s;
      else if (!usernames.has(s.username)) { existingAcc.push(s); usernames.add(s.username); }
    });
    window.LAB_DATA.accounts = existingAcc;
  }
} catch (e) {}
try {
  const mem = localStorage.getItem("yuanlab.members");
  if (mem) {
    const restored = JSON.parse(mem);
    window.LAB_DATA.members = restored.filter(m => m.active !== false);
    const dbAlumni = restored.filter(m => m.active === false);
    if (dbAlumni.length > 0) {
      window.LAB_DATA.alumni = dbAlumni.map(m => ({
        id: m.id, name: m.name, nameCn: m.nameCn,
        role: m.role, next: m.next || "", active: false,
      }));
    }
  }
} catch (e) {}

// i18n strings
window.LAB_I18N = {
  en: {
    nav: { home: "Home", people: "People", research: "Research", publications: "Publications", resources: "Resources", join: "Join Us", contact: "Contact", calendar: "Calendar" },
    actions: { signin: "Sign in", signout: "Sign out", admin: "Admin", openAdmin: "Open admin console" },
    home: {
      missionLabel: "Mission",
      latestNews: "Latest",
      readMore: "Read more",
      labFigures: { members: "Members", publications: "Publications since 2017", funded: "Active grants", years: "Established" },
      sectionResearch: "Research directions",
      sectionPubs: "Featured publications",
      viewAll: "View all"
    },
    people: { pi: "Principal Investigator", current: "Current members", alumni: "Graduated members" },
    pubs: { all: "All", featured: "Featured", searchPlaceholder: "Search title, author, journal…" },
    resources: {
      gateTitle: "Resources are members-only",
      gateBody: "Sign in with your lab account to access protocols, literature presentations, duty rosters, and shared files. Visitors only see public categories.",
      categories: "Categories", uploaded: "Uploaded", uploader: "By", downloads: "Downloads", download: "Download", preview: "Preview"
    },
    auth: { username: "Username", password: "Password", signinTitle: "Sign in to Yuan Lab", signinHint: "Demo accounts: admin / admin · member / member", continueGuest: "Continue as visitor" },
    common: { close: "Close", save: "Save", cancel: "Cancel", delete: "Delete", edit: "Edit", add: "Add", upload: "Upload", confirm: "Confirm", search: "Search" }
  },
  cn: {
    nav: { home: "首页", people: "成员", research: "研究方向", publications: "论文", resources: "共享资源", join: "招生", contact: "联系", calendar: "日程" },
    actions: { signin: "登录", signout: "退出", admin: "后台", openAdmin: "进入管理后台" },
    home: {
      missionLabel: "使命",
      latestNews: "最新动态",
      readMore: "查看全文",
      labFigures: { members: "组内成员", publications: "2017 起发表论文", funded: "在研项目", years: "组建于" },
      sectionResearch: "研究方向",
      sectionPubs: "代表性论文",
      viewAll: "查看全部"
    },
    people: { pi: "课题组负责人", current: "当前成员", alumni: "已毕业成员" },
    pubs: { all: "全部", featured: "精选", searchPlaceholder: "搜索标题、作者、期刊…" },
    resources: {
      gateTitle: "共享资源仅对组内成员开放",
      gateBody: "请使用课题组账号登录后访问实验方法、文献汇报、值日表等共享文件。",
      categories: "分类", uploaded: "上传时间", uploader: "上传者", downloads: "下载次数", download: "下载", preview: "预览"
    },
    auth: { username: "账号", password: "密码", signinTitle: "登录 Yuan Lab", signinHint: "演示账号：admin / admin · member / member", continueGuest: "以访客身份浏览" },
    common: { close: "关闭", save: "保存", cancel: "取消", delete: "删除", edit: "编辑", add: "添加", upload: "上传", confirm: "确认", search: "搜索" }
  }
};
