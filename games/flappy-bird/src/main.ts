import kaplay from "kaplay";
import "kaplay/global";

// 初始化游戏
kaplay({
  width: 400,
  height: 600,
  background: [135, 206, 235], // 天蓝色背景
});

// ==========================================
// 🐦 Flappy Bird 游戏
// 按空格键或点击鼠标让小鸟飞起来，穿过管道！
// ==========================================

// 游戏状态
let gameStarted = false;
let gameOver = false;
let score = 0;

// 游戏参数
const GRAVITY = 1200;
const JUMP_FORCE = 400;
const PIPE_SPEED = 200;
const PIPE_GAP = 150;

// 创建小鸟
const bird = add([
  circle(16),
  pos(80, 300),
  anchor("center"),
  area(),
  body(),
  color(255, 220, 100),
  "bird",
]);

// 给小鸟加个眼睛
add([
  circle(5),
  pos(bird.pos.x + 8, bird.pos.y - 4),
  anchor("center"),
  color(0, 0, 0),
  follow(bird, vec2(8, -4)),
]);

// 分数显示
const scoreText = add([
  text("0", { size: 48 }),
  pos(200, 50),
  anchor("center"),
  color(255, 255, 255),
  z(100),
]);

// 开始提示
const startHint = add([
  text("点击或按空格开始", { size: 24 }),
  pos(200, 400),
  anchor("center"),
  color(50, 50, 50),
]);

// 地面
add([
  rect(400, 50),
  pos(0, 550),
  color(139, 90, 43),
  area(),
  body({ isStatic: true }),
  "ground",
]);

// 草地
add([
  rect(400, 15),
  pos(0, 550),
  color(34, 139, 34),
]);

// 生成管道
function spawnPipes() {
  if (!gameStarted || gameOver) return;

  // 随机高度
  const gapY = rand(150, 400);

  // 上管道
  add([
    rect(60, gapY - PIPE_GAP / 2),
    pos(420, 0),
    color(50, 180, 50),
    area(),
    move(LEFT, PIPE_SPEED),
    offscreen({ destroy: true }),
    "pipe",
  ]);

  // 上管道帽
  add([
    rect(70, 20),
    pos(415, gapY - PIPE_GAP / 2 - 20),
    color(40, 160, 40),
    move(LEFT, PIPE_SPEED),
    offscreen({ destroy: true }),
  ]);

  // 下管道
  add([
    rect(60, 600 - gapY - PIPE_GAP / 2 - 50),
    pos(420, gapY + PIPE_GAP / 2),
    color(50, 180, 50),
    area(),
    move(LEFT, PIPE_SPEED),
    offscreen({ destroy: true }),
    "pipe",
  ]);

  // 下管道帽
  add([
    rect(70, 20),
    pos(415, gapY + PIPE_GAP / 2),
    color(40, 160, 40),
    move(LEFT, PIPE_SPEED),
    offscreen({ destroy: true }),
  ]);

  // 得分区域（不可见）
  add([
    rect(10, PIPE_GAP),
    pos(450, gapY - PIPE_GAP / 2),
    area(),
    move(LEFT, PIPE_SPEED),
    offscreen({ destroy: true }),
    opacity(0),
    "score-zone",
  ]);
}

// 跳跃函数
function jump() {
  if (gameOver) {
    // 重新开始
    go("main");
    return;
  }

  if (!gameStarted) {
    gameStarted = true;
    startHint.destroy();
    // 开始生成管道
    loop(1.5, spawnPipes);
  }

  bird.jump(JUMP_FORCE);
  shake(2);
}

// 输入控制
onKeyPress("space", jump);
onClick(jump);

// 碰到管道或地面
onCollide("bird", "pipe", () => {
  if (!gameOver) {
    gameOver = true;
    shake(20);
    addGameOverUI();
  }
});

onCollide("bird", "ground", () => {
  if (!gameOver) {
    gameOver = true;
    shake(20);
    addGameOverUI();
  }
});

// 穿过得分区
onCollide("bird", "score-zone", (_, zone) => {
  destroy(zone);
  score++;
  scoreText.text = String(score);
  shake(3);
});

// 小鸟飞出上边界
onUpdate("bird", () => {
  if (bird.pos.y < -50 && !gameOver) {
    gameOver = true;
    addGameOverUI();
  }
});

// 游戏结束 UI
function addGameOverUI() {
  add([
    rect(400, 600),
    pos(0, 0),
    color(0, 0, 0),
    opacity(0.5),
    z(50),
  ]);

  add([
    text("游戏结束", { size: 40 }),
    pos(200, 250),
    anchor("center"),
    color(255, 100, 100),
    z(100),
  ]);

  add([
    text(`得分: ${score}`, { size: 32 }),
    pos(200, 320),
    anchor("center"),
    color(255, 255, 255),
    z(100),
  ]);

  add([
    text("点击重新开始", { size: 20 }),
    pos(200, 400),
    anchor("center"),
    color(200, 200, 200),
    z(100),
  ]);
}

// 添加云朵装饰
for (let i = 0; i < 5; i++) {
  add([
    text("☁️", { size: rand(30, 50) }),
    pos(rand(0, 400), rand(20, 200)),
    opacity(0.7),
    move(LEFT, rand(10, 30)),
    offscreen({ destroy: true, distance: 100 }),
  ]);
}

// 持续生成云朵
loop(3, () => {
  add([
    text("☁️", { size: rand(30, 50) }),
    pos(420, rand(20, 200)),
    opacity(0.7),
    move(LEFT, rand(10, 30)),
    offscreen({ destroy: true, distance: 100 }),
  ]);
});
