// Calendar page — month view, solar terms, holidays, recurring events

const { useState, useMemo } = React;

// ── Solar Terms (二十四节气) 2025–2026 ──
const SOLAR_TERMS = {
  "2025-12-21": { en: "Winter Solstice", cn: "冬至" },
  "2026-01-05": { en: "Minor Cold", cn: "小寒" },  "2026-01-20": { en: "Major Cold", cn: "大寒" },
  "2026-02-04": { en: "Start of Spring", cn: "立春" },  "2026-02-19": { en: "Rain Water", cn: "雨水" },
  "2026-03-05": { en: "Awakening of Insects", cn: "惊蛰" },  "2026-03-20": { en: "Spring Equinox", cn: "春分" },
  "2026-04-04": { en: "Clear & Bright", cn: "清明" },  "2026-04-20": { en: "Grain Rain", cn: "谷雨" },
  "2026-05-05": { en: "Start of Summer", cn: "立夏" },  "2026-05-21": { en: "Grain Buds", cn: "小满" },
  "2026-06-05": { en: "Grain in Ear", cn: "芒种" },  "2026-06-21": { en: "Summer Solstice", cn: "夏至" },
  "2026-07-07": { en: "Minor Heat", cn: "小暑" },  "2026-07-23": { en: "Major Heat", cn: "大暑" },
  "2026-08-07": { en: "Start of Autumn", cn: "立秋" },  "2026-08-23": { en: "End of Heat", cn: "处暑" },
  "2026-09-07": { en: "White Dew", cn: "白露" },  "2026-09-23": { en: "Autumnal Equinox", cn: "秋分" },
  "2026-10-08": { en: "Cold Dew", cn: "寒露" },  "2026-10-23": { en: "Frost Descent", cn: "霜降" },
  "2026-11-07": { en: "Start of Winter", cn: "立冬" },  "2026-11-22": { en: "Minor Snow", cn: "小雪" },
  "2026-12-07": { en: "Major Snow", cn: "大雪" },  "2026-12-22": { en: "Winter Solstice", cn: "冬至" },
};

// ── Chinese Public Holidays 2026 ──
const HOLIDAYS = {
  "2026-01-01": { en: "New Year's Day", cn: "元旦" },
  "2026-02-17": { en: "New Year's Eve", cn: "除夕" },
  "2026-02-18": { en: "Spring Festival", cn: "春节" },
  "2026-02-19": { en: "Spring Festival", cn: "春节" },
  "2026-03-08": { en: "Women's Day", cn: "妇女节" },
  "2026-04-04": { en: "Qingming Festival", cn: "清明节" },
  "2026-05-01": { en: "Labor Day", cn: "劳动节" },
  "2026-06-19": { en: "Dragon Boat Fest.", cn: "端午节" },
  "2026-10-01": { en: "National Day", cn: "国庆节" },
  "2026-10-02": { en: "National Holiday", cn: "国庆节" },
  "2026-10-06": { en: "Mid-Autumn Fest.", cn: "中秋节" },
};

// ── Month/Day names ──
const MONTHS_EN = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const MONTHS_CN = ["一月","二月","三月","四月","五月","六月","七月","八月","九月","十月","十一月","十二月"];
const DAYS_EN = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const DAYS_CN = ["日","一","二","三","四","五","六"];

const REPEAT_LABELS = { none: { en: "None", cn: "不重复" }, daily: { en: "Daily", cn: "每天" }, weekly: { en: "Weekly", cn: "每周" }, biweekly: { en: "Every 2 weeks", cn: "每两周" }, monthly: { en: "Monthly", cn: "每月" } };

