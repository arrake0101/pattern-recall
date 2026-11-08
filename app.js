/**
 * 九宫格解锁密码找回助手 - 核心算法与交互引擎
 */

// ==================== 1. 九宫格几何常量与基础规则 ====================
const NODE_COORDS = {
  1: { x: 0, y: 0, cx: 55, cy: 55, name: '左上(1)' },
  2: { x: 1, y: 0, cx: 150, cy: 55, name: '上中(2)' },
  3: { x: 2, y: 0, cx: 245, cy: 55, name: '右上(3)' },
  4: { x: 0, y: 1, cx: 55, cy: 150, name: '左中(4)' },
  5: { x: 1, y: 1, cx: 150, cy: 150, name: '中心(5)' },
  6: { x: 2, y: 1, cx: 245, cy: 150, name: '右中(6)' },
  7: { x: 0, y: 2, cx: 55, cy: 245, name: '左下(7)' },
  8: { x: 1, y: 2, cx: 150, cy: 245, name: '下中(8)' },
  9: { x: 2, y: 2, cx: 245, cy: 245, name: '右下(9)' },
};

// 坐标反查点位编号
const COORD_TO_NODE = {};
for (let n = 1; n <= 9; n++) {
  COORD_TO_NODE[`${NODE_COORDS[n].x},${NODE_COORDS[n].y}`] = n;
}

// 预计算任意两点之间的共线中间点 (若存在)
const MIDDLE_NODE = {};
for (let a = 1; a <= 9; a++) {
  MIDDLE_NODE[a] = {};
  for (let b = 1; b <= 9; b++) {
    if (a === b) continue;
    const ax = NODE_COORDS[a].x, ay = NODE_COORDS[a].y;
    const bx = NODE_COORDS[b].x, by = NODE_COORDS[b].y;
    if ((ax + bx) % 2 === 0 && (ay + by) % 2 === 0) {
      const mx = (ax + bx) / 2;
      const my = (ay + by) / 2;
      MIDDLE_NODE[a][b] = COORD_TO_NODE[`${mx},${my}`];
    } else {
      MIDDLE_NODE[a][b] = null;
    }
  }
}

// 经典高概率九宫格字典 (基于常见字母、符号与手势研究)
const ARCHETYPE_MAP = {
  // L 形系列
  '14789': '经典大L形',
  '1478': '左侧短L形',
  '2589': '中轴短L形',
  '4789': '左下小L形',
  '1456': '上中L形',
  '2569': '右上台阶形',
  '147896': 'L形带右钩',
  '12369': '右上倒L形',
  '36987': '右侧反L形',
  '74123': '左上直角形',
  '78963': '右下直角L',
  '14589': '阶梯L形',
  '12589': '中轴Z/L过渡',

  // Z 形与反 Z 形系列
  '1235789': '经典大Z形',
  '12578': '左上小Z形',
  '23578': '紧凑Z形',
  '23589': '右偏小Z形',
  '123578': '短尾Z形',
  '3215987': '反向大Z形',
  '45687': '下半屏小Z',
  '1245': '左上微型Z',
  '124789': '斜折Z-L形',

  // N 形与闪电系列
  '7415963': '经典大N形',
  '1475369': '经典反N形',
  '74159': '简笔N形',
  '14759': '闪电折线',
  '14753': '左V折线',
  '25478': '左侧闪电形',
  '25698': '右侧闪电形',
  '15269': '斜跳闪电',
  '41596': '横N形',

  // 7 字形与斜切系列
  '12357': '经典7字形',
  '12358': 'T/7字中垂',
  '12365': '7字内折',
  '123657': '7字折撇',
  '4568': '下半7字',
  '1258': '短7字',
  '123579': '7字带底勾',

  // U 形 / C 形 / 口字系列
  '1478963': '经典大U形',
  '3214789': '经典大C形',
  '1236987': '反向大C形',
  '3698741': '逆向大U形',
  '7412369': '倒U门形',
  '147863': '斜角U形',
  '47896': '下半小U形',
  '14563': '上半小U形',
  '12369874': '顺时针口字',
  '14789632': '逆时针口字',
  '1254': '左上小方框',
  '2365': '右上小方框',
  '4587': '左下小方框',
  '5698': '右下小方框',

  // S 形与蛇形系列
  '321456987': '经典全屏S形',
  '123654789': '全屏反S蛇形',
  '3214587': '半屏S形',
  '214587': '紧凑小S形',
  '23654789': '波浪蛇形',
  '14752369': '纵向蛇形',

  // M 形 / W 形 / V 形 / 对角线系列
  '7415369': '经典M形',
  '1475963': '经典W形',
  '15987': '对角线底钩',
  '15963': '对角线上钩',
  '35789': '大撇捺角',
  '15369': '右上V形钩',
  '14863': '大V字形',
  '2486': '中心菱形',
  '24568': '十字绕行',
  '1598': '主对角短钩',
  '123456789': '全屏顺滑扫描',
};

/**
 * 将任意点序列标准化为合法的九宫格序列（自动补全未访问的共线中间点，去重）
 * @param {number[]} rawNodes
 * @returns {number[]}
 */
function normalizePattern(rawNodes) {
  const result = [];
  const visited = new Set();

  for (const raw of rawNodes) {
    const n = Number(raw);
    if (!Number.isInteger(n) || n < 1 || n > 9) continue;
    if (visited.has(n)) continue;

    if (result.length > 0) {
      const last = result[result.length - 1];
      const mid = MIDDLE_NODE[last][n];
      if (mid && !visited.has(mid)) {
        result.push(mid);
        visited.add(mid);
      }
    }
    result.push(n);
    visited.add(n);
  }
  return result;
}

/**
 * 判断每一步是否包含“日”字跳步 (Knight move)
 */
function hasKnightMove(nodes) {
  for (let i = 0; i < nodes.length - 1; i++) {
    const a = NODE_COORDS[nodes[i]];
    const b = NODE_COORDS[nodes[i + 1]];
    const dx = Math.abs(a.x - b.x);
    const dy = Math.abs(a.y - b.y);
    if ((dx === 1 && dy === 2) || (dx === 2 && dy === 1)) {
      return true;
    }
  }
  return false;
}

/**
 * 判断路径是否全部为顺滑转角（无锐角 >120° 折返，也无跳过已访问中间点的跨格跳跃）
 */
function isSmoothPath(nodes) {
  for (let i = 0; i < nodes.length - 1; i++) {
    const a = NODE_COORDS[nodes[i]];
    const b = NODE_COORDS[nodes[i + 1]];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    // 跨两格跳跃不视为顺滑
    if (Math.abs(dx) > 1 || Math.abs(dy) > 1) return false;

    if (i > 0) {
      const prev = NODE_COORDS[nodes[i - 1]];
      const vx1 = a.x - prev.x;
      const vy1 = a.y - prev.y;
      const dot = vx1 * dx + vy1 * dy;
      // dot < 0 代表转角超过 90 度（即锐角往回折）
      if (dot < 0) return false;
    }
  }
  return true;
}

/**
 * 判断图形是否具有较强的几何规整/对称性
 */
function isSymmetricOrGeometric(nodes) {
  const str = nodes.join('');
  if (ARCHETYPE_MAP[str]) return true;
  // 检查左右镜像后是否步进一致，或首尾对称
  const n = nodes.length;
  let horizSym = true;
  let pointSym = true;
  for (let i = 0; i < n; i++) {
    const a = NODE_COORDS[nodes[i]];
    const b = NODE_COORDS[nodes[n - 1 - i]];
    if (a.x + b.x !== 2 || a.y !== b.y) horizSym = false;
    if (a.x + b.x !== 2 || a.y + b.y !== 2) pointSym = false;
  }
  return horizSym || pointSym;
}

// ==================== 2. 状态管理与持久化 ====================
const STORAGE_KEY = 'unlock_pattern_assistant_v1';

const state = {
  // 当前画板上的点序列
  currentPadNodes: [],
  isDragging: false,

  // 已试记录: [{ seq: "14789", nodes: [1,4,7,8,9], time: 1700000000, starred: false, note: "" }]
  triedList: [],
  triedMap: new Map(), // seq -> item

  // 已找回的正确密码 (若有)
  solvedSeq: null,

  // 记忆筛选器状态
  filters: {
    startNodes: new Set(), // 空表示不限
    endNodes: new Set(),   // 空表示不限
    nodeStates: {},        // 1..9 -> 'neutral' | 'include' | 'exclude'
    lengths: new Set([4, 5, 6]),
    subpaths: [],          // 如 ["147", "89"]
    shapeMode: 'all',      // 'all' | 'archetype' | 'no_knight' | 'smooth' | 'symmetric'
    handHabit: 'standard', // 'standard' | 'right_thumb' | 'left_thumb' | 'memory_first'
  },

  // 推荐结果缓存与分页
  recommendations: [],
  currentPage: 1,
  pageSize: 15, // 3组 x 5个

  // 冷却倒计时
  cooldownRemaining: 0,
  cooldownTimerId: null,
};

