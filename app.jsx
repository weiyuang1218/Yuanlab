// Root app — orchestrates everything

function App() {
  const [route, setRouteRaw] = useState("home");
  const [lang, setLang] = useState("en");
  const [user, setUser] = useState({ role: "guest", name: "Visitor" });
  const [showLogin, setShowLogin] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [toasts, setToasts] = useState([]);

  // Persist some state for refresh-friendliness
  useEffect(() => {
    const saved = localStorage.getItem("yuanlab.state");
    if (saved) {
      try {
        const s = JSON.parse(saved);
        if (s.route) setRouteRaw(s.route);
        if (s.lang) setLang(s.lang);
        if (s.user) setUser(s.user);
        if (s.adminOpen) setAdminOpen(s.adminOpen);
      } catch (e) {}
    }
  }, []);
  useEffect(() => {
    localStorage.setItem("yuanlab.state", JSON.stringify({ route, lang, user, adminOpen }));
  }, [route, lang, user, adminOpen]);

  function setRoute(r) {
    setRouteRaw(r);
    setAdminOpen(false);
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  function signIn(username, password) {
    const a = window.LAB_DATA.accounts.find(x => x.username === username && x.password === password);
    if (!a) return false;
    setUser({ role: a.role, name: a.name, nameCn: a.nameCn, username: a.username });
    addToast((lang === "en" ? "Signed in as " : "已登录 · ") + a.name);
    return true;
  }
  function signOut() {
    setUser({ role: "guest", name: "Visitor" });
    setAdminOpen(false);
    addToast(lang === "en" ? "Signed out" : "已退出");
  }
  function addToast(text) {
    const id = Math.random().toString(36).slice(2);
    setToasts(prev => [...prev, { id, text }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 2400);
  }

  const t = window.LAB_I18N[lang];

  const ctx = {
    route, setRoute, lang, setLang, user, signIn, signOut,
    showLogin, openLogin: () => setShowLogin(true), closeLogin: () => setShowLogin(false),
    adminOpen, openAdmin: () => setAdminOpen(true), closeAdmin: () => setAdminOpen(false),
    toasts, addToast, t,
  };

  return (
    <AppCtx.Provider value={ctx}>
      <div className={lang === "cn" ? "lang-cn" : "lang-en"}>
        <Nav />
        <main>
          {adminOpen ? <AdminPage /> : (
            <>
              {route === "home" && <HomePage />}
              {route === "people" && <PeoplePage />}
              {route === "research" && <ResearchPage />}
              {route === "publications" && <PublicationsPage />}
              {route === "resources" && <ResourcesPage />}
              {route === "join" && <JoinPage />}
              {route === "contact" && <ContactPage />}
            </>
          )}
        </main>
        {!adminOpen && <Footer />}
        <LoginModal />
        <ToastStack />
      </div>
    </AppCtx.Provider>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
