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

// 创建玩家（小飞机 - 正面朝上）
const player = add([
  polygon([vec2(0, -25), vec2(-20, 20), vec2(0, 10), vec2(20, 20)]),
  pos(width() / 2, height() - 50),
  anchor("center"),
  color(100, 200, 255),
  outline(2, rgb(255, 255, 255)),
  area({ scale: 0.7 }),
  "player",
]);

// 飞机装饰（驾驶舱）
const cockpit = add([
  circle(6),
  pos(player.pos.x, player.pos.y - 5),
  anchor("center"),
  color(255, 255, 200),
  z(1),
]);

// 飞机装饰跟随玩家
onUpdate(() => {
  cockpit.pos.x = player.pos.x;
  cockpit.pos.y = player.pos.y - 5;

  // 僚机跟随玩家
  if (wingmanActive) {
    if (leftWingman) {
      leftWingman.pos.x = player.pos.x - 50;
      leftWingman.pos.y = player.pos.y + 20;
    }
    if (rightWingman) {
      rightWingman.pos.x = player.pos.x + 50;
      rightWingman.pos.y = player.pos.y + 20;
    }
  }
});

// 游戏状态
let score = 0;
let level = 1;
let levelScore = 0; // 当前关卡已获得的分数
let gameOver = false;

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
    bugInterval: Math.max(1.5, 4 - (lv - 1) * 0.5), // 虫子间隔，高级关卡更频繁
    bugSpeed: 120 + (lv - 1) * 20, // 虫子追踪速度
    enemyInterval: Math.max(2, 5 - (lv - 1) * 0.5), // 敌机间隔，高级关卡更频繁
    enemySpeed: 80 + (lv - 1) * 15, // 敌机移动速度
    enemyFireRate: Math.max(0.8, 2 - (lv - 1) * 0.2), // 敌机射击间隔
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
  text("← → 移动  空格 射击", { size: 18 }),
  pos(20, height() - 40),
  color(150, 150, 150),
]);

// 玩家移动速度
const BASE_PLAYER_SPEED = 400;
let playerSpeedMultiplier = 1;
let speedBoostTimer: ReturnType<typeof wait> | null = null;

// 分数倍率
let scoreMultiplier = 1;
let scoreBoostTimer: ReturnType<typeof wait> | null = null;

// 散弹模式
let spreadShotActive = false;
let spreadShotTimer: ReturnType<typeof wait> | null = null;

// 僚机模式
let wingmanActive = false;
let wingmanTimer: ReturnType<typeof wait> | null = null;
let leftWingman: ReturnType<typeof add> | null = null;
let rightWingman: ReturnType<typeof add> | null = null;

// 加速下落
let speedMultiplier = 1;

// 无敌状态
let isInvincible = false;
let invincibleTimer: ReturnType<typeof wait> | null = null;

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
    const tags = ["star", "bigstar", "bomb", "sunflower", "speedup", "speeddown", "scoreboost", "spreadshot", "wingmanpowerup"];
    for (const tag of tags) {
      get(tag).forEach((obj) => {
        obj.pos.y += (speedMultiplier - 1) * 200 * dt();
      });
    }
  }
});

// 键盘控制 - 按住左右键移动
onKeyDown("left", () => {
  const speed = BASE_PLAYER_SPEED * playerSpeedMultiplier;
  player.pos.x -= speed * dt();
  if (player.pos.x < 50) player.pos.x = 50;
});

onKeyDown("right", () => {
  const speed = BASE_PLAYER_SPEED * playerSpeedMultiplier;
  player.pos.x += speed * dt();
  if (player.pos.x > width() - 50) player.pos.x = width() - 50;
});

onKeyDown("a", () => {
  const speed = BASE_PLAYER_SPEED * playerSpeedMultiplier;
  player.pos.x -= speed * dt();
  if (player.pos.x < 50) player.pos.x = 50;
});

onKeyDown("d", () => {
  const speed = BASE_PLAYER_SPEED * playerSpeedMultiplier;
  player.pos.x += speed * dt();
  if (player.pos.x > width() - 50) player.pos.x = width() - 50;
});

// 发射子弹
const BULLET_SPEED = 500;
const BULLET_COOLDOWN = 0.15; // 子弹冷却时间（按住连发）
let lastBulletTime = 0;

