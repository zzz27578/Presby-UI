const TEMPLATE_PASSWORD = "12345678";

const state = {
  topView: "home",
  activePage: "overview",
  homeStage: "intro",
  homeAccessVerified: false,
  homePasswordVisible: false,
  homePasswordDraft: "",
  homeAuthTerminalState: "idle",
  homeAuthTerminalMessage: "",
};

const uiTransitionState = {
  homeSidebarFlightCleanup: null,
  homeReturnOverlayCleanup: null,
  homeReturnTimer: null,
  isMorphingToConfig: false,
  isReturningHome: false,
};

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
const esc = (value) =>
  String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[char]);

function showToast(text, bad = false) {
  const toast = $("#toast");
  if (!toast) return;
  toast.textContent = text;
  toast.classList.toggle("bad", Boolean(bad));
  toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("show"), 2400);
}

function openDialog(title, html, mode = "") {
  $("#dialogTitle").textContent = title;
  $("#dialogBody").innerHTML = html;
  $("#dialog").className = `dialog open ${mode}`;
}

function closeDialog() {
  $("#dialog")?.classList.remove("open");
}

function syncTopViewButtons(view) {
  $$(".top-btn").forEach((button) => {
    button.classList.toggle("active", button.dataset.view === view);
  });
}

function syncShellVisibility(mode) {
  document.body.classList.toggle("template-home", mode === "home");
  document.body.classList.toggle("template-shell", mode === "shell");
}

function getContinuousSpinDelay(durationMs) {
  return `-${((performance.now() % durationMs) / 1000).toFixed(3)}s`;
}

function getContinuousAlternateDelay(durationMs) {
  return `-${((performance.now() % (durationMs * 2)) / 1000).toFixed(3)}s`;
}

function renderRadar(includeMetrics = true) {
  const targetOneDelay = getContinuousAlternateDelay(7000);
  const targetTwoDelay = getContinuousAlternateDelay(9000);
  const ticksDelay = getContinuousSpinDelay(180000);
  const outerDelay = getContinuousSpinDelay(50000);
  const innerDelay = getContinuousSpinDelay(16000);

  return `
    <div class="ark-geometry-core">
      <div class="ark-hud-stage">
        <div class="ark-cross-v"></div>
        <div class="ark-cross-h"></div>
        <div class="ark-track-target t1" style="animation-delay:${targetOneDelay};"></div>
        <div class="ark-track-target t2" style="animation-delay:${targetTwoDelay};"></div>
        ${includeMetrics ? "" : '<div class="ark-track-target t-alert"></div>'}
        <div class="ark-ring-ticks-rotor">
          <div class="ark-ring-ticks" style="--radar-ticks-delay:${ticksDelay};"></div>
        </div>
        <div class="ark-ring-outer" style="animation-delay:${outerDelay};">
          <div class="ark-orbit-node"></div>
          <div class="ark-orbit-node-opp"></div>
        </div>
        <div class="ark-ring-mid"></div>
        <div class="ark-ring-inner" style="animation-delay:${innerDelay};"></div>
        <div class="ark-core-node">
          <div class="ark-core-cross-h"></div>
          <div class="ark-core-cross-v"></div>
        </div>
        <div class="ark-deg-label top">000<span class="micro">N-POLE.SYS</span></div>
        <div class="ark-deg-label right">090<span class="micro">E-POLE.SYS</span></div>
        <div class="ark-deg-label bottom">180<span class="micro">S-POLE.SYS</span></div>
        <div class="ark-deg-label left">270<span class="micro">W-POLE.SYS</span></div>
        ${
          includeMetrics
            ? `<div class="ark-hud-metrics">
                <div>RADAR_SYNC // <span class="ark-highlight">STABLE</span></div>
                <div>GEO.LOCK // ACTIVE</div>
                <div>ORBIT_VEL // 0.08X</div>
                <div class="ark-hud-barcode"></div>
              </div>`
            : ""
        }
      </div>
    </div>`;
}

function getHomeAccessEyeIcon(visible) {
  return visible
    ? '<svg viewBox="0 0 24 24" fill="none"><path d="M3 3L21 21" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M10.58 10.58A2 2 0 0 0 13.41 13.41" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>'
    : '<svg viewBox="0 0 24 24" fill="none"><path d="M1.5 12C2.73 8.29 6.77 4.9 12 4.9S21.27 8.29 22.5 12C21.27 15.71 17.23 19.1 12 19.1S2.73 15.71 1.5 12Z" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.8"/></svg>';
}

