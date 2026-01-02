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

// 分数
let score = 0;

// 显示分数
const scoreText = add([
  text(`分数: ${score}`, { size: 28 }),
  pos(20, 20),
  color(255, 255, 255),
]);

// 显示提示
add([
  text("← → 移动篮子", { size: 18 }),
  pos(20, height() - 40),
  color(150, 150, 150),
]);

// 玩家移动速度
const PLAYER_SPEED = 400;

// 键盘控制 - 按住左右键移动
onKeyDown("left", () => {
  player.pos.x -= PLAYER_SPEED * dt();
  // 限制不能移出屏幕
  if (player.pos.x < 50) player.pos.x = 50;
});

onKeyDown("right", () => {
  player.pos.x += PLAYER_SPEED * dt();
  // 限制不能移出屏幕
  if (player.pos.x > width() - 50) player.pos.x = width() - 50;
});

// 也支持 A/D 键
onKeyDown("a", () => {
  player.pos.x -= PLAYER_SPEED * dt();
  if (player.pos.x < 50) player.pos.x = 50;
});

onKeyDown("d", () => {
  player.pos.x += PLAYER_SPEED * dt();
  if (player.pos.x > width() - 50) player.pos.x = width() - 50;
});

// 每隔一段时间生成星星
loop(0.8, () => {
  // 随机位置生成星星
  add([
    text("⭐", { size: 36 }),
    pos(rand(50, width() - 50), -20),
    anchor("center"),
    area({ scale: 0.8 }),
    move(DOWN, rand(150, 280)), // 随机速度向下移动
    offscreen({ destroy: true }), // 超出屏幕自动销毁
    "star",
  ]);
});

// 偶尔生成特殊的大星星（加更多分）
loop(3, () => {
  add([
    text("🌟", { size: 48 }),
    pos(rand(50, width() - 50), -20),
    anchor("center"),
    area({ scale: 0.8 }),
    move(DOWN, rand(100, 180)),
    offscreen({ destroy: true }),
    "bigstar",
  ]);
});

// 接到普通星星
onCollide("player", "star", (_, star) => {
  destroy(star);
  score += 1;
  scoreText.text = `分数: ${score}`;

  // 接到星星的动画效果
  shake(3);

  // 显示 +1 文字飘起
  add([
    text("+1", { size: 20 }),
    pos(star.pos),
    anchor("center"),
    color(255, 255, 100),
    opacity(1),
    lifespan(0.5, { fade: 0.3 }),
    move(UP, 80),
  ]);
});

// 接到大星星
onCollide("player", "bigstar", (_, star) => {
  destroy(star);
  score += 5;
  scoreText.text = `分数: ${score}`;

  shake(8);

  // 显示 +5 文字
  add([
    text("+5", { size: 32 }),
    pos(star.pos),
    anchor("center"),
    color(255, 200, 50),
    opacity(1),
    lifespan(0.8, { fade: 0.4 }),
    move(UP, 100),
  ]);
});

// 添加一些背景星星装饰
for (let i = 0; i < 50; i++) {
  add([
    text("·", { size: rand(8, 16) }),
    pos(rand(0, width()), rand(0, height() - 100)),
    color(100, 100, 150),
    opacity(rand(0.3, 0.8)),
  ]);
}
