import kaplay from "kaplay";
import "kaplay/global";

// 初始化游戏
kaplay({
  width: window.innerWidth,
  height: window.innerHeight,
  background: [20, 20, 50], // 深蓝色夜空
  stretch: true,
  letterbox: false,
});

// ==========================================
// 🌟 接星星游戏
// 用键盘左右方向键移动篮子，接住掉落的星星！
// 每关需要收集一定数量的星星才能进入下一关
// ==========================================

// 创建玩家（篮子）
const player = add([
  rect(100, 20),
  pos(width() / 2, height() - 40),
  anchor("center"),
  color(255, 200, 100),
  area(),
  "player",
]);

// 游戏状态
let score = 0;
let level = 1;
let levelScore = 0; // 当前关卡已获得的分数
let gameOver = false;

// 篮子大小
const BASE_WIDTH = 100;
const MIN_WIDTH = 50;
const MAX_WIDTH = 200;
let currentWidth = BASE_WIDTH;

// 关卡配置
function getLevelConfig(lv: number) {
  return {
    targetScore: 10 + (lv - 1) * 5, // 过关所需分数：10, 15, 20, 25...
    starInterval: Math.max(0.3, 0.8 - (lv - 1) * 0.08), // 星星生成间隔越来越短
    starSpeedMin: 150 + (lv - 1) * 30, // 星星最小速度
    starSpeedMax: 280 + (lv - 1) * 40, // 星星最大速度
    bigStarInterval: Math.max(1.5, 3 - (lv - 1) * 0.3), // 大星星间隔
    bombInterval: Math.max(0.6, 1.5 - (lv - 1) * 0.15), // 炸弹生成间隔越来越短
    bombSpeedMin: 180 + (lv - 1) * 25,
    bombSpeedMax: 300 + (lv - 1) * 35,
  };
}

let currentConfig = getLevelConfig(level);

// 显示分数
const scoreText = add([
  text(`分数: ${score}`, { size: 28 }),
  pos(20, 20),
  color(255, 255, 255),
]);

// 显示关卡
const levelText = add([
  text(`第 ${level} 关`, { size: 32 }),
  pos(width() / 2, 30),
  anchor("center"),
  color(255, 220, 100),
]);

// 显示关卡进度
const progressText = add([
  text(`进度: ${levelScore}/${currentConfig.targetScore}`, { size: 22 }),
  pos(width() - 20, 20),
  anchor("topright"),
  color(200, 200, 255),
]);

// 显示提示
add([
  text("← → 移动篮子", { size: 18 }),
  pos(20, height() - 40),
  color(150, 150, 150),
]);

// 玩家移动速度
const PLAYER_SPEED = 400;

// 加速下落
let speedMultiplier = 1;

onKeyDown("up", () => {
  speedMultiplier = 3;
});

onKeyDown("w", () => {
  speedMultiplier = 3;
});

onKeyRelease("up", () => {
  speedMultiplier = 1;
});

onKeyRelease("w", () => {
  speedMultiplier = 1;
});

// 每帧更新所有掉落物的速度
onUpdate(() => {
  if (speedMultiplier > 1) {
    const tags = ["star", "bigstar", "bomb", "powerup", "powerdown"];
    for (const tag of tags) {
      get(tag).forEach((obj) => {
        obj.pos.y += (speedMultiplier - 1) * 200 * dt();
      });
    }
  }
});

// 键盘控制 - 按住左右键移动
onKeyDown("left", () => {
  player.pos.x -= PLAYER_SPEED * dt();
  if (player.pos.x < 50) player.pos.x = 50;
});

onKeyDown("right", () => {
  player.pos.x += PLAYER_SPEED * dt();
  if (player.pos.x > width() - 50) player.pos.x = width() - 50;
});

onKeyDown("a", () => {
  player.pos.x -= PLAYER_SPEED * dt();
  if (player.pos.x < 50) player.pos.x = 50;
});

onKeyDown("d", () => {
  player.pos.x += PLAYER_SPEED * dt();
  if (player.pos.x > width() - 50) player.pos.x = width() - 50;
});

// 改变篮子大小
function changePlayerWidth(delta: number) {
  currentWidth = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, currentWidth + delta));
  player.width = currentWidth;
}

