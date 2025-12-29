import * as THREE from "three";
import { damp, randomInSphere, rand, formatInt } from "./utils.js";

/**
 * 粒子行星：
 * - 用 Points + ShaderMaterial
 * - “聚合/分散”通过 uniform uMorph 在 GPU 中混合 position(目标) 与 aDispersed(分散)
 * - 每个行星一个 drawcall（高性能）
 */
export class ParticlePlanet {
  constructor(opts){
    this.name = opts.name;
    this.key = (opts.key ?? opts.name).toLowerCase();

    this.radius = opts.radius;
    this.orbitRadius = opts.orbitRadius;
    this.orbitSpeed = opts.orbitSpeed;     // rad/s
    this.rotationSpeed = opts.rotationSpeed; // rad/s
    this.tilt = opts.tilt ?? 0;

    this.particleCount = opts.particleCount;
    this.pointSize = opts.pointSize ?? 2.0;

    this.colorA = new THREE.Color(opts.colorA ?? "#ffcf8c"); // 暖金
    this.colorB = new THREE.Color(opts.colorB ?? "#ff7a45"); // 橙金

    this.state = "aggregated"; // aggregated | dispersed
    this._morph = 1.0;
    this._morphTarget = 1.0;

    this.group = new THREE.Group();
    this.group.name = `PlanetGroup:${this.name}`;

    this._orbitAngle = rand(0, Math.PI * 2);

    // 主体粒子
    this.points = this._createPlanetPoints();
    this.points.name = `Planet:${this.name}`;
    this.group.add(this.points);

    // 可选：环（例如土星）
    this.hasRing = !!opts.ring;
    if (this.hasRing){
      this.ring = this._createRingPoints(opts.ring);
      this.ring.name = `Ring:${this.name}`;
      this.group.add(this.ring);
    }

    // 倾斜
    this.group.rotation.z = this.tilt;
  }

  get morph(){ return this._morph; }
  get particleInfo(){
    return `${formatInt(this.particleCount)} pts`;
  }

  setAggregated(){
    this.state = "aggregated";
    this._morphTarget = 1.0;
  }
  setDispersed(){
    this.state = "dispersed";
    this._morphTarget = 0.0;
  }
  toggle(){
    if (this._morphTarget > 0.5) this.setDispersed();
    else this.setAggregated();
  }

  update(dt, elapsed, lightDir){
    // 轨道运动
    this._orbitAngle += this.orbitSpeed * dt;
    this.group.position.set(
      Math.cos(this._orbitAngle) * this.orbitRadius,
      0,
      Math.sin(this._orbitAngle) * this.orbitRadius
    );

    // 自转（点云整体旋转）
    this.points.rotation.y += this.rotationSpeed * dt;
    if (this.ring) this.ring.rotation.y += this.rotationSpeed * 0.35 * dt;

    // 平滑 morph（自然过渡，不突兀）
    this._morph = damp(this._morph, this._morphTarget, 3.6, dt);

    // 更新 shader uniforms
    this.points.material.uniforms.uMorph.value = this._morph;
    this.points.material.uniforms.uTime.value = elapsed;
    this.points.material.uniforms.uLightDir.value.copy(lightDir);

    if (this.ring){
      this.ring.material.uniforms.uMorph.value = this._morph;
      this.ring.material.uniforms.uTime.value = elapsed;
      this.ring.material.uniforms.uLightDir.value.copy(lightDir);
    }
  }

