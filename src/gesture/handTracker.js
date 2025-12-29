import { FilesetResolver, HandLandmarker } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/vision_bundle.js";
/**
 * 依赖：index.html 已通过 CDN 引入 vision_bundle.js
 * 官方初始化方式：FilesetResolver.forVisionTasks(wasmRoot) + HandLandmarker.createFromOptions(...) :contentReference[oaicite:3]{index=3}
 */

const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/latest/hand_landmarker.task"; // :contentReference[oaicite:4]{index=4}

export class HandTracker {
  constructor({ videoEl, overlayEl, onStatus }){
    this.video = videoEl;
    this.canvas = overlayEl;
    this.ctx = this.canvas.getContext("2d");

    this.onStatus = onStatus ?? (()=>{});

    this.handLandmarker = null;
    this.stream = null;
    this.running = false;

    // 推理限频（很关键：避免拖慢 3D）
    this.maxInferFps = 15;
    this._lastInferMs = 0;

    this._lastVideoTime = -1;
    this._handFps = 0;
    this._handFrames = 0;
    this._handAcc = 0;

    this.latestLandmarks = null;
  }

  get handFps(){ return this._handFps; }

  async init(){
    // vision_bundle.js 通常会把 FilesetResolver / HandLandmarker 放到全局

    this.onStatus("加载手势模型中...");

    const vision = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
    ); // 官方 wasmRoot 示例 :contentReference[oaicite:5]{index=5}

    this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: MODEL_URL,
        delegate: "GPU"
      },
      runningMode: "VIDEO",
      numHands: 1,
      minHandDetectionConfidence: 0.5,
      minHandPresenceConfidence: 0.5,
      minTrackingConfidence: 0.5
    });

    this.onStatus("模型就绪，等待启动摄像头");
  }

  async start(){
    if (!this.handLandmarker) await this.init();

    try{
      this.onStatus("请求摄像头权限...");
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false
      });
    } catch (e){
      this.onStatus("摄像头权限被拒绝/不可用");
      throw e;
    }

    this.video.srcObject = this.stream;
    await this.video.play();

    this.running = true;
    this.onStatus("摄像头运行中");
  }

  stop(){
    this.running = false;
    this.latestLandmarks = null;
    this._lastVideoTime = -1;

    if (this.stream){
      for (const t of this.stream.getTracks()) t.stop();
      this.stream = null;
    }
    this.video.srcObject = null;

    this.onStatus("已停止摄像头");
    this._clearOverlay();
  }

  /**
   * 在主循环里调用：tracker.update(nowMs)
   * 返回 landmarks 或 null
   */
  update(nowMs){
    if (!this.running || !this.handLandmarker) return null;
    if (this.video.readyState < 2) return null;

    // 限频：maxInferFps
    const minInterval = 1000 / this.maxInferFps;
    if (nowMs - this._lastInferMs < minInterval) return this.latestLandmarks;
    this._lastInferMs = nowMs;

    // 官方建议：VIDEO 模式逐帧调用 detectForVideo，并提供时间戳（ms）:contentReference[oaicite:6]{index=6}
    let result = null;
    try{
      result = this.handLandmarker.detectForVideo(this.video, nowMs);
    } catch {
      // 兼容某些版本签名：detectForVideo(video)
      result = this.handLandmarker.detectForVideo(this.video);
    }

    const landmarks = result?.landmarks?.[0] ?? null;
    this.latestLandmarks = landmarks;

    // 统计 hand fps
    this._handFrames++;
    this._handAcc += minInterval;
    if (this._handAcc >= 500){
      this._handFps = (this._handFrames * 1000) / this._handAcc;
      this._handFrames = 0;
      this._handAcc = 0;
    }

    this._drawOverlay(landmarks);
    return landmarks;
  }

  _resizeCanvasToVideo(){
    const vw = this.video.videoWidth || 640;
    const vh = this.video.videoHeight || 480;
    const w = Math.max(1, Math.floor(vw));
    const h = Math.max(1, Math.floor(vh));
    if (this.canvas.width !== w || this.canvas.height !== h){
      this.canvas.width = w;
      this.canvas.height = h;
    }
  }

  _clearOverlay(){
    this._resizeCanvasToVideo();
    this.ctx.clearRect(0,0,this.canvas.width,this.canvas.height);
  }

  _drawOverlay(landmarks){
    this._resizeCanvasToVideo();
    const ctx = this.ctx;
    ctx.clearRect(0,0,this.canvas.width,this.canvas.height);

    if (!landmarks) return;

    // 画点
    ctx.save();
    ctx.globalAlpha = 0.95;
    ctx.lineWidth = 2;

    const W = this.canvas.width;
    const H = this.canvas.height;

    // 镜像匹配 video（video 画面是 scaleX(-1)）
    const px = (x) => (1 - x) * W;
    const py = (y) => y * H;

    // 关键骨架连线（简化）
    const lines = [
      [0,5],[5,9],[9,13],[13,17],[17,0], // palm
      [0,1],[1,2],[2,3],[3,4],          // thumb
      [5,6],[6,7],[7,8],                // index
      [9,10],[10,11],[11,12],           // middle
      [13,14],[14,15],[15,16],          // ring
      [17,18],[18,19],[19,20]           // pinky
    ];

    ctx.strokeStyle = "rgba(255, 204, 140, 0.35)";
    for (const [a,b] of lines){
      ctx.beginPath();
      ctx.moveTo(px(landmarks[a].x), py(landmarks[a].y));
      ctx.lineTo(px(landmarks[b].x), py(landmarks[b].y));
      ctx.stroke();
    }

    for (let i=0;i<landmarks.length;i++){
      const p = landmarks[i];
      ctx.fillStyle = "rgba(255, 204, 140, 0.85)";
      ctx.beginPath();
      ctx.arc(px(p.x), py(p.y), i===8 ? 5 : 3, 0, Math.PI*2);
      ctx.fill();
    }

    ctx.restore();
  }
}
