/**
 * 轻量自然语言解析：
 * - 不依赖外部模型，保证离线可用
 * - 你后续可以把这里替换成真实 LLM（OpenAI/本地模型）调用
 */
export function createCommandAgent(planetSystem, uiLogEl){
  function log(line){
    const div = document.createElement("div");
    div.className = "ai-line";
    div.textContent = line;
    uiLogEl.prepend(div);
  }

  function normalize(s){
    return (s ?? "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ");
  }

  function findPlanetKey(text){
    const t = normalize(text);
    // 支持中英关键词（可继续扩展）
    const mapping = [
      ["mercury","mercury"],["水星","mercury"],
      ["venus","venus"],["金星","venus"],
      ["earth","earth"],["地球","earth"],
      ["mars","mars"],["火星","mars"],
      ["jupiter","jupiter"],["木星","jupiter"],
      ["saturn","saturn"],["土星","saturn"],
      ["uranus","uranus"],["天王星","uranus"],
      ["neptune","neptune"],["海王星","neptune"],
      ["sun","sun"],["太阳","sun"]
    ];
    for (const [k, key] of mapping){
      if (t.includes(k)) return key;
    }
    return null;
  }

  function execute(raw){
    const t = normalize(raw);
    if (!t){
      log("请输入指令。例：聚合 地球 / disperse saturn / toggle all");
      return;
    }

    // 全部操作
    if (/(all|全部)/.test(t)){
      if (/(聚合|aggregate|form)/.test(t)){
        planetSystem.planets.forEach(p=>p.setAggregated());
        planetSystem.sun.setAggregated?.();
        log("已执行：全部聚合");
        return;
      }
      if (/(分散|disperse|explode|散开)/.test(t)){
        planetSystem.planets.forEach(p=>p.setDispersed());
        planetSystem.sun.setDispersed?.();
        log("已执行：全部分散");
        return;
      }
      if (/(toggle|切换)/.test(t)){
        planetSystem.toggleAll();
        log("已执行：全部切换");
        return;
      }
    }

    // 单个行星
    const key = findPlanetKey(t);
    if (!key){
      log(`未识别行星：${raw}`);
      return;
    }

    if (key === "sun"){
      if (/(聚合|aggregate|form)/.test(t)) { planetSystem.sun.setAggregated(); log("太阳：聚合"); return; }
      if (/(分散|disperse|explode|散开)/.test(t)) { planetSystem.sun.setDispersed(); log("太阳：分散"); return; }
      if (/(toggle|切换)/.test(t)) { planetSystem.sun.toggle(); log("太阳：切换"); return; }
    } else {
      const p = planetSystem.getPlanetByKey(key);
      if (!p){ log(`未找到行星：${key}`); return; }

      if (/(聚合|aggregate|form)/.test(t)) { p.setAggregated(); log(`${p.name}：聚合`); return; }
      if (/(分散|disperse|explode|散开)/.test(t)) { p.setDispersed(); log(`${p.name}：分散`); return; }
      if (/(toggle|切换)/.test(t)) { p.toggle(); log(`${p.name}：切换`); return; }
    }

    log(`已识别行星 ${key}，但未识别动作（试试：聚合/分散/toggle）`);
  }

  return { execute, log };
}