  // ====== 内部：创建点云（行星） ======
  _createPlanetPoints(){
    const count = this.particleCount;

    // 目标形态：球体体积内分布（更“立体”）
    const target = new Float32Array(count * 3);
    // 分散形态：更大范围的云（仍围绕行星中心，便于观察）
    const dispersed = new Float32Array(count * 3);
    const seed = new Float32Array(count);

    for(let i=0;i<count;i++){
      // target: 体积球
      const p = randomInSphere(this.radius);
      target[i*3+0] = p.x;
      target[i*3+1] = p.y;
      target[i*3+2] = p.z;

      // dispersed: 大范围云 + 少量偏移
      const d = randomInSphere(this.radius * rand(2.2, 4.2));
      dispersed[i*3+0] = d.x + rand(-2, 2);
      dispersed[i*3+1] = d.y + rand(-2, 2);
      dispersed[i*3+2] = d.z + rand(-2, 2);

      seed[i] = Math.random() * 1000;
    }

    const geo = new THREE.BufferGeometry();
    // 注意：把“目标形态”放在 position；分散形态放在 attribute
    geo.setAttribute("position", new THREE.BufferAttribute(target, 3));
    geo.setAttribute("aDispersed", new THREE.BufferAttribute(dispersed, 3));
    geo.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1));

    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uMorph: { value: 1.0 },
        uTime: { value: 0.0 },
        uPointSize: { value: this.pointSize },
        uColorA: { value: this.colorA },
        uColorB: { value: this.colorB },
        uLightDir: { value: new THREE.Vector3(1, 1, 1).normalize() }
      },
      vertexShader: `
        attribute vec3 aDispersed;
        attribute float aSeed;
        uniform float uMorph;
        uniform float uTime;
        uniform float uPointSize;
        uniform vec3 uLightDir;

        varying float vLight;
        varying float vAlpha;
        varying float vMix;

        float easeInOut(float x){
          return x*x*(3.0 - 2.0*x); // smoothstep-like
        }

        void main(){
          float m = easeInOut(clamp(uMorph, 0.0, 1.0));
          vMix = m;

          // 粒子在“分散”状态时增加轻微扰动（呼吸感）
          float wobble = (1.0 - m) * 0.9;
          vec3 noise = vec3(
            sin(uTime*1.2 + aSeed*0.7),
            sin(uTime*1.0 + aSeed*1.1),
            sin(uTime*1.4 + aSeed*0.9)
          ) * wobble;

          vec3 p = mix(aDispersed, position, m) + noise;

          // 假光照：用“从中心指向点”的方向近似法线
          vec3 n = normalize(position);
          vLight = clamp(dot(n, normalize(uLightDir)) * 0.5 + 0.5, 0.0, 1.0);

          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mv;

          // 点大小：与距离相关，避免近大远小失控
          float distScale = clamp(260.0 / -mv.z, 0.7, 6.0);
          gl_PointSize = uPointSize * distScale * (0.7 + 0.3 * sin(aSeed + uTime*0.8));

          // 透明度：聚合更实，分散更轻
          vAlpha = mix(0.35, 0.95, m);
        }
      `,
      fragmentShader: `
        uniform vec3 uColorA;
        uniform vec3 uColorB;
        varying float vLight;
        varying float vAlpha;
        varying float vMix;

        void main(){
          // 圆形粒子 + 软边
          vec2 uv = gl_PointCoord - 0.5;
          float d = length(uv);

          // 核心更亮，边缘更柔和
          float core = smoothstep(0.35, 0.0, d);
          float rim  = smoothstep(0.50, 0.20, d);

          // 暖金渐变 + 假光照
          vec3 col = mix(uColorB, uColorA, vLight);
          col *= (1.0 + 0.35 * core);

          // 分散状态更“雾化”
          float a = (core * 0.9 + rim * 0.35) * vAlpha;
          a *= mix(0.78, 1.0, vMix);

          if (a < 0.02) discard;
          gl_FragColor = vec4(col, a);
        }
      `
    });

    const pts = new THREE.Points(geo, mat);
    return pts;
  }

  // ====== 内部：创建环（粒子圆盘） ======
  _createRingPoints(ringOpts){
    const ringCount = ringOpts.particleCount ?? Math.floor(this.particleCount * 0.55);
    const inner = ringOpts.inner ?? (this.radius * 1.35);
    const outer = ringOpts.outer ?? (this.radius * 2.6);
    const thickness = ringOpts.thickness ?? (this.radius * 0.18);

    const target = new Float32Array(ringCount * 3);
    const dispersed = new Float32Array(ringCount * 3);
    const seed = new Float32Array(ringCount);

    for(let i=0;i<ringCount;i++){
      const t = Math.random() * Math.PI * 2;
      const r = Math.sqrt(rand(inner*inner, outer*outer));
      const y = rand(-thickness, thickness) * 0.35;

      // ring target
      target[i*3+0] = Math.cos(t) * r;
      target[i*3+1] = y;
      target[i*3+2] = Math.sin(t) * r;

      // dispersed：更“散”的盘
      const rr = r * rand(1.1, 1.8);
      dispersed[i*3+0] = Math.cos(t) * rr + rand(-3, 3);
      dispersed[i*3+1] = y + rand(-3, 3);
      dispersed[i*3+2] = Math.sin(t) * rr + rand(-3, 3);

      seed[i] = Math.random() * 1000;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(target, 3));
    geo.setAttribute("aDispersed", new THREE.BufferAttribute(dispersed, 3));
    geo.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1));

    const mat = this.points.material.clone();
    mat.uniforms = THREE.UniformsUtils.clone(this.points.material.uniforms);
    mat.uniforms.uPointSize.value = (this.pointSize * 0.85);

    const pts = new THREE.Points(geo, mat);
    pts.rotation.x = ringOpts.tiltX ?? (Math.PI * 0.48);
    return pts;
  }
}