function getHomeAuthStatusSnapshot(panelReady) {
  if (panelReady) return { statusClass: "is-success", statusValue: "ACCESS LINKED", terminalState: "SYNC GREEN" };
  if (state.homeAuthTerminalState === "verifying") return { statusClass: "", statusValue: "SIGNATURE CHECK", terminalState: "LOCAL HASH" };
  if (state.homeAuthTerminalState === "error") return { statusClass: "is-error", statusValue: "ACCESS DENIED", terminalState: "FAULT TRACE" };
  return { statusClass: "", statusValue: "AWAITING CREDENTIAL", terminalState: "IDLE LISTEN" };
}

function getHomeAuthTerminalLines(panelReady) {
  if (panelReady) {
    return [
      ["root@terra", "template-auth --handshake", ""],
      ["[ OK ]", "Local credential accepted. No backend route required.", "is-success"],
      ["[ OK ]", "Industrial vitality shell mounted.", "is-success"],
      ["root@terra", "Design template ready for inspection.", "is-success"],
    ];
  }
  if (state.homeAuthTerminalState === "verifying") {
    return [
      ["root@terra", "template-auth --verify local.key", ""],
      ["[PROC]", "Checking static password 12345678...", ""],
      ["[INFO]", "No network request will be sent.", "is-muted"],
      ["[PROC]", "Preparing shell transition.", "is-warn"],
    ];
  }
  if (state.homeAuthTerminalState === "error") {
    return [
      ["root@terra", "template-auth --verify local.key", ""],
      ["[FAIL]", state.homeAuthTerminalMessage || "Invalid template password.", "is-error"],
      ["[HINT]", "Use 12345678 for this public template.", "is-error"],
      ["[WAIT]", "Retry credential input.", "is-muted"],
    ];
  }
  return [
    ["root@terra", "systemctl status template-auth", ""],
    ["[INFO]", "Local-only authentication daemon prepared.", ""],
    ["[WAIT]", "Awaiting operator credential input...", "is-muted"],
    ["[WAIT]", "Default password: 12345678", "is-muted"],
  ];
}