function buildMonthGrid(year, month) {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const startPad = first.getDay();
  const daysInMonth = last.getDate();
  const prevLast = new Date(year, month, 0).getDate();
  const today = new Date();
  const weeks = []; let row = [];
  for (let i = startPad - 1; i >= 0; i--)
    row.push({ day: prevLast - i, other: true, dateStr: "" });
  for (let d = 1; d <= daysInMonth; d++) {
    const ds = `${year}-${String(month+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
    row.push({ day: d, dateStr: ds, other: false, today: year === today.getFullYear() && month === today.getMonth() && d === today.getDate() });
    if (row.length === 7) { weeks.push(row); row = []; }
  }
  let nd = 1;
  while (row.length < 7) { row.push({ day: nd++, other: true, dateStr: "" }); }
  if (row.length) weeks.push(row);
  return weeks;
}

function pad(n) { return String(n).padStart(2, "0"); }

function expandRecurringEvents(events, year, month, members) {
  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 0);
  const result = [];
  for (const e of events) {
    const p = e.date.split("-");
    const ed = new Date(+p[0], +p[1] - 1, +p[2]);
    if (!e.repeat || e.repeat === "none") {
      if (ed >= monthStart && ed <= monthEnd) result.push(e);
    } else {
      let cur = new Date(+p[0], +p[1] - 1, +p[2]);
      for (let i = 0; i < 366; i++) {
        if (cur > monthEnd) break;
        if (cur >= monthStart) {
          const ds = `${cur.getFullYear()}-${pad(cur.getMonth()+1)}-${pad(cur.getDate())}`;
          result.push({ ...e, date: ds, _repeatId: e.id + "_" + ds });
        }
        if (e.repeat === "daily") cur.setDate(cur.getDate() + 1);
        else if (e.repeat === "weekly") cur.setDate(cur.getDate() + 7);
        else if (e.repeat === "biweekly") cur.setDate(cur.getDate() + 14);
        else if (e.repeat === "monthly") cur.setMonth(cur.getMonth() + 1);
        else break;
      }
    }
  }
  // Auto-generate birthday events from member data
  if (members) {
    const yearStr = String(year);
    members.forEach(m => {
      if (!m.birthday) return;
      const bd = yearStr + "-" + m.birthday; // e.g. "2026-05-04"
      if (bd >= `${year}-${pad(month+1)}-01` && bd <= `${year}-${pad(month+1)}-${pad(new Date(year, month+1, 0).getDate())}`) {
        result.push({ id: "birthday_" + m.id, title: "🎂 " + m.name + (m.nameCn ? " · " + m.nameCn : ""), date: bd, startTime: "", endTime: "", location: "Lab", people: m.name, priority: 3, description: (year === new Date().getFullYear() ? "" : yearStr + " ") + "Birthday", repeat: "none", _isBirthday: true });
      }
    });
  }
  return result;
}

function priorityColor(p) {
  if (p === 1) return "var(--brick)";
  if (p === 2) return "var(--accent)";
  return "var(--ink-3)";
}

function priorityLabel(p, lang) {
  if (p === 1) return lang === "en" ? "High" : "高";
  if (p === 2) return lang === "en" ? "Medium" : "中";
  return lang === "en" ? "Low" : "低";
}

function getRepeatIcon(r) {
  if (r === "daily") return "↻";
  if (r === "weekly") return "↻";
  if (r === "biweekly") return "⇄";
  if (r === "monthly") return "↻";
  return "";
}

function CalendarPage() {
  const ctx = useApp();
  const { lang, t } = ctx;
  const today = new Date();
  const [base, setBase] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selDate, setSelDate] = useState(null);
  const [detail, setDetail] = useState(null);

  const year = base.getFullYear();
  const month = base.getMonth();
  const grid = useMemo(() => buildMonthGrid(year, month), [year, month]);
  const days = lang === "en" ? DAYS_EN : DAYS_CN;
  const months = lang === "en" ? MONTHS_EN : MONTHS_CN;

  function prev() { setBase(new Date(year, month - 1, 1)); setSelDate(null); }
  function next() { setBase(new Date(year, month + 1, 1)); setSelDate(null); }
  function goToday() { const n = new Date(); setBase(new Date(n.getFullYear(), n.getMonth(), 1)); setSelDate(null); }

  // Expand recurring events for current month view
  const D = ctx.D || window.LAB_DATA;
  const allMonthEvents = useMemo(() => expandRecurringEvents(D.events, year, month, D.members), [year, month, D.events, D.members]);

  // Group by date
  const evtMap = useMemo(() => {
    const m = {};
    allMonthEvents.forEach(e => {
      if (!m[e.date]) m[e.date] = [];
      m[e.date].push(e);
    });
    return m;
  }, [allMonthEvents]);

  // Sort events for each date
  function sortedEvents(dateStr) {
    return (evtMap[dateStr] || []).sort((a, b) => (a.startTime || "99:99").localeCompare(b.startTime || "99:99"));
  }

  const dayEvents = selDate ? sortedEvents(selDate) : [];

  // Highest priority color for a date
  function topColor(dateStr) {
    const list = evtMap[dateStr];
    if (!list || list.length === 0) return null;
    const minP = Math.min(...list.map(e => e.priority));
    return priorityColor(minP);
  }

  // Event list bar label
  function eventCountLabel(dateStr) {
    const n = (evtMap[dateStr] || []).length;
    if (n === 1) return lang === "en" ? "1 event" : "1 个日程";
    return n + (lang === "en" ? " events" : " 个日程");
  }

  return (
    <div className="page-fade container" style={{ padding: "64px 32px 0" }}>
      <div className="eyebrow" style={{ marginBottom: 16 }}>{lang === "en" ? "Calendar" : "日程"}</div>
      <h1 style={{ marginBottom: 40 }}>{lang === "en" ? "Lab events & schedule." : "实验室日程。"}</h1>

      {/* ── Month nav ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <button className="btn btn-text btn-sm" onClick={prev}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m15 18-6-6 6-6"/></svg>
        </button>
        <h2 style={{ fontSize: 26, fontFamily: "var(--serif)", fontWeight: 400, minWidth: 160, textAlign: "center" }}>
          {months[month]} {year}
        </h2>
        <button className="btn btn-text btn-sm" onClick={next}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 18 6-6-6-6"/></svg>
        </button>
        <button className="btn btn-ghost btn-sm" onClick={goToday} style={{ marginLeft: 8 }}>{lang === "en" ? "Today" : "今天"}</button>
      </div>

      {/* ── Calendar Grid ── */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 0,
        borderTop: "1px solid var(--line)", borderLeft: "1px solid var(--line)",
        marginBottom: 40, borderRadius: "var(--radius-lg) 0 0 0", overflow: "hidden",
      }}>
        {/* Day headers */}
        {days.map((d, i) => (
          <div key={d} style={{
            padding: "10px 0", textAlign: "center",
            fontFamily: "var(--mono)", fontSize: 11, fontWeight: 500,
            color: (i === 0 || i === 6) ? "var(--brick)" : "var(--ink-3)",
            letterSpacing: "0.08em", textTransform: "uppercase",
            borderRight: "1px solid var(--line)", borderBottom: "1px solid var(--line)",
            background: "var(--bg-2)",
          }}>{d}</div>
        ))}
        {/* Day cells */}
        {grid.flat().map((cell, i) => {
          const term = !cell.other && SOLAR_TERMS[cell.dateStr];
          const holiday = !cell.other && HOLIDAYS[cell.dateStr];
          const cellEvents = evtMap[cell.dateStr] || [];
          const hasEvents = cellEvents.length > 0;
          const cTop = topColor(cell.dateStr);

          return (
            <div key={i} onClick={() => { if (!cell.other) setSelDate(cell.dateStr === selDate ? null : cell.dateStr); }}
              style={{
                padding: "6px 4px", textAlign: "center", cursor: cell.other ? "default" : "pointer",
                borderRight: "1px solid var(--line)", borderBottom: "1px solid var(--line)",
                background: cell.other ? "var(--bg-2)" : cell.today ? "var(--accent-soft)" : "var(--bg)",
                color: cell.other ? "var(--ink-3)" : cell.today ? "var(--accent-2)" : "var(--ink)",
                position: "relative", minHeight: 72, transition: "background 0.1s",
                boxShadow: selDate === cell.dateStr ? `inset 0 0 0 1.5px ${cTop || "var(--accent)"}` : hasEvents ? `inset 0 -3px 0 ${cTop}` : "none",
              }}
              onMouseEnter={e => { if (!cell.other && selDate !== cell.dateStr) e.currentTarget.style.background = "var(--bg-3)"; }}
              onMouseLeave={e => { if (!cell.other && selDate !== cell.dateStr) e.currentTarget.style.background = cell.today ? "var(--accent-soft)" : "var(--bg)"; }}>
              {/* Date number */}
              <span style={{
                fontFamily: "var(--mono)", fontSize: 14, fontWeight: (cell.today || hasEvents) ? 600 : 400,
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                width: 28, height: 28, borderRadius: 100,
                background: cell.today ? "var(--accent)" : "transparent",
                color: cell.today ? "white" : hasEvents ? "var(--ink)" : undefined,
              }}>{cell.day}</span>

              {/* Event count label */}
              {hasEvents && (
                <div style={{ fontSize: 9, fontFamily: "var(--mono)", color: cTop, fontWeight: 600, marginTop: 1, lineHeight: 1.1 }}>
                  {eventCountLabel(cell.dateStr)}
                </div>
              )}

              {/* Solar term label */}
              {term && !hasEvents && (
                <div style={{ fontSize: 9, fontFamily: "var(--mono)", color: "var(--accent-2)", marginTop: 1, lineHeight: 1.1, fontWeight: 500 }}>
                  {lang === "en" ? term.en : term.cn}
                </div>
              )}

              {/* Holiday label */}
              {holiday && (
                <div style={{ fontSize: 9, fontFamily: "var(--mono)", color: "var(--brick)", marginTop: 1, lineHeight: 1.1, fontWeight: 500 }}>
                  {holiday.cn} / {holiday.en}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Day events ── */}
      {selDate && (
        <div style={{ marginBottom: 48 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, paddingBottom: 12, borderBottom: "1px solid var(--ink)" }}>
            <h3 style={{ fontSize: 20 }}>{selDate}</h3>
            <span className="chip">{dayEvents.length} {lang === "en" ? "event(s)" : "个日程"}</span>
            {(SOLAR_TERMS[selDate] || HOLIDAYS[selDate]) && (
              <span className="chip" style={{ background: HOLIDAYS[selDate] ? "var(--brick-soft)" : "var(--accent-soft)", color: HOLIDAYS[selDate] ? "var(--brick)" : "var(--accent-2)", border: "none" }}>
                {SOLAR_TERMS[selDate] ? (lang === "en" ? SOLAR_TERMS[selDate].en : SOLAR_TERMS[selDate].cn) : ""}
                {HOLIDAYS[selDate] ? (lang === "en" ? HOLIDAYS[selDate].en : HOLIDAYS[selDate].cn) : ""}
              </span>
            )}
          </div>
          {dayEvents.length === 0 ? (
            <p style={{ fontSize: 14, color: "var(--ink-3)" }}>{lang === "en" ? "No events on this day." : "当天无日程。"}</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {dayEvents.map((e, idx) => (
                <div key={e._repeatId || e.id || idx} onClick={() => setDetail(e)}
                  onMouseEnter={e => e.currentTarget.style.background = "var(--bg-3)"}
                  onMouseLeave={e => e.currentTarget.style.background = "var(--bg-2)"}
                  style={{
                    display: "flex", alignItems: "center", gap: 16,
                    padding: "12px 16px", background: "var(--bg-2)",
                    borderLeft: `4px solid ${priorityColor(e.priority)}`,
                    borderRadius: "0 var(--radius) var(--radius) 0",
                    cursor: "pointer", transition: "background 0.12s",
                  }}>
                  <div style={{ minWidth: 56, fontFamily: "var(--mono)", fontSize: 12, color: "var(--ink-3)" }}>
                    {e.startTime || (lang === "en" ? "All day" : "全天")}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 500, display: "flex", alignItems: "center", gap: 6 }}>
                      {e.repeat && e.repeat !== "none" && (
                        <span style={{ fontSize: 12 }} title={REPEAT_LABELS[e.repeat]?.[lang] || ""}>{getRepeatIcon(e.repeat)}</span>
                      )}
                      {e.title}
                    </div>
                    {e.location && <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 2 }}>{e.location}</div>}
                  </div>
                  <span className="chip" style={{ background: priorityColor(e.priority) + "20", color: priorityColor(e.priority), border: "none", fontSize: 11 }}>
                    {priorityLabel(e.priority, lang)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Event detail modal ── */}
      {detail && (
        <div className="modal-backdrop" onClick={() => setDetail(null)}>
          <div className="modal" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ width: 10, height: 10, borderRadius: 10, flexShrink: 0, background: priorityColor(detail.priority) }} />
                <h3 style={{ fontSize: 18 }}>{detail.title}</h3>
              </div>
              <button className="btn btn-text" onClick={() => setDetail(null)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
              </button>
            </div>
            <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {[
                [lang === "en" ? "Date" : "日期", detail.date],
                [lang === "en" ? "Time" : "时间", detail.startTime && detail.endTime ? `${detail.startTime} – ${detail.endTime}` : (detail.startTime || (lang === "en" ? "All day" : "全天"))],
                [lang === "en" ? "Location" : "地点", detail.location],
                [lang === "en" ? "People" : "人员", detail.people],
                [lang === "en" ? "Priority" : "优先级", priorityLabel(detail.priority, lang)],
                [lang === "en" ? "Repeat" : "重复", detail.repeat && detail.repeat !== "none" ? REPEAT_LABELS[detail.repeat]?.[lang] : (lang === "en" ? "None" : "不重复"),],
                [lang === "en" ? "Description" : "描述", detail.description],
              ].filter(([, v]) => v).map(([label, val]) => (
                <div key={label} style={{ display: "grid", gridTemplateColumns: "100px 1fr", gap: 12 }}>
                  <span className="eyebrow" style={{ paddingTop: 2 }}>{label}</span>
                  <span style={{ fontSize: 14, color: "var(--ink)", lineHeight: 1.55, whiteSpace: "pre-wrap" }}>{val}</span>
                </div>
              ))}
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost btn-sm" onClick={() => setDetail(null)}>{lang === "en" ? "Close" : "关闭"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

Object.assign(window, { CalendarPage });
