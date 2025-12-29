function dist(a, b){
  const dx = a.x - b.x, dy = a.y - b.y, dz = (a.z ?? 0) - (b.z ?? 0);
  return Math.sqrt(dx*dx + dy*dy + dz*dz);
}

function clamp(v, a, b){ return Math.max(a, Math.min(b, v)); }

/**
 * landmarks: 21 points, normalized x/y in [0,1]
 * 返回：
 * - mode: "rotate" | "zoom" | "point" | "none"
 * - rotate: {yaw, pitch} (增量)
 * - zoomTargetRadius: number | null
 * - toggleAll: boolean
 * - cursorNDC: {x,y} | null  // 用于 raycast 选中行星
 * - pinch: boolean           // 捏合触发
 */
export class GestureLogic {
  constructor(){
    this.lastGesture = "none";
    this.lastToggleMs = 0;
    this.toggleCooldownMs = 900;

    this.lastPinchMs = 0;
    this.pinchCooldownMs = 650;

    this.zoomRefSize = null;
    this.zoomRefRadius = null;
    this.zoomEnterMs = 0;
  }

  analyze(landmarks, nowMs, dt, cameraRadius){
    if (!landmarks || landmarks.length < 21){
      this.lastGesture = "none";
      this.zoomRefSize = null;
      this.zoomRefRadius = null;
      return {
        label: "未检测到手",
        mode: "none",
        rotate: { yaw: 0, pitch: 0 },
        zoomTargetRadius: null,
        toggleAll: false,
        cursorNDC: null,
        pinch: false
      };
    }

    // palm center 用 0/5/9/13/17 平均
    const c = {
      x: (landmarks[0].x + landmarks[5].x + landmarks[9].x + landmarks[13].x + landmarks[17].x) / 5,
      y: (landmarks[0].y + landmarks[5].y + landmarks[9].y + landmarks[13].y + landmarks[17].y) / 5,
      z: (landmarks[0].z + landmarks[5].z + landmarks[9].z + landmarks[13].z + landmarks[17].z) / 5
    };

    const ext = (tip, pip) => dist(landmarks[tip], c) > dist(landmarks[pip], c) + 0.02;

    const thumb = ext(4, 3);
    const index = ext(8, 6);
    const middle = ext(12, 10);
    const ring = ext(16, 14);
    const pinky = ext(20, 18);

    const extendedCount = [thumb,index,middle,ring,pinky].filter(Boolean).length;

    const isOpen = extendedCount >= 4;
    const isFist = extendedCount <= 1;
    const isPoint = index && !middle && !ring && !pinky; // thumb 不强制

    // pinch（拇指尖 & 食指尖）
    const pinchDist = dist(landmarks[4], landmarks[8]);
    const isPinch = pinchDist < 0.035;

    // 输出默认
    const out = {
      label: "识别中",
      mode: "none",
      rotate: { yaw: 0, pitch: 0 },
      zoomTargetRadius: null,
      toggleAll: false,
      cursorNDC: null,
      pinch: false
    };

    // 旋转（open palm）
    if (isOpen){
      out.label = "🖐 张开手掌：旋转";
      out.mode = "rotate";

      // 手在画面中的偏移 -> 相机增量（带死区）
      const dx = c.x - 0.5;
      const dy = c.y - 0.5;

      const dead = 0.04;
      const nx = Math.abs(dx) < dead ? 0 : dx;
      const ny = Math.abs(dy) < dead ? 0 : dy;

      // 这里用 dt 保证不同帧率一致
      out.rotate.yaw = -nx * 1.9 * dt;
      out.rotate.pitch = -ny * 1.3 * dt;
    }

    // 缩放（fist）
    if (isFist){
      out.label = "✊ 握拳：缩放";
      out.mode = "zoom";

      // 用掌宽估算“手大小”
      const size = dist(landmarks[5], landmarks[17]); // index_mcp - pinky_mcp

      if (this.lastGesture !== "fist"){
        this.zoomRefSize = size;
        this.zoomRefRadius = cameraRadius;
        this.zoomEnterMs = nowMs;
      }

      const refSize = this.zoomRefSize ?? size;
      const refRadius = this.zoomRefRadius ?? cameraRadius;

      // size 越大，radius 越小（放大）
      const scale = clamp(size / refSize, 0.60, 1.80);
      out.zoomTargetRadius = refRadius / scale;
    }

    // 指向：输出光标（可用于 raycast）
    if (isPoint){
      out.label = "☝ 指向：可选中行星（配合捏合）";
      out.mode = "point";
      const tip = landmarks[8];
      // 归一化坐标 -> NDC
      out.cursorNDC = { x: (1 - tip.x) * 2 - 1, y: -(tip.y * 2 - 1) };
      // 反转 x 是因为 video 镜像了
    }

    // 捏合触发（切换单个行星）
    if (isPoint && isPinch && (nowMs - this.lastPinchMs > this.pinchCooldownMs)){
      out.pinch = true;
      this.lastPinchMs = nowMs;
    }

    // 张开 -> 握拳 快速切换：toggleAll
    const prev = this.lastGesture;
    const nowG = isFist ? "fist" : (isOpen ? "open" : (isPoint ? "point" : "other"));

    if (prev === "open" && nowG === "fist" && (nowMs - this.lastToggleMs > this.toggleCooldownMs)){
      out.toggleAll = true;
      this.lastToggleMs = nowMs;
    }

    this.lastGesture = nowG;
    return out;
  }
}