for (let i = 1; i <= 9; i++) {
  state.filters.nodeStates[i] = 'neutral';
}

function saveStateToStorage() {
  try {
    const payload = {
      triedList: state.triedList,
      solvedSeq: state.solvedSeq,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch (e) {
    console.error('保存本地记录失败:', e);
  }
}

function normalizeRecordItem(item) {
  const feedback = item.feedback || (item.starred ? 'like' : 'tried');
  return {
    ...item,
    feedback,
    starred: feedback === 'like',
  };
}

function loadStateFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    if (Array.isArray(data.triedList)) {
      state.triedList = data.triedList.map(normalizeRecordItem);
      state.triedMap.clear();
      state.triedList.forEach((item) => {
        state.triedMap.set(item.seq, item);
      });
    }
    if (data.solvedSeq) {
      state.solvedSeq = data.solvedSeq;
    }
  } catch (e) {
    console.error('读取本地记录失败:', e);
  }
}

// ==================== 3. 统计学 + 人体工学 + 肌肉记忆评分引擎 ====================

// 起点先验分 (根据研究：左上角 1 占比高达 44%，其次 2,4,7,3)
const START_PRIORS = {
  standard:    { 1: 20, 2: 13, 4: 13, 7: 11, 3: 11, 5: 8, 6: 4, 8: 4, 9: 4 },
  right_thumb: { 1: 20, 2: 15, 4: 15, 5: 10, 7: 10, 3: 9, 8: 5, 6: 4, 9: 3 },
  left_thumb:  { 3: 18, 2: 15, 1: 16, 6: 12, 5: 10, 9: 8, 4: 8, 7: 5, 8: 4 },
  memory_first:{ 1: 14, 2: 10, 4: 10, 7: 9,  3: 9,  5: 7, 6: 4, 8: 4, 9: 4 },
};

// 终点先验分 (右下角 9、下中 8、左下 7、右中 6 最常见)
const END_PRIORS = {
  standard:    { 9: 15, 8: 12, 7: 10, 6: 10, 3: 9, 5: 6, 4: 4, 2: 4, 1: 3 },
  right_thumb: { 9: 18, 8: 14, 6: 12, 7: 9,  3: 8, 5: 6, 4: 3, 2: 3, 1: 2 },
  left_thumb:  { 7: 17, 8: 14, 4: 11, 9: 10, 1: 8, 5: 6, 6: 4, 2: 3, 3: 2 },
  memory_first:{ 9: 11, 8: 9,  7: 8,  6: 8,  3: 7, 5: 5, 4: 3, 2: 3, 1: 2 },
};

// 长度先验分
const LENGTH_PRIORS = {
  4: 16,
  5: 18,
  6: 14,
  7: 9,
  8: 6,
  9: 5,
};

/**
 * 计算两个手势之间的“肌肉记忆相似度”
 * 检测：同形状平移、镜像对称、相同起手前缀、相同收尾后缀、编辑距离接近
 */
function computeMuscleSimilarity(nodesA, nodesB) {
  const seqA = nodesA.join('');
  const seqB = nodesB.join('');
  if (seqA === seqB) return { bonus: 0, reason: null };

  let bonus = 0;
  const reasons = [];

  // 1. 检查是否为“同形状平移变体” (Step Vectors 完全一致，比如 1-4-7-8 与 2-5-8-9)
  if (nodesA.length === nodesB.length) {
    let sameVectors = true;
    let horizMirror = true;
    for (let i = 0; i < nodesA.length - 1; i++) {
      const a1 = NODE_COORDS[nodesA[i]], a2 = NODE_COORDS[nodesA[i + 1]];
      const b1 = NODE_COORDS[nodesB[i]], b2 = NODE_COORDS[nodesB[i + 1]];
      const dxA = a2.x - a1.x, dyA = a2.y - a1.y;
      const dxB = b2.x - b1.x, dyB = b2.y - b1.y;
      if (dxA !== dxB || dyA !== dyB) sameVectors = false;
      if (dxA !== -dxB || dyA !== dyB) horizMirror = false;
    }
    if (sameVectors) {
      bonus += 36;
      reasons.push(`同形平移(${seqB})`);
    } else if (horizMirror) {
      bonus += 26;
      reasons.push(`左右镜像(${seqB})`);
    }
  }

  // 2. 逆序手势 (起点终点反过来滑)
  if (nodesA.length === nodesB.length && nodesA.slice().reverse().join('') === seqB) {
    bonus += 25;
    reasons.push(`反向轨迹(${seqB})`);
  }

  // 3. 共同前缀长度 (起手肌肉记忆往往最准)
  let prefixLen = 0;
  while (
    prefixLen < nodesA.length &&
    prefixLen < nodesB.length &&
    nodesA[prefixLen] === nodesB[prefixLen]
  ) {
    prefixLen++;
  }
  if (prefixLen >= 3) {
    bonus += prefixLen * 8;
    reasons.push(`前${prefixLen}步相同`);
  } else if (prefixLen === 2) {
    bonus += 11;
    reasons.push(`起手${nodesA[0]}→${nodesA[1]}相同`);
  } else if (prefixLen === 1) {
    bonus += 4;
  }

  // 4. 共同后缀长度 (收尾动作相同)
  let suffixLen = 0;
  while (
    suffixLen < nodesA.length &&
    suffixLen < nodesB.length &&
    nodesA[nodesA.length - 1 - suffixLen] === nodesB[nodesB.length - 1 - suffixLen]
  ) {
    suffixLen++;
  }
  if (suffixLen >= 2 && prefixLen < nodesA.length) {
    bonus += suffixLen * 6;
    if (reasons.length < 2) reasons.push(`收尾相同`);
  }

  // 5. 共同有向边与点位重合度 (比如中间拐弯多滑/少滑了一个点)
  if (Math.abs(nodesA.length - nodesB.length) <= 1) {
    const setB = new Set(nodesB);
    let sharedNodes = 0;
    for (const n of nodesA) {
      if (setB.has(n)) sharedNodes++;
    }
    const overlapRatio = sharedNodes / Math.max(nodesA.length, nodesB.length);
    if (overlapRatio >= 0.78) {
      bonus += 16;
      if (reasons.length === 0) reasons.push(`点位高度重合(${seqB})`);
    }
  }

  return {
    bonus: Math.min(bonus, 58),
    reason: reasons[0] || null,
  };
}

/**
 * 综合评估一个九宫格图案的可能性得分与解释标签
 * @param {number[]} nodes
 */