// 发射单颗子弹的辅助函数
function fireBullet(x: number, y: number, bulletColor: [number, number, number] = [255, 200, 50]) {
  if (spreadShotActive) {
    // 散弹模式：发射5颗子弹
    const angles = [-30, -15, 0, 15, 30];
    for (const angle of angles) {
      const rad = (angle * Math.PI) / 180;
      const dirX = Math.sin(rad);
      const dirY = -Math.cos(rad);
      const bullet = add([
        text("🔸", { size: 18 }),
        pos(x, y),
        anchor("center"),
        area({ scale: 0.8 }),
        offscreen({ destroy: true }),
        color(255, 100, 50),
        { dirX, dirY },
        "bullet",
      ]);
      bullet.onUpdate(() => {
        bullet.pos.x += bullet.dirX * BULLET_SPEED * dt();
        bullet.pos.y += bullet.dirY * BULLET_SPEED * dt();
      });
    }
  } else {
    // 普通模式：发射1颗子弹
    add([
      text("🔸", { size: 20 }),
      pos(x, y),
      anchor("center"),
      area({ scale: 0.8 }),
      move(UP, BULLET_SPEED),
      offscreen({ destroy: true }),
      color(...bulletColor),
      "bullet",
    ]);
  }
}

function shootBullet() {
  if (gameOver) return;

  const now = time();
  if (now - lastBulletTime < BULLET_COOLDOWN) return;
  lastBulletTime = now;

  // 玩家发射子弹
  fireBullet(player.pos.x, player.pos.y - 30);

  // 僚机发射子弹
  if (wingmanActive) {
    if (leftWingman) {
      fireBullet(leftWingman.pos.x, leftWingman.pos.y - 20, [100, 255, 200]);
    }
    if (rightWingman) {
      fireBullet(rightWingman.pos.x, rightWingman.pos.y - 20, [100, 255, 200]);
    }
  }
}

onKeyDown("space", () => {
  shootBullet();
});

// 子弹击中虫子
onCollide("bullet", "bug", (bullet, bug) => {
  const bugPos = bug.pos.clone();
  destroy(bullet);
  destroy(bug);

  shake(5);

  // 击杀虫子奖励1分
  score += 1 * scoreMultiplier;
  scoreText.text = `分数: ${score}`;

  add([
    text("+1", { size: 18 }),
    pos(bugPos),
    anchor("center"),
    color(100, 255, 100),
    opacity(1),
    lifespan(0.5, { fade: 0.3 }),
    move(UP, 60),
  ]);
});

// 子弹击中炸弹
onCollide("bullet", "bomb", (bullet, bomb) => {
  const bombPos = bomb.pos.clone();
  destroy(bullet);
  destroy(bomb);

  shake(15);

  // 爆炸效果
  add([
    text("💥", { size: 60 }),
    pos(bombPos),
    anchor("center"),
    opacity(1),
    lifespan(0.4, { fade: 0.2 }),
    scale(1),
  ]);

  // 击毁炸弹奖励2分
  const points = 2 * scoreMultiplier;
  score += points;
  scoreText.text = `分数: ${score}`;

  add([
    text(`+${points}`, { size: 20 }),
    pos(bombPos.x, bombPos.y - 30),
    anchor("center"),
    color(255, 200, 50),
    opacity(1),
    lifespan(0.5, { fade: 0.3 }),
    move(UP, 60),
  ]);
});

// 子弹击中敌机
onCollide("bullet", "enemy", (bullet, enemy) => {
  const enemyPos = enemy.pos.clone();
  destroy(bullet);
  destroy(enemy);

  shake(8);

  // 击杀敌机奖励3分
  const points = 3 * scoreMultiplier;
  score += points;
  levelScore += 1;
  scoreText.text = `分数: ${score}`;
  updateProgress();

  add([
    text(`+${points}`, { size: 22 }),
    pos(enemyPos),
    anchor("center"),
    color(255, 150, 50),
    opacity(1),
    lifespan(0.6, { fade: 0.3 }),
    move(UP, 80),
  ]);
});

// 敌人子弹击中玩家
onCollide("player", "enemybullet", (_, bullet) => {
  if (gameOver) return;

  const bulletPos = bullet.pos.clone();
  destroy(bullet);

  // 无敌状态下不受伤害
  if (isInvincible) {
    shake(3);
    add([
      text("免疫!", { size: 18 }),
      pos(bulletPos),
      anchor("center"),
      color(255, 220, 50),
      opacity(1),
      lifespan(0.4, { fade: 0.2 }),
      move(UP, 50),
    ]);
    return;
  }

  score -= 3;
  levelScore = Math.max(0, levelScore - 1);
  scoreText.text = `分数: ${score}`;
  updateProgress();

  shake(10);

  add([
    text("-3", { size: 24 }),
    pos(bulletPos),
    anchor("center"),
    color(255, 80, 80),
    opacity(1),
    lifespan(0.5, { fade: 0.3 }),
    move(UP, 60),
  ]);

  if (score < 0) {
    gameOver = true;
    stopSpawners();
    showGameOver();
  }
});