// 存储定时器引用，用于关卡切换时重置
let starLoop: ReturnType<typeof loop>;
let bigStarLoop: ReturnType<typeof loop>;
let bombLoop: ReturnType<typeof loop>;
let powerUpLoop: ReturnType<typeof loop>;
let powerDownLoop: ReturnType<typeof loop>;

// 启动生成循环
function startSpawners() {
  const config = currentConfig;

  // 生成普通星星
  starLoop = loop(config.starInterval, () => {
    if (gameOver) return;
    add([
      text("⭐", { size: 36 }),
      pos(rand(50, width() - 50), -20),
      anchor("center"),
      area({ scale: 0.8 }),
      move(DOWN, rand(config.starSpeedMin, config.starSpeedMax)),
      offscreen({ destroy: true }),
      "star",
    ]);
  });

  // 生成大星星
  bigStarLoop = loop(config.bigStarInterval, () => {
    if (gameOver) return;
    add([
      text("🌟", { size: 48 }),
      pos(rand(50, width() - 50), -20),
      anchor("center"),
      area({ scale: 0.8 }),
      move(DOWN, rand(config.starSpeedMin * 0.7, config.starSpeedMax * 0.7)),
      offscreen({ destroy: true }),
      "bigstar",
    ]);
  });

  // 生成炸弹
  bombLoop = loop(config.bombInterval, () => {
    if (gameOver) return;
    add([
      text("💣", { size: 56 }),
      pos(rand(50, width() - 50), -20),
      anchor("center"),
      area({ scale: 0.7 }),
      move(DOWN, rand(config.bombSpeedMin, config.bombSpeedMax)),
      offscreen({ destroy: true }),
      color(255, 50, 50),
      "bomb",
    ]);
  });

  // 生成增大道具（绿色药水）
  powerUpLoop = loop(4, () => {
    if (gameOver) return;
    add([
      text("🧪", { size: 40 }),
      pos(rand(50, width() - 50), -20),
      anchor("center"),
      area({ scale: 0.8 }),
      move(DOWN, rand(120, 200)),
      offscreen({ destroy: true }),
      color(100, 255, 100),
      "powerup",
    ]);
  });

  // 生成减小道具（紫色药水）
  powerDownLoop = loop(3, () => {
    if (gameOver) return;
    add([
      text("☠️", { size: 40 }),
      pos(rand(50, width() - 50), -20),
      anchor("center"),
      area({ scale: 0.8 }),
      move(DOWN, rand(150, 250)),
      offscreen({ destroy: true }),
      color(200, 100, 255),
      "powerdown",
    ]);
  });
}

// 停止生成循环
function stopSpawners() {
  if (starLoop) starLoop.cancel();
  if (bigStarLoop) bigStarLoop.cancel();
  if (bombLoop) bombLoop.cancel();
  if (powerUpLoop) powerUpLoop.cancel();
  if (powerDownLoop) powerDownLoop.cancel();
}

// 进入下一关
function nextLevel() {
  level++;
  levelScore = 0;
  currentConfig = getLevelConfig(level);

  // 更新UI
  levelText.text = `第 ${level} 关`;
  progressText.text = `进度: ${levelScore}/${currentConfig.targetScore}`;

  // 清除屏幕上的所有星星、炸弹和道具
  destroyAll("star");
  destroyAll("bigstar");
  destroyAll("bomb");
  destroyAll("powerup");
  destroyAll("powerdown");

  // 重新启动生成器
  stopSpawners();
  startSpawners();

  // 显示过关动画
  showLevelUp();
}

// 显示过关提示
function showLevelUp() {
  const levelUpText = add([
    text(`🎉 第 ${level} 关 🎉`, { size: 56 }),
    pos(width() / 2, height() / 2),
    anchor("center"),
    color(255, 220, 100),
    opacity(1),
    z(100),
  ]);

  const difficultyText = add([
    text("难度提升！", { size: 28 }),
    pos(width() / 2, height() / 2 + 50),
    anchor("center"),
    color(255, 150, 150),
    opacity(1),
    z(100),
  ]);

  // 动画效果
  shake(10);

  // 1.5秒后消失
  wait(1.5, () => {
    destroy(levelUpText);
    destroy(difficultyText);
  });
}