function renderHome() {
  const panelReady = state.homeStage === "ready";
  const stageClass = panelReady ? "stage-ready" : state.homeStage === "auth" ? "stage-auth" : "stage-intro";
  const alertClass = state.homeAuthTerminalState === "error" ? "auth-alert" : "";
  const authSnapshot = getHomeAuthStatusSnapshot(panelReady);
  const terminalLines = getHomeAuthTerminalLines(panelReady);

  $("#page-home").innerHTML = `
    <div class="home-showcase ${stageClass} ${alertClass}">
      <div class="showcase-noise"></div>
      <div class="showcase-grid-bg"></div>
      <div class="home-splash ark-splash">
        <div class="ark-bg-watermark"><span>TERRA</span><br><span>SYSTEM</span></div>
        <div class="ark-baseline"></div>
        ${renderRadar(true)}
        <div class="home-splash-core ark-hero-core">
          <div class="ark-header-block">
            <div class="home-splash-kicker ark-kicker">
              <span class="ark-blink-rect"></span>
              <span>// INDUSTRIAL VITALITY // TEMPLATE.READY</span>
            </div>
            <h1 class="home-splash-title ark-title">工业与生机</h1>
            <div class="ark-subtitle-en">BIO INDUSTRIAL UI TEMPLATE</div>
          </div>
          <div class="home-splash-actions ark-actions">
            <button class="ark-login-btn" onclick="beginHomeLoginFlow()">
              <span class="ark-btn-text">SYSTEM LOGIN // 登录模板</span>
              <svg class="ark-btn-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M5 12h14M12 5l7 7-7 7" stroke-width="2"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
      <div class="showcase-left">
        <div class="sc-crosshair" style="top:48px;left:48px;"></div>
        <div class="sc-crosshair" style="bottom:48px;right:48px;"></div>
        <div class="home-auth-shell">
          ${renderRadar(false)}
          <div class="home-auth-left-main">
            <div class="home-auth-heading">
              <div class="home-auth-kicker">TEMPLATE ACCESS // STAGE 01</div>
              <h1 class="home-auth-title">工业与生机</h1>
            </div>
            <div class="home-auth-meta">
              <div class="home-auth-status ${authSnapshot.statusClass}">
                <span class="home-auth-status-rail"></span>
                <span class="home-auth-status-label">ACCESS STATE</span>
                <span class="home-auth-status-value">${authSnapshot.statusValue}</span>
              </div>
            </div>
          </div>
          <div class="home-terminal-block">
            <div class="home-terminal-head">
              <div class="home-terminal-title">SYS.FEED // LOCAL CONSOLE</div>
              <div class="home-terminal-state">${authSnapshot.terminalState}</div>
            </div>
            <div class="home-terminal-panel">
              ${terminalLines.map(([prefix, text, level], index) => `
                <div class="home-terminal-line ${level}" style="--line-delay:${(index * 0.4).toFixed(2)}s;">
                  <span class="home-terminal-prefix">${prefix}</span>
                  <span class="home-terminal-content">${esc(text)}</span>
                </div>`).join("")}
            </div>
          </div>
        </div>
      </div>
      <div class="showcase-right">
        <div class="home-login-shell">
          <div class="home-login-card ${panelReady ? "is-ready" : "is-auth"} ${state.homeAuthTerminalState === "verifying" ? "is-verifying" : ""} ${state.homeAuthTerminalState === "error" ? "is-error shake-error" : ""}">
            <div class="home-login-kicker">模板权限核验</div>
            <div class="home-login-title ${panelReady ? "is-ready" : ""}">
              <span class="home-login-title-text">${panelReady ? "欢迎回来" : "身份验证"}</span>
            </div>
            <div class="home-login-status-bar"></div>
            ${panelReady ? "" : '<div class="home-login-desc">输入模板口令后完成本地验证</div>'}
            <div class="home-login-body">
              ${
                panelReady
                  ? `<div class="home-login-ready-panel">
                      <div class="home-login-ready-row">
                        <div class="home-ready-label"><b>验证状态</b><span>本地模板口令已通过</span></div>
                        <div class="home-ready-value"><span class="home-ready-dot"></span>模板操作者</div>
                      </div>
                      <div class="home-login-ready-row">
                        <div class="home-ready-label"><b>可用内容</b><span>当前模板开放的展示范围</span></div>
                        <div class="row" style="justify-content:flex-end;flex-wrap:wrap;gap:6px;max-width:360px;">
                          <span class="badge">本地预览</span>
                          <span class="badge light">元素复用</span>
                          <span class="badge light">无后端依赖</span>
                        </div>
                      </div>
                    </div>`
                  : `<div class="field">
                      <label>访问口令</label>
                      <div class="password-input-wrap">
                        <input class="input" id="homeInlinePassword" type="${state.homePasswordVisible ? "text" : "password"}" value="${esc(state.homePasswordDraft)}" placeholder="输入访问口令" oninput="state.homePasswordDraft=this.value;" onkeydown="if(event.key === 'Enter') submitHomeAccess()">
                        <button class="password-eye-btn ${state.homePasswordVisible ? "is-active" : ""}" id="homePasswordToggle" type="button" onclick="toggleHomeAccessVisibility()">${getHomeAccessEyeIcon(state.homePasswordVisible)}</button>
                      </div>
                      <div class="home-login-message-slot">
                        ${state.homeAuthTerminalState === "error" ? '<div class="home-login-error-msg">访问拒绝：请使用模板口令 12345678。</div>' : '<div class="home-login-inline-note">默认口令为 <b>12345678</b>，用于公开模板预览。</div>'}
                      </div>
                    </div>`
              }
            </div>
            <div class="home-login-actions ${panelReady ? "is-ready" : "is-auth"}">
              ${
                panelReady
                  ? `<button class="btn-strong" id="homeInlineInitBtn" type="button" onclick="triggerSystemMorph()"><span class="btn-text">初始化并接入</span></button>
                     <button class="btn" type="button" onclick="restartHomeVerification()"><span class="btn-text">重新验证</span></button>`
                  : '<button class="btn-strong" type="button" onclick="submitHomeAccess()"><span class="btn-text">验证口令</span></button>'
              }
              <button class="btn" type="button" onclick="returnHomeIntro()"><span class="btn-text">返回首页</span></button>
            </div>
          </div>
        </div>
      </div>
    </div>`;

  if (state.homeStage === "auth") setTimeout(() => $("#homeInlinePassword")?.focus(), 30);
}

