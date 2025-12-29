import * as THREE from "three";

function clamp(v, a, b){ return Math.max(a, Math.min(b, v)); }
function lerp(a, b, t){ return a + (b - a) * t; }
function damp(current, target, lambda, dt){
  return lerp(current, target, 1 - Math.exp(-lambda * dt));
}

/**
 * 手势相机控制器：用球坐标控制相机绕 target 旋转 + 缩放
 */
export class GestureCameraController {
  constructor(camera){
    this.camera = camera;
    this.target = new THREE.Vector3(0,0,0);

    // 球坐标参数
    this.theta = 0.0;          // 水平角
    this.phi = 1.05;           // 俯仰角（0=上方极点）
    this.radius = 260;

    this.thetaTarget = this.theta;
    this.phiTarget = this.phi;
    this.radiusTarget = this.radius;

    this.minRadius = 90;
    this.maxRadius = 900;

    this.minPhi = 0.22;
    this.maxPhi = 1.38;

    this.rotateSpeed = 2.2;
    this.zoomDamp = 5.0;
    this.rotDamp = 7.0;

    this._apply();
  }

  reset(){
    this.thetaTarget = 0.0;
    this.phiTarget = 1.05;
    this.radiusTarget = 260;
  }

  addRotation(dTheta, dPhi){
    this.thetaTarget += dTheta * this.rotateSpeed;
    this.phiTarget += dPhi * this.rotateSpeed;
    this.phiTarget = clamp(this.phiTarget, this.minPhi, this.maxPhi);
  }

  setRadiusTarget(r){
    this.radiusTarget = clamp(r, this.minRadius, this.maxRadius);
  }

  update(dt){
    this.theta = damp(this.theta, this.thetaTarget, this.rotDamp, dt);
    this.phi = damp(this.phi, this.phiTarget, this.rotDamp, dt);
    this.radius = damp(this.radius, this.radiusTarget, this.zoomDamp, dt);
    this._apply();
  }

  _apply(){
    const sinPhi = Math.sin(this.phi);
    const x = this.radius * sinPhi * Math.sin(this.theta);
    const y = this.radius * Math.cos(this.phi);
    const z = this.radius * sinPhi * Math.cos(this.theta);

    this.camera.position.set(
      this.target.x + x,
      this.target.y + y,
      this.target.z + z
    );
    this.camera.lookAt(this.target);
  }
}