function evaluatePattern(nodes) {
  const seq = nodes.join('');
  const len = nodes.length;
  const habit = state.filters.handHabit || 'standard';
  const startPriors = START_PRIORS[habit] || START_PRIORS.standard;
  const endPriors = END_PRIORS[habit] || END_PRIORS.standard;

  let score = 30; // 基础分
  const tags = [];

  // 1. 经典形状加分
  if (ARCHETYPE_MAP[seq]) {
    score += 24;
    tags.push({ text: `🏆 ${ARCHETYPE_MAP[seq]}`, type: 'archetype' });
  }

  // 2. 起点与终点人体工学加分
  const startNode = nodes[0];
  const endNode = nodes[len - 1];
  score += startPriors[startNode] || 5;
  score += endPriors[endNode] || 4;

  if (startNode === 1) {
    tags.push({ text: '左上1起手(44%高频)', type: 'normal' });
  } else if (startNode === 2 || startNode === 4 || startNode === 7) {
    tags.push({ text: `${NODE_COORDS[startNode].name}起手`, type: 'normal' });
  }

  // 3. 长度加分
  score += LENGTH_PRIORS[len] || 5;

  // 4. 步进向量与转角流畅度分析
  let straightCount = 0;
  let knightCount = 0;
  let jumpOverCount = 0;
  let sharpTurnCount = 0;
  let naturalFlowCount = 0;

  const visitedSoFar = new Set([nodes[0]]);

  for (let i = 0; i < len - 1; i++) {
    const u = nodes[i];
    const v = nodes[i + 1];
    const cu = NODE_COORDS[u];
    const cv = NODE_COORDS[v];
    const dx = cv.x - cu.x;
    const dy = cv.y - cu.y;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    // 步长类型
    if (absDx + absDy === 1) {
      score += 4.5; // 横竖相邻最顺手
    } else if (absDx === 1 && absDy === 1) {
      score += 3.2; // 斜向相邻
    } else if ((absDx === 1 && absDy === 2) || (absDx === 2 && absDy === 1)) {
      knightCount++;
      score -= 7.5; // 日字跳步在日常密码中较少见
    } else {
      // 跨过已访问中间点的跳跃
      jumpOverCount++;
      score -= 6.5;
    }

    // 自然流向（从上往下 dy >= 0，从左往右 dx >= 0）
    if (dy >= 0 && dx >= 0) {
      naturalFlowCount++;
      score += 2.2;
    } else if (dy > 0) {
      score += 1.5;
    }

    // 转角连续性
    if (i > 0) {
      const prev = NODE_COORDS[nodes[i - 1]];
      const vx1 = cu.x - prev.x;
      const vy1 = cu.y - prev.y;
      if (vx1 === dx && vy1 === dy) {
        straightCount++;
        score += 6.5; // 3点连成一线非常符合人类直觉
      } else {
        const dot = vx1 * dx + vy1 * dy;
        if (dot === 0) {
          score += 3.5; // 90度直角转弯
        } else if (dot > 0) {
          score += 2.5; // 135度钝角平滑转弯
        } else {
          sharpTurnCount++;
          score -= 4.0; // 锐角往回折
        }
      }
    }

    visitedSoFar.add(v);
  }

  if (straightCount >= 1 && knightCount === 0 && sharpTurnCount === 0) {
    tags.push({ text: '走势顺滑', type: 'normal' });
  }

  // 5. 与用户标记的“⭐ 手感像”与“🚫 不像”进行正负向相似度调权
  const likeItems = state.triedList.filter((item) => item.feedback === 'like');
  const unlikeItems = state.triedList.filter((item) => item.feedback === 'unlike');

  let bestLikeBonus = 0;
  let bestLikeReason = null;
  for (const item of likeItems) {
    const sim = computeMuscleSimilarity(nodes, item.nodes);
    if (sim.bonus > bestLikeBonus) {
      bestLikeBonus = sim.bonus;
      bestLikeReason = sim.reason;
    }
  }

  let bestUnlikeBonus = 0;
  let bestUnlikeReason = null;
  for (const item of unlikeItems) {
    const sim = computeMuscleSimilarity(nodes, item.nodes);
    if (sim.bonus > bestUnlikeBonus) {
      bestUnlikeBonus = sim.bonus;
      bestUnlikeReason = sim.reason;
    }
  }

  if (bestLikeBonus > 0 && bestLikeBonus >= bestUnlikeBonus) {
    const multiplier = habit === 'memory_first' ? 1.35 : 1.0;
    score += bestLikeBonus * multiplier;
    if (bestLikeReason) {
      tags.unshift({ text: `⭐ ${bestLikeReason}`, type: 'similarity' });
    }
  } else if (bestUnlikeBonus >= 14) {
    const penalty = Math.min(34, Math.round(bestUnlikeBonus * 0.72));
    score -= penalty;
    if (bestUnlikeReason) {
      tags.push({ text: `🚫 避开不像:${bestUnlikeReason}`, type: 'penalty' });
    }
  }

  // 将原始分数平滑映射到 10 ~ 99.8 区间，确保高分梯队之间也有明显区分度
  const scaled = 42 + (score - 35) * 0.46;
  const displayScore = Math.max(8, Math.min(99.8, Math.round(scaled * 10) / 10));

  return {
    seq,
    nodes,
    rawScore: score,
    displayScore,
    tags: tags.slice(0, 3),
  };
}

// ==================== 4. 候选密码生成器 (带约束剪枝) ====================

/**
 * 根据当前筛选条件，快速生成并排序高概率未试密码
 */
function recomputeRecommendations() {
  const {
    startNodes,
    endNodes,
    nodeStates,
    lengths,
    subpaths,
    shapeMode,
  } = state.filters;

  const allowedLengths = Array.from(lengths).sort((a, b) => a - b);
  if (allowedLengths.length === 0) {
    state.recommendations = [];
    renderAll();
    return;
  }

  const maxLen = Math.max(...allowedLengths);
  const minLen = Math.min(...allowedLengths);

  // 必经点集合 & 排除点集合
  const mustInclude = [];
  const excludedSet = new Set();
  for (let n = 1; n <= 9; n++) {
    if (nodeStates[n] === 'include') mustInclude.push(n);
    if (nodeStates[n] === 'exclude') excludedSet.add(n);
  }

  const results = [];
  // 为防止选择 7~9 点且无筛选条件时遍历全部 38.9 万个组合阻塞主线程，
  // 我们按起点优先级顺序和顺手邻接顺序做启发式搜索，收集满高优候选池即可
  const MAX_POOL_SIZE = 8500;

  // 对起点按经验概率排序
  const startOrder = [1, 2, 4, 7, 3, 5, 8, 6, 9].filter((n) => {
    if (excludedSet.has(n)) return false;
    if (startNodes.size > 0 && !startNodes.has(n)) return false;
    return true;
  });

  // 预排序每个点的下一步探索顺序（优先相邻横竖、斜角，最后日字步）
  const nextOrderMap = {};
  for (let u = 1; u <= 9; u++) {
    const list = [];
    for (let v = 1; v <= 9; v++) {
      if (u === v) continue;
      const dx = Math.abs(NODE_COORDS[u].x - NODE_COORDS[v].x);
      const dy = Math.abs(NODE_COORDS[u].y - NODE_COORDS[v].y);
      const priority = dx + dy === 1 ? 1 : dx === 1 && dy === 1 ? 2 : 3;
      list.push({ v, priority });
    }
    list.sort((a, b) => a.priority - b.priority);
    nextOrderMap[u] = list.map((x) => x.v);
  }

  const visited = new Array(10).fill(false);
  const currentPath = [];

  function checkCandidate(nodes) {
    const len = nodes.length;
    if (len < 4 || !lengths.has(len)) return;

    const startNode = nodes[0];
    if (startNodes.size > 0 && !startNodes.has(startNode)) return;

    const endNode = nodes[len - 1];
    if (endNodes.size > 0 && !endNodes.has(endNode)) return;

    // 排除点检查
    for (let i = 0; i < len; i++) {
      if (excludedSet.has(nodes[i])) return;
    }

    // 必经点检查
    for (let i = 0; i < mustInclude.length; i++) {
      if (!nodes.includes(mustInclude[i])) return;
    }

    const seq = nodes.join('');

    // 已试过的直接跳过
    if (state.triedMap.has(seq)) return;

    // 必含局部连线片段检查
    if (subpaths.length > 0) {
      for (const sp of subpaths) {
        if (!seq.includes(sp)) return;
      }
    }

    // 形状模式过滤
    if (shapeMode === 'archetype' && !ARCHETYPE_MAP[seq]) return;
    if (shapeMode === 'no_knight' && hasKnightMove(nodes)) return;
    if (shapeMode === 'smooth' && !isSmoothPath(nodes)) return;
    if (shapeMode === 'symmetric' && !isSymmetricOrGeometric(nodes)) return;

    results.push(evaluatePattern(nodes.slice()));
  }

  // 辅助函数：针对“⭐手感接近”样本定向生成平移、镜像、增删改首尾的近邻变体
  function generateStarredNeighborhood(baseNodes) {
    const variants = [];

    // 1. 整体平移变体 (dx, dy in -2..2)
    for (let dx = -2; dx <= 2; dx++) {
      for (let dy = -2; dy <= 2; dy++) {
        if (dx === 0 && dy === 0) continue;
        const shifted = [];
        let ok = true;
        for (const n of baseNodes) {
          const nx = NODE_COORDS[n].x + dx;
          const ny = NODE_COORDS[n].y + dy;
          const mapped = COORD_TO_NODE[`${nx},${ny}`];
          if (!mapped) {
            ok = false;
            break;
          }
          shifted.push(mapped);
        }
        if (ok) variants.push(normalizePattern(shifted));
      }
    }

    // 2. 左右镜像、上下镜像、逆序
    variants.push(
      normalizePattern(baseNodes.map((n) => COORD_TO_NODE[`${2 - NODE_COORDS[n].x},${NODE_COORDS[n].y}`]))
    );
    variants.push(
      normalizePattern(baseNodes.map((n) => COORD_TO_NODE[`${NODE_COORDS[n].x},${2 - NODE_COORDS[n].y}`]))
    );
    variants.push(normalizePattern(baseNodes.slice().reverse()));

    // 3. 尾部延伸1步、头部延伸1步、改最后1步、改第1步
    for (let n = 1; n <= 9; n++) {
      variants.push(normalizePattern([...baseNodes, n]));
      variants.push(normalizePattern([n, ...baseNodes]));
      if (baseNodes.length >= 4) {
        variants.push(normalizePattern([...baseNodes.slice(0, -1), n]));
        variants.push(normalizePattern([n, ...baseNodes.slice(1)]));
      }
    }

    // 4. 截短1步 (若原长 >= 5)
    if (baseNodes.length >= 5) {
      variants.push(normalizePattern(baseNodes.slice(0, -1)));
      variants.push(normalizePattern(baseNodes.slice(1)));
    }

    return variants;
  }

  function dfs(u, depth) {
    if (results.length >= MAX_POOL_SIZE) return;

    // 剪枝：剩余步数是否足够覆盖还未访问的必经点
    let missingMust = 0;
    for (let i = 0; i < mustInclude.length; i++) {
      if (!visited[mustInclude[i]]) missingMust++;
    }
    if (missingMust > maxLen - depth) return;

    if (depth >= minLen) {
      checkCandidate(currentPath);
    }

    if (depth === maxLen) return;

    const neighbors = nextOrderMap[u];
    for (let i = 0; i < neighbors.length; i++) {
      const v = neighbors[i];
      if (visited[v] || excludedSet.has(v)) continue;

      // 检查共线中间点是否已访问
      const mid = MIDDLE_NODE[u][v];
      if (mid !== null && !visited[mid]) continue;

      // 如果开启了“排除日字跳步”或“仅看顺滑走势”，在搜索中直接剪枝！
      if (shapeMode === 'no_knight' || shapeMode === 'smooth') {
        const dx = NODE_COORDS[v].x - NODE_COORDS[u].x;
        const dy = NODE_COORDS[v].y - NODE_COORDS[u].y;
        if (Math.abs(dx) > 1 || Math.abs(dy) > 1) continue;

        if (shapeMode === 'smooth' && currentPath.length >= 2) {
          const prev = NODE_COORDS[currentPath[currentPath.length - 2]];
          const vx1 = NODE_COORDS[u].x - prev.x;
          const vy1 = NODE_COORDS[u].y - prev.y;
          if (vx1 * dx + vy1 * dy < 0) continue;
        }
      }

      visited[v] = true;
      currentPath.push(v);
      dfs(v, depth + 1);
      currentPath.pop();
      visited[v] = false;

      if (results.length >= MAX_POOL_SIZE) return;
    }
  }

  // 第零阶段：确保所有“⭐手感接近”样本的平移、镜像、改首尾近邻变体优先纳入考量
  const starredItems = state.triedList.filter((item) => item.starred);
  for (const stItem of starredItems) {
    const nbVariants = generateStarredNeighborhood(stItem.nodes);
    for (const vNodes of nbVariants) {
      checkCandidate(vNodes);
    }
  }

  // 第一阶段：确保所有满足筛选条件的经典图形 (ARCHETYPE_MAP) 一定被纳入考量
  for (const seqKey of Object.keys(ARCHETYPE_MAP)) {
    const nodes = normalizePattern(seqKey.split('').map(Number));
    checkCandidate(nodes);
  }

  // 第二阶段：启发式 DFS 搜索
  visited.fill(false);
  for (const startNode of startOrder) {
    visited[startNode] = true;
    currentPath.push(startNode);
    dfs(startNode, 1);
    currentPath.pop();
    visited[startNode] = false;
  }

  // 去重并按得分从高到低排序
  const uniqueResults = [];
  const seen = new Set();
  for (const item of results) {
    if (!seen.has(item.seq)) {
      seen.add(item.seq);
      uniqueResults.push(item);
    }
  }

  uniqueResults.sort((a, b) => b.rawScore - a.rawScore);

  state.recommendations = uniqueResults;
  state.currentPage = 1;
  renderAll();
}