function beginHomeLoginFlow() {
  if (state.homeStage !== "intro") return;
  const showcase = document.querySelector(".home-showcase");
  if (!showcase) {
    state.homeStage = "auth";
    renderHome();
    return;
  }
  showcase.classList.add("intro-collapse");
  setTimeout(() => {
    state.homeStage = "auth";
    showcase.classList.remove("stage-intro", "intro-collapse");
    showcase.classList.add("stage-auth");
    $("#homeInlinePassword")?.focus();
  }, 620);
}

function toggleHomeAccessVisibility() {
  state.homePasswordVisible = !state.homePasswordVisible;
  renderHome();
}

async function submitHomeAccess() {
  const password = ($("#homeInlinePassword")?.value || state.homePasswordDraft || "").trim();
  if (password !== TEMPLATE_PASSWORD) {
    state.homeAccessVerified = false;
    state.homeStage = "auth";
    state.homeAuthTerminalState = "error";
    state.homeAuthTerminalMessage = "模板口令不匹配；请使用 12345678。";
    renderHome();
    showToast("口令错误，模板默认口令为 12345678。", true);
    return;
  }
  state.homePasswordDraft = password;
  state.homeAuthTerminalState = "verifying";
  renderHome();
  await new Promise((resolve) => setTimeout(resolve, 520));
  state.homeAccessVerified = true;
  state.homeStage = "ready";
  state.homePasswordDraft = "";
  state.homeAuthTerminalState = "success";
  renderHome();
  showToast("模板登录成功。入口动画与界面骨架已解锁。");
}

function restartHomeVerification() {
  state.homeAccessVerified = false;
  state.homePasswordVisible = false;
  state.homePasswordDraft = "";
  state.homeAuthTerminalState = "idle";
  state.homeStage = "auth";
  renderHome();
}

function returnHomeIntro() {
  const showcase = document.querySelector(".home-showcase");
  if (!showcase || state.homeStage === "intro") {
    state.homeStage = "intro";
    renderHome();
    return;
  }
  showcase.classList.add("return-home");
  setTimeout(() => {
    state.homeStage = "intro";
    renderHome();
  }, 620);
}

function createHomeSidebarFlight(showcase) {
  const source = showcase?.querySelector(".showcase-left");
  const target = $(".glass-side");
  if (!source || !target) return;
  const sourceRect = source.getBoundingClientRect();
  const targetRect = target.getBoundingClientRect();
  const flight = document.createElement("div");
  flight.className = "home-sidebar-flight";
  flight.style.left = `${sourceRect.left}px`;
  flight.style.top = `${sourceRect.top}px`;
  flight.style.width = `${sourceRect.width}px`;
  flight.style.height = `${sourceRect.height}px`;
  document.body.appendChild(flight);
  uiTransitionState.homeSidebarFlightCleanup = () => flight.remove();
  requestAnimationFrame(() => requestAnimationFrame(() => {
    flight.classList.add("is-active");
    flight.style.left = "0px";
    flight.style.top = "0px";
    flight.style.width = `${Math.round(targetRect.width)}px`;
    flight.style.height = `${window.innerHeight || targetRect.height}px`;
  }));
}

function removeHomeSidebarFlight() {
  if (uiTransitionState.homeSidebarFlightCleanup) uiTransitionState.homeSidebarFlightCleanup();
  uiTransitionState.homeSidebarFlightCleanup = null;
}

function removeHomeReturnOverlay() {
  if (uiTransitionState.homeReturnOverlayCleanup) uiTransitionState.homeReturnOverlayCleanup();
  uiTransitionState.homeReturnOverlayCleanup = null;
}

function createHomeReturnOverlay() {
  removeHomeReturnOverlay();
  const overlay = document.createElement("div");
  overlay.className = "home-return-overlay";
  overlay.innerHTML = '<div class="return-white"></div><div class="return-top"></div>';
  document.body.appendChild(overlay);
  uiTransitionState.homeReturnOverlayCleanup = () => overlay.remove();
  requestAnimationFrame(() => requestAnimationFrame(() => overlay.classList.add("is-active")));
}

