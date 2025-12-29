import * as THREE from "three";
import { randomInShell, rand } from "./utils.js";

export function createScene(canvas){
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x070a12, 0.0018);

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    powerPreference: "high-performance"
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.setClearColor(0x070a12, 1);

  const camera = new THREE.PerspectiveCamera(
    55,
    window.innerWidth / window.innerHeight,
    0.1,
    5000
  );

  // 光源
  const ambient = new THREE.AmbientLight(0xffffff, 0.10);
  scene.add(ambient);

  const sunLight = new THREE.PointLight(0xffe6b7, 3.2, 1500, 1.1);
  sunLight.position.set(0, 0, 0);
  scene.add(sunLight);

  // 星空
  scene.add(createStarfield());

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight, false);
  });

  return { scene, renderer, camera, sunLight };
}

function createStarfield(){
  const starCount = 6000;
  const positions = new Float32Array(starCount * 3);
  const sizes = new Float32Array(starCount);

  for(let i=0;i<starCount;i++){
    const p = randomInShell(600, 1800);
    positions[i*3+0] = p.x;
    positions[i*3+1] = p.y;
    positions[i*3+2] = p.z;
    sizes[i] = rand(0.8, 2.0);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geo.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));

  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 } },
    vertexShader: `
      attribute float aSize;
      uniform float uTime;
      void main(){
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        float tw = 0.75 + 0.25 * sin(uTime * 0.8 + position.x * 0.01 + position.y * 0.01);
        gl_PointSize = aSize * tw * (240.0 / -mv.z);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: `
      void main(){
        vec2 uv = gl_PointCoord - 0.5;
        float d = length(uv);
        float a = smoothstep(0.5, 0.0, d);
        gl_FragColor = vec4(vec3(1.0), a * 0.85);
      }
    `
  });

  const pts = new THREE.Points(geo, mat);
  pts.name = "Starfield";
  return pts;
}

export function createOrbitLine(radius, color=0x334155){
  const segments = 180;
  const positions = new Float32Array((segments+1)*3);
  for(let i=0;i<=segments;i++){
    const t = (i/segments)*Math.PI*2;
    positions[i*3+0] = Math.cos(t) * radius;
    positions[i*3+1] = 0;
    positions[i*3+2] = Math.sin(t) * radius;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.LineBasicMaterial({ color, transparent:true, opacity: 0.28 });
  return new THREE.Line(geo, mat);
}