// 更新进度
function updateProgress() {
  progressText.text = `进度: ${levelScore}/${currentConfig.targetScore}`;

  // 检查是否过关
  if (levelScore >= currentConfig.targetScore) {
    nextLevel();
  }
}

// 接到普通星星
onCollide("player", "star", (_, star) => {
  const starPos = star.pos.clone();
  destroy(star);
  score += 1;
  levelScore += 1;
  scoreText.text = `分数: ${score}`;
  updateProgress();

  shake(3);

  add([
    text("+1", { size: 20 }),
    pos(starPos),
    anchor("center"),
    color(255, 255, 100),
    opacity(1),
    lifespan(0.5, { fade: 0.3 }),
    move(UP, 80),
  ]);
});

// 接到大星星
onCollide("player", "bigstar", (_, star) => {
  const starPos = star.pos.clone();
  destroy(star);
  score += 5;
  levelScore += 3;
  scoreText.text = `分数: ${score}`;
  updateProgress();

  shake(8);

  add([
    text("+5", { size: 32 }),
    pos(starPos),
    anchor("center"),
    color(255, 200, 50),
    opacity(1),
    lifespan(0.8, { fade: 0.4 }),
    move(UP, 100),
  ]);
});

// 碰到炸弹
onCollide("player", "bomb", (_, bomb) => {
  if (gameOver) return;

  const bombPos = bomb.pos.clone();
  destroy(bomb);
  score -= 10;
  levelScore = Math.max(0, levelScore - 5); // 关卡进度也扣分，但不会低于0
  scoreText.text = `分数: ${score}`;
  updateProgress();

  shake(20);

  add([
    text("-10", { size: 36 }),
    pos(bombPos),
    anchor("center"),
    color(255, 50, 50),
    opacity(1),
    lifespan(0.8, { fade: 0.4 }),
    move(UP, 100),
  ]);

  // 分数低于0，游戏结束
  if (score < 0) {
    gameOver = true;
    stopSpawners();
    showGameOver();
  }
});

// 接到增大道具
onCollide("player", "powerup", (_, item) => {
  const itemPos = item.pos.clone();
  destroy(item);
  changePlayerWidth(30);

  shake(5);

  add([
    text("篮子变大!", { size: 24 }),
    pos(itemPos),
    anchor("center"),
    color(100, 255, 100),
    opacity(1),
    lifespan(0.8, { fade: 0.4 }),
    move(UP, 80),
  ]);
});

// 接到减小道具
onCollide("player", "powerdown", (_, item) => {
  const itemPos = item.pos.clone();
  destroy(item);
  changePlayerWidth(-30);

  shake(8);

  add([
    text("篮子变小!", { size: 24 }),
    pos(itemPos),
    anchor("center"),
    color(200, 100, 255),
    opacity(1),
    lifespan(0.8, { fade: 0.4 }),
    move(UP, 80),
  ]);
});

// 游戏结束界面
function showGameOver() {
  // 半透明黑色背景
  add([
    rect(width(), height()),
    pos(0, 0),
    color(0, 0, 0),
    opacity(0.6),
    z(50),
  ]);

  // 游戏结束文字
  add([
    text("游戏结束", { size: 48 }),
    pos(width() / 2, height() / 2 - 80),
    anchor("center"),
    color(255, 80, 80),
    z(100),
  ]);

  // 显示最终成绩
  add([
    text(`最终成绩: 第 ${level} 关  总分 ${score}`, { size: 28 }),
    pos(width() / 2, height() / 2 - 20),
    anchor("center"),
    color(255, 220, 100),
    z(100),
  ]);

  // 提示重新开始
  add([
    text("点击重新开始", { size: 24 }),
    pos(width() / 2, height() / 2 + 40),
    anchor("center"),
    color(200, 200, 200),
    z(100),
  ]);

  // 点击重新开始
  onClick(() => {
    if (gameOver) {
      location.reload();
    }
  });
}

// 添加一些背景星星装饰
for (let i = 0; i < 50; i++) {
  add([
    text("·", { size: rand(8, 16) }),
    pos(rand(0, width()), rand(0, height() - 100)),
    color(100, 100, 150),
    opacity(rand(0.3, 0.8)),
  ]);
}

// 启动游戏
startSpawners();
