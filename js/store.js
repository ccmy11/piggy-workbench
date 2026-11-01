/* store.js — 单键 localStorage 数据层 */
(function () {
  const KEY = "piggy-app-v1";

  // 内置雅思核心词池（用于"今日推荐"，推荐从池中取用户生词本里没有的词）
  const IELTS_POOL = [
    ["acquire", "/əˈkwaɪə/", "v. 获得；习得"], ["abundant", "/əˈbʌndənt/", "adj. 丰富的，充裕的"], ["accelerate", "/əkˈseləreɪt/", "v. 加速，促进"],
    ["accommodate", "/əˈkɒmədeɪt/", "v. 容纳；适应"], ["accumulate", "/əˈkjuːmjəleɪt/", "v. 积累，积聚"], ["acknowledge", "/əkˈnɒlɪdʒ/", "v. 承认；致谢"],
    ["adequate", "/ˈædɪkwət/", "adj. 足够的，适当的"], ["advocate", "/ˈædvəkeɪt/", "v./n. 提倡；提倡者"], ["allocate", "/ˈæləkeɪt/", "v. 分配，拨出"],
    ["ambiguous", "/æmˈbɪɡjuəs/", "adj. 模棱两可的"], ["anticipate", "/ænˈtɪsɪpeɪt/", "v. 预期，预料"], ["appraise", "/əˈpreɪz/", "v. 评估，鉴定"],
    ["arbitrary", "/ˈɑːbɪtrəri/", "adj. 任意的，武断的"], ["assess", "/əˈses/", "v. 评估，评定"], ["attribute", "/ˈætrɪbjuːt/", "v./n. 归因于；属性"],
    ["autonomous", "/ɔːˈtɒnəməs/", "adj. 自治的，自主的"], ["benchmark", "/ˈbentʃmɑːk/", "n. 基准，标杆"], ["beneficial", "/ˌbenɪˈfɪʃl/", "adj. 有益的"],
    ["boost", "/buːst/", "v./n. 促进，提高"], ["capacity", "/kəˈpæsəti/", "n. 容量；能力"], ["commodity", "/kəˈmɒdəti/", "n. 商品，日用品"],
    ["compatible", "/kəmˈpætəbl/", "adj. 兼容的，相容的"], ["comprehensive", "/ˌkɒmprɪˈhensɪv/", "adj. 全面的，综合的"], ["compulsory", "/kəmˈpʌlsəri/", "adj. 强制的，义务的"],
    ["conceive", "/kənˈsiːv/", "v. 构想，设想"], ["condense", "/kənˈdens/", "v. 浓缩，压缩"], ["confront", "/kənˈfrʌnt/", "v. 面对，对抗"],
    ["consequence", "/ˈkɒnsɪkwəns/", "n. 后果，结果"], ["conservation", "/ˌkɒnsəˈveɪʃn/", "n. 保护，节约"], ["contemporary", "/kənˈtemprəri/", "adj. 当代的"],
    ["contradict", "/ˌkɒntrəˈdɪkt/", "v. 反驳，与…矛盾"], ["controversial", "/ˌkɒntrəˈvɜːʃl/", "adj. 有争议的"], ["crucial", "/ˈkruːʃl/", "adj. 至关重要的"],
    ["cultivate", "/ˈkʌltɪveɪt/", "v. 培养，耕作"], ["curb", "/kɜːb/", "v./n. 抑制，约束"], ["dedicate", "/ˈdedɪkeɪt/", "v. 奉献，致力于"],
    ["deficiency", "/dɪˈfɪʃnsi/", "n. 缺乏，缺陷"], ["deteriorate", "/dɪˈtɪəriəreɪt/", "v. 恶化，变坏"], ["diminish", "/dɪˈmɪnɪʃ/", "v. 减少，缩小"],
    ["discrimination", "/dɪˌskrɪmɪˈneɪʃn/", "n. 歧视，辨别"], ["diverse", "/daɪˈvɜːs/", "adj. 多样的，不同的"], ["domain", "/dəˈmeɪn/", "n. 领域，范围"],
    ["drastic", "/ˈdræstɪk/", "adj. 激烈的，极端的"], ["ecosystem", "/ˈiːkəʊsɪstəm/", "n. 生态系统"], ["elaborate", "/ɪˈlæbərət/", "v./adj. 详尽阐述；精细的"],
    ["eliminate", "/ɪˈlɪmɪneɪt/", "v. 消除，淘汰"], ["embrace", "/ɪmˈbreɪs/", "v. 拥抱；欣然接受"], ["emission", "/ɪˈmɪʃn/", "n. 排放，排放物"],
    ["enhance", "/ɪnˈhɑːns/", "v. 提高，增强"], ["enormous", "/ɪˈnɔːməs/", "adj. 巨大的，庞大的"], ["evaluate", "/ɪˈvæljueɪt/", "v. 评估，评价"],
    ["exaggerate", "/ɪɡˈzædʒəreɪt/", "v. 夸大，夸张"], ["excessive", "/ɪkˈsesɪv/", "adj. 过度的，过多的"], ["exclusive", "/ɪkˈskluːsɪv/", "adj. 独有的；排他的"],
    ["expenditure", "/ɪkˈspendɪtʃə/", "n. 支出，花费"], ["feasible", "/ˈfiːzəbl/", "adj. 可行的"], ["fluctuate", "/ˈflʌktʃueɪt/", "v. 波动，起伏"],
    ["formulate", "/ˈfɔːmjuleɪt/", "v. 制定，系统阐述"], ["foster", "/ˈfɒstə/", "v. 培养，促进"], ["fundamental", "/ˌfʌndəˈmentl/", "adj. 基本的，根本的"],
    ["generate", "/ˈdʒenəreɪt/", "v. 产生，引起"], ["genuine", "/ˈdʒenjuɪn/", "adj. 真正的，真诚的"], ["hierarchy", "/ˈhaɪərɑːki/", "n. 等级制度，层级"],
    ["identical", "/aɪˈdentɪkl/", "adj. 完全相同的"], ["implement", "/ˈɪmplɪment/", "v. 实施，执行"], ["incentive", "/ɪnˈsentɪv/", "n. 激励，动机"],
    ["indicate", "/ˈɪndɪkeɪt/", "v. 表明，暗示"], ["inevitable", "/ɪnˈevɪtəbl/", "adj. 不可避免的"], ["inferior", "/ɪnˈfɪəriə/", "adj. 较差的，下级的"],
    ["inflation", "/ɪnˈfleɪʃn/", "n. 通货膨胀"], ["infrastructure", "/ˈɪnfrəstrʌktʃə/", "n. 基础设施"], ["initiative", "/ɪˈnɪʃətɪv/", "n. 倡议；主动性"],
    ["innovation", "/ˌɪnəˈveɪʃn/", "n. 创新，革新"], ["integrate", "/ˈɪntɪɡreɪt/", "v. 整合，融合"], ["intervene", "/ˌɪntəˈviːn/", "v. 干预，介入"],
    ["legitimate", "/lɪˈdʒɪtɪmət/", "adj. 合法的，正当的"], ["leisure", "/ˈleʒə/", "n. 闲暇，休闲"], ["maintain", "/meɪnˈteɪn/", "v. 维持，保养"],
    ["manipulate", "/məˈnɪpjuleɪt/", "v. 操纵，控制"], ["mechanism", "/ˈmekənɪzəm/", "n. 机制，机理"], ["moderate", "/ˈmɒdərət/", "adj./v. 适度的；缓和"],
    ["negotiate", "/nɪˈɡəʊʃieɪt/", "v. 谈判，协商"], ["notion", "/ˈnəʊʃn/", "n. 观念，概念"], ["nurture", "/ˈnɜːtʃə/", "v. 养育，培育"],
    ["oblige", "/əˈblaɪdʒ/", "v. 迫使；施恩于"], ["obstacle", "/ˈɒbstəkl/", "n. 障碍，阻碍"], ["occupy", "/ˈɒkjupaɪ/", "v. 占据，占用"],
    ["optimistic", "/ˌɒptɪˈmɪstɪk/", "adj. 乐观的"], ["overwhelm", "/ˌəʊvəˈwelm/", "v. 压倒，使不知所措"], ["paradox", "/ˈpærədɒks/", "n. 悖论，矛盾"],
    ["participate", "/pɑːˈtɪsɪpeɪt/", "v. 参与，参加"], ["perspective", "/pəˈspektɪv/", "n. 视角，观点"], ["phenomenon", "/fəˈnɒmɪnən/", "n. 现象"],
    ["plausible", "/ˈplɔːzəbl/", "adj. 貌似合理的"], ["pore", "/pɔː/", "n./v. 毛孔；仔细阅读"], ["predominant", "/prɪˈdɒmɪnənt/", "adj. 主要的，占优势的"],
    ["prevail", "/prɪˈveɪl/", "v. 盛行，获胜"], ["priority", "/praɪˈɒrəti/", "n. 优先事项"], ["profound", "/prəˈfaʊnd/", "adj. 深刻的，深远的"],
    ["prohibit", "/prəˈhɪbɪt/", "v. 禁止"], ["prominent", "/ˈprɒmɪnənt/", "adj. 突出的，著名的"], ["proportion", "/prəˈpɔːʃn/", "n. 比例，部分"],
    ["prosperity", "/prɒˈsperəti/", "n. 繁荣，昌盛"], ["pessimistic", "/ˌpesɪˈmɪstɪk/", "adj. 悲观的"], ["ratify", "/ˈrætɪfaɪ/", "v. 批准，正式认可"],
    ["recession", "/rɪˈseʃn/", "n. 经济衰退"], ["refute", "/rɪˈfjuːt/", "v. 驳斥，反驳"], ["relevant", "/ˈreləvənt/", "adj. 相关的，切题的"],
    ["reluctant", "/rɪˈlʌktənt/", "adj. 不情愿的"], ["remedy", "/ˈremədi/", "n./v. 补救办法；补救"], ["restrain", "/rɪˈstreɪn/", "v. 抑制，约束"],
    ["revenue", "/ˈrevənjuː/", "n. 收入，税收"], ["rigorous", "/ˈrɪɡərəs/", "adj. 严格的，严谨的"], ["scarce", "/skeəs/", "adj. 稀缺的，不足的"],
    ["simultaneous", "/ˌsɪmlˈteɪniəs/", "adj. 同时发生的"], ["skeptical", "/ˈskeptɪkl/", "adj. 怀疑的"], ["spontaneous", "/spɒnˈteɪniəs/", "adj. 自发的，自然的"],
    ["stimulate", "/ˈstɪmjuleɪt/", "v. 刺激，激励"], ["subsidy", "/ˈsʌbsədi/", "n. 补贴，津贴"], ["substantial", "/səbˈstænʃl/", "adj. 大量的，实质的"],
    ["sufficient", "/səˈfɪʃnt/", "adj. 充分的，足够的"], ["sustainable", "/səˈsteɪnəbl/", "adj. 可持续的"], ["tackle", "/ˈtækl/", "v. 处理，解决"],
    ["tedious", "/ˈtiːdiəs/", "adj. 单调乏味的"], ["tentative", "/ˈtentətɪv/", "adj. 试探性的，暂定的"], ["thrive", "/θraɪv/", "v. 兴旺，繁荣"],
    ["transparent", "/trænsˈpærənt/", "adj. 透明的"], ["trigger", "/ˈtrɪɡə/", "v./n. 触发；扳机"], ["underestimate", "/ˌʌndərˈestɪmeɪt/", "v. 低估"],
    ["undergo", "/ˌʌndəˈɡəʊ/", "v. 经历，承受"], ["utilize", "/ˈjuːtəlaɪz/", "v. 利用"], ["verify", "/ˈverɪfaɪ/", "v. 核实，查证"],
    ["viable", "/ˈvaɪəbl/", "adj. 可行的，有生存能力的"], ["vulnerable", "/ˈvʌlnərəbl/", "adj. 脆弱的，易受伤的"], ["widespread", "/ˈwaɪdspred/", "adj. 普遍的，广泛的"]
  ];

  // 内置示例新闻（非实时，用于展示版式；用户可换一批/手动收藏真实资讯）
  const DEMO_NEWS = [
    ["股票", "什么是市盈率（PE）？", "市盈率 = 股价 ÷ 每股收益，是衡量股票估值最常用的指标之一。一般来说 PE 越高，市场对其增长预期越高，但也要结合行业平均看。"],
    ["股票", "A股交易小知识：T+1 制度", "A股实行 T+1 交割制度，今天买入的股票最快要到下一个交易日才能卖出，下单前要考虑流动性哦。"],
    ["股票", "什么是指数基金？", "指数基金跟踪特定指数（如沪深300），费率低、持仓透明，适合想省心长期投资的人，是很多理财入门书推荐的第一站。"],
    ["宏观", "GDP 是怎么算出来的？", "GDP（国内生产总值）常用支出法核算：消费 + 投资 + 政府购买 + 净出口。它是衡量一个经济体总量最核心的指标。"],
    ["宏观", "央行「降准」是什么意思？", "降准即降低存款准备金率，银行可放贷的钱变多，市场流动性增强，通常被视为对经济和股市偏利好的信号。"],
    ["宏观", "CPI 与我们的钱包", "CPI（居民消费价格指数）反映物价涨跌。CPI 温和上涨说明经济活跃，涨幅过高则意味着「钱变毛了」，购买力下降。"],
    ["理财", "理财入门：先存应急金", "理财第一步不是买产品，而是备好 3~6 个月生活费的应急金（货币基金/活期理财），再谈其他投资。"],
    ["理财", "什么是「72 法则」？", "用 72 除以年化收益率，就是资金翻倍大约需要的年数。年化 6% 约 12 年翻倍，年化 9% 约 8 年翻倍。"],
    ["理财", "黄金为什么被视为避险资产？", "黄金总量有限、不依赖任何政府信用，在通胀高企或地缘动荡时往往受青睐，但价格同样会波动，不宜重仓。"],
    ["国际", "美联储加息如何影响全球？", "美联储加息会推高美元与美债收益率，全球资金倾向回流美国，新兴市场货币与股市可能承压。"],
    ["国际", "什么是汇率「破7」？", "「破7」指人民币兑美元汇率跌破 7.0。汇率波动影响进出口、留学与出境游成本，是观察宏观冷暖的重要窗口。"],
    ["国际", "石油价格为何牵动世界经济？", "原油是工业血液，油价大涨会推高运输与制造成本，加剧通胀；油价暴跌则可能冲击产油国经济。"]
  ];

  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function today() { return new Date().toISOString().slice(0, 10); }

  function seedData() {
    const t = today();
    return {
      plans: [
        { id: uid(), text: "背 10 个雅思单词", done: true, date: t, _d: 1 },
        { id: uid(), text: "运动 30 分钟", done: false, date: t, _d: 1 }
      ],
      words: [
        { id: uid(), word: "sustainable", ipa: "/səˈsteɪnəbl/", meaning: "adj. 可持续的", note: "", date: t, mastered: false, _d: 1 },
        { id: uid(), word: "fluctuate", ipa: "/ˈflʌktʃueɪt/", meaning: "v. 波动，起伏", note: "", date: t, mastered: false, _d: 1 }
      ],
      workouts: [
        { id: uid(), date: t, type: "跑步", minutes: 30, _d: 1 },
        { id: uid(), date: new Date(Date.now() - 86400000).toISOString().slice(0, 10), type: "健身", minutes: 45, _d: 1 }
      ],
      weights: [
        { id: uid(), date: t, kg: 62.5, _d: 1 },
        { id: uid(), date: new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10), kg: 63.1, _d: 1 }
      ],
      news: DEMO_NEWS.map(function (n, i) {
        return { id: "demo-n" + i, tag: n[0], title: n[1], summary: n[2], url: "", date: t, demo: true };
      }),
      assets: [
        { id: uid(), name: "招商银行 · 活期", type: "银行存款", amount: 20000, _d: 1 },
        { id: uid(), name: "XX银行 · 稳健理财", type: "理财", amount: 50000, _d: 1 },
        { id: uid(), name: "积存金", type: "黄金", amount: 8000, _d: 1 },
        { id: uid(), name: "沪深300指数基金", type: "股票", amount: 12000, _d: 1 }
      ],
      incomes: [
        { id: uid(), date: t.slice(0, 8) + "05", kind: "工资", amount: 8500, note: "", _d: 1 },
        { id: uid(), date: t, kind: "兼职", amount: 600, note: "周末兼职", _d: 1 }
      ],
      exams: [
        { id: uid(), name: "雅思考试", date: new Date(Date.now() + 21 * 86400000).toISOString().slice(0, 10), note: "口语下午 2 点", _d: 1 },
        { id: uid(), name: "银行从业资格", date: new Date(Date.now() + 60 * 86400000).toISOString().slice(0, 10), note: "", _d: 1 }
      ],
      expenses: [
        { id: uid(), date: t, cat: "餐饮", amount: 35.5, note: "午饭", _d: 1 },
        { id: uid(), date: t, cat: "交通", amount: 6, note: "地铁", _d: 1 },
        { id: uid(), date: new Date(Date.now() - 86400000).toISOString().slice(0, 10), cat: "购物", amount: 128, note: "洗衣液等日用", _d: 1 }
      ],
      settings: { goalWords: 10, goalMinutes: 30, suggestDay: "" }
    };
  }

  let needSave = false;
  function load() {
    let d = null;
    try { d = JSON.parse(localStorage.getItem(KEY) || "null"); } catch (e) { d = null; }
    if (!d) { d = seedData(); needSave = true; }
    // 旧数据兼容
    ["plans", "words", "workouts", "weights", "news", "assets", "incomes", "expenses", "exams"].forEach(function (k) {
      if (!Array.isArray(d[k])) d[k] = [];
    });
    if (!d.settings) d.settings = { goalWords: 10, goalMinutes: 30, suggestDay: "" };
    return d;
  }

  let cache = load();
  if (needSave) save();
  function save(d) {
    if (!d) d = cache;
    cache = d;
    try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) { /* 隐私模式下静默 */ }
  }
  function D() { return cache; }

  function removeDemo() {
    const d = D();
    ["plans", "words", "workouts", "weights", "news", "assets", "incomes", "expenses", "exams"].forEach(function (k) {
      d[k] = d[k].filter(function (x) { return !x._d && !x.demo; });
    });
    save();
  }
  function wipeAll() {
    cache = { plans: [], words: [], workouts: [], weights: [], news: [], assets: [], incomes: [], expenses: [], settings: cache.settings };
    save();
  }

  // 惰性 getter 兜底
  function Plans() { const d = D(); if (!d.plans) d.plans = []; return d.plans; }
  function Words() { const d = D(); if (!d.words) d.words = []; return d.words; }
  function Workouts() { const d = D(); if (!d.workouts) d.workouts = []; return d.workouts; }
  function Weights() { const d = D(); if (!d.weights) d.weights = []; return d.weights; }
  function News() { const d = D(); if (!d.news) d.news = []; return d.news; }
  function Assets() { const d = D(); if (!d.assets) d.assets = []; return d.assets; }
  function Incomes() { const d = D(); if (!d.incomes) d.incomes = []; return d.incomes; }
  function Expenses() { const d = D(); if (!d.expenses) d.expenses = []; return d.expenses; }
  function Exams() { const d = D(); if (!d.exams) d.exams = []; return d.exams; }

  window.Store = {
    KEY: KEY, D: D, save: save, uid: uid, today: today,
    IELTS_POOL: IELTS_POOL, DEMO_NEWS: DEMO_NEWS,
    removeDemo: removeDemo, wipeAll: wipeAll,
    Plans: Plans, Words: Words, Workouts: Workouts, Weights: Weights,
    News: News, Assets: Assets, Incomes: Incomes, Expenses: Expenses, Exams: Exams
  };
  if (typeof module !== "undefined") module.exports = window.Store;
})();
