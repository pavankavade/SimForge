// Shared mobile touch controls, drag-to-look, portrait FOV scaling, and landscape helper
// for Crypt Hall Traps and Boulder Hallway.

export function fitPortraitFov(baseFov, width, height) {
  const aspect = Math.max(0.35, width / Math.max(1, height));
  if (aspect >= 1) return baseFov;
  const minHfovRad = (76 * Math.PI) / 180;
  const vfov = (2 * Math.atan(Math.tan(minHfovRad / 2) / aspect) * 180) / Math.PI;
  return Math.min(92, Math.max(baseFov, vfov));
}

export async function enterLandscapeMode() {
  const docEl = document.documentElement;
  try {
    if (!document.fullscreenElement) {
      await (docEl.requestFullscreen?.() ?? docEl.webkitRequestFullscreen?.());
    }
  } catch {
    // Fullscreen may be unavailable on iOS Safari
  }
  try {
    await screen.orientation?.lock?.("landscape");
  } catch {
    // Native physical device rotation still triggers resize/orientationchange
  }
}

export function mountTouchControls({ canvas, keys, pressed, onLook }) {
  const isTouchCapable = () =>
    window.matchMedia?.("(pointer: coarse)")?.matches ||
    ("ontouchstart" in window && window.innerWidth <= 1024);

  let enabled = isTouchCapable();
  let playing = false;
  let rotateDismissed = false;
  let runToggled = false;
  let lookPointer = null;
  const stickHeldCodes = new Set();

  const state = { lastPointerTouch: false };

  // Canvas swipe-to-look (multi-touch friendly: tracks a single pointerId on the canvas).
  canvas.addEventListener("pointerdown", (e) => {
    const isTouch = e.pointerType === "touch";
    state.lastPointerTouch = isTouch;
    if (isTouch && !enabled) {
      enabled = true;
      syncVisibility();
    }
    if (!isTouch || lookPointer !== null) return;
    lookPointer = { id: e.pointerId, x: e.clientX, y: e.clientY };
    try {
      canvas.setPointerCapture?.(e.pointerId);
    } catch {
      // Optional capture
    }
  });
  window.addEventListener("pointermove", (e) => {
    if (!lookPointer || lookPointer.id !== e.pointerId) return;
    const dx = e.clientX - lookPointer.x;
    const dy = e.clientY - lookPointer.y;
    lookPointer.x = e.clientX;
    lookPointer.y = e.clientY;
    onLook(dx * 2.1, dy * 2.1);
  });
  const endLook = (e) => {
    if (lookPointer && lookPointer.id === e.pointerId) lookPointer = null;
  };
  window.addEventListener("pointerup", endLook);
  window.addEventListener("pointercancel", endLook);

  // Overlay DOM (hidden unless enabled && playing).
  const root = document.createElement("div");
  Object.assign(root.style, {
    position: "fixed",
    inset: "0",
    pointerEvents: "none",
    zIndex: "9",
    display: "none",
    userSelect: "none",
    WebkitUserSelect: "none",
    touchAction: "none",
    fontFamily: "system-ui, sans-serif",
  });

  // Top-right quick bar (Restart, Rotate/Landscape, All Modes if in portal)
  const topBar = document.createElement("div");
  Object.assign(topBar.style, {
    position: "fixed",
    top: "max(10px, env(safe-area-inset-top))",
    right: "max(10px, env(safe-area-inset-right))",
    display: "flex",
    gap: "6px",
    alignItems: "center",
    pointerEvents: "auto",
  });
  const pillStyle = {
    background: "rgba(14, 11, 8, 0.78)",
    color: "#f3e6cc",
    border: "1px solid rgba(255, 216, 77, 0.36)",
    borderRadius: "8px",
    padding: "6px 10px",
    fontSize: "12px",
    fontWeight: "700",
    cursor: "pointer",
    textDecoration: "none",
    touchAction: "none",
  };
  const restartBtn = document.createElement("button");
  restartBtn.type = "button";
  restartBtn.textContent = "↻ Restart";
  Object.assign(restartBtn.style, pillStyle);
  restartBtn.addEventListener("pointerdown", (e) => {
    e.stopPropagation();
    pressed.add("KeyR");
  });

  const rotateBtn = document.createElement("button");
  rotateBtn.type = "button";
  rotateBtn.textContent = "↻ Wide";
  Object.assign(rotateBtn.style, pillStyle, { color: "#7df39b", borderColor: "rgba(125, 243, 155, 0.45)" });
  rotateBtn.addEventListener("pointerdown", (e) => {
    e.stopPropagation();
    void enterLandscapeMode();
  });

  topBar.append(rotateBtn, restartBtn);
  if (window.__SIMFORGE_PORTAL__) {
    const modesLink = document.createElement("a");
    modesLink.href = "./";
    modesLink.textContent = "← Modes";
    Object.assign(modesLink.style, pillStyle, { color: "#ffd84d" });
    topBar.append(modesLink);
  }

  // Portrait dismissible rotate banner
  const rotateTip = document.createElement("div");
  Object.assign(rotateTip.style, {
    position: "fixed",
    left: "50%",
    bottom: "calc(max(18px, env(safe-area-inset-bottom)) + 132px)",
    transform: "translateX(-50%)",
    display: "none",
    alignItems: "center",
    gap: "8px",
    background: "rgba(12, 10, 8, 0.88)",
    border: "1px solid rgba(125, 243, 155, 0.42)",
    borderRadius: "999px",
    padding: "5px 10px 5px 12px",
    fontSize: "11px",
    color: "#efe8da",
    whiteSpace: "nowrap",
    pointerEvents: "auto",
  });
  const rotateTipBtn = document.createElement("button");
  rotateTipBtn.type = "button";
  rotateTipBtn.textContent = "↻ Landscape";
  Object.assign(rotateTipBtn.style, {
    background: "#6ce88a",
    color: "#082012",
    border: "none",
    borderRadius: "999px",
    padding: "4px 9px",
    fontSize: "11px",
    fontWeight: "800",
    cursor: "pointer",
  });
  rotateTipBtn.addEventListener("pointerdown", (e) => {
    e.stopPropagation();
    void enterLandscapeMode();
  });
  const rotateTipClose = document.createElement("button");
  rotateTipClose.type = "button";
  rotateTipClose.textContent = "✕";
  Object.assign(rotateTipClose.style, {
    background: "transparent",
    color: "#cbb89a",
    border: "none",
    fontSize: "13px",
    cursor: "pointer",
    padding: "2px 4px",
  });
  rotateTipClose.addEventListener("pointerdown", (e) => {
    e.stopPropagation();
    rotateDismissed = true;
    syncVisibility();
  });
  const tipLabel = document.createElement("span");
  tipLabel.textContent = "Rotate phone or tap:";
  rotateTip.append(tipLabel, rotateTipBtn, rotateTipClose);

  // Bottom-left Virtual Analog Joystick
  const stickBase = document.createElement("div");
  Object.assign(stickBase.style, {
    position: "fixed",
    left: "max(16px, env(safe-area-inset-left))",
    bottom: "max(18px, env(safe-area-inset-bottom))",
    width: "110px",
    height: "110px",
    borderRadius: "50%",
    background: "rgba(12, 10, 8, 0.52)",
    border: "2px solid rgba(255, 216, 77, 0.38)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    pointerEvents: "auto",
    touchAction: "none",
  });
  const stickKnob = document.createElement("div");
  Object.assign(stickKnob.style, {
    width: "44px",
    height: "44px",
    borderRadius: "50%",
    background: "rgba(255, 216, 77, 0.8)",
    border: "2px solid #fff3c4",
    boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
    pointerEvents: "none",
  });
  stickBase.append(stickKnob);

  const setStickCode = (code, active) => {
    if (active) {
      keys.add(code);
      stickHeldCodes.add(code);
    } else if (stickHeldCodes.has(code)) {
      keys.delete(code);
      stickHeldCodes.delete(code);
    }
  };

  let stickPtr = null;
  const applyStick = (clientX, clientY) => {
    if (!stickPtr) return;
    const maxR = 38;
    const dx = clientX - stickPtr.cx;
    const dy = clientY - stickPtr.cy;
    const dist = Math.hypot(dx, dy);
    const scale = dist > maxR ? maxR / dist : 1;
    const cx = dx * scale;
    const cy = dy * scale;
    stickKnob.style.transform = `translate3d(${cx}px, ${cy}px, 0)`;
    const nx = cx / maxR;
    const ny = -cy / maxR;
    setStickCode("KeyW", ny > 0.24);
    setStickCode("KeyS", ny < -0.24);
    setStickCode("KeyD", nx > 0.24);
    setStickCode("KeyA", nx < -0.24);
    setStickCode("ShiftLeft", runToggled || Math.hypot(nx, ny) > 0.86);
  };
  const resetStick = () => {
    stickPtr = null;
    stickKnob.style.transform = "translate3d(0px, 0px, 0)";
    for (const c of ["KeyW", "KeyS", "KeyA", "KeyD"]) setStickCode(c, false);
    setStickCode("ShiftLeft", runToggled);
  };

  stickBase.addEventListener("pointerdown", (e) => {
    e.stopPropagation();
    const r = stickBase.getBoundingClientRect();
    stickPtr = { id: e.pointerId, cx: r.left + r.width / 2, cy: r.top + r.height / 2 };
    try {
      stickBase.setPointerCapture?.(e.pointerId);
    } catch {
      // Optional
    }
    applyStick(e.clientX, e.clientY);
  });
  stickBase.addEventListener("pointermove", (e) => {
    if (stickPtr && stickPtr.id === e.pointerId) {
      e.stopPropagation();
      applyStick(e.clientX, e.clientY);
    }
  });
  stickBase.addEventListener("pointerup", (e) => {
    if (stickPtr && stickPtr.id === e.pointerId) {
      e.stopPropagation();
      resetStick();
    }
  });
  stickBase.addEventListener("pointercancel", (e) => {
    if (stickPtr && stickPtr.id === e.pointerId) {
      e.stopPropagation();
      resetStick();
    }
  });

  // Bottom-right Action Buttons: RUN toggle, Q, E, JUMP
  const pad = document.createElement("div");
  Object.assign(pad.style, {
    position: "fixed",
    right: "max(16px, env(safe-area-inset-right))",
    bottom: "max(18px, env(safe-area-inset-bottom))",
    display: "grid",
    gridTemplateColumns: "auto auto",
    gap: "10px",
    alignItems: "end",
    pointerEvents: "auto",
    touchAction: "none",
  });

  const makeHoldBtn = (label, code, styleExtra = {}) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = label;
    Object.assign(btn.style, {
      width: "56px",
      height: "56px",
      borderRadius: "50%",
      border: "2px solid rgba(255, 216, 77, 0.58)",
      background: "rgba(24, 17, 10, 0.78)",
      color: "#ffd84d",
      fontWeight: "900",
      fontSize: "13px",
      touchAction: "none",
      ...styleExtra,
    });
    let downId = null;
    btn.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      downId = e.pointerId;
      try {
        btn.setPointerCapture?.(e.pointerId);
      } catch {
        // Optional
      }
      keys.add(code);
      pressed.add(code);
      btn.style.filter = "brightness(1.25)";
    });
    const release = (e) => {
      if (downId === e.pointerId) {
        downId = null;
        keys.delete(code);
        btn.style.filter = "";
      }
    };
    btn.addEventListener("pointerup", release);
    btn.addEventListener("pointercancel", release);
    return btn;
  };

  const runBtn = document.createElement("button");
  runBtn.type = "button";
  runBtn.textContent = "RUN";
  Object.assign(runBtn.style, {
    width: "54px",
    height: "42px",
    borderRadius: "999px",
    border: "1.5px solid rgba(255,255,255,0.32)",
    background: "rgba(18, 16, 12, 0.72)",
    color: "#e6efe9",
    fontWeight: "800",
    fontSize: "12px",
    touchAction: "none",
    justifySelf: "end",
  });
  runBtn.addEventListener("pointerdown", (e) => {
    e.stopPropagation();
    runToggled = !runToggled;
    setStickCode("ShiftLeft", runToggled);
    runBtn.style.background = runToggled ? "rgba(108, 232, 138, 0.88)" : "rgba(18, 16, 12, 0.72)";
    runBtn.style.color = runToggled ? "#082012" : "#e6efe9";
    runBtn.style.borderColor = runToggled ? "#7df39b" : "rgba(255,255,255,0.32)";
  });

  const qBtn = makeHoldBtn("Q", "KeyQ", { width: "50px", height: "50px", justifySelf: "end" });
  const eBtn = makeHoldBtn("E", "KeyE", { width: "54px", height: "54px" });
  const jumpBtn = makeHoldBtn("JUMP", "Space", { width: "68px", height: "68px", fontSize: "12px" });

  pad.append(qBtn, runBtn, eBtn, jumpBtn);
  root.append(topBar, rotateTip, stickBase, pad);
  document.body.append(root);

  function syncVisibility() {
    const active = enabled && playing;
    root.style.display = active ? "block" : "none";
    const portrait = window.innerHeight > window.innerWidth;
    rotateTip.style.display = active && portrait && !rotateDismissed ? "flex" : "none";
  }

  window.addEventListener("resize", syncVisibility);
  window.addEventListener("orientationchange", () => setTimeout(syncVisibility, 120));
  window.addEventListener(
    "touchstart",
    () => {
      enabled = true;
      syncVisibility();
    },
    { passive: true, once: true },
  );

  return {
    get lastPointerTouch() {
      return state.lastPointerTouch;
    },
    setPlaying(v) {
      playing = v;
      syncVisibility();
    },
  };
}
