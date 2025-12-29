# 🌌 Particle Solar System (Hand Gesture)

### 基于 MediaPipe 手势识别的 3D 粒子太阳系

> ✨ **核心亮点**：纯前端实现、60FPS 高性能粒子渲染、无需触碰屏幕的 AI 手势交互。

---

## 🎮 在线演示 (Live Demo)

**[👉 点击这里体验在线演示](https://whispering-nature.github.io/solar-particle-system/)
** 
*(请确保允许浏览器使用摄像头权限以开启手势控制)*

---

## 🖼️ 效果预览
**![]()

## 🌟 功能特性

* **3D 粒子模拟**：使用 Three.js `Points` + `ShaderMaterial` 渲染数万个粒子，模拟行星的体积感与光效。
* **AI 手势交互**：集成 Google MediaPipe Hand Landmarker，实现毫秒级手势追踪。
* **高性能优化**：
* 手势推理与渲染循环解耦（推理 15fps / 渲染 60fps）。
* GPU 加速的粒子聚合/分散变形动画 (Morphing)。


* **沉浸式体验**：动态星空背景、泛光效果、平滑的相机阻尼跟随。

## 🖐️ 操作指南

启动摄像头后，站在摄像头前约 0.5 ~ 1 米处，举起一只手即可控制：

| 手势 | 动作说明 | 视觉反馈 |
| --- | --- | --- |
| 🖐 **张开手掌** | 移动手掌位置 | **旋转视角** (Rotate Camera) |
| ✊ **握拳** | 改变拳头与摄像头的距离 | **缩放视角** (Zoom In/Out) |
| 🖐 ➔ ✊ **快速抓取** | 快速从张开变握拳 | **行星聚合/分散** (Toggle Particles) |
| ☝ **食指指向** | 移动指尖 | **光标悬停** (Raycast Hover) |
| 🤏 **捏合** | 食指与拇指捏合 (需配合指向) | **选中/切换单个行星** |

---

## 🛠️ 本地开发与运行

由于浏览器的安全策略（CORS 和 Camera 权限），本项目**不能**直接双击 `index.html` 打开。必须使用本地服务器。

### 方式 A：使用 VS Code (推荐)

1. 安装 **Live Server** 插件。
2. 右键 `index.html` 选择 **Open with Live Server**。

### 方式 B：使用 Python

如果你安装了 Python，可以在项目根目录运行：

```bash
# Python 3
python -m http.server 5173

```

然后浏览器访问 `http://localhost:5173`。

### 方式 C：Node.js

```bash
npx http-server .

```

## 📦 技术栈

* **渲染引擎**: [Three.js](https://threejs.org/) (ES Modules)
* **计算机视觉**: [MediaPipe Tasks Vision](https://developers.google.com/mediapipe/solutions/vision/hand_landmarker)
* **开发语言**: Vanilla JavaScript (ES6+)
* **着色器**: GLSL (用于自定义粒子材质)

## ⚠️ 常见问题 (Troubleshooting)

**Q: 摄像头无法启动？**

1. **检查协议**：确保使用的是 `http://localhost` 或 `https://`。普通 `http://IP地址`（非本地）会被浏览器禁止调用摄像头。
2. **检查权限**：查看浏览器地址栏左侧的“锁”图标，确认已授权摄像头。
3. **检查占用**：关闭其他占用摄像头的软件（如腾讯会议、Zoom）。

**Q: 加载非常慢或报错？**

* 本项目依赖 CDN 加载模型文件（约 10MB）。请检查网络连接，或按 F12 查看控制台是否有网络报错。

## 📜 License

本项目采用 [MIT License](https://www.google.com/search?q=LICENSE) 开源。欢迎 Star 和 Fork！

---

*Created by [whispering-nature]*
