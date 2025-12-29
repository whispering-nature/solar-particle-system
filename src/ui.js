import { formatInt } from "./utils.js";

export class UI {
  constructor(planetSystem){
    this.sys = planetSystem;

    this.elTotalParticles = document.getElementById("totalParticles");
    this.elPlanetList = document.getElementById("planetList");

    this.elFPS = document.getElementById("fps");
    this.elMS = document.getElementById("ms");
    this.elDrawCalls = document.getElementById("drawCalls");
    this.elTriangles = document.getElementById("triangles");
    this.elHandFps = document.getElementById("handFps");

    this.elCamStatus = document.getElementById("camStatus");
    this.elGestureStatus = document.getElementById("gestureStatus");
    this.elPickedPlanet = document.getElementById("pickedPlanet");

    this.btnCam = document.getElementById("btnCam");
    this.btnToggleAll = document.getElementById("btnToggleAll");
    this.btnAuto = document.getElementById("btnAuto");
    this.btnReset = document.getElementById("btnReset");

    this._items = new Map();

    this._buildPlanetList();
    this.elTotalParticles.textContent = formatInt(this.sys.totalParticles);
  }

  bind({ onCamToggle, onToggleAll, onTogglePlanet, onToggleAuto, onReset }){
    this.btnCam.addEventListener("click", onCamToggle);
    this.btnToggleAll.addEventListener("click", onToggleAll);
    this.btnAuto.addEventListener("click", onToggleAuto);
    this.btnReset.addEventListener("click", onReset);

    for (const p of this.sys.planets){
      const item = this._items.get(p.key);
      if (!item) continue;
      item.btn.addEventListener("click", () => onTogglePlanet(p.key));
    }
  }

  setCamButton(running){
    this.btnCam.textContent = running ? "停止摄像头" : "启动摄像头";
    this.btnCam.classList.toggle("primary", !running);
  }

  setCamStatus(text){ this.elCamStatus.textContent = text; }
  setGestureStatus(text){ this.elGestureStatus.textContent = text; }
  setPickedPlanet(text){ this.elPickedPlanet.textContent = text; }

  setAuto(isOn){
    this.btnAuto.textContent = `自动循环：${isOn ? "ON" : "OFF"}`;
    this.btnAuto.classList.toggle("primary", isOn);
  }

  updatePerf({ fps, ms, drawCalls, triangles, handFps }){
    this.elFPS.textContent = fps.toFixed(1);
    this.elMS.textContent = `${ms.toFixed(1)} ms`;
    this.elDrawCalls.textContent = String(drawCalls);
    this.elTriangles.textContent = formatInt(triangles);
    this.elHandFps.textContent = handFps ? handFps.toFixed(1) : "-";
  }

  updatePlanets(){
    for (const p of this.sys.planets){
      const item = this._items.get(p.key);
      if (!item) continue;

      const state = (p.morph > 0.5) ? "聚合" : "分散";
      item.state.textContent = state;
      item.state.style.color = (p.morph > 0.5)
        ? "rgba(255,255,255,0.92)"
        : "rgba(255,255,255,0.60)";
    }
  }

  _buildPlanetList(){
    this.elPlanetList.innerHTML = "";
    for (const p of this.sys.planets){
      const row = document.createElement("div");
      row.className = "planet-item";

      const left = document.createElement("div");
      left.className = "planet-name";

      const badge = document.createElement("span");
      badge.className = "badge";
      badge.style.background = `linear-gradient(135deg, ${p.colorA.getStyle()}, ${p.colorB.getStyle()})`;

      const name = document.createElement("div");
      name.className = "pname";
      name.textContent = `${p.name} · ${formatInt(p.particleCount)} pts`;

      left.appendChild(badge);
      left.appendChild(name);

      const right = document.createElement("div");
      right.style.display = "flex";
      right.style.alignItems = "center";
      right.style.gap = "10px";

      const state = document.createElement("span");
      state.className = "pstate";
      state.textContent = "聚合";

      const btn = document.createElement("button");
      btn.className = "btn";
      btn.textContent = "切换";

      right.appendChild(state);
      right.appendChild(btn);

      row.appendChild(left);
      row.appendChild(right);

      this.elPlanetList.appendChild(row);
      this._items.set(p.key, { row, btn, state });
    }
  }
}
