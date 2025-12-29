import * as THREE from "three";
import { ParticlePlanet } from "./particlePlanet.js";
import { createOrbitLine } from "./scene.js";
import { formatInt } from "./utils.js";

export class PlanetSystem {
  constructor(scene){
    this.scene = scene;
    this.planets = [];
    this.orbitLines = [];
    this.auto = false;
    this._autoTimer = 0;
    this._autoInterval = 7.5; // 秒

    // 用于“太阳”
    this.sun = this._createSun();
    scene.add(this.sun.group);

    // 创建行星
    for (const cfg of PLANET_PRESETS){
      const p = new ParticlePlanet(cfg);
      this.planets.push(p);
      scene.add(p.group);

      // 轨道线
      const orbit = createOrbitLine(cfg.orbitRadius, 0x334155);
      orbit.position.y = -0.001;
      this.orbitLines.push(orbit);
      scene.add(orbit);
    }
  }

  get totalParticles(){
    const planetPts = this.planets.reduce((s,p)=>s+p.particleCount, 0);
    const sunPts = this.sun.particleCount;
    const ringPts = this.planets.reduce((s,p)=>s + (p.ring ? p.ring.geometry.attributes.position.count : 0), 0);
    return planetPts + sunPts + ringPts;
  }

  getPlanetByKey(key){
    const k = (key ?? "").toLowerCase().trim();
    return this.planets.find(p => p.key === k || p.name.toLowerCase() === k);
  }

  toggleAll(){
    // 如果大部分是聚合，就全部分散；反之全部聚合
    const avg = this.planets.reduce((s,p)=>s + p.morph, 0) / this.planets.length;
    const targetDisperse = avg > 0.5;
    for (const p of this.planets){
      targetDisperse ? p.setDispersed() : p.setAggregated();
    }
    // 太阳也跟随（更有仪式感）
    targetDisperse ? this.sun.setDispersed() : this.sun.setAggregated();
  }

  update(dt, elapsed, lightDir){
    // 太阳自转 + morph
    this.sun.update(dt, elapsed, lightDir);

    for (const p of this.planets){
      p.update(dt, elapsed, lightDir);
    }

    // 自动循环
    if (this.auto){
      this._autoTimer += dt;
      if (this._autoTimer >= this._autoInterval){
        this._autoTimer = 0;
        this.toggleAll();
      }
    }
  }

  // ====== Sun ======
  _createSun(){
    const cfg = {
      name: "Sun",
      key: "sun",
      radius: 26,
      orbitRadius: 0,
      orbitSpeed: 0,
      rotationSpeed: 0.25,
      particleCount: 22000,
      pointSize: 2.3,
      colorA: "#ffd59a",
      colorB: "#ff6a2a"
    };
    const sun = new ParticlePlanet(cfg);
    sun.group.position.set(0, 0, 0);

    // “太阳”更亮：把透明度视觉拉满（通过提高点大小 / 颜色已足够）
    sun.points.material.uniforms.uPointSize.value = 2.6;
    return sun;
  }

  debugSummary(){
    return `Planets=${this.planets.length}, TotalParticles=${formatInt(this.totalParticles)}`;
  }
}

/**
 * 行星参数（示例数据）
 * 为了 60FPS：默认总粒子控制在 ~9万以内（设备越强可以再加）
 */
const PLANET_PRESETS = [
  {
    name: "Mercury",
    key: "mercury",
    radius: 4.0,
    orbitRadius: 52,
    orbitSpeed: 0.55,
    rotationSpeed: 0.55,
    particleCount: 4200,
    pointSize: 2.0,
    colorA: "#ffcfa2",
    colorB: "#ff8a4b"
  },
  {
    name: "Venus",
    key: "venus",
    radius: 6.4,
    orbitRadius: 72,
    orbitSpeed: 0.44,
    rotationSpeed: 0.35,
    particleCount: 5600,
    pointSize: 2.0,
    colorA: "#ffd8a7",
    colorB: "#ff7a45"
  },
  {
    name: "Earth",
    key: "earth",
    radius: 6.8,
    orbitRadius: 95,
    orbitSpeed: 0.36,
    rotationSpeed: 0.8,
    particleCount: 6500,
    pointSize: 2.0,
    colorA: "#ffd9b0",
    colorB: "#ff6f3c"
  },
  {
    name: "Mars",
    key: "mars",
    radius: 5.2,
    orbitRadius: 118,
    orbitSpeed: 0.30,
    rotationSpeed: 0.72,
    particleCount: 5200,
    pointSize: 2.0,
    colorA: "#ffd1a6",
    colorB: "#ff5d3a"
  },
  {
    name: "Jupiter",
    key: "jupiter",
    radius: 14.5,
    orbitRadius: 165,
    orbitSpeed: 0.18,
    rotationSpeed: 0.95,
    particleCount: 12000,
    pointSize: 2.1,
    colorA: "#ffd7a6",
    colorB: "#ff7a45"
  },
  {
    name: "Saturn",
    key: "saturn",
    radius: 12.8,
    orbitRadius: 210,
    orbitSpeed: 0.14,
    rotationSpeed: 0.90,
    particleCount: 10500,
    pointSize: 2.1,
    colorA: "#ffe0b4",
    colorB: "#ff8a4b",
    ring: {
      inner: 18.0,
      outer: 33.0,
      thickness: 2.8,
      tiltX: Math.PI * 0.48,
      particleCount: 9000
    }
  },
  {
    name: "Uranus",
    key: "uranus",
    radius: 10.2,
    orbitRadius: 265,
    orbitSpeed: 0.10,
    rotationSpeed: 0.65,
    particleCount: 8200,
    pointSize: 2.0,
    colorA: "#ffd9b0",
    colorB: "#ff6f3c",
    tilt: 0.35
  },
  {
    name: "Neptune",
    key: "neptune",
    radius: 10.0,
    orbitRadius: 315,
    orbitSpeed: 0.085,
    rotationSpeed: 0.62,
    particleCount: 8200,
    pointSize: 2.0,
    colorA: "#ffd9b0",
    colorB: "#ff6a2a"
  }
];