function transitionShellToHomeReady() {
  if (uiTransitionState.isReturningHome) return;
  uiTransitionState.isReturningHome = true;
  removeHomeSidebarFlight();
  state.topView = "home";
  state.homeAccessVerified = true;
  state.homeStage = "ready";
  syncTopViewButtons("home");
  renderHome();

  const appLayout = $(".app-layout");
  const homePages = $("#homePages");
  const homePage = $("#page-home");
  const showcase = document.querySelector(".home-showcase");
  if (!appLayout || !homePages || !homePage || !showcase) {
    syncShellVisibility("home");
    uiTransitionState.isReturningHome = false;
    return;
  }

  homePages.style.display = "block";
  homePage.classList.add("home-shell-return", "home-return-target");
  createHomeReturnOverlay();
  appLayout.classList.remove("ui-shell-pre-enter", "ui-shell-enter", "ui-shell-body-hold", "ui-shell-side-hold");
  appLayout.classList.add("ui-shell-home-exit");

  clearTimeout(uiTransitionState.homeReturnTimer);
  uiTransitionState.homeReturnTimer = setTimeout(() => {
    $(".glass-side").style.display = "none";
    $(".glass-top").style.display = "none";
    $(".shard-header").style.display = "none";
    $("#configPages").style.display = "none";
    $("#statsPages").style.display = "none";
    $("#visitorPages").style.display = "none";
    $(".toolbar-actions").style.display = "none";
    appLayout.classList.remove("ui-shell-home-exit");
    homePage.classList.remove("home-shell-return", "home-return-target");
    showcase.classList.remove("shell-return-prep", "shell-return-active");
    removeHomeReturnOverlay();
    syncShellVisibility("home");
    uiTransitionState.homeReturnTimer = null;
    uiTransitionState.isReturningHome = false;
  }, 520);
}

function triggerSystemMorph() {
  if (!state.homeAccessVerified) return;
  const showcase = document.querySelector(".home-showcase");
  if (!showcase || uiTransitionState.isMorphingToConfig) return;
  uiTransitionState.isMorphingToConfig = true;
  state.topView = "main1";
  syncTopViewButtons("main1");
  syncShellVisibility("shell");
  $(".glass-top").style.display = "flex";
  $(".glass-side").style.display = "flex";
  $("#configPages").style.display = "block";
  $("#statsPages").style.display = "none";
  $("#visitorPages").style.display = "none";
  $(".toolbar-actions").style.display = "flex";
  $(".shard-header").style.display = "flex";
  setPage("overview");
  const appLayout = $(".app-layout");
  appLayout.classList.add("ui-shell-pre-enter", "ui-shell-body-hold", "ui-shell-side-hold");
  createHomeSidebarFlight(showcase);
  showcase.classList.add("morph-active");
  setTimeout(() => {
    appLayout.classList.remove("ui-shell-pre-enter");
    appLayout.classList.add("ui-shell-enter");
  }, 160);
  setTimeout(() => appLayout.classList.remove("ui-shell-body-hold"), 235);
  setTimeout(() => {
    $("#homePages").style.display = "none";
    showcase.classList.remove("morph-active");
    removeHomeSidebarFlight();
    appLayout.classList.remove("ui-shell-side-hold", "ui-shell-enter");
    uiTransitionState.isMorphingToConfig = false;
  }, 455);
}

function setTopView(view) {
  if (view === "home") {
    const wasInShell = state.topView !== "home" && getComputedStyle($("#configPages")).display !== "none";
    if (wasInShell && state.homeAccessVerified) {
      transitionShellToHomeReady();
      return;
    }
    state.topView = "home";
    state.homeStage = state.homeAccessVerified ? "ready" : "intro";
    syncTopViewButtons("home");
    syncShellVisibility("home");
    $("#homePages").style.display = "block";
    $("#configPages").style.display = "none";
    $("#statsPages").style.display = "none";
    $("#visitorPages").style.display = "none";
    $(".glass-top").style.display = "none";
    $(".glass-side").style.display = "none";
    $(".shard-header").style.display = "none";
    $(".toolbar-actions").style.display = "none";
    renderHome();
    return;
  }
  state.topView = view;
  syncTopViewButtons(view);
  syncShellVisibility("shell");
  $("#homePages").style.display = "none";
  $("#configPages").style.display = "block";
  $("#statsPages").style.display = "none";
  $("#visitorPages").style.display = "none";
  $(".glass-top").style.display = "flex";
  $(".glass-side").style.display = "flex";
  $(".shard-header").style.display = "flex";
  setPage(view === "main1" ? "overview" : view === "main2" ? "signin" : "runtime");
}

