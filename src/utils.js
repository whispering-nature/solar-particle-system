export function clamp(v, a, b){ return Math.max(a, Math.min(b, v)); }
export function lerp(a, b, t){ return a + (b - a) * t; }

/**
 * 平滑阻尼：frame-rate independent
 * lambda 越大越“跟手”
 */
export function damp(current, target, lambda, dt){
  return lerp(current, target, 1 - Math.exp(-lambda * dt));
}

export function smoothstep(edge0, edge1, x){
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

export function rand(min=0, max=1){
  return min + Math.random() * (max - min);
}

/** 随机单位向量 */
export function randomUnitVec3(){
  const u = Math.random() * 2 - 1;
  const a = Math.random() * Math.PI * 2;
  const s = Math.sqrt(1 - u*u);
  return { x: s*Math.cos(a), y: u, z: s*Math.sin(a) };
}

/** 在球体体积内均匀采样点（r 使用 cbrt） */
export function randomInSphere(radius=1){
  const dir = randomUnitVec3();
  const r = radius * Math.cbrt(Math.random());
  return { x: dir.x * r, y: dir.y * r, z: dir.z * r };
}

/** 用于生成“看起来更像星空”的分布（远处更稀疏） */
export function randomInShell(minR, maxR){
  const dir = randomUnitVec3();
  const r = Math.cbrt(rand(minR**3, maxR**3));
  return { x: dir.x * r, y: dir.y * r, z: dir.z * r };
}

export function formatInt(n){
  return new Intl.NumberFormat("zh-CN").format(n);
}