// 玩家与敌机相撞
onCollide("player", "enemy", (_, enemy) => {
  if (gameOver) return;

  const enemyPos = enemy.pos.clone();
  destroy(enemy);

  // 无敌状态下不受伤害
  if (isInvincible) {
    shake(5);
    add([
      text("免疫!", { size: 20 }),
      pos(enemyPos),
      anchor("center"),
      color(255, 220, 50),
      opacity(1),
      lifespan(0.5, { fade: 0.3 }),
      move(UP, 60),
    ]);
    return;
  }

  score -= 8;
  levelScore = Math.max(0, levelScore - 3);
  scoreText.text = `分数: ${score}`;
  updateProgress();

  shake(15);

  add([
    text("-8", { size: 28 }),
    pos(enemyPos),
    anchor("center"),
    color(255, 50, 50),
    opacity(1),
    lifespan(0.6, { fade: 0.3 }),
    move(UP, 80),
  ]);

  if (score < 0) {
    gameOver = true;
    stopSpawners();
    showGameOver();
  }
});

// 存储定时器引用，用于关卡切换时重置
let starLoop: ReturnType<typeof loop>;
let bigStarLoop: ReturnType<typeof loop>;
let bombLoop: ReturnType<typeof loop>;
let sunflowerLoop: ReturnType<typeof loop>;
let speedUpLoop: ReturnType<typeof loop>;
let speedDownLoop: ReturnType<typeof loop>;
let scoreBoostLoop: ReturnType<typeof loop>;
let bugLoop: ReturnType<typeof loop>;
let spreadShotLoop: ReturnType<typeof loop>;
let enemyLoop: ReturnType<typeof loop>;
let wingmanPowerupLoop: ReturnType<typeof loop>;

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

  // 生成向日葵道具（无敌+5倍下落速度）
  sunflowerLoop = loop(8, () => {
    if (gameOver) return;
    add([
      text("🌻", { size: 44 }),
      pos(rand(50, width() - 50), -20),
      anchor("center"),
      area({ scale: 0.8 }),
      move(DOWN, rand(100, 180)),
      offscreen({ destroy: true }),
      color(255, 220, 50),
      "sunflower",
    ]);
  });

  // 生成移动加速道具（闪电）
  speedUpLoop = loop(6, () => {
    if (gameOver) return;
    add([
      text("⚡", { size: 40 }),
      pos(rand(50, width() - 50), -20),
      anchor("center"),
      area({ scale: 0.8 }),
      move(DOWN, rand(130, 200)),
      offscreen({ destroy: true }),
      color(50, 200, 255),
      "speedup",
    ]);
  });

  // 生成移动减速道具（蜗牛）
  speedDownLoop = loop(5, () => {
    if (gameOver) return;
    add([
      text("🐌", { size: 40 }),
      pos(rand(50, width() - 50), -20),
      anchor("center"),
      area({ scale: 0.8 }),
      move(DOWN, rand(100, 160)),
      offscreen({ destroy: true }),
      color(150, 100, 80),
      "speeddown",
    ]);
  });

  // 生成分数加倍道具（钻石）
  scoreBoostLoop = loop(10, () => {
    if (gameOver) return;
    add([
      text("💎", { size: 42 }),
      pos(rand(50, width() - 50), -20),
      anchor("center"),
      area({ scale: 0.8 }),
      move(DOWN, rand(90, 150)),
      offscreen({ destroy: true }),
      color(100, 200, 255),
      "scoreboost",
    ]);
  });

  // 生成小虫子（会追踪玩家）
  bugLoop = loop(config.bugInterval, () => {
    if (gameOver) return;
    const bugSpeed = config.bugSpeed;
    const bug = add([
      text("🐛", { size: 36 }),
      pos(rand(50, width() - 50), -20),
      anchor("center"),
      area({ scale: 0.7 }),
      offscreen({ destroy: true }),
      color(100, 200, 100),
      { bugSpeed },
      "bug",
    ]);

    // 虫子追踪玩家的逻辑
    bug.onUpdate(() => {
      if (gameOver) return;
      const dir = player.pos.sub(bug.pos).unit();
      bug.pos = bug.pos.add(dir.scale(bug.bugSpeed * dt() * speedMultiplier));
    });
  });

  // 生成散弹道具（火箭）
  spreadShotLoop = loop(12, () => {
    if (gameOver) return;
    add([
      text("🚀", { size: 40 }),
      pos(rand(50, width() - 50), -20),
      anchor("center"),
      area({ scale: 0.8 }),
      move(DOWN, rand(80, 140)),
      offscreen({ destroy: true }),
      color(255, 100, 50),
      "spreadshot",
    ]);
  });

  // 生成僚机道具（星星徽章）
  wingmanPowerupLoop = loop(15, () => {
    if (gameOver) return;
    add([
      text("🎖️", { size: 42 }),
      pos(rand(50, width() - 50), -20),
      anchor("center"),
      area({ scale: 0.8 }),
      move(DOWN, rand(70, 120)),
      offscreen({ destroy: true }),
      color(255, 215, 0),
      "wingmanpowerup",
    ]);
  });

  // 生成敌人飞机
  enemyLoop = loop(config.enemyInterval, () => {
    if (gameOver) return;
    const enemySpeed = config.enemySpeed;
    const fireRate = config.enemyFireRate;
    const moveDir = rand(0, 1) > 0.5 ? 1 : -1; // 随机初始方向
    const horizontalSpeed = rand(50, 120); // 水平移动速度

    // 敌机（倒三角形，红色）
    const enemy = add([
      polygon([vec2(0, 20), vec2(-15, -15), vec2(0, -5), vec2(15, -15)]),
      pos(rand(80, width() - 80), -30),
      anchor("center"),
      color(255, 80, 80),
      outline(2, rgb(255, 200, 200)),
      area({ scale: 0.6 }),
      offscreen({ destroy: true }),
      { enemySpeed, lastFireTime: 0, fireRate, moveDir, horizontalSpeed },
      "enemy",
    ]);

    // 敌机移动和射击逻辑
    enemy.onUpdate(() => {
      if (gameOver) return;

      // 向下移动
      enemy.pos.y += enemy.enemySpeed * dt() * speedMultiplier;

      // 左右移动
      enemy.pos.x += enemy.moveDir * enemy.horizontalSpeed * dt();

      // 碰到边界就反弹
      if (enemy.pos.x <= 40) {
        enemy.pos.x = 40;
        enemy.moveDir = 1;
      } else if (enemy.pos.x >= width() - 40) {
        enemy.pos.x = width() - 40;
        enemy.moveDir = -1;
      }

      // 定期发射子弹
      const now = time();
      if (now - enemy.lastFireTime >= enemy.fireRate) {
        enemy.lastFireTime = now;

        // 发射敌人子弹
        add([
          circle(5),
          pos(enemy.pos.x, enemy.pos.y + 20),
          anchor("center"),
          color(255, 100, 100),
          area(),
          move(DOWN, 350),
          offscreen({ destroy: true }),
          "enemybullet",
        ]);
      }
    });
  });
}

