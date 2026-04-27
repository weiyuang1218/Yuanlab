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
  }
};

// ─── 从数据库加载动态数据，合并到 LAB_DATA ───────────────────────
// 调用时机：app.jsx 里 App() 组件挂载后调用一次
// 成功后触发 window.dispatchEvent(new Event("labdata:updated"))
window.SUPABASE.loadAll = async function () {
  try {
    const [members, publications, news, projects] = await Promise.all([
      window.SUPABASE.query("members", { order: "sort_order.asc,joined_year.asc", filter: "active=eq.true" }),
      window.SUPABASE.query("publications", { order: "year.desc" }),
      window.SUPABASE.query("news", { order: "published_at.desc", limit: 10 }),
      window.SUPABASE.query("projects", { order: "start_year.desc" }),
    ]);

    // 只在数据库有内容时覆盖，否则保留 seed 数据
    if (members && members.length > 0) {
      window.LAB_DATA.members = members.map(m => ({
        id: m.id, name: m.name, nameCn: m.name_cn,
        role: m.role, roleCn: m.role_cn,
        focus: m.research_interests || "", focusCn: m.research_interests || "",
        bio: m.bio, bioCn: m.bio_cn,
        email: m.email || "",
        year: m.joined_year ? String(m.joined_year) + "–" : "",
        education: m.education || "",
        orcid: m.orcid || "",
        googleScholar: m.google_scholar || "",
      }));
    }
    if (publications && publications.length > 0) {
      window.LAB_DATA.publications = publications.map(p => ({
        id: p.id, year: p.year, title: p.title,
        authors: p.authors, journal: p.journal,
        volume: "", tag: p.tags ? p.tags[0] : "",
        featured: p.featured, doi: p.doi,
      }));
    }
    if (news && news.length > 0) {
      window.LAB_DATA.news = news.map(n => ({
        date: n.published_at ? n.published_at.slice(0, 10) : "",
        en: n.content || n.title || "",
        cn: n.content_cn || n.title_cn || "",
        pinned: n.pinned,
        type: n.type,
      }));
    }
    if (projects && projects.length > 0) {
      window.LAB_DATA.projects = projects;
    }

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
    email: "yuanlab@shutcm.edu.cn",
    established: 2024
  },

  pi: {
    name: { en: "Fuwen Yuan, PhD", cn: "袁富文 博士" },
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
    email: "fwyuan@shutcm.edu.cn",
    orcid: "0000-0002-XXXX-XXXX"
  },

  members: [
    { id: "m1", name: "Yuang Wei",     nameCn: "卫宇昂", role: "PhD · 2023 (Joint)",  roleCn: "2023 级博士（联合培养）", year: "2023–", focus: "Adipose tissue senescence and tumor progression", focusCn: "脂肪组织衰老与肿瘤进展", email: "" },
    { id: "m2", name: "Siliang Wang",  nameCn: "王思亮", role: "PhD · 2025",          roleCn: "2025 级博士",            year: "2025–", focus: "", focusCn: "", email: "" },
    { id: "m3", name: "Yunxiao Qiao",  nameCn: "乔云笑", role: "PhD · 2025",          roleCn: "2025 级博士",            year: "2025–", focus: "", focusCn: "", email: "" },
    { id: "m4", name: "Xiaowen Song",  nameCn: "宋晓雯", role: "PhD · 2026",          roleCn: "2026 级博士",            year: "2026–", focus: "", focusCn: "", email: "" },
    { id: "m5", name: "Chuang Xie",    nameCn: "谢 创",  role: "Master · 2024",       roleCn: "2024 级硕士",            year: "2024–", focus: "", focusCn: "", email: "" },
    { id: "m6", name: "Xinyi Xu",      nameCn: "许心怡", role: "Master · 2024",       roleCn: "2024 级硕士",            year: "2024–", focus: "", focusCn: "", email: "" },
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
    { id: "p5",  year: 2025, authors: "Wei Y, Yuan F*", title: "Periprostatic adipose tissue in prostate cancer development and progression", journal: "Frontiers in Oncology", volume: "15: 1543479", tag: "Corresponding", featured: false, doi: "10.3389/fonc.2025.1543479" },
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

  news: [
    { date: "2026-03-02", en: "Our paper on Ezetimibe-engineered L14-8 inducing ferroptosis in advanced PCa is out in Advanced Science.", cn: "实验室关于依折麦布工程化分子 L14-8 诱导前列腺癌铁死亡的论文发表于 Advanced Science。" },
    { date: "2025-11-20", en: "We are recruiting 2026 PhD students — see Join Us.", cn: "课题组 2026 级博士招生进行中，详见 Join Us。" }
  ],

  projects: [],

  resources: [
    { id: "f1",  category: "Protocols",         name: "RNA-seq library prep · Yuanlab v3.2",              type: "PDF",  size: "1.4 MB",  uploaded: "2026-04-10", uploader: "Yuang Wei",     downloads: 23 },
    { id: "f2",  category: "Protocols",         name: "CRISPR-Cas13d guide design SOP",                   type: "DOCX", size: "320 KB",  uploaded: "2026-03-21", uploader: "Siliang Wang", downloads: 41 },
    { id: "f3",  category: "Protocols",         name: "Mouse xenograft — castration model",               type: "PDF",  size: "880 KB",  uploaded: "2026-02-08", uploader: "Yunxiao Qiao", downloads: 17 },
    { id: "f4",  category: "Protocols",         name: "ChIP-seq for AR · cross-linking optimized",        type: "PDF",  size: "1.1 MB",  uploaded: "2026-01-15", uploader: "Chuang Xie",  downloads: 28 },
    { id: "f5",  category: "Literature PPT",    name: "Adv Sci 2025 — L14-8 ferroptosis in CRPC",         type: "PPTX", size: "12 MB",   uploaded: "2026-04-22", uploader: "Xinyi Xu",     downloads: 9  },
    { id: "f6",  category: "Literature PPT",    name: "Cell Death Discov 2025 — Saikosaponin-D / PIM1",   type: "PPTX", size: "18 MB",   uploaded: "2026-04-15", uploader: "Minghuang Xu", downloads: 12 },
    { id: "f7",  category: "Literature PPT",    name: "Nat Chem Biol 2022 — Cas13d Ctsl SARS-CoV-2",      type: "PPTX", size: "9.4 MB",  uploaded: "2026-03-08", uploader: "Chunmei Zhou", downloads: 18 },
    { id: "f8",  category: "Duty Roster",       name: "Lab duty roster · 2026 Q2",                        type: "XLSX", size: "48 KB",   uploaded: "2026-03-30", uploader: "Lab Manager",  downloads: 31 },
    { id: "f9",  category: "Lab Meeting",       name: "Group meeting schedule · 2026 Spring",             type: "XLSX", size: "32 KB",   uploaded: "2026-02-25", uploader: "Lab Manager",  downloads: 47 },
    { id: "f10", category: "Reagent Inventory", name: "Antibody inventory · master sheet",                type: "XLSX", size: "210 KB",  uploaded: "2026-04-18", uploader: "Lab Manager",  downloads: 22 },
    { id: "f11", category: "Reagent Inventory", name: "Plasmid bank · CRISPR vectors",                    type: "XLSX", size: "96 KB",   uploaded: "2026-04-02", uploader: "Siliang Wang", downloads: 15 },
    { id: "f12", category: "Reading Group",     name: "Reading list · April 2026",                        type: "PDF",  size: "180 KB",  uploaded: "2026-04-01", uploader: "Fuwen Yuan",   downloads: 19 }
  ],

  accounts: [
    { username: "admin",    password: "admin",          role: "admin",  name: "Fuwen Yuan", nameCn: "袁富文" },
    { username: "weiyuang", password: "weiyuangat123",  role: "member", name: "Yuang Wei",  nameCn: "卫宇昂" },
    { username: "guest",    password: "",               role: "guest",  name: "Visitor",    nameCn: "访客" }
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
      { title: "轮转 / 访问学生", body: "面向 3–6 个月的短期轮转开放申请。请将 CV 和一段研究意向陈述发送至 yuanlab@shutcm.edu.cn。" }
    ]
  }
};

// i18n strings
window.LAB_I18N = {
  en: {
    nav: { home: "Home", people: "People", research: "Research", publications: "Publications", resources: "Resources", join: "Join Us", contact: "Contact" },
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
    nav: { home: "首页", people: "成员", research: "研究方向", publications: "论文", resources: "共享资源", join: "招生", contact: "联系" },
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
