/* 睡眠节律：时间推进 - 核心逻辑 */

(function () {
  "use strict";

  // 工具函数
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  const lerp = (a, b, t) => a + (b - a) * t;

  // 时间系统（游戏内时间，分钟为单位）
  const MIN_PER_HOUR = 60;
  const MIN_PER_DAY = 24 * MIN_PER_HOUR;

  const $ = (sel) => document.querySelector(sel);

  const ui = {
    day: $("#day"),
    clock: $("#clock"),
    state: $("#state"),
    bars: {
      alertness: $("#barAlertness"),
      sleepPressure: $("#barSleepPressure"),
      circadian: $("#barCircadian"),
      melatonin: $("#barMelatonin"),
      caffeine: $("#barCaffeine"),
      health: $("#barHealth"),
      performance: $("#barPerformance"),
    },
    vals: {
      alertness: $("#valAlertness"),
      sleepPressure: $("#valSleepPressure"),
      circadian: $("#valCircadian"),
      melatonin: $("#valMelatonin"),
      caffeine: $("#valCaffeine"),
      health: $("#valHealth"),
      performance: $("#valPerformance"),
    },
    log: $("#log"),
    chart: $("#chart"),
    currentActivity: $("#currentActivity"),
    world: $("#world"),
    worldPrompt: $("#worldPrompt"),

    btnStart: $("#btnStart"),
    btnPause: $("#btnPause"),
    btnNextDay: $("#btnNextDay"),
    speedSelect: $("#speedSelect"),

    btnSleepToggle: $("#btnSleepToggle"),
    btnNap: $("#btnNap"),
    btnCoffee: $("#btnCoffee"),
    btnBrightLight: $("#btnBrightLight"),
    btnScreenToggle: $("#btnScreenToggle"),
    btnExercise: $("#btnExercise"),

    chkDarkRoom: $("#chkDarkRoom"),
  };

  // 模型参数（简化）
  const params = {
    // 睡眠压力（过程S）
    S_awake_rate: 1 / (16 * MIN_PER_HOUR), // 清醒时每分钟上升到满的比例（16小时到满）
    S_sleep_decay_half_life_min: 180, // 睡眠时半衰期（3小时）

    // 昼夜节律（过程C）
    C_amplitude: 0.6, // 振幅（-0.6..+0.6）
    C_phase_offset_min: 16 * MIN_PER_HOUR, // 相位（峰值在下午/傍晚）
    C_period_min: MIN_PER_DAY, // 24h

    // 褪黑素（受光、屏幕、遮光影响）
    melatonin_base: 0, // 白天近0，夜晚上升

    // 咖啡因
    caffeine_half_life_min: 300, // 5h
    caffeine_max: 1.5,

    // 运动对睡眠质量与健康的影响
    exercise_effect_hours: 6,

    // 评分
    performance_noise: 0.05,
  };

  // 游戏状态
  const state = {
    running: false,
    speed: 1,
    day: 1,
    minute: 7 * MIN_PER_HOUR, // 07:00 开始
    sleeping: false,
    screenOn: false,
    activity: "闲暇",

    // 模型变量（0..1）
    S: 0.3, // 睡眠压力
    C_phase_shift_min: 0, // 相位漂移
    caffeine: 0,
    melatonin: 0,

    // 综合指标
    alertness: 0.7,
    health: 1,
    performance: 0.7,

    // 记录
    history: [], // 最近24h曲线
    lastExerciseMin: -9999,
  };

  // 日志
  function log(msg) {
    const t = formatTime(globalMinutes);
    const line = document.createElement("div");
    line.className = "line";
    line.innerHTML = `<span class="t">[第${state.day}天 ${t}]</span>${msg}`;
    ui.log.prepend(line);
  }

  // 时间格式
  function formatTime(min) {
    let m = (min % MIN_PER_DAY + MIN_PER_DAY) % MIN_PER_DAY;
    const h = Math.floor(m / 60);
    const mm = m % 60;
    return `${String(h).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
  }

  // 计算昼夜节律C（-1..+1）与褪黑素（0..1）
  function calcCircadian(minute) {
    const phase = (2 * Math.PI * (minute - params.C_phase_offset_min - state.C_phase_shift_min)) / params.C_period_min;
    const c = Math.sin(phase); // -1..1
    // 夜间褪黑素：当C为负且夜间（22:00-06:00）更高
    const h = (minute % MIN_PER_DAY) / MIN_PER_HOUR;
    const isNight = h >= 22 || h < 6;
    let mel = isNight ? clamp(-c, 0, 1) : clamp(-c * 0.5, 0, 1);
    // 光照与屏幕影响：强光/屏幕抑制褪黑素
    if (ui.chkDarkRoom.checked && isNight) mel = mel * 1.1;
    if (actionFlags.brightLightUntil > globalMinutes) mel *= 0.2;
    if (state.screenOn && isNight) mel *= 0.5;
    mel = clamp(mel, 0, 1);
    return { C: c * params.C_amplitude, melatonin: mel };
  }

  // 全局时间推进
  let globalMinutes = state.minute;

  // 行动标记（短时效果）
  const actionFlags = {
    brightLightUntil: -1,
    nappingUntil: -1,
  };

  const keys = { left:false, right:false, up:false, down:false, w:false, a:false, s:false, d:false };
  const world = {
    width: 800,
    height: 450,
    roomPadding: 24,
    player: { x: 400, y: 280, radius: 10, speed: 140 },
    zones: [],
  };
  let lastInteractAt = 0;
  function setupWorldZones() {
    world.zones = [
      { name: "床", x: 40, y: 340, w: 140, h: 70, prompt: "睡觉/起床", action: () => toggleSleep() },
      { name: "咖啡机", x: 640, y: 80, w: 100, h: 60, prompt: "喝咖啡", action: () => drinkCoffee() },
      { name: "窗户", x: 680, y: 20, w: 80, h: 40, prompt: "强光曝露", action: () => brightLight() },
      { name: "电视/屏幕", x: 320, y: 80, w: 140, h: 60, prompt: "切换屏幕", action: () => toggleScreen() },
      { name: "运动区", x: 520, y: 320, w: 120, h: 80, prompt: "运动30分钟", action: () => exercise30m() },
      { name: "沙发", x: 220, y: 320, w: 120, h: 80, prompt: "小睡20分钟", action: () => nap20m() },
    ];
  }

  // 模型更新（dt分钟）
  function updateModel(dt) {
    globalMinutes += dt;

    // S：睡眠压力
    if (!state.sleeping) {
      state.S = clamp(state.S + params.S_awake_rate * dt, 0, 1.2);
    } else {
      // 指数衰减
      const k = Math.pow(0.5, dt / params.S_sleep_decay_half_life_min);
      state.S = clamp(state.S * k, 0, 1);
    }

    // C 与 褪黑素
    const { C, melatonin } = calcCircadian(globalMinutes);

    // 咖啡因衰减
    const ck = Math.pow(0.5, dt / params.caffeine_half_life_min);
    state.caffeine = clamp(state.caffeine * ck, 0, params.caffeine_max);

    state.melatonin = melatonin;

    // 清醒度：受（-S + C）与咖啡因、睡眠状态影响
    const baseAlert = clamp(1 - state.S + C, 0, 1);
    const caffeineBoost = clamp(state.caffeine / params.caffeine_max, 0, 0.35);
    let alertness = clamp(baseAlert + caffeineBoost, 0, 1);
    if (state.sleeping) alertness = lerp(alertness, 0.1, 0.7);
    state.alertness = alertness;

    // 表现：工作时依赖清醒度，非工作时间略降权
    const hour = (globalMinutes % MIN_PER_DAY) / MIN_PER_HOUR;
    const working = hour >= 9 && hour < 17;
    const perfBase = working ? alertness : alertness * 0.7;
    state.performance = clamp(perfBase + (Math.random() - 0.5) * params.performance_noise, 0, 1);

    // 健康：长期睡眠不足下降；优质睡眠回升
    const sleptEnough = state.S < 0.25;
    const sleepDebt = clamp(state.S - 0.9, 0, 1); // 过高压力代表债
    if (!state.sleeping) {
      state.health = clamp(state.health - (0.00002 + sleepDebt * 0.00008) * dt, 0, 1);
    } else {
      // 最近运动助益恢复
      const exercisedRecently = globalMinutes - state.lastExerciseMin < params.exercise_effect_hours * MIN_PER_HOUR;
      const recov = exercisedRecently ? 0.00025 : 0.00018;
      state.health = clamp(state.health + (sleptEnough ? recov * 1.2 : recov) * dt, 0, 1);
    }

    // 记录历史用于绘图（最近24h）
    state.history.push({
      t: globalMinutes,
      alertness: state.alertness,
      S: clamp(state.S, 0, 1),
      C: C * 0.5 + 0.5, // 映射0..1绘图
    });
    while (state.history.length > 0 && globalMinutes - state.history[0].t > MIN_PER_DAY) {
      state.history.shift();
    }

    // 跨日处理
    const newDay = Math.floor(globalMinutes / MIN_PER_DAY) + 1;
    if (newDay !== state.day) {
      state.day = newDay;
    }
  }

  // 绘图（简单canvas）
  function renderChart() {
    const ctx = ui.chart.getContext("2d");
    const w = ui.chart.width, h = ui.chart.height;
    ctx.clearRect(0, 0, w, h);

    // 网格
    ctx.strokeStyle = "#223";
    ctx.lineWidth = 1;
    for (let i = 0; i <= 24; i++) {
      const x = (i / 24) * w;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }

    const t0 = globalMinutes - MIN_PER_DAY;

    function drawLine(color, getter) {
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      let started = false;
      for (const p of state.history) {
        const x = ((p.t - t0) / MIN_PER_DAY) * w;
        const y = h - getter(p) * (h - 10) - 5;
        if (!started) {
          ctx.moveTo(x, y);
          started = true;
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
    }

    drawLine("#6aa0ff", (p) => p.alertness);
    drawLine("#a78bfa", (p) => p.S);
    drawLine("#6de79b", (p) => p.C);
  }

  // UI更新
  function renderUI() {
    ui.day.textContent = `第 ${state.day} 天`;
    ui.clock.textContent = formatTime(globalMinutes);
    ui.state.textContent = `状态：${state.sleeping ? "睡眠中" : "清醒"}${state.screenOn ? "｜屏幕" : ""}`;

    function setBar(el, val, pct = true) {
      const v = clamp(val, 0, 1);
      el.style.width = `${(pct ? v : v) * 100}%`;
    }

    setBar(ui.bars.alertness, state.alertness);
    setBar(ui.bars.sleepPressure, clamp(state.S, 0, 1));
    const { C } = calcCircadian(globalMinutes);
    setBar(ui.bars.circadian, (C * 0.5 + 0.5));
    setBar(ui.bars.melatonin, state.melatonin);
    setBar(ui.bars.caffeine, clamp(state.caffeine / params.caffeine_max, 0, 1));
    setBar(ui.bars.health, state.health);
    setBar(ui.bars.performance, state.performance);

    ui.vals.alertness.textContent = Math.round(state.alertness * 100).toString();
    ui.vals.sleepPressure.textContent = Math.round(clamp(state.S, 0, 1) * 100).toString();
    ui.vals.circadian.textContent = Math.round((C * 0.5 + 0.5) * 100).toString();
    ui.vals.melatonin.textContent = Math.round(state.melatonin * 100).toString();
    ui.vals.caffeine.textContent = Math.round(clamp(state.caffeine / params.caffeine_max, 0, 1) * 100).toString();
    ui.vals.health.textContent = Math.round(state.health * 100).toString();
    ui.vals.performance.textContent = Math.round(state.performance * 100).toString();

    ui.currentActivity.textContent = state.activity;

    renderChart();
  }

  // 2D 世界：检测、更新与绘制
  function rectContainsPoint(rect, px, py) {
    return px >= rect.x && px <= rect.x + rect.w && py >= rect.y && py <= rect.y + rect.h;
  }
  function nearestZoneInRange(range=48) {
    const p = world.player;
    let best = null, bestDist = Infinity;
    for (const z of world.zones) {
      const cx = clamp(p.x, z.x, z.x + z.w);
      const cy = clamp(p.y, z.y, z.y + z.h);
      const dx = p.x - cx, dy = p.y - cy;
      const d = Math.hypot(dx, dy);
      if (d < bestDist && d <= range) { bestDist = d; best = z; }
    }
    return best;
  }
  function interact() {
    const now = performance.now();
    if (now - lastInteractAt < 250) return;
    const z = nearestZoneInRange();
    if (z) {
      z.action();
      lastInteractAt = now;
    }
  }
  function updateWorld(dt) {
    const p = world.player;
    if (!state.sleeping) {
      let ax = 0, ay = 0;
      if (keys.left || keys.a) ax -= 1;
      if (keys.right || keys.d) ax += 1;
      if (keys.up || keys.w) ay -= 1;
      if (keys.down || keys.s) ay += 1;
      const len = Math.hypot(ax, ay) || 1;
      ax /= len; ay /= len;
      p.x += ax * p.speed * dt;
      p.y += ay * p.speed * dt;
    }
    const pad = world.roomPadding;
    p.x = clamp(p.x, pad, world.width - pad);
    p.y = clamp(p.y, pad, world.height - pad);
    // 更新交互提示
    const inRange = nearestZoneInRange();
    ui.worldPrompt.textContent = inRange ? `按 E：${inRange.prompt}` : "";
  }
  function drawWorld() {
    const c = ui.world;
    if (!c) return;
    const ctx = c.getContext('2d');
    const w = c.width, h = c.height;
    // 背景与房间
    ctx.fillStyle = '#0b0f18';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#111826';
    ctx.fillRect(16, 16, w - 32, h - 32);
    // 区域
    for (const z of world.zones) {
      ctx.fillStyle = '#1f2a44';
      ctx.fillRect(z.x, z.y, z.w, z.h);
      ctx.strokeStyle = '#2f3b5c';
      ctx.strokeRect(z.x + 0.5, z.y + 0.5, z.w - 1, z.h - 1);
      ctx.fillStyle = '#a3a9b7';
      ctx.font = '12px sans-serif';
      ctx.fillText(z.name, z.x + 6, z.y + 16);
    }
    // 玩家
    const p = world.player;
    ctx.fillStyle = '#6aa0ff';
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fill();
    // 昼夜遮罩
    const hour = (globalMinutes % (24*60)) / 60;
    const isNight = hour >= 21 || hour < 6;
    if (isNight) {
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.fillRect(0,0,w,h);
    }
    // 时钟
    ctx.fillStyle = '#c8d0e0';
    ctx.font = '12px sans-serif';
    ctx.fillText(`第${state.day}天 ${formatTime(globalMinutes)} ${state.sleeping ? '睡眠中' : ''}`, 20, 28);
  }

  // 行动逻辑
  function toggleSleep() {
    state.sleeping = !state.sleeping;
    state.activity = state.sleeping ? "睡觉" : "闲暇";
    log(state.sleeping ? "上床睡觉。" : "起床，开始清醒期。");
  }

  function nap20m() {
    if (state.sleeping) { log("已在睡觉，无法小睡。"); return; }
    actionFlags.nappingUntil = globalMinutes + 20;
    state.activity = "小睡";
    state.sleeping = true;
    log("开始小睡20分钟。");
  }

  function drinkCoffee() {
    state.caffeine = clamp(state.caffeine + 0.6, 0, params.caffeine_max);
    log("喝了一杯咖啡（+咖啡因）。");
  }

  function brightLight() {
    actionFlags.brightLightUntil = globalMinutes + 15;
    log("进行了15分钟强光曝露（抑制褪黑素，提升相位稳定）。");
    // 早晨强光略微提前相位，夜晚强光推迟
    const hour = (globalMinutes % MIN_PER_DAY) / MIN_PER_HOUR;
    if (hour < 12) state.C_phase_shift_min -= 5; else state.C_phase_shift_min += 5;
  }

  function toggleScreen() {
    state.screenOn = !state.screenOn;
    log(state.screenOn ? "打开屏幕，蓝光可能影响入睡。" : "关闭屏幕。");
  }

  function exercise30m() {
    // 运动当下提升清醒度并记录恢复增益
    state.lastExerciseMin = globalMinutes;
    state.activity = "运动";
    // 短暂提升：通过降低S一点点模拟精神焕发
    state.S = clamp(state.S - 0.05, 0, 1);
    log("完成30分钟运动（有助夜间睡眠与健康恢复）。");
  }

  // 循环
  let lastTime = 0;
  function tick(ts) {
    if (!lastTime) lastTime = ts;
    const elapsed = ts - lastTime;
    lastTime = ts;
    const dt = Math.max(0, elapsed / 1000);

    // 世界更新始终进行（允许暂停时移动）
    updateWorld(dt);

    if (state.running) {
      const simMinutes = Math.max(1, Math.floor(dt * 60 * state.speed));
      for (let i = 0; i < simMinutes; i++) {
        updateModel(1);
        // 小睡到点自动醒
        if (actionFlags.nappingUntil > 0 && globalMinutes >= actionFlags.nappingUntil) {
          state.sleeping = false;
          state.activity = "闲暇";
          actionFlags.nappingUntil = -1;
          log("小睡结束，醒来。");
        }
        // 自动睡/醒
        const hour = (globalMinutes % MIN_PER_DAY) / MIN_PER_HOUR;
        if (!state.sleeping) {
          const sleepy = state.S > 0.85 && hour >= 21;
          if (sleepy && !state.screenOn) { state.sleeping = true; state.activity = "睡觉"; log("困倦难耐，进入睡眠。"); }
        } else {
          const wakeup = state.S < 0.25 && hour >= 6;
          if (wakeup) { state.sleeping = false; state.activity = "清晨"; log("睡够了，自然醒来。"); }
        }
      }
    }

    drawWorld();
    renderUI();
    requestAnimationFrame(tick);
  }

  // 绑定事件
  function bindUI() {
    ui.btnStart.addEventListener("click", () => { state.running = true; log("开始模拟。"); });
    ui.btnPause.addEventListener("click", () => { state.running = false; log("暂停。"); });
    ui.btnNextDay.addEventListener("click", () => {
      const target = (Math.floor(globalMinutes / MIN_PER_DAY) + 1) * MIN_PER_DAY;
      const delta = target - globalMinutes;
      updateModel(delta);
      log("跳到次日。");
      renderUI();
    });
    ui.speedSelect.addEventListener("change", () => { state.speed = parseInt(ui.speedSelect.value, 10); });

    ui.btnSleepToggle.addEventListener("click", toggleSleep);
    ui.btnNap.addEventListener("click", nap20m);
    ui.btnCoffee.addEventListener("click", drinkCoffee);
    ui.btnBrightLight.addEventListener("click", brightLight);
    ui.btnScreenToggle.addEventListener("click", toggleScreen);
    ui.btnExercise.addEventListener("click", exercise30m);

    window.addEventListener('keydown', (e) => {
      const k = e.key;
      if (["ArrowLeft","ArrowRight","ArrowUp","ArrowDown"," "].includes(k)) e.preventDefault();
      if (k === 'ArrowLeft') keys.left = true;
      if (k === 'ArrowRight') keys.right = true;
      if (k === 'ArrowUp') keys.up = true;
      if (k === 'ArrowDown') keys.down = true;
      if (k === 'a' || k === 'A') keys.a = true;
      if (k === 'd' || k === 'D') keys.d = true;
      if (k === 'w' || k === 'W') keys.w = true;
      if (k === 's' || k === 'S') keys.s = true;
      if (k === 'e' || k === 'E') interact();
      if (k === ' ') { state.running = !state.running; log(state.running ? '开始模拟。' : '暂停。'); }
    });
    window.addEventListener('keyup', (e) => {
      const k = e.key;
      if (k === 'ArrowLeft') keys.left = false;
      if (k === 'ArrowRight') keys.right = false;
      if (k === 'ArrowUp') keys.up = false;
      if (k === 'ArrowDown') keys.down = false;
      if (k === 'a' || k === 'A') keys.a = false;
      if (k === 'd' || k === 'D') keys.d = false;
      if (k === 'w' || k === 'W') keys.w = false;
      if (k === 's' || k === 'S') keys.s = false;
    });
  }

  // 初始化
  function init() {
    bindUI();
    setupWorldZones();
    // 初始数据点
    updateModel(0);
    state.running = false;
    renderUI();
    requestAnimationFrame(tick);
    log("欢迎来到《睡眠节律：时间推进》。建议目标：23:00-07:00 睡眠，白天强光，晚间少屏幕，适量咖啡与运动。");
  }

  init();
})();