// ==================== 5. 画板与缩略图 SVG 渲染 ====================

const lockPadSvg = document.getElementById('lockPadSvg');
const padHaloGroup = document.getElementById('padHaloGroup');
const padLinesGroup = document.getElementById('padLinesGroup');
const padActiveLine = document.getElementById('padActiveLine');
const padNodesGroup = document.getElementById('padNodesGroup');

/**
 * 初始化左侧可交互九宫格画板节点（分三层渲染：底光环层 -> 中连线箭头层 -> 顶序号圆心层）
 */
function initLockPad() {
  if (padHaloGroup) padHaloGroup.innerHTML = '';
  padNodesGroup.innerHTML = '';

  for (let n = 1; n <= 9; n++) {
    const { cx, cy } = NODE_COORDS[n];

    // 1. 底层光环与右上外侧点位编号
    const haloG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    haloG.setAttribute('class', 'pad-halo-item');
    haloG.setAttribute('data-node', n);

    const outer = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    outer.setAttribute('cx', cx);
    outer.setAttribute('cy', cy);
    outer.setAttribute('r', 23);
    outer.setAttribute('class', 'pad-node-outer');

    // 点位固有编号 1..9 放在外圈左上外侧，绝不压线
    const numText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    numText.setAttribute('x', cx - 24);
    numText.setAttribute('y', cy - 22);
    numText.setAttribute('text-anchor', 'middle');
    numText.setAttribute('class', 'pad-node-num');
    numText.textContent = n;

    haloG.appendChild(outer);
    haloG.appendChild(numText);
    if (padHaloGroup) padHaloGroup.appendChild(haloG);

    // 2. 顶层中心圆点、步数序号与透明交互热区
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('class', 'pad-node-group');
    g.setAttribute('data-node', n);

    const inner = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    inner.setAttribute('cx', cx);
    inner.setAttribute('cy', cy);
    inner.setAttribute('r', 6);
    inner.setAttribute('class', 'pad-node-inner');

    const orderText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    orderText.setAttribute('x', cx);
    orderText.setAttribute('y', cy + 4);
    orderText.setAttribute('text-anchor', 'middle');
    orderText.setAttribute('class', 'pad-node-order');
    orderText.textContent = '';

    const hit = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    hit.setAttribute('cx', cx);
    hit.setAttribute('cy', cy);
    hit.setAttribute('r', 32);
    hit.setAttribute('class', 'pad-node-hit');

    g.appendChild(inner);
    g.appendChild(orderText);
    g.appendChild(hit);
    padNodesGroup.appendChild(g);
  }

  // 绑定指针拖拽事件 (兼容鼠标与触摸屏)
  lockPadSvg.addEventListener('pointerdown', onPadPointerDown);
  window.addEventListener('pointermove', onPadPointerMove);
  window.addEventListener('pointerup', onPadPointerUp);
}

function getSvgCoordsFromEvent(e) {
  const rect = lockPadSvg.getBoundingClientRect();
  const scaleX = 300 / rect.width;
  const scaleY = 300 / rect.height;
  return {
    x: (e.clientX - rect.left) * scaleX,
    y: (e.clientY - rect.top) * scaleY,
  };
}

function findHitNode(svgX, svgY, radius = 32) {
  for (let n = 1; n <= 9; n++) {
    const { cx, cy } = NODE_COORDS[n];
    const dist = Math.hypot(svgX - cx, svgY - cy);
    if (dist <= radius) return n;
  }
  return null;
}

function onPadPointerDown(e) {
  e.preventDefault();
  const pt = getSvgCoordsFromEvent(e);
  const hitNode = findHitNode(pt.x, pt.y, 34);
  if (!hitNode) return;

  state.isDragging = true;
  state.currentPadNodes = [hitNode];
  renderPadState();
}

function onPadPointerMove(e) {
  if (!state.isDragging) return;
  const pt = getSvgCoordsFromEvent(e);

  // 更新正在拖拽的虚线
  const lastNode = state.currentPadNodes[state.currentPadNodes.length - 1];
  if (lastNode) {
    const { cx, cy } = NODE_COORDS[lastNode];
    padActiveLine.setAttribute('x1', cx);
    padActiveLine.setAttribute('y1', cy);
    padActiveLine.setAttribute('x2', pt.x);
    padActiveLine.setAttribute('y2', pt.y);
    padActiveLine.classList.remove('hidden');
  }

  const hitNode = findHitNode(pt.x, pt.y, 29);
  if (hitNode && !state.currentPadNodes.includes(hitNode)) {
    const updated = normalizePattern([...state.currentPadNodes, hitNode]);
    state.currentPadNodes = updated;
    renderPadState();
  }
}

function onPadPointerUp() {
  if (!state.isDragging) return;
  state.isDragging = false;
  padActiveLine.classList.add('hidden');
  renderPadState();
}

/**
 * 渲染画板上的节点高亮、顺序与连线，并更新下方实时诊断卡
 */
