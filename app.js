(() => {
  "use strict";

  const config = window.INVITATION_CONFIG || {};
  const $ = (id) => document.getElementById(id);
  const safeText = (value, fallback) => String(value || fallback || "").trim();
  const parameters = new URLSearchParams(window.location.search);
  const autoOpen = parameters.get("open") === "1";
  const letterDate = safeText(config.letterDate, "2026年9月");
  const members = Array.isArray(config.members) && config.members.length ? config.members : [];

  $("letterDate").textContent = letterDate;
  document.title = "来自团委组织部的邀请信";

  function createElement(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function renderMembers() {
    const grid = $("memberGrid");
    const source = members.length ? members : Array.from({ length: 6 }, () => ({}));
    source.forEach((member, index) => {
      const card = createElement("article", "member-card");
      const avatar = createElement("div", "avatar");
      const avatarPath = safeText(member.avatar, "");
      if (avatarPath) {
        const image = new Image();
        image.src = avatarPath;
        image.alt = `${safeText(member.name, "组织部伙伴")}头像`;
        image.addEventListener("error", () => {
          avatar.replaceChildren(document.createTextNode("待添加\n头像"));
        });
        avatar.append(image);
      } else {
        avatar.textContent = "待添加\n头像";
      }
      const details = createElement("div");
      details.append(createElement("div", "member-role", safeText(member.role, "待填写职务")));
      details.append(createElement("div", "member-name", safeText(member.name, `待填写成员 ${index + 1}`)));
      if (member.intro) details.append(createElement("div", "member-intro", member.intro));
      card.append(avatar, details);
      grid.append(card);
    });
  }

  renderMembers();

  const cover = $("cover");
  const letter = $("letter");
  const envelope = $("envelope");
  function showLetter() {
    envelope.classList.add("opening");
    window.setTimeout(() => {
      cover.hidden = true;
      letter.hidden = false;
      $("letterApp").scrollIntoView({ behavior: "smooth", block: "start" });
    }, window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 80 : 880);
  }
  $("openLetter").addEventListener("click", showLetter);
  $("backToCover").addEventListener("click", () => {
    letter.hidden = true;
    cover.hidden = false;
    envelope.classList.remove("opening");
    $("message").textContent = "";
    $("letterApp").scrollIntoView({ behavior: "smooth", block: "start" });
  });
  $("celebrate").addEventListener("click", () => {
    $("message").textContent = "邀请已收下。欢迎加入行知书院团委组织部！";
  });

  function roundedRect(context, x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    context.beginPath();
    context.moveTo(x + r, y);
    context.arcTo(x + width, y, x + width, y + height, r);
    context.arcTo(x + width, y + height, x, y + height, r);
    context.arcTo(x, y + height, x, y, r);
    context.arcTo(x, y, x + width, y, r);
    context.closePath();
  }

  function hit(left, right) {
    return left.x < right.x + right.w && left.x + left.w > right.x && left.y < right.y + right.h && left.y + left.h > right.y;
  }

  /* --- Quest 01: side-scrolling newcomer run --- */
  const runCanvas = $("runCanvas");
  const runContext = runCanvas.getContext("2d");
  const runStage = $("runStage");
  const runPlayer = { x: 105, y: 212, w: 34, h: 54, vy: 0, onGround: true };
  const runGroundY = 266;
  const memberItems = members.slice(0, 6).map((member, index) => ({
    kind: "person",
    label: safeText(member.name, `组织部伙伴${index + 1}`),
    sub: safeText(member.role, "组织部伙伴"),
    icon: "👋"
  }));
  const activityItems = [
    { kind: "activity", label: "破冰相识", sub: "新的开始", icon: "✉" },
    { kind: "activity", label: "团籍整理", sub: "细致与责任", icon: "▣" },
    { kind: "activity", label: "主题团日", sub: "凝聚班团", icon: "✦" },
    { kind: "activity", label: "团员发展", sub: "认真记录", icon: "✓" },
    { kind: "activity", label: "服务同学", sub: "一起行动", icon: "♥" },
    { kind: "activity", label: "共同成长", sub: "收获能力", icon: "↑" }
  ];
  const runCollectibles = [];
  const maximum = Math.max(memberItems.length, activityItems.length);
  for (let index = 0; index < maximum; index += 1) {
    if (memberItems[index]) runCollectibles.push(memberItems[index]);
    if (activityItems[index]) runCollectibles.push(activityItems[index]);
  }

  let runItems = [];
  let runObstacles = [];
  let runWorld = 0;
  let runLives = 3;
  let runCollected = [];
  let runFinishX = 0;
  let runActive = false;
  let runLastTime = 0;
  let runFrame = 0;
  let runHitCooldown = 0;
  let runToastTimer = 0;

  function buildRunCourse() {
    runItems = [];
    runObstacles = [];
    let worldX = 500;
    runCollectibles.forEach((data, index) => {
      runItems.push({ data, worldX, y: index % 3 === 1 ? runGroundY - 150 : runGroundY - 97, w: 56, h: 56, collected: false, missed: false });
      if (index % 2 === 0) runObstacles.push({ worldX: worldX - 116, y: runGroundY - 35, w: 35, h: 35, hit: false });
      worldX += 285;
    });
    runFinishX = worldX + 300;
  }

  function showRunToast(message) {
    window.clearTimeout(runToastTimer);
    $("runToast").textContent = message;
    $("runToast").classList.add("show");
    runToastTimer = window.setTimeout(() => $("runToast").classList.remove("show"), 1150);
  }

  function drawRunBackground() {
    const context = runContext;
    const width = runCanvas.width;
    const height = runCanvas.height;
    const sky = context.createLinearGradient(0, 0, 0, height);
    sky.addColorStop(0, "#def0f9"); sky.addColorStop(.69, "#ffffff"); sky.addColorStop(1, "#f7fbfe");
    context.fillStyle = sky; context.fillRect(0, 0, width, height);
    const cloudOffset = -(runWorld * .15) % 310;
    context.fillStyle = "rgba(255,255,255,.88)";
    for (let i = -1; i < 4; i += 1) {
      const x = cloudOffset + i * 310 + 60;
      const y = 48 + (i % 2) * 34;
      context.beginPath(); context.arc(x, y, 24, 0, Math.PI * 2); context.arc(x + 27, y - 8, 31, 0, Math.PI * 2); context.arc(x + 57, y, 23, 0, Math.PI * 2); context.fill();
    }
    const buildingOffset = -(runWorld * .32) % 510;
    for (let i = -1; i < 3; i += 1) {
      const x = buildingOffset + i * 510;
      context.fillStyle = "#c6dce9"; context.fillRect(x + 55, 160, 172, 72);
      context.fillStyle = "#4167b1"; context.fillRect(x + 255, 140, 132, 92);
      context.fillStyle = "#ffffff";
      for (let col = 0; col < 4; col += 1) for (let row = 0; row < 2; row += 1) context.fillRect(x + 76 + col * 34, 178 + row * 25, 19, 13);
    }
    context.fillStyle = "#c7e7f6"; context.fillRect(0, 232, width, 34);
    context.fillStyle = "#4167b1"; context.fillRect(0, 266, width, height - 266);
    context.fillStyle = "#f7fbfe";
    for (let x = -(runWorld % 90); x < width; x += 90) context.fillRect(x, 293, 44, 5);
  }

  function drawRunPlayer() {
    const context = runContext;
    const player = runPlayer;
    context.fillStyle = "rgba(38,56,72,.15)";
    context.beginPath(); context.ellipse(player.x + player.w / 2, runGroundY + 3, 25, 6, 0, 0, Math.PI * 2); context.fill();
    const leg = Math.sin(performance.now() / 80) * 7;
    context.strokeStyle = "#1b1f23"; context.lineWidth = 6; context.lineCap = "round";
    context.beginPath(); context.moveTo(player.x + 15, player.y + 42); context.lineTo(player.x + 11 + leg, player.y + 55); context.moveTo(player.x + 23, player.y + 42); context.lineTo(player.x + 27 - leg, player.y + 55); context.stroke();
    context.fillStyle = "#4167b1"; roundedRect(context, player.x + 7, player.y + 20, 25, 28, 7); context.fill();
    context.fillStyle = "#c7e7f6"; roundedRect(context, player.x + 2, player.y + 24, 10, 21, 4); context.fill();
    context.fillStyle = "#ffd5b5"; context.beginPath(); context.arc(player.x + 20, player.y + 12, 12, 0, Math.PI * 2); context.fill();
    context.fillStyle = "#1b1f23"; context.beginPath(); context.arc(player.x + 20, player.y + 7, 12, Math.PI, Math.PI * 2); context.fill();
  }

  function drawRunObstacle(obstacle) {
    const context = runContext;
    const x = obstacle.worldX - runWorld;
    if (x < -55 || x > 955) return;
    context.fillStyle = obstacle.hit ? "#d7e4eb" : "#5878b9";
    roundedRect(context, x, obstacle.y, obstacle.w, obstacle.h, 4); context.fill();
    context.strokeStyle = "#2d4f91"; context.lineWidth = 3; context.stroke();
    context.fillStyle = "#ffffff"; context.font = "bold 11px sans-serif"; context.textAlign = "center"; context.fillText("材料", x + obstacle.w / 2, obstacle.y + 21);
  }

  function drawRunItem(item) {
    if (item.collected) return;
    const context = runContext;
    const x = item.worldX - runWorld;
    if (x < -90 || x > 970) return;
    context.save();
    context.shadowColor = "rgba(35,80,94,.18)"; context.shadowBlur = 8; context.shadowOffsetY = 4;
    context.fillStyle = "#fff"; roundedRect(context, x - 7, item.y - 7, 70, 80, 8); context.fill();
    context.shadowColor = "transparent"; context.strokeStyle = item.data.kind === "person" ? "#4167b1" : "#2d4f91"; context.lineWidth = 3; context.stroke();
    context.fillStyle = item.data.kind === "person" ? "#4167b1" : "#2d4f91";
    context.beginPath(); context.arc(x + 28, item.y + 25, 20, 0, Math.PI * 2); context.fill();
    context.fillStyle = "#fff"; context.font = "bold 23px sans-serif"; context.textAlign = "center"; context.textBaseline = "middle"; context.fillText(item.data.icon, x + 28, item.y + 26);
    context.fillStyle = "#1b1f23"; context.font = "bold 11px sans-serif"; context.textBaseline = "alphabetic";
    const label = item.data.label.length > 7 ? `${item.data.label.slice(0, 7)}…` : item.data.label;
    context.fillText(label, x + 28, item.y + 63); context.restore();
  }

  function drawRunFinish() {
    const context = runContext;
    const x = runFinishX - runWorld;
    if (x < -130 || x > 1000) return;
    context.fillStyle = "#4167b1"; context.fillRect(x, 90, 7, 176);
    context.fillStyle = "#ffffff"; context.fillRect(x + 7, 104, 130, 66);
    context.strokeStyle = "#4167b1"; context.lineWidth = 4; context.strokeRect(x + 7, 104, 130, 66);
    context.fillStyle = "#2d4f91"; context.textAlign = "center"; context.font = "bold 16px sans-serif"; context.fillText("行知书院团委", x + 72, 130);
    context.fillStyle = "#4167b1"; context.font = "bold 14px sans-serif"; context.fillText("组织部 ✦", x + 72, 153);
  }

  function drawRun() {
    runContext.clearRect(0, 0, runCanvas.width, runCanvas.height);
    drawRunBackground(); runObstacles.forEach(drawRunObstacle); runItems.forEach(drawRunItem); drawRunFinish(); drawRunPlayer();
  }

  function finishRun() {
    runActive = false;
    window.cancelAnimationFrame(runFrame);
    const total = runCollectibles.length;
    const title = runCollected.length === total ? "全图鉴解锁！" : "跑到终点啦！";
    const result = $("runResult");
    result.replaceChildren();
    result.append(createElement("div", "", title));
    const description = createElement("div", "", `你收集了 ${runCollected.length}/${total} 个伙伴与组织部工作图鉴。`);
    description.style.marginTop = "6px"; result.append(description);
    const tags = createElement("div", "result-tags");
    runCollected.forEach((item) => tags.append(createElement("span", "result-tag", `${item.kind === "person" ? "伙伴" : "工作"} · ${item.label}`)));
    result.append(tags, createElement("div", "", "真正的组织部图鉴，接下来会在一次次合作中慢慢解锁。"));
    result.hidden = false;
    showRunToast("欢迎加入行知书院团委组织部！");
  }

  function runLoop(timestamp) {
    if (!runActive) return;
    const delta = Math.min(.032, (timestamp - runLastTime) / 1000);
    runLastTime = timestamp;
    runWorld += 235 * delta;
    $("runDistance").textContent = String(Math.floor(runWorld / 10));
    runPlayer.vy += 1550 * delta; runPlayer.y += runPlayer.vy * delta;
    if (runPlayer.y >= runGroundY - runPlayer.h) { runPlayer.y = runGroundY - runPlayer.h; runPlayer.vy = 0; runPlayer.onGround = true; }
    if (runHitCooldown > 0) runHitCooldown -= delta;
    runItems.forEach((item) => {
      const screenX = item.worldX - runWorld;
      if (!item.collected && !item.missed) {
        if (hit(runPlayer, { x: screenX, y: item.y, w: item.w, h: item.h })) {
          item.collected = true; runCollected.push(item.data); $("runScore").textContent = String(runCollected.length);
          showRunToast(`${item.data.kind === "person" ? "认识伙伴" : "解锁工作"}：${item.data.label}`);
        } else if (screenX < -item.w) item.missed = true;
      }
    });
    runObstacles.forEach((obstacle) => {
      const screenX = obstacle.worldX - runWorld;
      if (!obstacle.hit && runHitCooldown <= 0 && hit(runPlayer, { x: screenX, y: obstacle.y, w: obstacle.w, h: obstacle.h })) {
        obstacle.hit = true; runHitCooldown = .85; runLives = Math.max(0, runLives - 1); $("runLives").textContent = String(runLives);
        runPlayer.vy = -330; runPlayer.onGround = false;
        showRunToast(runLives ? "碰到材料箱了，调整一下继续跑！" : "体力用完啦，也可以继续跑到终点！");
      }
    });
    drawRun();
    if (runWorld >= runFinishX) finishRun(); else runFrame = window.requestAnimationFrame(runLoop);
  }

  function resetRun() {
    window.cancelAnimationFrame(runFrame);
    buildRunCourse(); runWorld = 0; runLives = 3; runCollected = []; runHitCooldown = 0;
    Object.assign(runPlayer, { x: 105, y: runGroundY - 54, w: 34, h: 54, vy: 0, onGround: true });
    $("runDistance").textContent = "0"; $("runScore").textContent = "0"; $("runTotal").textContent = String(runCollectibles.length); $("runLives").textContent = "3";
    $("runResult").hidden = true; $("runResult").replaceChildren(); runActive = true; runLastTime = performance.now(); drawRun(); runFrame = window.requestAnimationFrame(runLoop);
  }
  function runJump() { if (runActive && runPlayer.onGround) { runPlayer.vy = -620; runPlayer.onGround = false; } }
  $("runStart").addEventListener("click", () => { $("runPanel").hidden = false; $("runStart").textContent = "跑酷进行中"; $("runPanel").scrollIntoView({ behavior: "smooth", block: "center" }); window.setTimeout(() => { resetRun(); runStage.focus(); }, 260); });
  $("runRestart").addEventListener("click", () => { resetRun(); runStage.focus(); });
  $("runJump").addEventListener("click", runJump);
  runStage.addEventListener("pointerdown", (event) => { if (event.target === runStage || event.target === runCanvas) runJump(); });
  runStage.addEventListener("keydown", (event) => { if (event.key === " " || event.key === "ArrowUp") { event.preventDefault(); runJump(); } });

  /* --- Quest 02: timed hook collection game --- */
  const hookCanvas = $("hookCanvas");
  const hookContext = hookCanvas.getContext("2d");
  const hookStage = $("hookStage");
  const gains = [
    { label: "服务同学", value: 140, icon: "♥" }, { label: "组织能力", value: 150, icon: "↑" },
    { label: "可靠伙伴", value: 130, icon: "✦" }, { label: "责任意识", value: 160, icon: "✓" },
    { label: "沟通协作", value: 140, icon: "↔" }, { label: "活动经验", value: 125, icon: "▣" },
    { label: "细致耐心", value: 145, icon: "◎" }, { label: "校园记忆", value: 120, icon: "☀" }
  ];
  const risks = [{ label: "拖延", value: -100 }, { label: "推诿", value: -110 }, { label: "形式主义", value: -125 }, { label: "敷衍", value: -95 }, { label: "摆架子", value: -115 }, { label: "内耗", value: -90 }];
  const hook = { x: 450, y: 82, angle: 0, dir: 1, state: "swing", len: 58, maxLen: 430, speed: 520, target: null };
  let hookObjects = [];
  let hookFrame = 0;
  let hookLastTime = 0;
  let hookActive = false;
  let hookScore = 0;
  let hookSeconds = 45;
  let hookSecondAccumulator = 0;
  let hookGains = [];
  let hookRisks = [];
  let hookToastTimer = 0;

  function showHookToast(message, isRisk = false) {
    window.clearTimeout(hookToastTimer);
    const toast = $("hookToast");
    toast.textContent = message;
    toast.style.borderColor = isRisk ? "#1b1f23" : "#4167b1";
    toast.style.color = isRisk ? "#1b1f23" : "#2d4f91";
    toast.classList.add("show");
    hookToastTimer = window.setTimeout(() => toast.classList.remove("show"), 1200);
  }

  function buildHookObjects() {
    const slots = [[110,235],[260,305],[410,215],[555,325],[730,240],[180,395],[365,370],[620,410],[805,350],[90,360],[510,395],[775,420],[300,210],[680,315]];
    const data = gains.map((item) => ({ type: "gain", ...item })).concat(risks.map((item) => ({ type: "risk", ...item, icon: "×" })));
    hookObjects = data.map((item, index) => ({ ...item, x: slots[index][0], y: slots[index][1], r: item.type === "gain" ? (index % 3 === 0 ? 34 : 28) : 29, active: true }));
  }

  function hookEnd() { return { x: hook.x + Math.sin(hook.angle) * hook.len, y: hook.y + Math.cos(hook.angle) * hook.len }; }
  function checkHookHit() {
    const end = hookEnd();
    for (const item of hookObjects) {
      if (!item.active) continue;
      if (Math.hypot(end.x - item.x, end.y - item.y) <= item.r + 10) { item.active = false; hook.target = item; hook.state = "retract"; return true; }
    }
    return false;
  }
  function scoreHookTarget(target) {
    hookScore += target.value; $("hookScore").textContent = String(hookScore);
    if (target.type === "gain") { hookGains.push(target.label); $("hookCount").textContent = String(hookGains.length); showHookToast(`+${target.value} 收获：${target.label}`); }
    else { hookRisks.push(target.label); showHookToast(`${target.value} 碰到${target.label}，换个方向继续！`, true); }
  }

  function drawHookBackground() {
    const context = hookContext; const width = hookCanvas.width; const height = hookCanvas.height;
    const sky = context.createLinearGradient(0, 0, 0, height); sky.addColorStop(0, "#def0f9"); sky.addColorStop(.34, "#ffffff"); sky.addColorStop(.35, "#c7e7f6"); sky.addColorStop(1, "#4167b1");
    context.fillStyle = sky; context.fillRect(0, 0, width, height);
    context.fillStyle = "#b8dced"; context.fillRect(0, 168, width, height - 168); context.fillStyle = "#4167b1"; context.fillRect(0, 305, width, height - 305);
    context.fillStyle = "rgba(255,255,255,.2)"; for (let x = 20; x < width; x += 95) for (let y = 185; y < height; y += 82) { context.beginPath(); context.arc(x + (y % 3) * 8, y, 3, 0, Math.PI * 2); context.fill(); }
    context.fillStyle = "#ffffff"; roundedRect(context, 307, 22, 286, 65, 8); context.fill(); context.strokeStyle = "#4167b1"; context.lineWidth = 4; context.stroke();
    context.fillStyle = "#2d4f91"; context.font = "bold 20px sans-serif"; context.textAlign = "center"; context.fillText("组织部收获站", 450, 49); context.font = "14px sans-serif"; context.fillStyle = "#5f6d7b"; context.fillText("找准时机，带走真正的收获", 450, 72);
  }

  function drawHookObject(item) {
    if (!item.active && hook.target !== item) return;
    const context = hookContext; let x = item.x; let y = item.y;
    if (hook.target === item) { const end = hookEnd(); x = end.x; y = end.y + item.r * .35; }
    context.save();
    if (item.type === "gain") {
      context.shadowColor = "rgba(65,103,177,.22)"; context.shadowBlur = 8; context.fillStyle = "#4167b1";
      context.beginPath();
      for (let point = 0; point < 7; point += 1) { const angle = Math.PI * 2 * point / 7 - .4; const radius = item.r * (.82 + .16 * Math.sin(point * 2.1)); const px = x + Math.cos(angle) * radius; const py = y + Math.sin(angle) * radius; if (point === 0) context.moveTo(px, py); else context.lineTo(px, py); }
      context.closePath(); context.fill(); context.shadowColor = "transparent"; context.strokeStyle = "#2d4f91"; context.lineWidth = 3; context.stroke();
      context.fillStyle = "#def0f9"; context.beginPath(); context.ellipse(x - item.r * .24, y - item.r * .22, item.r * .24, item.r * .12, -.5, 0, Math.PI * 2); context.fill();
      context.fillStyle = "#1b1f23"; context.font = "bold 24px sans-serif"; context.textAlign = "center"; context.textBaseline = "middle"; context.fillText(item.icon, x, y + 1);
    } else {
      context.fillStyle = "#1b1f23"; context.beginPath(); context.arc(x, y, item.r, 0, Math.PI * 2); context.fill(); context.strokeStyle = "#101315"; context.lineWidth = 3; context.stroke();
      context.strokeStyle = "#4167b1"; context.lineWidth = 5; context.beginPath(); context.moveTo(x + item.r * .45, y - item.r * .72); context.quadraticCurveTo(x + item.r * .78, y - item.r * 1.18, x + item.r * .92, y - item.r * 1.35); context.stroke();
      context.fillStyle = "#fff"; context.font = "bold 23px sans-serif"; context.textAlign = "center"; context.textBaseline = "middle"; context.fillText("×", x, y + 1);
    }
    context.fillStyle = item.type === "gain" ? "#1b1f23" : "#1b1f23"; context.font = "bold 11px sans-serif"; context.textBaseline = "alphabetic";
    context.fillText(item.label.length > 8 ? `${item.label.slice(0, 8)}…` : item.label, x, y + item.r + 16); context.restore();
  }

  function drawHookLine() {
    const context = hookContext; const end = hookEnd();
    context.strokeStyle = "#1b1f23"; context.lineWidth = 4; context.beginPath(); context.moveTo(hook.x, hook.y); context.lineTo(end.x, end.y); context.stroke();
    context.save(); context.translate(end.x, end.y); context.rotate(-hook.angle); context.strokeStyle = "#5f6d7b"; context.lineWidth = 5; context.beginPath(); context.arc(0, 8, 12, .1, Math.PI * 1.25); context.stroke(); context.restore();
    context.fillStyle = "#4167b1"; context.beginPath(); context.arc(hook.x, hook.y, 18, 0, Math.PI * 2); context.fill(); context.strokeStyle = "#2d4f91"; context.lineWidth = 4; context.stroke(); context.fillStyle = "#def0f9"; context.beginPath(); context.arc(hook.x, hook.y, 7, 0, Math.PI * 2); context.fill();
  }

  function drawHook() { hookContext.clearRect(0, 0, hookCanvas.width, hookCanvas.height); drawHookBackground(); hookObjects.forEach(drawHookObject); drawHookLine(); }
  function finishHook() {
    hookActive = false; window.cancelAnimationFrame(hookFrame);
    const result = $("hookResult"); result.replaceChildren();
    result.append(createElement("div", "", hookGains.length === gains.length ? "组织部收获全收集！" : "时间到，收获结算！"));
    const summary = createElement("div", "", `最终得分：${hookScore}，带走收获 ${hookGains.length}/${gains.length}。`); summary.style.marginTop = "6px"; result.append(summary);
    if (hookGains.length) { const tags = createElement("div", "result-tags"); hookGains.forEach((label) => tags.append(createElement("span", "result-tag", `收获 · ${label}`))); result.append(tags); }
    if (hookRisks.length) { const riskLine = createElement("div", "", `需要避开的误区：${hookRisks.join("、")}`); riskLine.style.marginTop = "9px"; result.append(riskLine); }
    result.append(createElement("div", "", "在组织部真正值得带走的，是服务、成长、伙伴和责任感。")); result.hidden = false; showHookToast("本轮收集结束，看看你的成果！");
  }
  function hookLoop(timestamp) {
    if (!hookActive) return;
    const delta = Math.min(.032, (timestamp - hookLastTime) / 1000); hookLastTime = timestamp; hookSecondAccumulator += delta;
    if (hookSecondAccumulator >= 1) { const seconds = Math.floor(hookSecondAccumulator); hookSecondAccumulator -= seconds; hookSeconds = Math.max(0, hookSeconds - seconds); $("hookTime").textContent = String(hookSeconds); if (!hookSeconds) { finishHook(); return; } }
    if (hook.state === "swing") { hook.angle += hook.dir * 1.15 * delta; if (hook.angle > 1.12) { hook.angle = 1.12; hook.dir = -1; } if (hook.angle < -1.12) { hook.angle = -1.12; hook.dir = 1; } }
    else if (hook.state === "extend") { hook.len += hook.speed * delta; if (!checkHookHit() && hook.len >= hook.maxLen) hook.state = "retract"; }
    else if (hook.state === "retract") { hook.len -= hook.speed * (hook.target ? .65 : 1) * delta; if (hook.len <= 58) { hook.len = 58; if (hook.target) { scoreHookTarget(hook.target); hook.target = null; } hook.state = "swing"; } }
    drawHook(); hookFrame = window.requestAnimationFrame(hookLoop);
  }
  function resetHook() {
    window.cancelAnimationFrame(hookFrame); buildHookObjects(); hookScore = 0; hookSeconds = 45; hookSecondAccumulator = 0; hookGains = []; hookRisks = [];
    Object.assign(hook, { angle: 0, dir: 1, state: "swing", len: 58, target: null }); $("hookScore").textContent = "0"; $("hookTime").textContent = "45"; $("hookCount").textContent = "0";
    $("hookResult").hidden = true; $("hookResult").replaceChildren(); hookActive = true; hookLastTime = performance.now(); drawHook(); hookFrame = window.requestAnimationFrame(hookLoop);
  }
  function fireHook() { if (hookActive && hook.state === "swing") hook.state = "extend"; }
  $("hookStart").addEventListener("click", () => { $("hookPanel").hidden = false; $("hookStart").textContent = "收集进行中"; $("hookPanel").scrollIntoView({ behavior: "smooth", block: "center" }); window.setTimeout(() => { resetHook(); hookStage.focus(); }, 260); });
  $("hookRestart").addEventListener("click", () => { resetHook(); hookStage.focus(); });
  $("hookDrop").addEventListener("click", fireHook);
  hookStage.addEventListener("pointerdown", (event) => { if (event.target === hookStage || event.target === hookCanvas) fireHook(); });
  hookStage.addEventListener("keydown", (event) => { if (event.key === " " || event.key === "ArrowDown") { event.preventDefault(); fireHook(); } });

  if (autoOpen) {
    cover.hidden = true;
    letter.hidden = false;
    envelope.classList.add("opening");
  }
})();