function setPage(page) {
  state.activePage = page;
  $$(".nav-btn").forEach((button) => button.classList.toggle("active", button.dataset.page === page));
  $$("#configPages .page").forEach((pageEl) => pageEl.classList.toggle("active", pageEl.id === `page-${page}`));
  const meta = {
    overview: ["模板总览", "保留扫描线、硬边面板与黑绿工业骨架的主展示页。"],
    runtime: ["按钮系统", "展示主按钮、轮廓按钮、危险按钮、状态切换与行动组。"],
    panelcfg: ["表单元素", "展示输入框、选择器、检查项与说明文本。"],
    signin: ["图表展示", "展示环形图、横向条、KPI 卡片和数据说明。"],
    fate: ["卡片矩阵", "展示内容卡、状态卡、资源卡和悬停层级。"],
    cards: ["弹窗反馈", "展示弹窗、提示、标签、空状态和操作反馈。"],
    titles: ["布局切片", "展示可组合页面区块和响应式栅格。"],
  }[page];
  const heroTitle = $("#heroTitle");
  const heroDesc = $("#heroDesc");
  if (heroTitle) heroTitle.textContent = meta[0];
  if (heroDesc) heroDesc.textContent = meta[1];
  renderActivePage();
}

function renderOverview() {
  const cards = [
    ["按钮系统", "直角边界、强对比反馈、主次危险三类动作。", "runtime"],
    ["表单元素", "输入、选择、说明文本与密集配置区块。", "panelcfg"],
    ["图表展示", "工业仪表、数据条和概率圆盘分布。", "signin"],
  ];
  $("#page-overview").innerHTML = `
    <div class="grid">
      <section class="panel col-8">
        <div class="panel-head">
          <div>
            <div class="panel-title">模板主控台</div>
            <div class="panel-note">保留原方案配置页的结构感、绿色扫描线和硬边卡片，用组件说明替换插件业务。</div>
          </div>
          <button class="btn-strong" onclick="showToast('扫描线、卡片和状态层级都保留在模板中。')"><span class="btn-text">运行展示</span></button>
        </div>
        <div class="profile-list" style="display:grid;gap:16px;">
          ${cards.map(([title, note, target], index) => `
            <article class="profile-card ${index === 0 ? "active" : ""}">
              <div class="scan-beam"></div>
              <div class="profile-main">
                <div class="panel-title">${title}</div>
                <div class="panel-note" style="margin-top:8px;">${note}</div>
                <div class="row" style="margin-top:12px;">
                  <span class="badge">STYLE TOKEN</span>
                  <span class="badge light">可复用组件</span>
                </div>
              </div>
              <div class="profile-hud-slot">
                <button class="hud-switch-btn" onclick="setPage('${target}')">
                  <span class="hud-text">切换至此</span>
                  <svg class="hud-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                </button>
              </div>
            </article>`).join("")}
        </div>
      </section>
      <section class="panel col-4">
        <div class="panel-title">结构说明</div>
        <div class="panel-note">这里不是假装配置数据，而是作为模板入口，直接跳转到可复用元素页。</div>
        <div class="field" style="margin-top:16px;">
          <label>视觉关键词</label>
          <div class="tag-preview"><span class="badge">工业装甲</span><span class="badge">生机绿</span><span class="badge">雷达几何</span></div>
        </div>
        <div class="field" style="margin-top:16px;">
          <label>默认口令</label>
          <input class="input" value="12345678" readonly>
        </div>
      </section>
    </div>`;
}

function renderButtons() {
  $("#page-runtime").innerHTML = `
    <div class="grid">
      <section class="panel col-7">
        <div class="panel-title">按钮与动作组</div>
        <div class="panel-note">用于后台模板里的主要操作、次级操作和危险操作。</div>
        <div class="row" style="gap:12px;flex-wrap:wrap;margin-top:18px;">
          <button class="btn-strong" onclick="showToast('主按钮触发成功')"><span class="btn-text">主行动</span></button>
          <button class="btn" onclick="showToast('次级按钮触发成功')"><span class="btn-text">次级行动</span></button>
          <button class="btn outline-btn" onclick="showToast('轮廓按钮触发成功')"><span class="btn-text">轮廓行动</span></button>
          <button class="btn-danger" onclick="showToast('危险按钮仅作展示', true)"><span class="btn-text">危险行动</span></button>
        </div>
      </section>
      <section class="panel col-5">
        <div class="panel-title">状态标签</div>
        <div class="row" style="margin-top:14px;gap:8px;flex-wrap:wrap;">
          <span class="badge">ACTIVE</span><span class="badge light">STANDBY</span><span class="badge">SYNC</span><span class="badge light">LOCAL</span>
        </div>
      </section>
    </div>`;
}

