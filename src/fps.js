import { clamp } from "./utils.js";

export class PerfMonitor {
  constructor(){
    this.fps = 0;
    this.ms = 0;

    this._last = performance.now();
    this._acc = 0;
    this._frames = 0;

    // 平滑
    this._fpsSmoothed = 60;
    this._msSmoothed = 16.6;
  }

  tick(now){
    const dt = now - this._last;
    this._last = now;

    this._frames++;
    this._acc += dt;

    // 每 250ms 更新一次“原始值”
    if (this._acc >= 250){
      const fps = (this._frames * 1000) / this._acc;
      const ms = this._acc / this._frames;

      this._fpsSmoothed = this._fpsSmoothed + (fps - this._fpsSmoothed) * 0.25;
      this._msSmoothed  = this._msSmoothed  + (ms  - this._msSmoothed ) * 0.25;

      this.fps = clamp(this._fpsSmoothed, 0, 999);
      this.ms  = clamp(this._msSmoothed, 0, 999);

      this._frames = 0;
      this._acc = 0;
    }
    return dt / 1000;
  }
}