// 停止生成循环
function stopSpawners() {
  if (starLoop) starLoop.cancel();
  if (bigStarLoop) bigStarLoop.cancel();
  if (bombLoop) bombLoop.cancel();
  if (sunflowerLoop) sunflowerLoop.cancel();
  if (speedUpLoop) speedUpLoop.cancel();
  if (speedDownLoop) speedDownLoop.cancel();
  if (scoreBoostLoop) scoreBoostLoop.cancel();
  if (bugLoop) bugLoop.cancel();
  if (spreadShotLoop) spreadShotLoop.cancel();
  if (enemyLoop) enemyLoop.cancel();
  if (wingmanPowerupLoop) wingmanPowerupLoop.cancel();
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
  destroyAll("sunflower");
  destroyAll("speedup");
  destroyAll("speeddown");
  destroyAll("scoreboost");
  destroyAll("bug");
  destroyAll("spreadshot");
  destroyAll("bullet");
  destroyAll("enemy");
  destroyAll("enemybullet");
  destroyAll("wingmanpowerup");

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
  const points = 1 * scoreMultiplier;
  score += points;
  levelScore += 1;
  scoreText.text = `分数: ${score}`;
  updateProgress();

  shake(3);

  add([
    text(`+${points}`, { size: 20 }),
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
  const points = 5 * scoreMultiplier;
  score += points;
  levelScore += 3;
  scoreText.text = `分数: ${score}`;
  updateProgress();

  shake(8);

  add([
    text(`+${points}`, { size: 32 }),
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

  // 无敌状态下不受伤害
  if (isInvincible) {
    shake(5);
    add([
      text("免疫!", { size: 24 }),
      pos(bombPos),
      anchor("center"),
      color(255, 220, 50),
      opacity(1),
      lifespan(0.5, { fade: 0.3 }),
      move(UP, 80),
    ]);
    return;
  }

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

// 接到向日葵道具
onCollide("player", "sunflower", (_, item) => {
  const itemPos = item.pos.clone();
  destroy(item);

  // 取消之前的无敌计时器
  if (invincibleTimer) {
    invincibleTimer.cancel();
  }

  // 激活无敌状态和5倍下落速度
  isInvincible = true;
  speedMultiplier = 5;

  // 玩家变成金色表示无敌
  player.color = rgb(255, 215, 0);

  shake(10);

  add([
    text("无敌 10秒!", { size: 28 }),
    pos(itemPos),
    anchor("center"),
    color(255, 220, 50),
    opacity(1),
    lifespan(1, { fade: 0.5 }),
    move(UP, 100),
  ]);

  // 10秒后取消无敌状态
  invincibleTimer = wait(10, () => {
    isInvincible = false;
    speedMultiplier = 1;
    player.color = rgb(100, 200, 255); // 恢复原来颜色
    invincibleTimer = null;

    add([
      text("无敌结束", { size: 24 }),
      pos(player.pos.x, player.pos.y - 40),
      anchor("center"),
      color(150, 150, 150),
      opacity(1),
      lifespan(0.8, { fade: 0.4 }),
      move(UP, 60),
    ]);
  });
});

// 接到移动加速道具
onCollide("player", "speedup", (_, item) => {
  const itemPos = item.pos.clone();
  destroy(item);

  // 取消之前的速度计时器
  if (speedBoostTimer) {
    speedBoostTimer.cancel();
  }

  playerSpeedMultiplier = 2;

  shake(5);

  add([
    text("速度提升!", { size: 24 }),
    pos(itemPos),
    anchor("center"),
    color(50, 200, 255),
    opacity(1),
    lifespan(0.8, { fade: 0.4 }),
    move(UP, 80),
  ]);

  // 8秒后恢复正常速度
  speedBoostTimer = wait(8, () => {
    playerSpeedMultiplier = 1;
    speedBoostTimer = null;

    add([
      text("速度恢复", { size: 20 }),
      pos(player.pos.x, player.pos.y - 40),
      anchor("center"),
      color(150, 150, 150),
      opacity(1),
      lifespan(0.6, { fade: 0.3 }),
      move(UP, 50),
    ]);
  });
});

// 接到移动减速道具
onCollide("player", "speeddown", (_, item) => {
  const itemPos = item.pos.clone();
  destroy(item);

  // 取消之前的速度计时器
  if (speedBoostTimer) {
    speedBoostTimer.cancel();
  }

  playerSpeedMultiplier = 0.5;

  shake(5);

  add([
    text("速度降低!", { size: 24 }),
    pos(itemPos),
    anchor("center"),
    color(150, 100, 80),
    opacity(1),
    lifespan(0.8, { fade: 0.4 }),
    move(UP, 80),
  ]);

  // 5秒后恢复正常速度
  speedBoostTimer = wait(5, () => {
    playerSpeedMultiplier = 1;
    speedBoostTimer = null;

    add([
      text("速度恢复", { size: 20 }),
      pos(player.pos.x, player.pos.y - 40),
      anchor("center"),
      color(150, 150, 150),
      opacity(1),
      lifespan(0.6, { fade: 0.3 }),
      move(UP, 50),
    ]);
  });
});

// 接到分数加倍道具
onCollide("player", "scoreboost", (_, item) => {
  const itemPos = item.pos.clone();
  destroy(item);

  // 取消之前的分数倍率计时器
  if (scoreBoostTimer) {
    scoreBoostTimer.cancel();
  }

  scoreMultiplier = 2;

  shake(8);

  add([
    text("分数2倍!", { size: 28 }),
    pos(itemPos),
    anchor("center"),
    color(100, 200, 255),
    opacity(1),
    lifespan(1, { fade: 0.5 }),
    move(UP, 100),
  ]);

  // 10秒后恢复正常倍率
  scoreBoostTimer = wait(10, () => {
    scoreMultiplier = 1;
    scoreBoostTimer = null;

    add([
      text("倍率结束", { size: 20 }),
      pos(player.pos.x, player.pos.y - 40),
      anchor("center"),
      color(150, 150, 150),
      opacity(1),
      lifespan(0.6, { fade: 0.3 }),
      move(UP, 50),
    ]);
  });
});

// 接到散弹道具
onCollide("player", "spreadshot", (_, item) => {
  const itemPos = item.pos.clone();
  destroy(item);

  // 取消之前的散弹计时器
  if (spreadShotTimer) {
    spreadShotTimer.cancel();
  }

  spreadShotActive = true;

  shake(8);

  add([
    text("散弹模式!", { size: 28 }),
    pos(itemPos),
    anchor("center"),
    color(255, 100, 50),
    opacity(1),
    lifespan(1, { fade: 0.5 }),
    move(UP, 100),
  ]);

  // 8秒后恢复普通模式
  spreadShotTimer = wait(8, () => {
    spreadShotActive = false;
    spreadShotTimer = null;

    add([
      text("散弹结束", { size: 20 }),
      pos(player.pos.x, player.pos.y - 40),
      anchor("center"),
      color(150, 150, 150),
      opacity(1),
      lifespan(0.6, { fade: 0.3 }),
      move(UP, 50),
    ]);
  });
});

// 接到僚机道具
onCollide("player", "wingmanpowerup", (_, item) => {
  const itemPos = item.pos.clone();
  destroy(item);

  // 取消之前的僚机计时器
  if (wingmanTimer) {
    wingmanTimer.cancel();
  }

  // 如果已有僚机，先销毁
  if (leftWingman) {
    destroy(leftWingman);
    leftWingman = null;
  }
  if (rightWingman) {
    destroy(rightWingman);
    rightWingman = null;
  }

  wingmanActive = true;

  // 创建左僚机
  leftWingman = add([
    polygon([vec2(0, -15), vec2(-12, 12), vec2(0, 6), vec2(12, 12)]),
    pos(player.pos.x - 50, player.pos.y + 20),
    anchor("center"),
    color(100, 255, 200),
    outline(2, rgb(200, 255, 230)),
    z(-1),
    "wingman",
  ]);

  // 创建右僚机
  rightWingman = add([
    polygon([vec2(0, -15), vec2(-12, 12), vec2(0, 6), vec2(12, 12)]),
    pos(player.pos.x + 50, player.pos.y + 20),
    anchor("center"),
    color(100, 255, 200),
    outline(2, rgb(200, 255, 230)),
    z(-1),
    "wingman",
  ]);

  shake(8);

  add([
    text("僚机支援!", { size: 28 }),
    pos(itemPos),
    anchor("center"),
    color(100, 255, 200),
    opacity(1),
    lifespan(1, { fade: 0.5 }),
    move(UP, 100),
  ]);

  // 12秒后僚机离开
  wingmanTimer = wait(12, () => {
    wingmanActive = false;
    wingmanTimer = null;

    if (leftWingman) {
      destroy(leftWingman);
      leftWingman = null;
    }
    if (rightWingman) {
      destroy(rightWingman);
      rightWingman = null;
    }

    add([
      text("僚机撤离", { size: 20 }),
      pos(player.pos.x, player.pos.y - 40),
      anchor("center"),
      color(150, 150, 150),
      opacity(1),
      lifespan(0.6, { fade: 0.3 }),
      move(UP, 50),
    ]);
  });
});

// 碰到小虫子
onCollide("player", "bug", (_, bug) => {
  if (gameOver) return;

  const bugPos = bug.pos.clone();
  destroy(bug);

  // 无敌状态下不受伤害
  if (isInvincible) {
    shake(3);
    add([
      text("免疫!", { size: 20 }),
      pos(bugPos),
      anchor("center"),
      color(255, 220, 50),
      opacity(1),
      lifespan(0.5, { fade: 0.3 }),
      move(UP, 60),
    ]);
    return;
  }

  score -= 5;
  levelScore = Math.max(0, levelScore - 2);
  scoreText.text = `分数: ${score}`;
  updateProgress();

  shake(12);

  add([
    text("-5", { size: 28 }),
    pos(bugPos),
    anchor("center"),
    color(100, 200, 100),
    opacity(1),
    lifespan(0.6, { fade: 0.3 }),
    move(UP, 80),
  ]);

  // 分数低于0，游戏结束
  if (score < 0) {
    gameOver = true;
    stopSpawners();
    showGameOver();
  }
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