function renderForms() {
  $("#page-panelcfg").innerHTML = `
    <div class="grid">
      <section class="panel col-12">
        <div class="panel-title">表单元素</div>
        <div class="panel-note">适合设置页、生成器、筛选器和编辑面板。</div>
        <div class="field-grid three" style="margin-top:16px;">
          <div class="field"><label>文本输入</label><input class="input" value="工业与生机"></div>
          <div class="field"><label>选择器</label><select class="select"><option>黑绿装甲</option><option>浅色碎片</option></select></div>
          <div class="field"><label>数值输入</label><input class="input" type="number" value="72"></div>
        </div>
        <div class="field" style="margin-top:16px;">
          <label>说明文本</label>
          <textarea class="textarea" rows="4">保留艺术元素时，文案应解释组件用途，而不是绑定具体插件业务。</textarea>
        </div>
      </section>
    </div>`;
}

function renderCharts() {
  const bars = [["CHASSIS", 92], ["RADAR", 84], ["SHARD", 76], ["SIGNAL", 88]];
  $("#page-signin").innerHTML = `
    <div class="grid">
      <section class="col-12 kpi-zone">
        <article class="kpi-hardcore" style="--kpi-color:#1A9E5E;"><div class="kpi-hardcore-title"><span>装甲骨架</span></div><div class="kpi-hardcore-value">L-01</div><div class="kpi-hardcore-sub">TOP / SIDE SHELL</div></article>
        <article class="kpi-hardcore" style="--kpi-color:#58a7ff;"><div class="kpi-hardcore-title"><span>概率圆盘</span></div><div class="kpi-hardcore-value">100</div><div class="kpi-hardcore-sub">WEIGHT TOTAL</div></article>
        <article class="kpi-hardcore" style="--kpi-color:#ffbf5f;"><div class="kpi-hardcore-title"><span>本地依赖</span></div><div class="kpi-hardcore-value">0</div><div class="kpi-hardcore-sub">DOUBLE CLICK READY</div></article>
      </section>
      <section class="chart-box col-8" style="padding:0;">
        <div style="padding:24px 24px 12px;">
          <div class="chart-title">信号分配板</div>
          <div class="chart-note">用更接近控制面板的电路条替换普通图表。</div>
        </div>
        <div class="template-circuit-board">
          ${bars.map(([name, value]) => `
            <div class="template-circuit-row">
              <div class="template-circuit-label">${name}</div>
              <div class="template-circuit-track"><div class="template-circuit-fill" style="width:${value}%;"></div></div>
              <div class="template-circuit-value">${value}%</div>
            </div>`).join("")}
        </div>
      </section>
      <section class="chart-box col-4" style="padding:0;">
        <div style="padding:24px 24px 12px;">
          <div class="chart-title">概率圆盘分布</div>
          <div class="chart-note">复用插件内的稀有度权重分析圆盘。</div>
        </div>
        <div class="rarity-ring-wrap" style="width:auto;border-left:0;padding:18px 28px 28px;">
          <div class="rarity-ring" style="background:conic-gradient(#6f7d8e 0% 42%, #58a7ff 42% 68%, #9f6cff 68% 84%, #ffbf5f 84% 96%, #ff7078 96% 100%);">
            <div class="rarity-ring-center"><div><b>100</b><span>权重总和</span></div></div>
          </div>
          <div class="rarity-legend">
            <div class="rarity-legend-item"><div class="rarity-dot-wrap"><span class="rarity-dot" style="--dot-color:#6f7d8e"></span><span>普通</span></div><span class="rarity-pct">42.0%</span></div>
            <div class="rarity-legend-item"><div class="rarity-dot-wrap"><span class="rarity-dot" style="--dot-color:#58a7ff"></span><span>稀有</span></div><span class="rarity-pct">26.0%</span></div>
            <div class="rarity-legend-item"><div class="rarity-dot-wrap"><span class="rarity-dot" style="--dot-color:#9f6cff"></span><span>史诗</span></div><span class="rarity-pct">16.0%</span></div>
            <div class="rarity-legend-item"><div class="rarity-dot-wrap"><span class="rarity-dot" style="--dot-color:#ffbf5f"></span><span>传说</span></div><span class="rarity-pct">12.0%</span></div>
            <div class="rarity-legend-item"><div class="rarity-dot-wrap"><span class="rarity-dot" style="--dot-color:#ff7078"></span><span>神话</span></div><span class="rarity-pct">4.0%</span></div>
          </div>
        </div>
      </section>
    </div>`;
}

