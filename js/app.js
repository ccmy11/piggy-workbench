/* app.js — 渲染 + 事件委托 + 通用弹窗 */
(function () {
  const S = window.Store, C = window.Charts;
  const $ = function (sel) { return document.querySelector(sel); };
  const $$ = function (sel) { return Array.prototype.slice.call(document.querySelectorAll(sel)); };
  const esc = function (s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); };
  const fmtMoney = function (n) { return "¥" + (Math.round(n * 100) / 100).toLocaleString("zh-CN", { maximumFractionDigits: 2 }); };
  const PALETTE = ["#d63a76", "#f08bb3", "#f6b93b", "#5b8ff9", "#e07a7a", "#9a7ff1", "#4ec9c1", "#f19a5b"];

  /* ================= 单词发音 ================= */
  function pickVoice() {
    if (!("speechSynthesis" in window)) return null;
    const vs = window.speechSynthesis.getVoices() || [];
    // 优先英式（与音标一致），其次任意英语发音
    for (let i = 0; i < vs.length; i++) if (/^en[-_]GB/i.test(vs[i].lang)) return vs[i];
    for (let i = 0; i < vs.length; i++) if (/^en/i.test(vs[i].lang)) return vs[i];
    return null;
  }
  function speak(text) {
    text = String(text || "").trim();
    if (!text) return;
    if (!("speechSynthesis" in window) || !window.SpeechSynthesisUtterance) {
      toast("当前浏览器不支持朗读 😢");
      return;
    }
    try {
      window.speechSynthesis.cancel(); // 连点时不排队，直接读新词
      const u = new SpeechSynthesisUtterance(text);
      const v = pickVoice();
      u.lang = v ? v.lang : "en-GB";
      if (v) u.voice = v;
      u.rate = 0.9;
      window.speechSynthesis.speak(u);
    } catch (err) {
      toast("朗读失败，换个浏览器试试");
    }
  }

  let cur = "home";
  let enFilter = "all", newsFilter = "全部";
  const state = { enFilter: "all", newsFilter: "全部", exMonth: S.today().slice(0, 7) };

  const VIEW_TITLE = { home: "小猪工作台", english: "📚 英语学习", exam: "🎓 考试倒计时", workout: "💪 锻炼打卡", news: "📰 财经热点", money: "💰 攒钱计划", expense: "🧾 记账本" };

  /* ================= 通用弹窗 ================= */
  function openSheet(opt) {
    const root = $("#modalRoot");
    let body = "";
    (opt.fields || []).forEach(function (f, i) {
      if (f.type === "chips") {
        body += '<div class="f-row"><label class="f-lab">' + esc(f.label) + '</label><div class="chips" data-k="' + f.key + '" data-chip="1">' +
          f.options.map(function (o) { return '<button type="button" class="chip' + (o === f.value ? " on" : "") + '" data-v="' + esc(o) + '">' + esc(o) + "</button>"; }).join("") +
          '</div></div>';
      } else if (f.type === "textarea") {
        body += '<div class="f-row"><label class="f-lab">' + esc(f.label) + '</label><textarea class="f-ta" data-k="' + f.key + '" placeholder="' + esc(f.ph || "") + '">' + esc(f.value || "") + "</textarea></div>";
      } else {
        body += '<div class="f-row"><label class="f-lab">' + esc(f.label) + '</label><input class="f-in" type="' + f.type + '" data-k="' + f.key + '" value="' + esc(f.value || "") + '" placeholder="' + esc(f.ph || "") + '"></div>';
      }
    });
    let btns = '<button class="btn ghost" data-sheet-cancel>取消</button><button class="btn primary" data-sheet-ok>' + esc(opt.okText || "保存") + "</button>";
    if (opt.buttons) {
      btns = opt.buttons.map(function (b) {
        return '<button class="btn ' + b.cls + '" data-sheet-x="' + b.act + '">' + esc(b.text) + "</button>";
      }).join("");
    }
    root.innerHTML = '<div class="sheet-mask"><div class="sheet">' +
      '<div class="sheet-h"><span class="sheet-t">' + esc(opt.title) + '</span><button class="icon-btn" data-sheet-cancel>✕</button></div>' +
      body + '<div class="sheet-btns">' + btns + "</div></div></div>";
    root.classList.add("open");

    // chips 交互
    root.querySelectorAll("[data-chip]").forEach(function (g) {
      g.addEventListener("click", function (e) {
        const c = e.target.closest(".chip");
        if (!c) return;
        g.querySelectorAll(".chip").forEach(function (x) { x.classList.remove("on"); });
        c.classList.add("on");
      });
    });

    function close() { root.classList.remove("open"); root.innerHTML = ""; }
    root.querySelector(".sheet-mask").addEventListener("click", function (e) {
      if (e.target === e.currentTarget) close();
    });
    root.querySelectorAll("[data-sheet-cancel]").forEach(function (b) { b.addEventListener("click", close); });
    root.querySelectorAll("[data-sheet-x]").forEach(function (b) {
      b.addEventListener("click", function () { close(); const act = b.getAttribute("data-sheet-x"); if (ACT[act]) ACT[act](); });
    });
    const ok = root.querySelector("[data-sheet-ok]");
    if (ok) ok.addEventListener("click", function () {
      const vals = {};
      root.querySelectorAll("[data-k]").forEach(function (inp) {
        if (inp.hasAttribute("data-chip")) {
          const on = inp.querySelector(".chip.on");
          vals[inp.getAttribute("data-k")] = on ? on.getAttribute("data-v") : "";
        } else vals[inp.getAttribute("data-k")] = inp.value.trim();
      });
      const r = opt.onSubmit(vals);
      if (r !== false) close();
    });
    return close;
  }
  function toast(msg) {
    const t = $("#toast");
    t.textContent = msg; t.classList.add("show");
    clearTimeout(t._tm); t._tm = setTimeout(function () { t.classList.remove("show"); }, 1800);
  }
  const num = function (v) { const n = parseFloat(v); return isNaN(n) ? null : n; };
  const need = function (vals, keys) {
    for (let i = 0; i < keys.length; i++) if (!vals[keys[i]]) { toast("还有内容没填哦～"); return false; }
    return true;
  };

  /* ================= 抽屉 ================= */
  function openDrawer() { $("#drawer").classList.add("open"); $("#scrim").classList.add("open"); }
  function closeDrawer() { $("#drawer").classList.remove("open"); $("#scrim").classList.remove("open"); }

  /* ================= 视图切换 ================= */
  function switchView(v) {
    cur = v;
    $$(".view").forEach(function (s) { s.hidden = s.getAttribute("data-view") !== v; });
    $$(".tab").forEach(function (t) { t.classList.toggle("on", t.getAttribute("data-go") === v); });
    $("#topTitle").textContent = VIEW_TITLE[v] || "小猪工作台";
    $("#fab").style.display = v === "home" ? "none" : "";
    closeDrawer();
    $("#scroll").scrollTop = 0;
    render(v);
  }

  /* ================= 渲染分发 ================= */
  function render(v) {
    if (v === "home") renderHome();
    else if (v === "english") renderEnglish();
    else if (v === "exam") renderExam();
    else if (v === "workout") renderWorkout();
    else if (v === "news") renderNews();
    else if (v === "money") renderMoney();
    else if (v === "expense") renderExpense();
  }
  function renderAll() { Object.keys(VIEW_TITLE).forEach(render); }

  /* ================= 首页 ================= */
  function renderHome() {
    const t = S.today(), d = S.D(), st = d.settings;
    const h = new Date().getHours();
    $("#heroHi").textContent = h < 6 ? "夜深了，早点休息呀" : h < 12 ? "早上好，今天也要加油鸭" : h < 18 ? "下午好，元气满满" : "晚上好";
    const wd = ["日", "一", "二", "三", "四", "五", "六"][new Date().getDay()];
    $("#heroDate").textContent = t + " · 星期" + wd;

    // 今日计划
    const plans = S.Plans().filter(function (p) { return p.date === t; });
    $("#homePlans").innerHTML = plans.length ? plans.map(function (p) {
      return '<div class="plan-item' + (p.done ? " done" : "") + '">' +
        '<span class="plan-check" data-act="toggle-plan" data-id="' + p.id + '">' + (p.done ? "✓" : "") + "</span>" +
        '<span class="plan-text">' + esc(p.text) + "</span>" +
        '<button class="plan-del" data-act="del-plan" data-id="' + p.id + '">🗑</button></div>';
    }).join("") : '<div class="empty-tip">今天还没有计划，点右上角「＋ 添加」安排起来吧</div>';

    // 打卡环
    const tw = S.Words().filter(function (w) { return w.date === t; }).length;
    const wm = S.Workouts().filter(function (w) { return w.date === t; }).reduce(function (s, x) { return s + x.minutes; }, 0);
    const pd = plans.length ? plans.filter(function (p) { return p.done; }).length / plans.length : 0;
    $("#homeRings").innerHTML =
      ringCell(C.ring(pd, "var(--accent)", 74, Math.round(pd * 100) + "%"), "计划完成", plans.filter(function (p) { return p.done; }).length + "/" + plans.length) +
      ringCell(C.ring(tw / (st.goalWords || 10), "var(--accent-2)", 74, tw + ""), "今日新词", "目标 " + (st.goalWords || 10)) +
      ringCell(C.ring(wm / (st.goalMinutes || 30), "#5b8ff9", 74, wm + "′"), "今日运动", "目标 " + (st.goalMinutes || 30) + "分");

    // 数据总览
    const weekAgo = new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10);
    const wkMin = S.Workouts().filter(function (w) { return w.date >= weekAgo; }).reduce(function (s, x) { return s + x.minutes; }, 0);
    const totalAsset = S.Assets().reduce(function (s, a) { return s + a.amount; }, 0);
    const mExp = S.Expenses().filter(function (e) { return e.date.slice(0, 7) === t.slice(0, 7); }).reduce(function (s, e) { return s + e.amount; }, 0);
    const exams = S.Exams().slice().sort(function (a, b) { return a.date < b.date ? -1 : 1; });
    const near = exams.filter(function (e) { return daysLeft(e.date) >= 0; })[0];
    const ndl = near ? daysLeft(near.date) : null;
    $("#homeStats").innerHTML =
      statCard("english", "📚", S.Words().length, "累计生词", "个") +
      statCard("workout", "🏃", wkMin, "本周运动", "分钟") +
      statCard("money", "💰", fmtMoney(totalAsset), "总资产", "") +
      statCard("expense", "🧾", fmtMoney(mExp), "本月支出", "") +
      statCard("exam", "🎓", near ? (ndl === 0 ? "今天" : ndl + " 天") : "暂无", "最近考试", "") +
      statCard("exam", "📅", exams.length, "考试场次", "场");
  }
  function ringCell(svg, label, val) {
    return '<div class="ring-cell">' + svg + '<div class="ring-label">' + label + '<br><span class="ring-val">' + esc(val) + "</span></div></div>";
  }
  function statCard(go, ico, val, cap, unit) {
    return '<div class="stat-card" data-go="' + go + '"><div class="stat-ico">' + ico + "</div>" +
      '<div class="stat-num">' + esc(val) + '<span style="font-size:12px;font-weight:400"> ' + unit + "</span></div>" +
      '<div class="stat-cap">' + cap + " ›</div></div>";
  }

  /* ================= 英语 ================= */
  function myWords() { return S.Words(); }
  function suggestWords() {
    const owned = {};
    myWords().forEach(function (w) { owned[w.word.toLowerCase()] = 1; });
    const rest = S.IELTS_POOL.filter(function (w) { return !owned[w[0].toLowerCase()]; });
    // Fisher-Yates 乱序后再取 5 个
    for (let i = rest.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = rest[i]; rest[i] = rest[j]; rest[j] = tmp;
    }
    return rest.slice(0, 5);
  }
  function renderEnglish() {
    const t = S.today(), ws = myWords();
    const mastered = ws.filter(function (w) { return w.mastered; }).length;
    const todayNew = ws.filter(function (w) { return w.date === t; }).length;
    $("#enSummary").innerHTML = '<div class="sum-row">' +
      '<div class="sum-cell"><div class="cap">生词总数</div><div class="val">' + ws.length + "</div></div>" +
      '<div class="sum-cell"><div class="cap">学习中</div><div class="val">' + (ws.length - mastered) + "</div></div>" +
      '<div class="sum-cell"><div class="cap">已掌握</div><div class="val">' + mastered + "</div></div>" +
      '<div class="sum-cell"><div class="cap">今日新增</div><div class="val">' + todayNew + "</div></div></div>";

    const sug = suggestWords();
    $("#enSuggest").innerHTML = sug.length ? sug.map(function (w) {
      return '<div class="suggest-item" data-act="speak" data-id="' + esc(w[0]) + '"><b>' + esc(w[0]) +
        '</b><span class="sg-ipa">' + esc(w[1]) + '</span><span>' + esc(w[2]) + "</span></div>";
    }).join("") : '<div class="empty-tip">词库都被你学完啦，太强了！🎉</div>';
    const takeBtn = document.getElementById("enTakeBtn");
    if (takeBtn) takeBtn.style.display = sug.length ? "" : "none";

    let list = ws.slice().sort(function (a, b) { return b.date < a.date ? -1 : 1; });
    if (state.enFilter === "learning") list = list.filter(function (w) { return !w.mastered; });
    if (state.enFilter === "mastered") list = list.filter(function (w) { return w.mastered; });
    $("#enList").innerHTML = list.length ? list.map(function (w) {
      return '<div class="word-item"><div class="word-main">' +
        '<div class="word-w' + (w.mastered ? " mastered" : "") + '">' +
        '<span class="word-tap" data-act="speak" data-id="' + esc(w.word) + '" title="点击朗读">' + esc(w.word) +
        '<span class="spk">🔊</span></span>' +
        (w.ipa ? '<span class="word-ipa">' + esc(w.ipa) + "</span>" : "") + "</div>" +
        '<div class="word-m">' + esc(w.meaning) + (w.note ? "<br>💡 " + esc(w.note) : "") + "</div>" +
        '<span class="word-tag">' + esc(w.date) + (w.mastered ? " · 已掌握" : "") + "</span></div>" +
        '<div class="word-ops"><button class="op-btn" data-act="master-word" data-id="' + w.id + '">' + (w.mastered ? "忘了" : "掌握了") + "</button>" +
        '<button class="op-btn red" data-act="del-word" data-id="' + w.id + '">删除</button></div></div>';
    }).join("") : '<div class="empty-tip">生词本是空的，收下上面的推荐或手动添加吧</div>';
  }

  /* ================= 考试 ================= */
  function daysLeft(dateStr) {
    const t = new Date(S.today() + "T00:00:00").getTime();
    const d = new Date(dateStr + "T00:00:00").getTime();
    return Math.round((d - t) / 86400000);
  }
  function examBadge(dl) {
    if (dl < 0) return { txt: "已结束", cls: "rec-r dim" };
    if (dl === 0) return { txt: "就在今天！", cls: "rec-r warn" };
    if (dl === 1) return { txt: "还有 1 天", cls: "rec-r warn" };
    if (dl <= 7) return { txt: "还有 " + dl + " 天", cls: "rec-r warn" };
    return { txt: "还有 " + dl + " 天", cls: "rec-r" };
  }
  function renderExam() {
    const exams = S.Exams().slice().sort(function (a, b) { return a.date < b.date ? -1 : 1; });
    const upcoming = exams.filter(function (e) { return daysLeft(e.date) >= 0; });
    const near = upcoming[0];
    const ndl = near ? daysLeft(near.date) : null;
    $("#examSummary").innerHTML = '<div class="sum-row">' +
      '<div class="sum-cell"><div class="cap">考试场次</div><div class="val">' + exams.length + "</div></div>" +
      '<div class="sum-cell"><div class="cap">待考</div><div class="val">' + upcoming.length + "</div></div>" +
      '<div class="sum-cell"><div class="cap">最近考试</div><div class="val">' + (near ? esc(near.name) : "暂无") + "</div></div>" +
      '<div class="sum-cell"><div class="cap">倒计时</div><div class="val big-num">' + (near ? (ndl === 0 ? "今天" : ndl + " 天") : "--") + "</div></div></div>";
    $("#examList").innerHTML = exams.length ? exams.map(function (e) {
      const dl = daysLeft(e.date), b = examBadge(dl);
      return '<div class="rec-item' + (dl < 0 ? " dim-item" : "") + '"><div class="rec-ico">' + (dl < 0 ? "🏁" : "🎓") + "</div>" +
        '<div class="rec-main"><div class="rec-t">' + esc(e.name) + '</div><div class="rec-s">' + esc(e.date) +
        " · 周" + ["日", "一", "二", "三", "四", "五", "六"][new Date(e.date + "T00:00:00").getDay()] +
        (e.note ? " · " + esc(e.note) : "") + "</div></div>" +
        '<div class="' + b.cls + '">' + b.txt + "</div>" +
        '<button class="plan-del" data-act="del-exam" data-id="' + e.id + '">🗑</button></div>';
    }).join("") : '<div class="empty-tip">还没有考试安排，点右上角「＋ 添加考试」</div>';
  }


  /* ================= 锻炼 ================= */
  const WO_ICO = { "跑步": "🏃", "健身": "🏋️", "游泳": "🏊", "球类": "🏸", "骑行": "🚴", "其他": "⚡" };
  function renderWorkout() {
    const t = S.today(), st = S.D().settings;
    const todayMin = S.Workouts().filter(function (w) { return w.date === t; }).reduce(function (s, x) { return s + x.minutes; }, 0);
    const ws = S.Weights();
    const last = ws.length ? ws.slice().sort(function (a, b) { return a.date < b.date ? 1 : -1; })[0].kg : "--";
    $("#woSummary").innerHTML = '<div class="sum-row">' +
      '<div class="sum-cell"><div class="cap">今日运动</div><div class="val">' + todayMin + ' <span style="font-size:12px">分钟</span></div></div>' +
      '<div class="sum-cell"><div class="cap">今日目标</div><div class="val">' + (st.goalMinutes || 30) + " 分钟</div></div>" +
      '<div class="sum-cell"><div class="cap">最新体重</div><div class="val">' + last + ' <span style="font-size:12px">kg</span></div></div></div>';

    // 近7天柱状图
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
      days.push(d);
    }
    const bars = days.map(function (d) {
      const m = S.Workouts().filter(function (w) { return w.date === d; }).reduce(function (s, x) { return s + x.minutes; }, 0);
      return { label: d.slice(5).replace("-", "/"), val: m, tip: m + "′" };
    });
    $("#woChart").innerHTML = C.bars(bars, "var(--accent)");

    // 体重折线
    const pts = ws.slice().sort(function (a, b) { return a.date < b.date ? -1 : 1; }).slice(-10)
      .map(function (w) { return { label: w.date.slice(5), val: w.kg }; });
    $("#woWeight").innerHTML = pts.length ? C.line(pts, "#f6b93b") : '<div class="empty-tip">还没有体重记录，去「称一称」吧</div>';

    const wl = S.Workouts().slice().sort(function (a, b) { return b.date < a.date ? -1 : 1; }).slice(0, 20);
    $("#woList").innerHTML = wl.length ? wl.map(function (w) {
      return recItem("add-workout", w.id, WO_ICO[w.type] || "⚡", esc(w.type), esc(w.date), w.minutes + " 分钟");
    }).join("") : '<div class="empty-tip">还没有运动记录，动起来！</div>';

    const wtl = ws.slice().sort(function (a, b) { return b.date < a.date ? -1 : 1; }).slice(0, 10);
    $("#wtList").innerHTML = wtl.length ? wtl.map(function (w) {
      return recItem("add-weight", w.id, "⚖️", "体重", esc(w.date), w.kg + " kg");
    }).join("") : '<div class="empty-tip">暂无记录</div>';
  }
  function recItem(act, id, ico, title, sub, right) {
    return '<div class="rec-item"><div class="rec-ico">' + ico + "</div>" +
      '<div class="rec-main"><div class="rec-t">' + title + '</div><div class="rec-s">' + sub + "</div></div>" +
      '<div class="rec-r">' + right + '</div>' +
      '<button class="plan-del" data-act="del-rec" data-kind="' + act + '" data-id="' + id + '">🗑</button></div>';
  }

  /* ================= 新闻 ================= */
  function renderNews() {
    const all = S.News();
    let demos = all.filter(function (n) { return n.demo; });
    const mine = all.filter(function (n) { return !n.demo; }).sort(function (a, b) { return b.id < a.id ? 1 : -1; });
    let list = demos;
    if (state.newsFilter !== "全部") list = demos.filter(function (n) { return n.tag === state.newsFilter; });
    $("#newsList").innerHTML = list.length ? list.map(function (n) {
      return '<div class="news-item"><div class="news-top"><span class="news-tag demo">' + esc(n.tag) + '</span><span class="news-title">' + esc(n.title) + "</span></div>" +
        '<div class="news-sum">' + esc(n.summary) + "</div>" +
        '<div class="news-date">内置示例 · 非实时资讯</div></div>';
    }).join("") : '<div class="empty-tip">这个分类暂时没有内容</div>';

    $("#myNewsList").innerHTML = mine.length ? mine.map(function (n) {
      return '<div class="news-item"><div class="news-top"><span class="news-tag">' + esc(n.tag || "收藏") + '</span><span class="news-title">' + esc(n.title) + "</span>" +
        '<button class="plan-del" data-act="del-news" data-id="' + n.id + '">🗑</button></div>' +
        (n.summary ? '<div class="news-sum">' + esc(n.summary) + "</div>" : "") +
        (n.url ? '<div class="news-date">🔗 ' + esc(n.url) + "</div>" : "") + "</div>";
    }).join("") : '<div class="empty-tip">看到好的财经文章，点「＋ 收藏」存进来</div>';
  }

  /* ================= 攒钱 ================= */
  function renderMoney() {
    const t = S.today().slice(0, 7);
    const assets = S.Assets(), incomes = S.Incomes();
    const total = assets.reduce(function (s, a) { return s + a.amount; }, 0);
    const mInc = incomes.filter(function (i) { return i.date.slice(0, 7) === t; });
    const mGz = mInc.filter(function (i) { return i.kind === "工资"; }).reduce(function (s, i) { return s + i.amount; }, 0);
    const mJz = mInc.filter(function (i) { return i.kind === "兼职"; }).reduce(function (s, i) { return s + i.amount; }, 0);
    $("#moneySummary").innerHTML = '<div class="cap">总资产（示例数据可在下方修改删除）</div>' +
      '<div class="val">' + fmtMoney(total) + "</div>" +
      '<div class="row"><div>本月工资<b>' + fmtMoney(mGz) + '</b></div><div>本月兼职<b>' + fmtMoney(mJz) + '</b></div><div>本月合计<b>' + fmtMoney(mGz + mJz) + "</b></div></div>";

    // 资产分布
    const byType = {};
    assets.forEach(function (a) { byType[a.type] = (byType[a.type] || 0) + a.amount; });
    const items = Object.keys(byType).map(function (k, i) { return { label: k, val: Math.round(byType[k] * 100) / 100, color: PALETTE[i % PALETTE.length] }; })
      .sort(function (a, b) { return b.val - a.val; });
    $("#moneyChart").innerHTML = items.length ? C.ratio(items) : '<div class="empty-tip">添加第一笔资产吧</div>';

    $("#assetList").innerHTML = assets.length ? assets.map(function (a) {
      const ico = { "银行存款": "🏦", "理财": "📈", "黄金": "🪙", "股票": "📊", "其他": "💼" }[a.type] || "💼";
      return recItem("add-asset", a.id, ico, esc(a.name), esc(a.type), fmtMoney(a.amount));
    }).join("") : '<div class="empty-tip">还没有资产记录</div>';

    const il = incomes.slice().sort(function (a, b) { return b.date < a.date ? -1 : 1; }).slice(0, 20);
    $("#incomeList").innerHTML = il.length ? il.map(function (i) {
      return recItem("add-income", i.id, i.kind === "工资" ? "💼" : "🛠", esc(i.kind) + (i.note ? " · " + esc(i.note) : ""), esc(i.date), "+" + fmtMoney(i.amount));
    }).join("") : '<div class="empty-tip">记录一下工资和兼职收入吧</div>';
  }

  /* ================= 记账 ================= */
  const EX_ICO = { "餐饮": "🍜", "交通": "🚇", "购物": "🛍", "娱乐": "🎮", "居住": "🏠", "医疗": "💊", "学习": "📖", "其他": "✨" };
  function renderExpense() {
    const m = state.exMonth;
    $("#exMonth").value = m;
    const list = S.Expenses().filter(function (e) { return e.date.slice(0, 7) === m; });
    const total = list.reduce(function (s, e) { return s + e.amount; }, 0);
    const dCnt = {};
    list.forEach(function (e) { dCnt[e.date] = (dCnt[e.date] || 0) + 1; });
    const dayN = Object.keys(dCnt).length;
    $("#exSummary").innerHTML = '<div class="sum-row">' +
      '<div class="sum-cell"><div class="cap">本月支出</div><div class="val big-num">' + fmtMoney(total) + "</div></div>" +
      '<div class="sum-cell"><div class="cap">记账天数</div><div class="val">' + dayN + "</div></div>" +
      '<div class="sum-cell"><div class="cap">日均</div><div class="val">' + (dayN ? fmtMoney(total / dayN) : "¥0") + "</div></div></div>";

    const byCat = {};
    list.forEach(function (e) { byCat[e.cat] = (byCat[e.cat] || 0) + e.amount; });
    const items = Object.keys(byCat).map(function (k, i) { return { label: k, val: Math.round(byCat[k] * 100) / 100, color: PALETTE[i % PALETTE.length] }; })
      .sort(function (a, b) { return b.val - a.val; });
    $("#exChart").innerHTML = items.length ? C.ratio(items) : '<div class="empty-tip">本月还没有账单</div>';

    const days = {};
    list.forEach(function (e) { (days[e.date] = days[e.date] || []).push(e); });
    const dkeys = Object.keys(days).sort().reverse();
    $("#exList").innerHTML = dkeys.length ? dkeys.map(function (d) {
      const dv = days[d].reduce(function (s, e) { return s + e.amount; }, 0);
      return '<div class="day-group"><div class="day-head"><span>' + d + " 星期" + ["日", "一", "二", "三", "四", "五", "六"][new Date(d + "T00:00:00").getDay()] + "</span><b>¥" + (Math.round(dv * 100) / 100) + "</b></div>" +
        days[d].map(function (e) {
          return '<div class="ex-item"><div class="rec-ico">' + (EX_ICO[e.cat] || "✨") + "</div>" +
            '<div class="rec-main"><div class="rec-t">' + esc(e.cat) + (e.note ? '<span class="ex-note"> ' + esc(e.note) + "</span>" : "") + "</div></div>" +
            '<div class="rec-r">-' + fmtMoney(e.amount) + "</div>" +
            '<button class="plan-del" data-act="del-expense" data-id="' + e.id + '">🗑</button></div>';
        }).join("") + "</div>";
    }).join("") : '<div class="empty-tip">这个月还没有记录，点右下角 ＋ 记一笔</div>';
  }

  /* ================= ACT 表单 ================= */
  const CATS = ["餐饮", "交通", "购物", "娱乐", "居住", "医疗", "学习", "其他"];
  const WO_TYPES = ["跑步", "健身", "游泳", "球类", "骑行", "其他"];
  const ASSET_TYPES = ["银行存款", "理财", "黄金", "股票", "其他"];
  const NEWS_TAGS = ["股票", "宏观", "理财", "国际", "其他"];

  function addWordSheet(id) {
    const w = id ? myWords().find(function (x) { return x.id === id; }) : null;
    openSheet({
      title: w ? "编辑单词" : "添加生词",
      fields: [
        { key: "word", label: "单词", type: "text", value: w && w.word, ph: "如 sustainable" },
        { key: "ipa", label: "音标（选填）", type: "text", value: w && w.ipa, ph: "如 /ˌsʌstəˈneɪbl/" },
        { key: "meaning", label: "释义", type: "text", value: w && w.meaning, ph: "如 adj. 可持续的" },
        { key: "note", label: "备注（选填）", type: "text", value: w && w.note }
      ],
      onSubmit: function (v) {
        if (!need(v, ["word", "meaning"])) return false;
        if (w) { w.word = v.word; w.ipa = v.ipa; w.meaning = v.meaning; w.note = v.note; }
        else S.Words().push({ id: S.uid(), word: v.word, ipa: v.ipa, meaning: v.meaning, note: v.note, date: S.today(), mastered: false });
        S.save(); renderAll(); toast("已保存 🎉");
      }
    });
  }

  const ACT = {
    "add-plan": function () {
      openSheet({
        title: "添加今日计划",
        fields: [{ key: "text", label: "计划内容", type: "text", ph: "想做什么？" }],
        onSubmit: function (v) {
          if (!need(v, ["text"])) return false;
          S.Plans().push({ id: S.uid(), text: v.text, done: false, date: S.today() });
          S.save(); renderAll(); toast("已添加 ✅");
        }
      });
    },
    "toggle-plan": function (id) {
      const p = S.Plans().find(function (x) { return x.id === id; });
      if (p) { p.done = !p.done; S.save(); renderAll(); }
    },
    "del-plan": function (id) {
      const d = S.D(); d.plans = d.plans.filter(function (x) { return x.id !== id; });
      S.save(d); renderAll();
    },
    "add-word": function () { addWordSheet(); },
    "speak": function (text) { speak(text); },
    "edit-word": function (id) { addWordSheet(id); },
    "master-word": function (id) {
      const w = myWords().find(function (x) { return x.id === id; });
      if (w) { w.mastered = !w.mastered; S.save(); renderAll(); toast(w.mastered ? "真棒，掌握一词 🎉" : "继续加油"); }
    },
    "del-word": function (id) {
      const d = S.D(); d.words = d.words.filter(function (x) { return x.id !== id; });
      S.save(d); renderAll(); toast("已删除");
    },
    "take-suggest": function () {
      const sug = suggestWords();
      if (!sug.length) return;
      sug.forEach(function (w) {
        S.Words().push({ id: S.uid(), word: w[0], ipa: w[1], meaning: w[2], note: "", date: S.today(), mastered: false });
      });
      S.save(); renderAll(); toast("已收下 " + sug.length + " 个词 📚");
    },
    "add-workout": function (id) {
      const w = id ? S.Workouts().find(function (x) { return x.id === id; }) : null;
      openSheet({
        title: w ? "编辑运动" : "记一笔运动",
        fields: [
          { key: "date", label: "日期", type: "date", value: w ? w.date : S.today() },
          { key: "type", label: "运动类型", type: "chips", options: WO_TYPES, value: w ? w.type : "跑步" },
          { key: "minutes", label: "时长（分钟）", type: "number", value: w ? w.minutes : "", ph: "如 30" }
        ],
        onSubmit: function (v) {
          if (!need(v, ["date", "minutes"])) return false;
          const m = num(v.minutes); if (m === null || m <= 0) { toast("时长要大于 0 哦"); return false; }
          if (w) { w.date = v.date; w.type = v.type; w.minutes = m; }
          else S.Workouts().push({ id: S.uid(), date: v.date, type: v.type, minutes: m });
          S.save(); renderAll(); toast("打卡成功 💪");
        }
      });
    },
    "add-weight": function (id) {
      const w = id ? S.Weights().find(function (x) { return x.id === id; }) : null;
      openSheet({
        title: w ? "编辑体重" : "称一称",
        fields: [
          { key: "date", label: "日期", type: "date", value: w ? w.date : S.today() },
          { key: "kg", label: "体重（kg）", type: "number", value: w ? w.kg : "", ph: "如 62.5" }
        ],
        onSubmit: function (v) {
          if (!need(v, ["date", "kg"])) return false;
          const n = num(v.kg); if (n === null || n <= 0) { toast("体重格式不对哦"); return false; }
          if (w) { w.date = v.date; w.kg = n; }
          else S.Weights().push({ id: S.uid(), date: v.date, kg: n });
          S.save(); renderAll(); toast("已记录 ⚖️");
        }
      });
    },
    "swap-news": function () {
      const all = S.News();
      const demos = all.filter(function (n) { return n.demo; });
      const rest = S.DEMO_NEWS.filter(function (dn) {
        return !demos.some(function (x) { return x.title === dn[1]; });
      });
      const pool = rest.length >= 4 ? rest : S.DEMO_NEWS;
      const picks = pool.slice().sort(function () { return Math.random() - 0.5; }).slice(0, Math.min(5, Math.max(4, demos.length)));
      const d = S.D();
      d.news = all.filter(function (n) { return !n.demo; });
      picks.forEach(function (n, i) {
        d.news.push({ id: "demo-n" + Date.now() + i, tag: n[0], title: n[1], summary: n[2], url: "", date: S.today(), demo: true });
      });
      S.save(d); renderNews(); toast("换了一批 🔁");
    },
    "add-news": function (id) {
      const n = id ? S.News().find(function (x) { return x.id === id && !x.demo; }) : null;
      openSheet({
        title: n ? "编辑收藏" : "收藏资讯",
        fields: [
          { key: "title", label: "标题", type: "text", value: n && n.title, ph: "文章标题" },
          { key: "tag", label: "分类", type: "chips", options: NEWS_TAGS, value: n ? n.tag : "理财" },
          { key: "url", label: "链接（选填）", type: "text", value: n && n.url, ph: "https://…" },
          { key: "summary", label: "摘要 / 备注（选填）", type: "textarea", value: n && n.summary }
        ],
        onSubmit: function (v) {
          if (!need(v, ["title"])) return false;
          if (n) { n.title = v.title; n.tag = v.tag; n.url = v.url; n.summary = v.summary; }
          else S.News().push({ id: S.uid(), tag: v.tag, title: v.title, url: v.url, summary: v.summary, date: S.today() });
          S.save(); renderAll(); toast("已收藏 ⭐");
        }
      });
    },
    "del-news": function (id) {
      const d = S.D(); d.news = d.news.filter(function (x) { return x.id !== id; });
      S.save(d); renderNews(); toast("已删除");
    },
    "add-asset": function (id) {
      const a = id ? S.Assets().find(function (x) { return x.id === id; }) : null;
      openSheet({
        title: a ? "编辑资产" : "添加资产",
        fields: [
          { key: "name", label: "名称", type: "text", value: a && a.name, ph: "如 XX银行 · 稳健理财" },
          { key: "type", label: "类型", type: "chips", options: ASSET_TYPES, value: a ? a.type : "银行存款" },
          { key: "amount", label: "金额（元）", type: "number", value: a ? a.amount : "", ph: "如 10000" }
        ],
        onSubmit: function (v) {
          if (!need(v, ["name", "amount"])) return false;
          const n = num(v.amount); if (n === null || n < 0) { toast("金额格式不对哦"); return false; }
          if (a) { a.name = v.name; a.type = v.type; a.amount = n; }
          else S.Assets().push({ id: S.uid(), name: v.name, type: v.type, amount: n });
          S.save(); renderAll(); toast("已记录 💰");
        }
      });
    },
    "add-income": function (id) {
      const i = id ? S.Incomes().find(function (x) { return x.id === id; }) : null;
      openSheet({
        title: i ? "编辑收入" : "记一笔收入",
        fields: [
          { key: "date", label: "日期", type: "date", value: i ? i.date : S.today() },
          { key: "kind", label: "类型", type: "chips", options: ["工资", "兼职"], value: i ? i.kind : "工资" },
          { key: "amount", label: "金额（元）", type: "number", value: i ? i.amount : "", ph: "如 8000" },
          { key: "note", label: "备注（选填）", type: "text", value: i && i.note }
        ],
        onSubmit: function (v) {
          if (!need(v, ["date", "amount"])) return false;
          const n = num(v.amount); if (n === null || n <= 0) { toast("金额要大于 0 哦"); return false; }
          if (i) { i.date = v.date; i.kind = v.kind; i.amount = n; i.note = v.note; }
          else S.Incomes().push({ id: S.uid(), date: v.date, kind: v.kind, amount: n, note: v.note });
          S.save(); renderAll(); toast("收入入账 🎉");
        }
      });
    },
    "add-expense": function (id) {
      const e = id ? S.Expenses().find(function (x) { return x.id === id; }) : null;
      openSheet({
        title: e ? "编辑账单" : "记一笔",
        fields: [
          { key: "date", label: "日期", type: "date", value: e ? e.date : S.today() },
          { key: "cat", label: "分类", type: "chips", options: CATS, value: e ? e.cat : "餐饮" },
          { key: "amount", label: "金额（元）", type: "number", value: e ? e.amount : "", ph: "如 25.5" },
          { key: "note", label: "备注（选填）", type: "text", value: e && e.note }
        ],
        onSubmit: function (v) {
          if (!need(v, ["date", "amount"])) return false;
          const n = num(v.amount); if (n === null || n <= 0) { toast("金额要大于 0 哦"); return false; }
          if (e) { e.date = v.date; e.cat = v.cat; e.amount = n; e.note = v.note; }
          else S.Expenses().push({ id: S.uid(), date: v.date, cat: v.cat, amount: n, note: v.note });
          S.save(); renderAll(); toast("记账成功 🧾");
        }
      });
    },
    "del-rec": function (id, kind) {
      const d = S.D();
      const map = { "add-workout": "workouts", "add-weight": "weights", "add-asset": "assets", "add-income": "incomes" };
      const key = map[kind];
      if (key) {
        d[key] = d[key].filter(function (x) { return x.id !== id; });
        S.save(d); renderAll(); toast("已删除");
      }
    },
    "del-expense": function (id) {
      const d = S.D(); d.expenses = d.expenses.filter(function (x) { return x.id !== id; });
      S.save(d); renderExpense(); toast("已删除");
    },
    "add-exam": function (id) {
      const e = id ? S.Exams().find(function (x) { return x.id === id; }) : null;
      openSheet({
        title: e ? "编辑考试" : "添加考试",
        fields: [
          { key: "name", label: "考试名称", type: "text", value: e && e.name, ph: "如 雅思考试" },
          { key: "date", label: "考试日期", type: "date", value: e ? e.date : "" },
          { key: "note", label: "备注（选填）", type: "text", value: e && e.note, ph: "如 考点、场次" }
        ],
        onSubmit: function (v) {
          if (!need(v, ["name", "date"])) return false;
          if (e) { e.name = v.name; e.date = v.date; e.note = v.note; }
          else S.Exams().push({ id: S.uid(), name: v.name, date: v.date, note: v.note });
          S.save(); renderAll(); toast("考试已记录 🎓");
        }
      });
    },
    "del-exam": function (id) {
      const d = S.D(); d.exams = d.exams.filter(function (x) { return x.id !== id; });
      S.save(d); renderAll(); toast("已删除");
    },
    "fab": function () {
      const map = { english: "add-word", exam: "add-exam", workout: "add-workout", news: "add-news", money: "add-asset", expense: "add-expense", home: "add-plan" };
      const act = map[cur]; if (act && ACT[act]) ACT[act]();
    },
    "open-settings": function () {
      const st = S.D().settings;
      openSheet({
        title: "⚙️ 设置与备份",
        fields: [
          { key: "goalWords", label: "每日背词目标（个）", type: "number", value: st.goalWords || 10 },
          { key: "goalMinutes", label: "每日运动目标（分钟）", type: "number", value: st.goalMinutes || 30 },
          { key: "backup", label: "备份：复制下面 JSON 保存到备忘录", type: "textarea", value: JSON.stringify(S.D()) }
        ],
        buttons: [
          { text: "清演示数据", act: "do-remove-demo", cls: "ghost" },
          { text: "导入备份", act: "do-import", cls: "ghost" },
          { text: "清空全部数据", act: "do-wipe", cls: "danger" }
        ],
        okText: "保存设置",
        onSubmit: function (v) {
          const s = S.D().settings;
          const gw = num(v.goalWords), gm = num(v.goalMinutes);
          if (gw && gw > 0) s.goalWords = gw;
          if (gm && gm > 0) s.goalMinutes = gm;
          S.save(); renderAll(); toast("设置已保存");
        }
      });
    },
    "do-remove-demo": function () {
      S.removeDemo(); renderAll(); toast("演示数据已清除 🧹");
    },
    "do-import": function () {
      openSheet({
        title: "导入备份",
        fields: [{ key: "json", label: "粘贴之前备份的 JSON", type: "textarea" }],
        onSubmit: function (v) {
          if (!v.json) return false;
          try {
            const d = JSON.parse(v.json);
            if (!d || typeof d !== "object") throw 0;
            localStorage.setItem(S.KEY, JSON.stringify(d));
            location.reload();
          } catch (e) { toast("JSON 格式不对哦"); return false; }
        }
      });
    },
    "do-wipe": function () {
      openSheet({
        title: "⚠️ 清空全部数据",
        fields: [{ key: "confirm", label: "此操作不可恢复！输入「清空」确认", type: "text" }],
        onSubmit: function (v) {
          if (v.confirm !== "清空") { toast("请输入「清空」确认"); return false; }
          S.wipeAll(); renderAll(); toast("已清空");
        }
      });
    }
  };

  /* ================= 事件委托 ================= */
  document.addEventListener("click", function (e) {
    const goEl = e.target.closest("[data-go]");
    if (goEl && goEl.closest(".stat-card, .drawer-nav, #tabbar")) { switchView(goEl.getAttribute("data-go")); return; }
    const actEl = e.target.closest("[data-act]");
    if (actEl) {
      const act = actEl.getAttribute("data-act");
      if (ACT[act]) ACT[act](actEl.getAttribute("data-id"), actEl.getAttribute("data-kind"));
      return;
    }
    const enf = e.target.closest("#enFilter .seg-btn");
    if (enf) {
      state.enFilter = enf.getAttribute("data-enf");
      $$("#enFilter .seg-btn").forEach(function (b) { b.classList.remove("on"); });
      enf.classList.add("on"); renderEnglish(); return;
    }
    const nf = e.target.closest("#newsFilter .seg-btn");
    if (nf) {
      state.newsFilter = nf.getAttribute("data-nf");
      $$("#newsFilter .seg-btn").forEach(function (b) { b.classList.remove("on"); });
      nf.classList.add("on"); renderNews(); return;
    }
  });
  document.getElementById("tabbar").addEventListener("click", function (e) {
    const t = e.target.closest(".tab");
    if (t) switchView(t.getAttribute("data-go"));
  });
  document.getElementById("btnMenu").addEventListener("click", openDrawer);
  document.getElementById("btnCloseDrawer").addEventListener("click", closeDrawer);
  document.getElementById("scrim").addEventListener("click", closeDrawer);
  document.getElementById("btnTheme").addEventListener("click", function () {
    const h = document.documentElement;
    const next = h.getAttribute("data-theme") === "dark" ? "light" : "dark";
    h.setAttribute("data-theme", next);
    try { localStorage.setItem("piggy-theme", next); } catch (e) { }
    document.getElementById("btnTheme").textContent = next === "dark" ? "☀️" : "🌙";
  });
  document.getElementById("exMonth").addEventListener("change", function (e) {
    state.exMonth = e.target.value || S.today().slice(0, 7);
    renderExpense();
  });

  // 左边缘右滑开抽屉 / 抽屉上左滑关闭
  let ts = null;
  document.addEventListener("touchstart", function (e) {
    ts = { x: e.touches[0].clientX, y: e.touches[0].clientY, t: Date.now(), inDrawer: !!e.target.closest(".drawer") };
  }, { passive: true });
  document.addEventListener("touchend", function (e) {
    if (!ts) return;
    const dx = e.changedTouches[0].clientX - ts.x, dy = e.changedTouches[0].clientY - ts.y;
    const dt = Date.now() - ts.t;
    if (!ts.inDrawer && dx > 45 && Math.abs(dy) < 40 && ts.x < 28 && dt < 700) openDrawer();
    if (ts.inDrawer && dx < -45 && Math.abs(dy) < 40 && dt < 700) closeDrawer();
    ts = null;
  }, { passive: true });

  /* ================= 启动 ================= */
  try {
    const th = localStorage.getItem("piggy-theme");
    if (th) { document.documentElement.setAttribute("data-theme", th); document.getElementById("btnTheme").textContent = th === "dark" ? "☀️" : "🌙"; }
  } catch (e) { }
  window.__PIGGY_STANDALONE__ = false;
  if (!window.__PIGGY_STANDALONE__ && "serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").catch(function () { });
  }
  let deferredPrompt = null;
  window.addEventListener("beforeinstallprompt", function (e) { e.preventDefault(); deferredPrompt = e; });

  /* ---- 运行环境自检：数据能否真正保住 ---- */
  (function envCheck() {
    var msg = "";
    if (window.self !== window.top) {
      msg = "当前是嵌套打开的（第三方框架页），iPhone 会在退出后清空这里的数据，别在这里记录重要内容。";
    } else {
      try {
        localStorage.setItem("piggy-__t", "1");
        localStorage.removeItem("piggy-__t");
      } catch (e) {
        msg = "浏览器禁止本地存储（隐私模式或权限限制），本次记录的内容无法保存。";
      }
    }
    if (!msg) return;
    var bar = document.createElement("div");
    bar.className = "env-warn";
    bar.innerHTML = "<span>⚠️ " + esc(msg) + "</span><button type=\"button\">知道了</button>";
    document.body.appendChild(bar);
    bar.querySelector("button").onclick = function () { bar.parentNode.removeChild(bar); };
  })();

  renderAll();
  switchView("home");
  window.__piggy = { switchView: switchView, state: state };
})();