function renderPadState() {
  const nodes = state.currentPadNodes;
  const manualInput = document.getElementById('manualSeqInput');
  manualInput.value = nodes.join('');

  // 1. 渲染连线与中点方向箭头（直接用显式RGB描边，彻底避免SVG水平/垂直线渐变消失问题）
  padLinesGroup.innerHTML = '';
  for (let i = 0; i < nodes.length - 1; i++) {
    const a = NODE_COORDS[nodes[i]];
    const b = NODE_COORDS[nodes[i + 1]];

    const ratio = i / Math.max(1, nodes.length - 2);
    const r = Math.round(37 + ratio * 87);
    const g = Math.round(99 - ratio * 41);
    const bl = Math.round(235 + ratio * 2);
    const segColor = `rgb(${r}, ${g}, ${bl})`;

    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', a.cx);
    line.setAttribute('y1', a.cy);
    line.setAttribute('x2', b.cx);
    line.setAttribute('y2', b.cy);
    line.setAttribute('stroke', segColor);
    line.setAttribute('stroke-width', '5');
    line.setAttribute('stroke-linecap', 'round');
    line.setAttribute('opacity', '0.9');
    padLinesGroup.appendChild(line);

    // 在线段中点绘制清晰的方向小箭头（不被两端圆心遮挡）
    const mx = a.cx + (b.cx - a.cx) * 0.54;
    const my = a.cy + (b.cy - a.cy) * 0.54;
    const angle = (Math.atan2(b.cy - a.cy, b.cx - a.cx) * 180) / Math.PI;
    const arrow = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    arrow.setAttribute('d', 'M -4.5 -4 L 4.5 0 L -4.5 4 z');
    arrow.setAttribute('fill', '#ffffff');
    arrow.setAttribute('stroke', segColor);
    arrow.setAttribute('stroke-width', '1.4');
    arrow.setAttribute('stroke-linejoin', 'round');
    arrow.setAttribute('transform', `translate(${mx}, ${my}) rotate(${angle})`);
    padLinesGroup.appendChild(arrow);
  }

  // 2. 渲染底层光环状态
  if (padHaloGroup) {
    const haloItems = padHaloGroup.querySelectorAll('.pad-halo-item');
    haloItems.forEach((h) => {
      const n = Number(h.getAttribute('data-node'));
      const idx = nodes.indexOf(n);
      h.classList.remove('active', 'start-node', 'end-node');
      if (idx !== -1) {
        h.classList.add('active');
        if (idx === 0) h.classList.add('start-node');
        if (idx === nodes.length - 1 && nodes.length > 1) h.classList.add('end-node');
      }
    });
  }

  // 3. 渲染顶层中心圆点与步数序号
  const nodeGroups = padNodesGroup.querySelectorAll('.pad-node-group');
  nodeGroups.forEach((g) => {
    const n = Number(g.getAttribute('data-node'));
    const idx = nodes.indexOf(n);
    const inner = g.querySelector('.pad-node-inner');
    const orderText = g.querySelector('.pad-node-order');

    g.classList.remove('active', 'start-node', 'end-node');
    if (idx !== -1) {
      g.classList.add('active');
      if (idx === 0) g.classList.add('start-node');
      if (idx === nodes.length - 1 && nodes.length > 1) g.classList.add('end-node');
      if (inner) inner.setAttribute('r', '11');
      orderText.textContent = idx + 1;
    } else {
      if (inner) inner.setAttribute('r', '6');
      orderText.textContent = '';
    }
  });

  // 4. 更新实时诊断与相近变体
  renderCurrentDiagnosis();
}

/**
 * 动态演示指定路径动画
 */
let replayTimer = null;
function animatePatternOnPad(nodes) {
  if (replayTimer) clearInterval(replayTimer);
  if (!nodes || nodes.length === 0) return;

  let step = 1;
  state.currentPadNodes = nodes.slice(0, 1);
  renderPadState();

  replayTimer = setInterval(() => {
    step++;
    if (step > nodes.length) {
      clearInterval(replayTimer);
      replayTimer = null;
      return;
    }
    state.currentPadNodes = nodes.slice(0, step);
    renderPadState();
  }, 220);
}

/**
 * 生成缩略九宫格 SVG 字符串 (用于推荐卡片和历史记录 - 适配清晰亮色主题)
 */