function renderCards() {
  $("#page-fate").innerHTML = `<div class="grid">${["信息卡片", "资源卡片", "状态卡片", "内容卡片"].map((title, index) => `
    <section class="panel col-6">
      <div class="panel-head"><div><div class="panel-title">${title}</div><div class="panel-note">用于模板页面里的重复内容块 #0${index + 1}</div></div><span class="badge ${index % 2 ? "light" : ""}">CARD</span></div>
      <div class="tag-preview">硬边边框、淡色表面、绿色强调线和紧凑信息密度。</div>
    </section>`).join("")}</div>`;
}

function renderDialogs() {
  $("#page-cards").innerHTML = `
    <div class="grid">
      <section class="panel col-12">
        <div class="panel-title">弹窗与反馈</div>
        <div class="panel-note">点击按钮查看模板中的弹窗与提示层。</div>
        <div class="row" style="gap:12px;margin-top:16px;">
          <button class="btn-strong" onclick="openDialog('模板弹窗', '<div class=&quot;panel-note&quot;>这是保留原视觉语言的通用弹窗。适合放编辑器、确认信息或组件说明。</div><div class=&quot;row&quot; style=&quot;margin-top:16px;&quot;><button class=&quot;btn-strong&quot; onclick=&quot;closeDialog()&quot;><span class=&quot;btn-text&quot;>确认</span></button></div>')"><span class="btn-text">打开弹窗</span></button>
          <button class="btn" onclick="showToast('这是模板提示条')"><span class="btn-text">显示提示</span></button>
          <button class="btn-danger" onclick="showToast('这是危险提示样式', true)"><span class="btn-text">危险提示</span></button>
        </div>
      </section>
    </div>`;
}

function renderLayouts() {
  $("#page-titles").innerHTML = `
    <div class="grid">
      <section class="panel col-4"><div class="panel-title">左侧信息</div><div class="panel-note">适合放索引、摘要、状态。</div></section>
      <section class="panel col-8"><div class="panel-title">右侧主体</div><div class="panel-note">适合放主要表格、编辑器或内容流。</div></section>
      <section class="panel col-12"><div class="panel-title">整行模块</div><div class="panel-note">用于关键流程、图表区域或长说明。</div></section>
    </div>`;
}

function renderActivePage() {
  const renderers = {
    overview: renderOverview,
    runtime: renderButtons,
    panelcfg: renderForms,
    signin: renderCharts,
    fate: renderCards,
    cards: renderDialogs,
    titles: renderLayouts,
  };
  (renderers[state.activePage] || renderOverview)();
}

function bindEvents() {
  $$(".nav-btn").forEach((button) => button.addEventListener("click", () => setPage(button.dataset.page)));
  $("#reloadBtn")?.addEventListener("click", () => {
    renderActivePage();
    showToast("演示页面已重载。");
  });
  $("#saveAllBtn")?.addEventListener("click", () => showToast("本模板无后端保存，状态仅用于本地演示。"));
  $(".dialog-backdrop")?.addEventListener("click", closeDialog);
}

function bootstrapWebUi() {
  document.body.classList.add("ui-ready");
  syncShellVisibility("home");
  $(".glass-top").style.display = "none";
  $(".glass-side").style.display = "none";
  $(".shard-header").style.display = "none";
  $("#configPages").style.display = "none";
  $("#statsPages").style.display = "none";
  $("#visitorPages").style.display = "none";
  $("#homePages").style.display = "block";
  syncTopViewButtons("home");
  bindEvents();
  renderHome();
  renderOverview();
}

Object.assign(window, {
  setTopView,
  setPage,
  beginHomeLoginFlow,
  submitHomeAccess,
  restartHomeVerification,
  returnHomeIntro,
  triggerSystemMorph,
  toggleHomeAccessVisibility,
  openDialog,
  closeDialog,
  showToast,
});

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bootstrapWebUi, { once: true });
} else {
  bootstrapWebUi();
}
