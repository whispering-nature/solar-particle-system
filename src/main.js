import * as THREE from "three";
import { createScene } from "./scene.js";
import { PlanetSystem } from "./planetSystem.js";
import { UI } from "./ui.js";
import { PerfMonitor } from "./fps.js";

import { HandTracker } from "./gesture/handTracker.js";
import { GestureLogic } from "./gesture/gestureLogic.js";
import { GestureCameraController } from "./gesture/cameraController.js";

const canvas = document.getElementById("c");
const { scene, renderer, camera, sunLight } = createScene(canvas);

const planetSystem = new PlanetSystem(scene);
const ui = new UI(planetSystem);
const perf = new PerfMonitor();

// 手势相机控制器（替代 OrbitControls）
const camCtl = new GestureCameraController(camera);

// 手势追踪
const videoEl = document.getElementById("cam");
const overlayEl = document.getElementById("camOverlay");

const tracker = new HandTracker({
  videoEl,
  overlayEl,
  onStatus: (s) => ui.setCamStatus(s)
});
const logic = new GestureLogic();

let camRunning = false;

// raycaster：用于“指向 + 捏合”切换单个行星
const raycaster = new THREE.Raycaster();
raycaster.params.Points.threshold = 10; // 点云更容易被点到
let hoveredName = "无";

ui.bind({
  onCamToggle: async () => {
    try{
      if (!camRunning){
        ui.setCamStatus("初始化中...");
        await tracker.start();
        camRunning = true;
        ui.setCamButton(true);
      } else {
        tracker.stop();
        camRunning = false;
        ui.setCamButton(false);
      }
    } catch (e){
      ui.setCamStatus("启动失败：请检查权限/设备");
      camRunning = false;
      ui.setCamButton(false);
      console.error(e);
    }
  },
  onToggleAll: () => planetSystem.toggleAll(),
  onTogglePlanet: (key) => {
    const p = planetSystem.getPlanetByKey(key);
    if (p) p.toggle();
  },
  onToggleAuto: () => {
    planetSystem.auto = !planetSystem.auto;
    ui.setAuto(planetSystem.auto);
  },
  onReset: () => camCtl.reset()
});
ui.setAuto(planetSystem.auto);
ui.setCamButton(false);

document.getElementById("totalParticles").textContent =
  planetSystem.totalParticles.toLocaleString("zh-CN");

// 快捷键（调试用）
window.addEventListener("keydown", (e) => {
  if (e.key.toLowerCase() === "r") camCtl.reset();
});

// 3D 循环
const lightDir = new THREE.Vector3();
let elapsed = 0;

function animate(now){
  requestAnimationFrame(animate);

  const dt = perf.tick(now);
  elapsed += dt;

  // 更新星空 time
  const star = scene.getObjectByName("Starfield");
  if (star?.material?.uniforms?.uTime) star.material.uniforms.uTime.value = elapsed;

  // 手势推理（限频在 tracker 内部完成）
  const landmarks = tracker.update(now);
  let gestureOut = null;

  if (camRunning && landmarks){
    gestureOut = logic.analyze(landmarks, now, dt, camCtl.radius);
    ui.setGestureStatus(gestureOut.label);

    // 手掌旋转
    if (gestureOut.mode === "rotate"){
      camCtl.addRotation(gestureOut.rotate.yaw, gestureOut.rotate.pitch);
    }

    // 握拳缩放
    if (gestureOut.mode === "zoom" && gestureOut.zoomTargetRadius != null){
      camCtl.setRadiusTarget(gestureOut.zoomTargetRadius);
    }

    // 张开→握拳：切换全部聚合/分散
    if (gestureOut.toggleAll){
      planetSystem.toggleAll();
    }

    // 指向：做 raycast hover；捏合：切换单个行星
    if (gestureOut.cursorNDC){
      raycaster.setFromCamera(gestureOut.cursorNDC, camera);

      const targets = [];
      for (const p of planetSystem.planets) targets.push(p.points);

      const hits = raycaster.intersectObjects(targets, false);
      if (hits.length){
        const obj = hits[0].object;
        hoveredName = obj.name.replace("Planet:", "").trim();
      } else {
        hoveredName = "无";
      }
      ui.setPickedPlanet(hoveredName);

      if (gestureOut.pinch && hoveredName !== "无"){
        const p = planetSystem.planets.find(x => x.name === hoveredName);
        if (p) p.toggle();
      }
    } else {
      ui.setPickedPlanet("无");
      hoveredName = "无";
    }
  } else {
    ui.setGestureStatus(camRunning ? "未检测到手" : "摄像头未启动");
    ui.setPickedPlanet("无");
  }

  // 更新相机
  camCtl.update(dt);

  // 光方向
  lightDir.copy(sunLight.position).normalize();

  // 更新行星系统
  planetSystem.update(dt, elapsed, lightDir);

  renderer.render(scene, camera);

  // UI：性能统计
  const info = renderer.info;
  ui.updatePerf({
    fps: perf.fps,
    ms: perf.ms,
    drawCalls: info.render.calls,
    triangles: info.render.triangles,
    handFps: tracker.handFps
  });
  ui.updatePlanets();
}
requestAnimationFrame(animate);