function createMiniPatternSvg(nodes, size = 96) {
  const coords = {
    1: [18, 18], 2: [48, 18], 3: [78, 18],
    4: [18, 48], 5: [48, 48], 6: [78, 48],
    7: [18, 78], 8: [48, 78], 9: [78, 78],
  };

  let linesHtml = '';
  for (let i = 0; i < nodes.length - 1; i++) {
    const [x1, y1] = coords[nodes[i]];
    const [x2, y2] = coords[nodes[i + 1]];
    const ratio = i / Math.max(1, nodes.length - 2);
    const r = Math.round(37 + ratio * 62);
    const g = Math.round(99 - ratio * 29);
    const b = Math.round(235 + ratio * 6);
    linesHtml += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="rgb(${r},${g},${b})" stroke-width="3.4" stroke-linecap="round" opacity="0.9" />`;
  }

  const showStepNum = size >= 80;
  let dotsHtml = '';
  for (let n = 1; n <= 9; n++) {
    const [cx, cy] = coords[n];
    const idx = nodes.indexOf(n);
    if (idx === 0) {
      // 起点：翠绿实心带外圈
      dotsHtml += `<circle cx="${cx}" cy="${cy}" r="8" fill="rgba(5,150,105,0.16)" stroke="#059669" stroke-width="1.5"/>`;
      dotsHtml += `<circle cx="${cx}" cy="${cy}" r="5.5" fill="#059669"/>`;
      if (showStepNum) {
        dotsHtml += `<text x="${cx}" y="${cy + 2.8}" text-anchor="middle" fill="#ffffff" font-size="7.5" font-weight="800">1</text>`;
      }
    } else if (idx === nodes.length - 1 && nodes.length > 1) {
      // 终点：紫罗兰实心带外圈
      dotsHtml += `<circle cx="${cx}" cy="${cy}" r="8" fill="rgba(124,58,237,0.16)" stroke="#7c3aed" stroke-width="1.5"/>`;
      dotsHtml += `<circle cx="${cx}" cy="${cy}" r="5.5" fill="#7c3aed"/>`;
      if (showStepNum) {
        dotsHtml += `<text x="${cx}" y="${cy + 2.8}" text-anchor="middle" fill="#ffffff" font-size="7.5" font-weight="800">${idx + 1}</text>`;
      }
    } else if (idx !== -1) {
      // 途经点：皇家蓝
      dotsHtml += `<circle cx="${cx}" cy="${cy}" r="5.5" fill="#2563eb"/>`;
      if (showStepNum) {
        dotsHtml += `<text x="${cx}" y="${cy + 2.8}" text-anchor="middle" fill="#ffffff" font-size="7" font-weight="700">${idx + 1}</text>`;
      }
    } else {
      // 未经过点：浅灰圆点
      dotsHtml += `<circle cx="${cx}" cy="${cy}" r="3.2" fill="#cbd5e1"/>`;
    }
  }

  return `
    <svg class="mini-pattern-svg" viewBox="0 0 96 96" width="${size}" height="${size}">
      ${linesHtml}
      ${dotsHtml}
    </svg>
  `;
}

// ==================== 6. 当前手势诊断与近邻变体推荐 ====================

function renderCurrentDiagnosis() {
  const diagEl = document.getElementById('currentDiagnosis');
  const similarSec = document.getElementById('similarSection');
  const similarGrid = document.getElementById('similarGrid');
  const nodes = state.currentPadNodes;

  if (nodes.length === 0) {
    diagEl.className = 'diagnosis-card empty';
    diagEl.innerHTML = `<div class="diag-placeholder">请在上方九宫格滑动，或点击右侧推荐卡片预览姿势</div>`;
    similarSec.classList.add('hidden');
    return;
  }

  const seq = nodes.join('');
  const arrowStr = nodes.join(' → ');

  if (nodes.length < 4) {
    diagEl.className = 'diagnosis-card';
    diagEl.innerHTML = `
      <div class="diag-top">
        <span class="diag-seq">${arrowStr}</span>
        <span class="tag">长度不足 (${nodes.length}/4点)</span>
      </div>
      <div class="diag-alert info">九宫格解锁至少需要连接 <strong>4 个点</strong>，请继续滑动连接。</div>
    `;
    similarSec.classList.add('hidden');
    return;
  }

  const triedRecord = state.triedMap.get(seq);
  const evalInfo = evaluatePattern(nodes);

  const tagsHtml = evalInfo.tags
    .map((t) => `<span class="tag ${t.type}">${t.text}</span>`)
    .join('');

  if (triedRecord) {
    const triedIndex = state.triedList.findIndex((x) => x.seq === seq) + 1;
    const timeStr = new Date(triedRecord.time).toLocaleTimeString();
    const fb = triedRecord.feedback || (triedRecord.starred ? 'like' : 'tried');
    const fbLabel =
      fb === 'like'
        ? '⭐ 手感像'
        : fb === 'unlike'
        ? '🚫 不像'
        : '✓ 试验过了';

    diagEl.className = 'diagnosis-card already-tried';
    diagEl.innerHTML = `
      <div class="diag-top">
        <span class="diag-seq">${arrowStr}</span>
        <span class="diag-score-badge">可能度 ${evalInfo.displayScore}</span>
      </div>
      <div class="diag-alert warn">
        ⚠️ 第 <strong>#${triedIndex}</strong> 次已记录为【${fbLabel}】(${timeStr})！可随时切换等级：
      </div>
      <div class="diag-tags">${tagsHtml}</div>
      <div class="diag-actions">
        <button class="btn btn-tried btn-sm ${fb === 'tried' ? 'active' : ''}" onclick="setPatternFeedback('${seq}', 'tried')">
          ✓ 试验过了
        </button>
        <button class="btn btn-star btn-sm ${fb === 'like' ? 'active' : ''}" onclick="setPatternFeedback('${seq}', 'like')">
          ⭐ 手感像
        </button>
        <button class="btn btn-danger btn-sm ${fb === 'unlike' ? 'active' : ''}" onclick="setPatternFeedback('${seq}', 'unlike')">
          🚫 不像
        </button>
        <button class="btn btn-ghost btn-sm btn-full" onclick="removeTried('${seq}')">
          ↩️ 撤销此条记录
        </button>
      </div>
    `;
  } else {
    diagEl.className = 'diagnosis-card fresh-valid';
    diagEl.innerHTML = `
      <div class="diag-top">
        <span class="diag-seq">${arrowStr}</span>
        <span class="diag-score-badge">推荐分 ${evalInfo.displayScore}</span>
      </div>
      <div class="diag-alert info">
        ✅ <strong>尚未试过</strong>（共 ${nodes.length} 个点）。请选择试锁反馈等级：
      </div>
      <div class="diag-tags">${tagsHtml}</div>
      <div class="diag-actions">
        <button class="btn btn-tried btn-sm" onclick="setPatternFeedback('${seq}', 'tried')" title="普通试过了不对，仅排除该姿势">
          ✓ 试验过了
        </button>
        <button class="btn btn-star btn-sm" onclick="setPatternFeedback('${seq}', 'like')" title="虽然不对，但手势走向很有感觉！加权相似变体">
          ⭐ 手感像
        </button>
        <button class="btn btn-danger btn-sm" onclick="setPatternFeedback('${seq}', 'unlike')" title="完全不像！自动压低相似走向的排名">
          🚫 不像
        </button>
        <button class="btn btn-success btn-sm btn-full" onclick="markPatternSolved('${seq}')">
          🎉 密码正确！成功解锁手机！
        </button>
      </div>
    `;
  }

  // 计算与当前手势最接近的 6 个未试变体
  const neighbors = getSimilarUntriedPatterns(nodes, 6);
  if (neighbors.length > 0) {
    similarSec.classList.remove('hidden');
    similarGrid.innerHTML = neighbors
      .map(
        (nb) => `
        <div class="sim-mini-card" onclick="loadPatternToPad('${nb.seq}')">
          <div class="sim-mini-seq">${nb.seq}</div>
          <div class="sim-mini-reason">${nb.reason}</div>
        </div>
      `
      )
      .join('');
  } else {
    similarSec.classList.add('hidden');
  }
}

/**
 * 寻找与指定手势最相似的未试变体（用于画板下方联想）
 */
function getSimilarUntriedPatterns(baseNodes, count = 6) {
  const baseSeq = baseNodes.join('');
  const pool = [];

  for (const item of state.recommendations) {
    if (item.seq === baseSeq) continue;
    const sim = computeMuscleSimilarity(item.nodes, baseNodes);
    if (sim.bonus >= 12) {
      pool.push({
        seq: item.seq,
        score: sim.bonus + item.rawScore * 0.25,
        reason: sim.reason || '相近变体',
      });
    }
  }

  pool.sort((a, b) => b.score - a.score);
  return pool.slice(0, count);
}

// ==================== 7. 记录操作 (标记已试 / 手感接近 / 撤销 / 成功) ====================

window.loadPatternToPad = function (seqStr, autoAnimate = false) {
  const nodes = normalizePattern(seqStr.split('').map(Number));
  state.currentPadNodes = nodes;
  if (autoAnimate) {
    animatePatternOnPad(nodes);
  } else {
    renderPadState();
  }
};

/**
 * 设置手势的三档反馈等级:
 * - 'tried': ✓ 试验过了（普通排除，不产生正负偏置）
 * - 'like':  ⭐ 手感像（正向加权相似变体）
 * - 'unlike': 🚫 不像（负向降权相似变体）
 */
window.setPatternFeedback = function (seqStr, feedback = 'tried') {
  const nodes = normalizePattern(seqStr.split('').map(Number));
  if (nodes.length < 4) return;
  const seq = nodes.join('');

  if (state.triedMap.has(seq)) {
    const existing = state.triedMap.get(seq);
    existing.feedback = feedback;
    existing.starred = feedback === 'like';
  } else {
    const record = {
      seq,
      nodes,
      time: Date.now(),
      feedback,
      starred: feedback === 'like',
    };
    state.triedList.push(record);
    state.triedMap.set(seq, record);
  }

  saveStateToStorage();
  recomputeRecommendations();
  renderPadState();
};

window.markPatternTried = function (seqStr, isStarred = false) {
  window.setPatternFeedback(seqStr, isStarred ? 'like' : 'tried');
};

window.toggleStarred = function (seq) {
  const item = state.triedMap.get(seq);
  if (!item) return;
  const nextFb = item.feedback === 'like' ? 'tried' : 'like';
  window.setPatternFeedback(seq, nextFb);
};

window.removeTried = function (seq) {
  if (!state.triedMap.has(seq)) return;
  state.triedMap.delete(seq);
  state.triedList = state.triedList.filter((x) => x.seq !== seq);
  saveStateToStorage();
  recomputeRecommendations();
  renderPadState();
};

window.markPatternSolved = function (seq) {
  state.solvedSeq = seq;
  saveStateToStorage();
  renderAll();
};

// ==================== 8. 记忆筛选器交互初始化 ====================

function initFilterSelectors() {
  const startContainer = document.getElementById('startNodeSelector');
  const endContainer = document.getElementById('endNodeSelector');
  const stateContainer = document.getElementById('nodeStateSelector');

  startContainer.innerHTML = '';
  endContainer.innerHTML = '';
  stateContainer.innerHTML = '';

  const POS_SHORT_NAMES = {
    1: '左上', 2: '上中', 3: '右上',
    4: '左中', 5: '中心', 6: '右中',
    7: '左下', 8: '下中', 9: '右下',
  };

  for (let n = 1; n <= 9; n++) {
    // 起点按钮 (3x3 空间方位)
    const sBtn = document.createElement('button');
    sBtn.className = 'node-pill-btn';
    sBtn.innerHTML = `<span>${n}</span><small>${POS_SHORT_NAMES[n]}</small>`;
    sBtn.dataset.node = n;
    sBtn.addEventListener('click', () => {
      if (state.filters.startNodes.has(n)) {
        state.filters.startNodes.delete(n);
      } else {
        state.filters.startNodes.add(n);
      }
      syncFilterUI();
      recomputeRecommendations();
    });
    startContainer.appendChild(sBtn);

    // 终点按钮 (3x3 空间方位)
    const eBtn = document.createElement('button');
    eBtn.className = 'node-pill-btn';
    eBtn.innerHTML = `<span>${n}</span><small>${POS_SHORT_NAMES[n]}</small>`;
    eBtn.dataset.node = n;
    eBtn.addEventListener('click', () => {
      if (state.filters.endNodes.has(n)) {
        state.filters.endNodes.delete(n);
      } else {
        state.filters.endNodes.add(n);
      }
      syncFilterUI();
      recomputeRecommendations();
    });
    endContainer.appendChild(eBtn);

    // 必经/排除三态按钮
    const stBtn = document.createElement('button');
    stBtn.className = 'node-state-btn';
    stBtn.dataset.node = n;
    stBtn.addEventListener('click', () => {
      const cur = state.filters.nodeStates[n];
      const next = cur === 'neutral' ? 'include' : cur === 'include' ? 'exclude' : 'neutral';
      state.filters.nodeStates[n] = next;
      syncFilterUI();
      recomputeRecommendations();
    });
    stateContainer.appendChild(stBtn);
  }

  // 起点快捷预设
  document.querySelectorAll('[data-preset-start]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const val = btn.getAttribute('data-preset-start');
      state.filters.startNodes.clear();
      if (val !== 'clear') {
        val.split(',').forEach((x) => state.filters.startNodes.add(Number(x)));
      }
      syncFilterUI();
      recomputeRecommendations();
    });
  });

  // 终点快捷预设
  document.querySelectorAll('[data-preset-end]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const val = btn.getAttribute('data-preset-end');
      state.filters.endNodes.clear();
      if (val !== 'clear') {
        val.split(',').forEach((x) => state.filters.endNodes.add(Number(x)));
      }
      syncFilterUI();
      recomputeRecommendations();
    });
  });

  // 长度快捷预设
  document.querySelectorAll('[data-len-preset]').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-len-preset]').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      const [minL, maxL] = btn.getAttribute('data-len-preset').split('-').map(Number);
      state.filters.lengths.clear();
      for (let l = minL; l <= maxL; l++) state.filters.lengths.add(l);
      syncFilterUI();
      recomputeRecommendations();
    });
  });

  // 长度复选框
  document.querySelectorAll('#lengthSelector input[type="checkbox"]').forEach((cb) => {
    cb.addEventListener('change', () => {
      const l = Number(cb.value);
      if (cb.checked) state.filters.lengths.add(l);
      else state.filters.lengths.delete(l);
      recomputeRecommendations();
    });
  });

  // 局部连线输入
  document.getElementById('subpathInput').addEventListener('input', (e) => {
    const raw = e.target.value.trim();
    if (!raw) {
      state.filters.subpaths = [];
    } else {
      state.filters.subpaths = raw
        .split(/[,，\s]+/)
        .map((s) => s.replace(/[^1-9]/g, ''))
        .filter((s) => s.length >= 2);
    }
    recomputeRecommendations();
  });

  // 形状与惯用手下拉框
  document.getElementById('shapeFilterSelect').addEventListener('change', (e) => {
    state.filters.shapeMode = e.target.value;
    recomputeRecommendations();
  });

  document.getElementById('handHabitSelect').addEventListener('change', (e) => {
    state.filters.handHabit = e.target.value;
    recomputeRecommendations();
  });

  // 重置筛选按钮
  document.getElementById('btnResetFilters').addEventListener('click', () => {
    state.filters.startNodes.clear();
    state.filters.endNodes.clear();
    for (let n = 1; n <= 9; n++) state.filters.nodeStates[n] = 'neutral';
    state.filters.lengths = new Set([4, 5, 6]);
    state.filters.subpaths = [];
    state.filters.shapeMode = 'all';
    state.filters.handHabit = 'standard';

    document.getElementById('subpathInput').value = '';
    document.getElementById('shapeFilterSelect').value = 'all';
    document.getElementById('handHabitSelect').value = 'standard';
    syncFilterUI();
    recomputeRecommendations();
  });

  syncFilterUI();
}

function syncFilterUI() {
  // 起点按钮状态
  document.querySelectorAll('#startNodeSelector .node-pill-btn').forEach((btn) => {
    const n = Number(btn.dataset.node);
    btn.classList.toggle('selected-start', state.filters.startNodes.has(n));
  });

  // 终点按钮状态
  document.querySelectorAll('#endNodeSelector .node-pill-btn').forEach((btn) => {
    const n = Number(btn.dataset.node);
    btn.classList.toggle('selected-end', state.filters.endNodes.has(n));
  });

  // 必经/排除矩阵状态
  document.querySelectorAll('#nodeStateSelector .node-state-btn').forEach((btn) => {
    const n = Number(btn.dataset.node);
    const st = state.filters.nodeStates[n];
    btn.className = `node-state-btn ${st === 'neutral' ? '' : st}`;
    const statusLabel = st === 'include' ? '✓ 必经' : st === 'exclude' ? '✕ 排除' : '不限';
    btn.innerHTML = `<span>${n}号点</span><span>${statusLabel}</span>`;
  });

  // 长度复选框状态
  document.querySelectorAll('#lengthSelector input[type="checkbox"]').forEach((cb) => {
    cb.checked = state.filters.lengths.has(Number(cb.value));
  });
}

// ==================== 9. 列表渲染 (推荐卡片 & 历史记录) ====================

function renderAll() {
  // 顶部统计栏 (三档反馈各自统计)
  const triedOnlyCount = state.triedList.filter((x) => (x.feedback || 'tried') === 'tried').length;
  const likeCount = state.triedList.filter((x) => x.feedback === 'like' || x.starred).length;
  const unlikeCount = state.triedList.filter((x) => x.feedback === 'unlike').length;

  document.getElementById('statTriedCount').textContent = triedOnlyCount;
  document.getElementById('statStarredCount').textContent = likeCount;
  const unlikeEl = document.getElementById('statUnlikeCount');
  if (unlikeEl) unlikeEl.textContent = unlikeCount;
  document.getElementById('statCandidateCount').textContent = state.recommendations.length;

  document.getElementById('tabRecBadge').textContent = state.recommendations.length;
  document.getElementById('tabHistBadge').textContent = state.triedList.length;

  // 解锁成功横幅
  const solvedBanner = document.getElementById('solvedBanner');
  if (state.solvedSeq) {
    solvedBanner.classList.remove('hidden');
    document.getElementById('solvedPatternText').textContent = state.solvedSeq
      .split('')
      .join(' → ');
  } else {
    solvedBanner.classList.add('hidden');
  }

  renderRecommendList();
  renderHistoryList();
}

function renderRecommendList() {
  const container = document.getElementById('recommendList');
  const total = state.recommendations.length;
  const totalPages = Math.max(1, Math.ceil(total / state.pageSize));
  if (state.currentPage > totalPages) state.currentPage = totalPages;

  const startIdx = (state.currentPage - 1) * state.pageSize;
  const pageItems = state.recommendations.slice(startIdx, startIdx + state.pageSize);

  document.getElementById('pageInfoText').textContent = `第 ${state.currentPage} / ${totalPages} 页（共 ${total} 个候选）`;
  document.getElementById('btnPrevPage').disabled = state.currentPage <= 1;
  document.getElementById('btnNextPage').disabled = state.currentPage >= totalPages;

  if (pageItems.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 40px 20px; color: var(--text-muted);">
        没有找到符合当前筛选条件的未试手势。请尝试放宽左侧的【记忆线索与习惯筛选】条件。
      </div>
    `;
    return;
  }

  container.innerHTML = pageItems
    .map((item, idx) => {
      const globalRank = startIdx + idx + 1;
      const isTop5Batch = globalRank <= 5;
      const tagsHtml = item.tags
        .map((t) => `<span class="tag ${t.type}">${t.text}</span>`)
        .join('');

      return `
        <div class="pattern-card ${isTop5Batch ? 'top-batch' : ''}">
          ${isTop5Batch ? `<span class="card-batch-ribbon">本轮优先 #${globalRank}</span>` : `<span class="card-batch-ribbon normal-rank">#${globalRank}</span>`}
          <div class="card-rank-score">
            <span class="score-pill">${item.displayScore}分</span>
          </div>
          <div class="card-svg-wrap" onclick="loadPatternToPad('${item.seq}', true)" title="点击在左侧大画板动态演示滑法">
            ${createMiniPatternSvg(item.nodes, 94)}
          </div>
          <div class="card-seq-title">${item.nodes.join(' - ')}</div>
          <div class="card-tags">${tagsHtml}</div>
          <div class="card-actions">
            <button class="btn btn-tried btn-xs" onclick="setPatternFeedback('${item.seq}', 'tried')" title="试验过了（普通排除，不加减周围权重）">
              ✓ 试过
            </button>
            <button class="btn btn-star btn-xs" onclick="setPatternFeedback('${item.seq}', 'like')" title="手感像！（加权推荐相似、平移、换尾变体）">
              ⭐ 像
            </button>
            <button class="btn btn-danger btn-xs" onclick="setPatternFeedback('${item.seq}', 'unlike')" title="完全不像！（自动压低相似图形排名）">
              🚫 不像
            </button>
            <button class="btn btn-success btn-xs" onclick="markPatternSolved('${item.seq}')" title="解锁成功！">
              🎉
            </button>
          </div>
        </div>
      `;
    })
    .join('');
}

function renderHistoryList() {
  const container = document.getElementById('historyList');
  const searchVal = document.getElementById('historySearchInput').value.trim();
  const filterMode = document.getElementById('historyFilterSelect').value;

  const list = state.triedList
    .map((item, index) => ({
      ...item,
      feedback: item.feedback || (item.starred ? 'like' : 'tried'),
      attemptNo: index + 1,
    }))
    .filter((item) => {
      if (filterMode === 'like' && item.feedback !== 'like') return false;
      if (filterMode === 'tried' && item.feedback !== 'tried') return false;
      if (filterMode === 'unlike' && item.feedback !== 'unlike') return false;
      if (searchVal && !item.seq.includes(searchVal)) return false;
      return true;
    })
    .reverse(); // 最新试过的排在最上面

  if (list.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 36px 20px; color: var(--text-muted);">
        暂无匹配的记录。在左侧画板滑出手势，或点击推荐卡片上的【✓ 试过 / ⭐ 像 / 🚫 不像】即可记录。
      </div>
    `;
    return;
  }

  container.innerHTML = list
    .map((item) => {
      const timeStr = new Date(item.time).toLocaleString();
      const fb = item.feedback;
      const itemClass =
        fb === 'like' ? 'starred-item' : fb === 'unlike' ? 'unlike-item' : 'tried-item';
      const badgeHtml =
        fb === 'like'
          ? '<span class="tag similarity">⭐ 手感像</span>'
          : fb === 'unlike'
          ? '<span class="tag penalty">🚫 不像</span>'
          : '<span class="tag">✓ 试验过了</span>';

      return `
        <div class="history-item ${itemClass}">
          <div class="history-left">
            <span class="history-index">#${item.attemptNo}</span>
            <div onclick="loadPatternToPad('${item.seq}', true)" style="cursor:pointer" title="点击演示">
              ${createMiniPatternSvg(item.nodes, 56)}
            </div>
            <div>
              <div class="history-seq">${item.nodes.join(' → ')} ${badgeHtml}</div>
              <div class="history-meta">记录时间：${timeStr} · 共 ${item.nodes.length} 点</div>
            </div>
          </div>
          <div class="history-actions">
            <button class="btn btn-tried btn-xs ${fb === 'tried' ? 'active' : ''}" onclick="setPatternFeedback('${item.seq}', 'tried')">
              ✓ 试验过了
            </button>
            <button class="btn btn-star btn-xs ${fb === 'like' ? 'active' : ''}" onclick="setPatternFeedback('${item.seq}', 'like')">
              ⭐ 手感像
            </button>
            <button class="btn btn-danger btn-xs ${fb === 'unlike' ? 'active' : ''}" onclick="setPatternFeedback('${item.seq}', 'unlike')">
              🚫 不像
            </button>
            <button class="btn btn-ghost btn-xs" onclick="loadPatternToPad('${item.seq}', true)">
              ▶️ 演示
            </button>
            <button class="btn btn-danger-ghost btn-xs" onclick="removeTried('${item.seq}')">
              删除
            </button>
          </div>
        </div>
      `;
    })
    .join('');
}

// ==================== 10. 工具栏、分页、倒计时与导入导出绑定 ====================

function initToolbarEvents() {
  // 手动输入数字序列框
  document.getElementById('manualSeqInput').addEventListener('input', (e) => {
    const cleaned = e.target.value.replace(/[^1-9]/g, '');
    const normalized = normalizePattern(cleaned.split('').map(Number));
    state.currentPadNodes = normalized;
    renderPadState();
  });

  // 演示与清空画板
  document.getElementById('btnReplayCurrent').addEventListener('click', () => {
    animatePatternOnPad(state.currentPadNodes.slice());
  });

  document.getElementById('btnClearPad').addEventListener('click', () => {
    state.currentPadNodes = [];
    renderPadState();
  });

  // Tab 切换
  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      const tab = btn.getAttribute('data-tab');
      document.getElementById('tabRecommendView').classList.toggle('hidden', tab !== 'recommend');
      document.getElementById('tabHistoryView').classList.toggle('hidden', tab !== 'history');
    });
  });

  // 一键将当前前 5 个全部标为「试验过了」
  document.getElementById('btnMarkTop5Tried').addEventListener('click', () => {
    const top5 = state.recommendations.slice(0, 5);
    if (top5.length === 0) return;
    const now = Date.now();
    top5.forEach((item, idx) => {
      if (!state.triedMap.has(item.seq)) {
        const record = {
          seq: item.seq,
          nodes: item.nodes,
          time: now + idx,
          feedback: 'tried',
          starred: false,
        };
        state.triedList.push(record);
        state.triedMap.set(item.seq, record);
      }
    });
    saveStateToStorage();
    recomputeRecommendations();
    renderPadState();
    // 自动启动 30 秒手机冷却倒计时提醒
    startCooldownTimer(30);
  });

  // 分页按钮
  document.getElementById('btnPrevPage').addEventListener('click', () => {
    if (state.currentPage > 1) {
      state.currentPage--;
      renderRecommendList();
    }
  });
  document.getElementById('btnNextPage').addEventListener('click', () => {
    const totalPages = Math.ceil(state.recommendations.length / state.pageSize);
    if (state.currentPage < totalPages) {
      state.currentPage++;
      renderRecommendList();
    }
  });

  // 历史记录搜索与筛选
  document.getElementById('historySearchInput').addEventListener('input', renderHistoryList);
  document.getElementById('historyFilterSelect').addEventListener('change', renderHistoryList);

  // 30秒手机冷却倒计时
  document.getElementById('btnStartTimer').addEventListener('click', () => {
    startCooldownTimer(30);
  });

  // 解锁成功横幅关闭
  document.getElementById('btnClearSolved').addEventListener('click', () => {
    state.solvedSeq = null;
    saveStateToStorage();
    renderAll();
  });

  // 导出备份 JSON
  document.getElementById('btnExport').addEventListener('click', () => {
    const dataStr = JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        triedList: state.triedList,
        solvedSeq: state.solvedSeq,
      },
      null,
      2
    );
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `九宫格已试记录_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  });

  // 导入备份 JSON
  document.getElementById('inputImport').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target.result);
        if (Array.isArray(parsed.triedList)) {
          state.triedList = parsed.triedList.map(normalizeRecordItem);
          state.triedMap.clear();
          state.triedList.forEach((item) => state.triedMap.set(item.seq, item));
          state.solvedSeq = parsed.solvedSeq || null;
          saveStateToStorage();
          recomputeRecommendations();
          renderPadState();
        }
      } catch (err) {
        alert('导入失败：JSON 文件格式不正确');
      }
    };
    reader.readAsText(file);
  });

  // 清空所有记录
  document.getElementById('btnResetAll').addEventListener('click', () => {
    if (state.triedList.length === 0 && !state.solvedSeq) return;
    if (confirm(`确定要清空全部 ${state.triedList.length} 条已试记录吗？此操作不可恢复。`)) {
      state.triedList = [];
      state.triedMap.clear();
      state.solvedSeq = null;
      saveStateToStorage();
      recomputeRecommendations();
      renderPadState();
    }
  });
}

function startCooldownTimer(seconds = 30) {
  const display = document.getElementById('timerDisplay');
  if (state.cooldownTimerId) clearInterval(state.cooldownTimerId);

  state.cooldownRemaining = seconds;
  display.classList.remove('hidden');
  display.textContent = `⏳ 冷却 ${state.cooldownRemaining}s`;

  state.cooldownTimerId = setInterval(() => {
    state.cooldownRemaining--;
    if (state.cooldownRemaining <= 0) {
      clearInterval(state.cooldownTimerId);
      state.cooldownTimerId = null;
      display.textContent = '✅ 可继续试锁';
      setTimeout(() => {
        if (!state.cooldownTimerId) display.classList.add('hidden');
      }, 4000);
    } else {
      display.textContent = `⏳ 冷却 ${state.cooldownRemaining}s`;
    }
  }, 1000);
}

function applyDemoModeIfRequested() {
  const params = new URLSearchParams(window.location.search);
  const demo = params.get('demo');
  if (!demo) return;

  const now = Date.now();
  const sampleRecords = [
    { seq: '1478', nodes: [1, 4, 7, 8], time: now - 360000, feedback: 'like', starred: true },
    { seq: '12369', nodes: [1, 2, 3, 6, 9], time: now - 240000, feedback: 'tried', starred: false },
    { seq: '74159', nodes: [7, 4, 1, 5, 9], time: now - 180000, feedback: 'unlike', starred: false },
    { seq: '14589', nodes: [1, 4, 5, 8, 9], time: now - 90000, feedback: 'like', starred: true },
  ];

  state.triedList = sampleRecords;
  state.triedMap.clear();
  sampleRecords.forEach((r) => state.triedMap.set(r.seq, r));

  if (demo === 'overview') {
    state.filters.startNodes.add(1);
    state.filters.startNodes.add(2);
    syncFilterUI();
    recomputeRecommendations();
    state.currentPadNodes = [1, 2, 3, 5, 7, 8, 9];
    renderPadState();
  } else if (demo === 'history') {
    recomputeRecommendations();
    state.currentPadNodes = [1, 4, 7, 8];
    renderPadState();
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach((b) => b.classList.toggle('active', b.getAttribute('data-tab') === 'history'));
    document.getElementById('tabRecommendView').classList.add('hidden');
    document.getElementById('tabHistoryView').classList.remove('hidden');
  }
}

// ==================== 11. 启动应用 ====================
window.addEventListener('DOMContentLoaded', () => {
  loadStateFromStorage();
  initLockPad();
  initFilterSelectors();
  initToolbarEvents();
  recomputeRecommendations();
  applyDemoModeIfRequested();
});
