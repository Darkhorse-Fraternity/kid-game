import Phaser from 'phaser'

// 游戏常量
const TILE_SIZE = 64
const ROOM_WIDTH = 5 // 房间宽度（格子数）- 加大
const ROOM_HEIGHT = 4 // 房间高度（格子数）- 加大
const CORRIDOR_HEIGHT = 3 // 走廊高度（格子数）- 加大
const ROOMS_PER_ROW = 5 // 每排房间数 - 增加到5个
const PLAYER_SPEED = 200
const GHOST_SPEED = 100

// 角色常量
const TOTAL_CHARACTERS = 8 // 总共 8 个角色（包括玩家）
const HIDING_TIME = 10 // 躲藏时间（秒）
const MAX_HP = 10 // 最大血量
const BASE_GHOST_DAMAGE = 3 // 阿飘基础攻击伤害
const DAMAGE_INCREASE_PER_KILL = 1 // 每杀一人增加的伤害
const HEAL_PER_SECOND = 0.5 // 每秒回血量（躺在床上时）

// 门常量
const DOOR_REPAIR_TIME = 8000 // 门自动修复时间（毫秒）
const WOOD_DOOR_HP = 3 // 木门耐久度（需要撞击次数）
const IRON_DOOR_HP = 6 // 铁门耐久度

// 门类型
type DoorType = 'wood' | 'iron'

// 游戏阶段
type GamePhase = 'entering' | 'hiding' | 'hunting'

// 阿飘状态
type GhostState = 'patrolling' | 'approaching' | 'breaching' | 'hunting_in_room' | 'returning'

// 颜色定义
const COLORS = {
  floor: 0x2d2d44,
  wall: 0x1a1a2e,
  corridor: 0x3d3d5c,
  door: 0x8b4513,
  doorFrame: 0x654321,
  roomFloor: 0x252538,
  mainDoor: 0xcd853f,
  player: 0x4fc3f7,
  ghost: 0x9c27b0,
  npc: 0x66bb6a, // NPC 颜色（绿色）
}

// 角色状态
type CharacterState = 'hiding' | 'scared' | 'caught' | 'dead' | 'survivor' | 'moving'

// 角色数据接口（包括玩家和 NPC）
interface Character {
  id: number
  name: string
  state: CharacterState
  roomId: string | null // 所在房间 ID
  bedIndex: number // 床位索引（0 或 1）
  hp: number // 当前血量
  maxHP: number // 最大血量
  isPlayer: boolean // 是否是玩家
  isInBed: boolean // 是否在床上
  container?: Phaser.GameObjects.Container
  hpBar?: Phaser.GameObjects.Graphics // 血条
}

// 角色名字列表（第一个是玩家）
const CHARACTER_NAMES = ['我', '小明', '小红', '小华', '小丽', '小刚', '小芳', '小强']

// 兼容旧代码
const NPC_COUNT = TOTAL_CHARACTERS
const MAX_NPC_PER_ROOM = 2 // 每个房间最多 2 张床
type NPC = Character
type NPCState = CharacterState
const NPC_NAMES = CHARACTER_NAMES

// 房间状态
type RoomState = 'closed' | 'breached' | 'empty'

// 房间数据接口
interface Room {
  id: string
  x: number
  y: number
  width: number
  height: number
  doorX: number
  doorY: number
  row: 'top' | 'bottom'
  state: RoomState
  npcs: NPC[] // 房间内的 NPC 列表
  doorType: DoorType // 门类型
  doorHP: number // 当前门耐久度
  doorMaxHP: number // 最大门耐久度
  doorGraphics?: Phaser.GameObjects.Graphics // 门的图形对象
  repairTimer?: Phaser.Time.TimerEvent // 修复计时器
  bedCount: number // 床位数量（1或2）
}

// 地图数据
interface GameMap {
  rooms: Room[]
  corridorY: number
  corridorHeight: number
  mainDoorX: number
  mainDoorY: number
  totalWidth: number
  totalHeight: number
}

// 创建地图数据
function createMapData(): GameMap {
  const rooms: Room[] = []
  const roomPixelWidth = ROOM_WIDTH * TILE_SIZE
  const roomPixelHeight = ROOM_HEIGHT * TILE_SIZE
  const corridorPixelHeight = CORRIDOR_HEIGHT * TILE_SIZE
  const roomGap = TILE_SIZE // 房间之间的间距

  // 上排房间 (101-105)
  for (let i = 0; i < ROOMS_PER_ROW; i++) {
    // 部分房间有2张床（第1、3、5个房间）
    const hasTwoBeds = i % 2 === 0
    const roomX = i * (roomPixelWidth + roomGap)
    rooms.push({
      id: `10${i + 1}`,
      x: roomX,
      y: 0,
      width: roomPixelWidth,
      height: roomPixelHeight,
      doorX: roomX + roomPixelWidth / 2,
      doorY: roomPixelHeight,
      row: 'top',
      state: 'closed',
      npcs: [],
      doorType: 'wood',
      doorHP: WOOD_DOOR_HP,
      doorMaxHP: WOOD_DOOR_HP,
      bedCount: hasTwoBeds ? 2 : 1,
    })
  }

  // 下排房间 (106-110)
  const bottomRowY = roomPixelHeight + corridorPixelHeight
  for (let i = 0; i < ROOMS_PER_ROW; i++) {
    // 部分房间有2张床（第2、4个房间）
    const hasTwoBeds = i % 2 === 1
    const roomX = i * (roomPixelWidth + roomGap)
    rooms.push({
      id: `10${i + 6}`,
      x: roomX,
      y: bottomRowY,
      width: roomPixelWidth,
      height: roomPixelHeight,
      doorX: roomX + roomPixelWidth / 2,
      doorY: bottomRowY,
      row: 'bottom',
      state: 'closed',
      npcs: [],
      doorType: 'wood',
      doorHP: WOOD_DOOR_HP,
      doorMaxHP: WOOD_DOOR_HP,
      bedCount: hasTwoBeds ? 2 : 1,
    })
  }

  const roomsWidth = ROOMS_PER_ROW * (roomPixelWidth + roomGap) - roomGap // 所有房间的总宽度
  const totalWidth = roomsWidth + TILE_SIZE * 5 // 右边留出大门通道空间
  const totalHeight = 2 * roomPixelHeight + corridorPixelHeight + TILE_SIZE * 3 // 额外空间给大门

  // 大门放在右边，不覆盖房间
  const mainDoorX = roomsWidth + TILE_SIZE * 2.5

  return {
    rooms,
    corridorY: roomPixelHeight,
    corridorHeight: corridorPixelHeight,
    mainDoorX: mainDoorX,
    mainDoorY: totalHeight - TILE_SIZE,
    totalWidth,
    totalHeight,
  }
}

class MainScene extends Phaser.Scene {
  private mapData!: GameMap
  private graphics!: Phaser.GameObjects.Graphics
  private player!: Phaser.GameObjects.Container
  private ghost!: Phaser.GameObjects.Container
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys
  private wasd!: { W: Phaser.Input.Keyboard.Key; A: Phaser.Input.Keyboard.Key; S: Phaser.Input.Keyboard.Key; D: Phaser.Input.Keyboard.Key }
  private spaceKey!: Phaser.Input.Keyboard.Key
  private ghostDirection: number = 1 // 1 = 向右, -1 = 向左
  private ghostState: GhostState = 'patrolling' // 阿飘状态
  private ghostTargetRoom: Room | null = null // 阿飘目标房间
  private ghostTargetNPC: NPC | null = null // 阿飘锁定的目标
  private ghostKillCount: number = 0 // 阿飘击杀数
  private npcs: NPC[] = [] // NPC 列表
  private npcCountText!: Phaser.GameObjects.Text // 存活人数显示
  private countdownText!: Phaser.GameObjects.Text // 倒计时显示
  private controlHintText!: Phaser.GameObjects.Text // 控制提示
  private gamePhase: GamePhase = 'entering' // 游戏阶段
  private countdown: number = HIDING_TIME // 倒计时秒数
  private npcsEnteredCount: number = 0 // 已进入房间的 NPC 数量
  private playerControlEnabled: boolean = false // 玩家是否可以控制移动
  private eKey!: Phaser.Input.Keyboard.Key // E键用于起床/上床

  constructor() {
    super({ key: 'MainScene' })
  }

  preload() {
    // 暂时不需要预加载资源，使用图形绘制
  }

  create() {
    this.mapData = createMapData()
    this.graphics = this.add.graphics()

    // 设置相机边界
    this.cameras.main.setBounds(0, 0, this.mapData.totalWidth, this.mapData.totalHeight)

    // 绘制场景
    this.drawCorridor()
    this.drawRooms()
    this.drawMainDoor()
    this.drawRoomLabels()

    // 创建 NPC（从大门进入）
    // 创建所有角色（包括玩家，从大门进入）
    this.createNPCs()

    // 创建 UI
    this.createUI()

    // 设置键盘控制
    this.cursors = this.input.keyboard!.createCursorKeys()
    this.wasd = {
      W: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      A: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      S: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      D: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    }
    this.spaceKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)
    this.eKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.E)

    // 相机跟随玩家
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1)

    // 添加缩放以适应屏幕
    const scaleX = this.cameras.main.width / this.mapData.totalWidth
    const scaleY = this.cameras.main.height / this.mapData.totalHeight
    const scale = Math.min(scaleX, scaleY) * 0.9
    this.cameras.main.setZoom(scale)
  }

  private createNPCs() {
    // 创建角色数据（包括玩家）
    for (let i = 0; i < NPC_COUNT; i++) {
      this.npcs.push({
        id: i,
        name: NPC_NAMES[i],
        state: 'hiding',
        roomId: null,
        bedIndex: -1,
        hp: MAX_HP,
        maxHP: MAX_HP,
        isPlayer: i === 0, // 第一个是玩家
        isInBed: false,
      })
    }

    // 在大门处创建所有角色（包括玩家），让他们抢床位
    this.spawnNPCsAtDoor()
  }

  private spawnNPCsAtDoor() {
    const doorX = this.mapData.mainDoorX
    const doorY = this.mapData.mainDoorY
    const corridorY = this.mapData.corridorY + this.mapData.corridorHeight / 2

    // 打乱房间顺序，让每个NPC随机选择目标
    const shuffledRooms = [...this.mapData.rooms].sort(() => Math.random() - 0.5)

    // 为每个角色创建容器
    this.npcs.forEach((npc, index) => {
      // 如果是玩家，放在大门入口处
      if (npc.isPlayer) {
        const container = this.createCharacterContainer(doorX, doorY - 20, npc)
        npc.container = container
        this.player = container
        this.playerControlEnabled = true // 立即启用玩家控制
        return
      }

      // NPC 在大门外排队
      const startX = doorX + (index - 4) * 25
      const startY = doorY + 30 // 大门外面
      const container = this.createCharacterContainer(startX, startY, npc)
      npc.container = container

      // NPC 自动移动逻辑
      const moveSpeed = 120 + Math.random() * 40 // 像素/秒
      const delay = index * 400 + Math.random() * 200 // 依次进入

      // 初始目标房间
      const initialTarget = shuffledRooms[index % shuffledRooms.length]

      this.time.delayedCall(delay, () => {
        // 路径：大门外 -> 大门 -> 走廊 -> 房间门口 -> 房间内
        this.moveNPCAlongPath(npc, initialTarget, corridorY, moveSpeed)
      })
    })
  }

  private moveNPCAlongPath(npc: NPC, targetRoom: Room, corridorY: number, moveSpeed: number) {
    const container = npc.container!
    const doorX = this.mapData.mainDoorX

    // 计算各段路径的距离和时间
    // 第一段：从当前位置到大门入口
    const step1Duration = this.calculateMoveDuration(container.x, container.y, doorX, this.mapData.mainDoorY, moveSpeed)

    this.tweens.add({
      targets: container,
      x: doorX,
      y: this.mapData.mainDoorY,
      duration: step1Duration,
      ease: 'Linear',
      onComplete: () => {
        // 第二段：从大门到走廊中心
        const step2Duration = this.calculateMoveDuration(container.x, container.y, doorX, corridorY, moveSpeed)

        this.tweens.add({
          targets: container,
          x: doorX,
          y: corridorY,
          duration: step2Duration,
          ease: 'Linear',
          onComplete: () => {
            // 第三段：沿走廊移动到目标房间门口
            const step3Duration = this.calculateMoveDuration(container.x, container.y, targetRoom.doorX, corridorY, moveSpeed)

            this.tweens.add({
              targets: container,
              x: targetRoom.doorX,
              y: corridorY,
              duration: step3Duration,
              ease: 'Linear',
              onComplete: () => {
                // 检查房间是否还有空位（根据床位数）
                if (targetRoom.npcs.length < targetRoom.bedCount) {
                  // 抢到床位了！进入房间
                  this.enterRoom(npc, targetRoom, moveSpeed)
                } else {
                  // 床位被抢了，找其他房间
                  this.findAnotherRoom(npc, corridorY, moveSpeed)
                }
              },
            })
          },
        })
      },
    })
  }

  private calculateMoveDuration(x1: number, y1: number, x2: number, y2: number, speed: number): number {
    const distance = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)
    return (distance / speed) * 1000 // 返回毫秒
  }

  private enterRoom(npc: NPC, room: Room, moveSpeed: number) {
    const container = npc.container!

    // 分配床位索引
    npc.bedIndex = room.npcs.length
    npc.roomId = room.id
    npc.isInBed = true
    room.npcs.push(npc)

    // 根据床位计算目标位置
    const bedPositions = this.getBedPositions(room)
    const targetPos = bedPositions[npc.bedIndex]
    const targetX = targetPos.x
    const targetY = targetPos.y

    const duration = this.calculateMoveDuration(container.x, container.y, targetX, targetY, moveSpeed)

    this.tweens.add({
      targets: container,
      x: targetX,
      y: targetY,
      duration: duration,
      ease: 'Linear',
      onComplete: () => {
        this.npcsEnteredCount++
        // 添加紧张晃动动画
        this.tweens.add({
          targets: container,
          x: targetX - 2,
          duration: 200 + Math.random() * 200,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        })
        // 检查是否所有NPC都进入了房间（玩家自己控制，不计入）
        if (this.npcsEnteredCount === NPC_COUNT - 1) {
          this.startHidingPhase()
        }
      },
    })
  }

  private findAnotherRoom(npc: NPC, corridorY: number, moveSpeed: number) {
    const container = npc.container!

    // 找到还有空位的房间
    const availableRooms = this.mapData.rooms.filter((r) => r.npcs.length < r.bedCount)

    if (availableRooms.length === 0) {
      // 没有空房间了
      console.warn(`${npc.name} 无处可去！`)
      this.npcsEnteredCount++
      if (this.npcsEnteredCount === NPC_COUNT - 1) {
        this.startHidingPhase()
      }
      return
    }

    // 随机选择一个空房间
    const newTarget = availableRooms[Math.floor(Math.random() * availableRooms.length)]

    // 沿走廊移动到新房间门口
    const duration = this.calculateMoveDuration(container.x, container.y, newTarget.doorX, corridorY, moveSpeed)

    this.tweens.add({
      targets: container,
      x: newTarget.doorX,
      y: corridorY,
      duration: duration,
      ease: 'Linear',
      onComplete: () => {
        // 再次检查是否还有空位
        if (newTarget.npcs.length < newTarget.bedCount) {
          this.enterRoom(npc, newTarget, moveSpeed)
        } else {
          // 又被抢了，继续找
          this.findAnotherRoom(npc, corridorY, moveSpeed)
        }
      },
    })
  }

  private createCharacterContainer(x: number, y: number, character: Character): Phaser.GameObjects.Container {
    const container = this.add.container(x, y)
    const isPlayer = character.isPlayer
    const color = isPlayer ? COLORS.player : COLORS.npc
    const size = isPlayer ? 16 : 12

    // 身体
    const body = this.add.graphics()
    body.fillStyle(color)
    body.fillCircle(0, 0, size)

    // 眼睛
    const eyeOffset = isPlayer ? 5 : 4
    const eyeSize = isPlayer ? 4 : 3
    const pupilSize = isPlayer ? 2 : 1.5

    const eyeLeft = this.add.graphics()
    eyeLeft.fillStyle(0xffffff)
    eyeLeft.fillCircle(-eyeOffset, -3, eyeSize)
    eyeLeft.fillStyle(0x000000)
    eyeLeft.fillCircle(-eyeOffset + 1, -3, pupilSize)

    const eyeRight = this.add.graphics()
    eyeRight.fillStyle(0xffffff)
    eyeRight.fillCircle(eyeOffset, -3, eyeSize)
    eyeRight.fillStyle(0x000000)
    eyeRight.fillCircle(eyeOffset + 1, -3, pupilSize)

    // 表情/标签
    const emoji = isPlayer ? '👤' : '😰'
    const label = this.add.text(0, -size - 12, emoji, { fontSize: isPlayer ? '20px' : '16px' }).setOrigin(0.5)

    // 血条背景
    const hpBarBg = this.add.graphics()
    hpBarBg.fillStyle(0x333333)
    hpBarBg.fillRect(-20, size + 5, 40, 6)

    // 血条
    const hpBar = this.add.graphics()
    hpBar.fillStyle(0x00ff00)
    hpBar.fillRect(-20, size + 5, 40, 6)
    character.hpBar = hpBar

    container.add([body, eyeLeft, eyeRight, label, hpBarBg, hpBar])
    return container
  }

  // 兼容旧代码
  private createNPCContainer(x: number, y: number): Phaser.GameObjects.Container {
    // 创建一个临时的非玩家角色容器
    const tempChar: Character = {
      id: -1,
      name: 'temp',
      state: 'hiding',
      roomId: null,
      bedIndex: -1,
      hp: MAX_HP,
      maxHP: MAX_HP,
      isPlayer: false,
      isInBed: false,
    }
    return this.createCharacterContainer(x, y, tempChar)
  }

  private startHidingPhase() {
    this.gamePhase = 'hiding'
    // 开始倒计时
    this.time.addEvent({
      delay: 1000,
      repeat: HIDING_TIME - 1,
      callback: () => {
        this.countdown--
        this.countdownText.setText(`阿飘将在 ${this.countdown} 秒后出现...`)
        if (this.countdown <= 0) {
          this.startHuntingPhase()
        }
      },
    })
  }

  private startHuntingPhase() {
    this.gamePhase = 'hunting'
    this.countdownText.setText('阿飘来了！按 E 键起床逃跑！')

    // 隐藏倒计时文字
    this.time.delayedCall(2500, () => {
      this.countdownText.setVisible(false)
    })

    // 创建鬼魂
    this.createGhost()

    // 显示玩家
    this.player.setVisible(true)

    // 启用玩家控制
    this.playerControlEnabled = true

    // 停止玩家的晃动动画（准备让玩家自由控制）
    this.tweens.killTweensOf(this.player)

    // 阿飘立即开始随机攻击
    this.time.delayedCall(1000, () => {
      this.selectTargetRoom()
    })
  }

  private getNPCEmoji(state: NPCState): string {
    switch (state) {
      case 'hiding':
        return '😰'
      case 'scared':
        return '😨'
      case 'caught':
        return '💀'
      case 'survivor':
        return '🎉'
      default:
        return '😰'
    }
  }

  private createUI() {
    // 存活人数显示（固定在屏幕左上角）
    const aliveCount = this.npcs.filter((n) => n.state !== 'caught').length
    this.npcCountText = this.add
      .text(20, 20, `存活人数: ${aliveCount}/${NPC_COUNT}`, {
        fontSize: '24px',
        color: '#ffffff',
        backgroundColor: '#000000aa',
        padding: { x: 10, y: 5 },
      })
      .setScrollFactor(0)
      .setDepth(100)

    // 倒计时显示（屏幕中央上方）
    this.countdownText = this.add
      .text(this.cameras.main.width / 2, 60, '快找一张床躺下！用 WASD 移动，E 躺下', {
        fontSize: '24px',
        color: '#ffff00',
        backgroundColor: '#000000aa',
        padding: { x: 15, y: 8 },
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(100)

    // 控制提示（屏幕下方）
    this.controlHintText = this.add
      .text(this.cameras.main.width / 2, this.cameras.main.height - 40, '', {
        fontSize: '18px',
        color: '#aaaaaa',
        backgroundColor: '#000000aa',
        padding: { x: 10, y: 5 },
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(100)
      .setVisible(false)
  }

  private updateUI() {
    const aliveCount = this.npcs.filter((n) => n.state !== 'caught').length
    this.npcCountText.setText(`存活人数: ${aliveCount}/${NPC_COUNT}`)

    // 更新控制提示
    if (this.playerControlEnabled) {
      const playerChar = this.getPlayerCharacter()
      if (playerChar && playerChar.state !== 'caught') {
        if (playerChar.isInBed) {
          this.controlHintText.setText('按 E 起床逃跑 | 空格 升级附近的门')
        } else {
          const nearbyRoom = this.findNearbyRoomWithEmptyBed()
          if (nearbyRoom) {
            this.controlHintText.setText('WASD/方向键 移动 | E 躺下休息 | 空格 升级门')
          } else {
            this.controlHintText.setText('WASD/方向键 移动 | 空格 升级附近的门')
          }
        }
        this.controlHintText.setVisible(true)
      } else {
        this.controlHintText.setVisible(false)
      }
    }
  }

  private getPlayerCharacter(): Character | undefined {
    return this.npcs.find((npc) => npc.isPlayer)
  }

  private createGhost() {
    // 鬼魂起始位置：走廊右侧
    const startX = this.mapData.totalWidth * 0.75
    const startY = this.mapData.corridorY + this.mapData.corridorHeight / 2

    this.ghost = this.add.container(startX, startY)

    // 鬼魂身体（幽灵形状）
    const body = this.add.graphics()
    body.fillStyle(COLORS.ghost, 0.8)
    // 头部
    body.fillCircle(0, -8, 18)
    // 身体（波浪形底部）
    body.fillRect(-18, -8, 36, 20)
    body.fillTriangle(-18, 12, -10, 20, -18, 20)
    body.fillTriangle(-6, 12, 0, 22, 6, 12)
    body.fillTriangle(18, 12, 10, 20, 18, 20)

    // 鬼魂眼睛（发光效果）
    const eyeLeft = this.add.graphics()
    eyeLeft.fillStyle(0xff0000)
    eyeLeft.fillCircle(-6, -10, 5)
    eyeLeft.fillStyle(0xffffff)
    eyeLeft.fillCircle(-7, -11, 2)

    const eyeRight = this.add.graphics()
    eyeRight.fillStyle(0xff0000)
    eyeRight.fillCircle(6, -10, 5)
    eyeRight.fillStyle(0xffffff)
    eyeRight.fillCircle(5, -11, 2)

    // 鬼魂标签
    const label = this.add.text(0, -45, '👻', { fontSize: '24px' }).setOrigin(0.5)

    this.ghost.add([body, eyeLeft, eyeRight, label])

    // 添加漂浮动画
    this.tweens.add({
      targets: this.ghost,
      y: startY - 10,
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    })
  }

  update() {
    // 玩家控制始终生效
    this.updatePlayer()
    this.updateUI()

    // 狩猎阶段才更新鬼魂
    if (this.gamePhase === 'hunting') {
      this.updateGhost()
      this.checkCollision()
      this.checkDoorUpgrade()
      this.updateHealing()
    }
  }

  private updateHealing() {
    const delta = this.game.loop.delta / 1000 // 秒

    // 所有躺在床上的角色回血
    for (const character of this.npcs) {
      if (character.isInBed && character.state === 'hiding' && character.hp < character.maxHP) {
        character.hp = Math.min(character.maxHP, character.hp + HEAL_PER_SECOND * delta)
        this.updateHPBar(character)
      }
    }
  }

  private checkDoorUpgrade() {
    // 按空格键升级附近的门
    if (Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
      const nearbyRoom = this.findNearbyDoor()
      if (nearbyRoom && nearbyRoom.doorType === 'wood' && nearbyRoom.state === 'closed') {
        this.upgradeDoor(nearbyRoom)
      }
    }
  }

  private findNearbyDoor(): Room | null {
    const upgradeDistance = 60 // 升级距离

    for (const room of this.mapData.rooms) {
      // 计算玩家到门的距离
      const doorY = room.row === 'top'
        ? room.y + room.height
        : room.y

      const distance = Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        room.doorX,
        doorY
      )

      if (distance < upgradeDistance) {
        return room
      }
    }

    return null
  }

  private upgradeDoor(room: Room) {
    // 升级为铁门
    room.doorType = 'iron'
    room.doorHP = IRON_DOOR_HP
    room.doorMaxHP = IRON_DOOR_HP

    // 重绘门
    this.redrawDoorOnly(room, 0xc0c0c0)

    // 显示升级效果
    const doorY = room.row === 'top' ? room.y + room.height : room.y
    const upgradeText = this.add
      .text(room.doorX, doorY, '⬆️🚪', { fontSize: '24px' })
      .setOrigin(0.5)

    this.tweens.add({
      targets: upgradeText,
      alpha: 0,
      y: doorY - 40,
      duration: 800,
      onComplete: () => upgradeText.destroy(),
    })
  }

  private updatePlayer() {
    if (!this.playerControlEnabled) return

    const playerChar = this.getPlayerCharacter()
    if (!playerChar || playerChar.state === 'caught') return

    // 按 E 键起床或上床
    if (Phaser.Input.Keyboard.JustDown(this.eKey)) {
      this.handleBedInteraction(playerChar)
    }

    // 检查是否有移动输入
    const hasMovementInput =
      this.cursors.left.isDown ||
      this.cursors.right.isDown ||
      this.cursors.up.isDown ||
      this.cursors.down.isDown ||
      this.wasd.A.isDown ||
      this.wasd.D.isDown ||
      this.wasd.W.isDown ||
      this.wasd.S.isDown

    // 如果玩家在床上并且按了移动键，自动起床
    if (playerChar.isInBed && hasMovementInput) {
      this.playerLeaveBed(playerChar)
    }

    // 如果玩家在床上，不能移动
    if (playerChar.isInBed) return

    let velocityX = 0
    let velocityY = 0

    // 检查输入
    if (this.cursors.left.isDown || this.wasd.A.isDown) {
      velocityX = -PLAYER_SPEED
    } else if (this.cursors.right.isDown || this.wasd.D.isDown) {
      velocityX = PLAYER_SPEED
    }

    if (this.cursors.up.isDown || this.wasd.W.isDown) {
      velocityY = -PLAYER_SPEED
    } else if (this.cursors.down.isDown || this.wasd.S.isDown) {
      velocityY = PLAYER_SPEED
    }

    // 归一化斜向移动
    if (velocityX !== 0 && velocityY !== 0) {
      velocityX *= 0.707
      velocityY *= 0.707
    }

    // 计算新位置
    const delta = this.game.loop.delta / 1000
    const newX = this.player.x + velocityX * delta
    const newY = this.player.y + velocityY * delta

    // 边界检测和碰撞检测
    const margin = 20
    const clampedX = Phaser.Math.Clamp(newX, margin, this.mapData.totalWidth - margin)
    const clampedY = Phaser.Math.Clamp(newY, margin, this.mapData.totalHeight - margin)

    // 检查是否可以移动到新位置
    if (this.canPlayerMoveTo(clampedX, clampedY, playerChar)) {
      this.player.x = clampedX
      this.player.y = clampedY
    }
  }

  private handleBedInteraction(playerChar: Character) {
    if (playerChar.isInBed) {
      // 起床离开
      this.playerLeaveBed(playerChar)
    } else {
      // 尝试上床
      this.playerTryEnterBed(playerChar)
    }
  }

  private playerLeaveBed(playerChar: Character) {
    playerChar.isInBed = false
    playerChar.state = 'moving' // 起床后变成移动状态，鬼魂不会直接攻击

    // 从房间 NPC 列表中移除（但不是真正离开房间）
    if (playerChar.roomId) {
      const room = this.mapData.rooms.find((r) => r.id === playerChar.roomId)
      if (room) {
        // 释放床位
        room.npcs = room.npcs.filter((n) => n.id !== playerChar.id)
      }
    }

    // 更新玩家状态
    playerChar.roomId = null
    playerChar.bedIndex = -1

    // 显示起床效果
    const getUpText = this.add
      .text(this.player.x, this.player.y - 30, '起床啦！', { fontSize: '16px', color: '#ffff00' })
      .setOrigin(0.5)

    this.tweens.add({
      targets: getUpText,
      alpha: 0,
      y: this.player.y - 60,
      duration: 800,
      onComplete: () => getUpText.destroy(),
    })

    // 更新表情
    const label = this.player.getAt(3) as Phaser.GameObjects.Text
    label.setText('🏃')
  }

  private playerTryEnterBed(playerChar: Character) {
    // 找到附近有空床位的房间
    const nearbyRoom = this.findNearbyRoomWithEmptyBed()

    if (nearbyRoom) {
      // 找到空床位
      const occupiedBeds = nearbyRoom.npcs.map((n) => n.bedIndex)
      let emptyBedIndex = -1
      for (let i = 0; i < nearbyRoom.bedCount; i++) {
        if (!occupiedBeds.includes(i)) {
          emptyBedIndex = i
          break
        }
      }

      if (emptyBedIndex >= 0) {
        // 进入床位
        playerChar.roomId = nearbyRoom.id
        playerChar.bedIndex = emptyBedIndex
        playerChar.isInBed = true
        playerChar.state = 'hiding' // 设置状态为躲藏，这样鬼魂才会攻击
        nearbyRoom.npcs.push(playerChar)

        // 移动到床位
        const bedPositions = this.getBedPositions(nearbyRoom)
        const targetPos = bedPositions[emptyBedIndex]

        this.tweens.add({
          targets: this.player,
          x: targetPos.x,
          y: targetPos.y,
          duration: 200,
          ease: 'Power1',
        })

        // 更新表情
        const label = this.player.getAt(3) as Phaser.GameObjects.Text
        label.setText('😰')

        // 显示效果
        const sleepText = this.add
          .text(this.player.x, this.player.y - 30, '躺下休息...', { fontSize: '16px', color: '#00ff00' })
          .setOrigin(0.5)

        this.tweens.add({
          targets: sleepText,
          alpha: 0,
          y: this.player.y - 60,
          duration: 800,
          onComplete: () => sleepText.destroy(),
        })
      }
    }
  }

  private findNearbyRoomWithEmptyBed(): Room | null {
    const interactDistance = 80

    for (const room of this.mapData.rooms) {
      // 检查玩家是否在房间内或门口
      const inRoom = this.isPlayerInRoom(room)
      const nearDoor = this.isPlayerNearDoor(room, interactDistance)

      if (inRoom || nearDoor) {
        // 检查是否有空床位
        if (room.npcs.length < room.bedCount) {
          return room
        }
      }
    }

    return null
  }

  private isPlayerInRoom(room: Room): boolean {
    return (
      this.player.x >= room.x &&
      this.player.x <= room.x + room.width &&
      this.player.y >= room.y &&
      this.player.y <= room.y + room.height
    )
  }

  private isPlayerNearDoor(room: Room, distance: number): boolean {
    const doorY = room.row === 'top' ? room.y + room.height : room.y
    return Phaser.Math.Distance.Between(this.player.x, this.player.y, room.doorX, doorY) < distance
  }

  private canPlayerMoveTo(x: number, y: number, _playerChar: Character): boolean {
    const corridorTop = this.mapData.corridorY
    const corridorBottom = this.mapData.corridorY + this.mapData.corridorHeight
    const margin = 15 // 玩家碰撞边距

    // 检查是否在走廊中
    const isInCorridor = y >= corridorTop + margin && y <= corridorBottom - margin

    // 检查是否在大门通道中
    const passageWidth = TILE_SIZE * 2
    const passageX = this.mapData.mainDoorX - passageWidth / 2
    const isInPassage =
      x >= passageX + margin &&
      x <= passageX + passageWidth - margin &&
      y >= corridorBottom - margin &&
      y <= this.mapData.mainDoorY + TILE_SIZE - margin

    // 如果在走廊或大门通道，允许移动
    if (isInCorridor || isInPassage) {
      return true
    }

    // 检查是否在房间内（通过门进入）
    for (const room of this.mapData.rooms) {
      const doorX = room.doorX
      const doorY = room.row === 'top' ? room.y + room.height : room.y
      const doorWidth = TILE_SIZE * 0.8

      // 检查是否在门的范围内（可以进出的区域）
      const nearDoorX = Math.abs(x - doorX) < doorWidth / 2
      const nearDoorY = Math.abs(y - doorY) < TILE_SIZE

      if (nearDoorX && nearDoorY) {
        return true
      }

      // 检查是否完全在房间内部
      const inRoomX = x >= room.x + margin && x <= room.x + room.width - margin
      const inRoomY = y >= room.y + margin && y <= room.y + room.height - margin

      if (inRoomX && inRoomY) {
        return true
      }
    }

    return false
  }

  private updateGhost() {
    const delta = this.game.loop.delta / 1000
    const corridorY = this.mapData.corridorY + this.mapData.corridorHeight / 2

    switch (this.ghostState) {
      case 'patrolling':
        this.ghostPatrol(delta)
        // 随机选择一个有人的房间去攻击（更积极）
        if (Math.random() < 0.02) { // 每帧约 2% 概率，更频繁攻击
          this.selectTargetRoom()
        }
        break

      case 'approaching':
        // 向目标房间门口移动
        if (this.ghostTargetRoom) {
          const targetX = this.ghostTargetRoom.doorX
          const distance = Math.abs(this.ghost.x - targetX)

          if (distance < 5) {
            // 到达门口，开始破门
            this.ghost.x = targetX
            this.startBreaching()
          } else {
            // 继续移动
            const direction = targetX > this.ghost.x ? 1 : -1
            this.ghost.x += GHOST_SPEED * direction * delta
            this.ghost.scaleX = direction
          }
        }
        break

      case 'breaching':
        // 破门动画由 tween 处理，这里不做操作
        break

      case 'hunting_in_room':
        // 在房间内抓人由 tween 处理
        break

      case 'returning':
        // 返回走廊
        const returnDistance = Math.abs(this.ghost.y - corridorY)
        if (returnDistance < 5) {
          this.ghost.y = corridorY
          this.ghostState = 'patrolling'
        } else {
          const direction = corridorY > this.ghost.y ? 1 : -1
          this.ghost.y += GHOST_SPEED * direction * delta
        }
        break
    }
  }

  private ghostPatrol(delta: number) {
    // 鬼魂在走廊中左右巡逻
    const corridorLeft = 50
    const corridorRight = this.mapData.totalWidth - 50

    this.ghost.x += GHOST_SPEED * this.ghostDirection * delta

    // 到达边界时转向
    if (this.ghost.x >= corridorRight) {
      this.ghostDirection = -1
      this.ghost.scaleX = -1
    } else if (this.ghost.x <= corridorLeft) {
      this.ghostDirection = 1
      this.ghost.scaleX = 1
    }
  }

  private selectTargetRoom() {
    // 找到还有存活 NPC 且未被破门的房间
    const availableRooms = this.mapData.rooms.filter(
      (room) => room.state !== 'breached' && room.npcs.some((npc) => npc.state === 'hiding')
    )

    if (availableRooms.length === 0) {
      return // 没有可攻击的房间
    }

    // 随机选择一个房间
    this.ghostTargetRoom = availableRooms[Math.floor(Math.random() * availableRooms.length)]
    this.ghostState = 'approaching'
  }

  private startBreaching() {
    if (!this.ghostTargetRoom) return

    this.ghostState = 'breaching'
    const room = this.ghostTargetRoom

    // 撞击一次门
    this.hitDoor(room)
  }

  private hitDoor(room: Room) {
    // 破门动画：阿飘撞击门
    const doorY = room.row === 'top' ? room.y + room.height : room.y

    this.tweens.add({
      targets: this.ghost,
      y: doorY,
      duration: 200,
      ease: 'Power2',
      yoyo: true,
      onComplete: () => {
        // 减少门的耐久度
        room.doorHP--
        this.updateDoorVisual(room)

        // 显示撞击效果
        this.showHitEffect(room)

        if (room.doorHP <= 0) {
          // 破门成功
          room.state = 'breached'
          this.redrawRoom(room)

          // 开始自动修复计时
          this.startDoorRepair(room)

          // 进入房间抓人
          this.enterRoomToHunt(room)
        } else {
          // 继续撞击
          this.time.delayedCall(300, () => {
            this.hitDoor(room)
          })
        }
      },
    })
  }

  private showHitEffect(room: Room) {
    const doorY = room.row === 'top' ? room.y + room.height : room.y
    const hitText = this.add
      .text(room.doorX, doorY, '💥', { fontSize: '24px' })
      .setOrigin(0.5)

    this.tweens.add({
      targets: hitText,
      alpha: 0,
      y: doorY - 20,
      duration: 400,
      onComplete: () => hitText.destroy(),
    })
  }

  private updateDoorVisual(room: Room) {
    // 根据门的耐久度更新门的颜色
    if (!room.doorGraphics) return

    const hpPercent = room.doorHP / room.doorMaxHP
    let doorColor: number

    if (room.doorType === 'iron') {
      // 铁门：从银色到深灰
      const r = Math.round(192 - (192 - 64) * (1 - hpPercent))
      const g = Math.round(192 - (192 - 64) * (1 - hpPercent))
      const b = Math.round(192 - (192 - 64) * (1 - hpPercent))
      doorColor = Phaser.Display.Color.GetColor(r, g, b)
    } else {
      // 木门：从棕色到深棕
      const r = Math.round(139 - (139 - 50) * (1 - hpPercent))
      const g = Math.round(69 - (69 - 25) * (1 - hpPercent))
      const b = Math.round(19 - (19 - 10) * (1 - hpPercent))
      doorColor = Phaser.Display.Color.GetColor(r, g, b)
    }

    // 重绘门
    this.redrawDoorOnly(room, doorColor)
  }

  private redrawDoorOnly(room: Room, doorColor: number) {
    if (!room.doorGraphics) return

    const doorWidth = TILE_SIZE * 1.2
    const doorHeight = TILE_SIZE * 0.5

    let doorX = room.doorX - doorWidth / 2
    let doorY: number

    if (room.row === 'top') {
      // 上排房间，门在底部墙壁上
      doorY = room.y + room.height - doorHeight
    } else {
      // 下排房间，门在顶部墙壁上
      doorY = room.y
    }

    room.doorGraphics.clear()

    // 门框
    room.doorGraphics.fillStyle(COLORS.doorFrame)
    room.doorGraphics.fillRect(doorX - 4, doorY - 4, doorWidth + 8, doorHeight + 8)

    // 门
    room.doorGraphics.fillStyle(doorColor)
    room.doorGraphics.fillRect(doorX, doorY, doorWidth, doorHeight)

    // 门把手
    room.doorGraphics.fillStyle(0xffd700)
    room.doorGraphics.fillCircle(doorX + doorWidth * 0.8, doorY + doorHeight / 2, 3)

    // 铁门显示特殊标记
    if (room.doorType === 'iron') {
      room.doorGraphics.lineStyle(2, 0x888888)
      room.doorGraphics.strokeRect(doorX + 5, doorY + 3, doorWidth - 10, doorHeight - 6)
    }
  }

  private startDoorRepair(room: Room) {
    // 如果已有修复计时器，取消它
    if (room.repairTimer) {
      room.repairTimer.destroy()
    }

    // 开始新的修复计时
    room.repairTimer = this.time.delayedCall(DOOR_REPAIR_TIME, () => {
      this.repairDoor(room)
    })
  }

  private repairDoor(room: Room) {
    // 恢复门的状态
    room.state = 'closed'
    room.doorHP = room.doorMaxHP

    // 重新绘制完好的门
    const doorColor = room.doorType === 'iron' ? 0xc0c0c0 : COLORS.door
    this.redrawDoorOnly(room, doorColor)

    // 显示修复效果
    const doorY = room.row === 'top' ? room.y + room.height : room.y
    const repairText = this.add
      .text(room.doorX, doorY, '🔧', { fontSize: '20px' })
      .setOrigin(0.5)

    this.tweens.add({
      targets: repairText,
      alpha: 0,
      y: doorY - 30,
      duration: 800,
      onComplete: () => repairText.destroy(),
    })
  }

  private enterRoomToHunt(room: Room) {
    this.ghostState = 'hunting_in_room'

    // 找到房间内的 NPC
    const targetNPC = room.npcs.find((npc) => npc.state === 'hiding')

    if (!targetNPC || !targetNPC.container) {
      // 房间没人，返回走廊
      this.returnToCorridor()
      return
    }

    // 阿飘移动到 NPC 位置
    const targetX = targetNPC.container.x
    const targetY = targetNPC.container.y

    this.tweens.add({
      targets: this.ghost,
      x: targetX,
      y: targetY,
      duration: 500,
      ease: 'Power1',
      onComplete: () => {
        // 抓住 NPC
        this.catchNPC(targetNPC)
      },
    })
  }

  private getGhostDamage(): number {
    return BASE_GHOST_DAMAGE + this.ghostKillCount * DAMAGE_INCREASE_PER_KILL
  }

  private attackCharacter(character: NPC) {
    // 锁定目标
    this.ghostTargetNPC = character

    // 计算伤害（随击杀数增加）
    const damage = this.getGhostDamage()
    character.hp -= damage
    this.updateHPBar(character)

    // 显示伤害数字
    if (character.container) {
      const damageText = this.add
        .text(character.container.x, character.container.y - 40, `-${damage}`, {
          fontSize: '20px',
          color: '#ff0000',
          fontStyle: 'bold',
        })
        .setOrigin(0.5)

      this.tweens.add({
        targets: damageText,
        alpha: 0,
        y: character.container.y - 70,
        duration: 600,
        onComplete: () => damageText.destroy(),
      })

      const label = character.container.getAt(3) as Phaser.GameObjects.Text
      label.setText('😱')

      // 闪烁效果
      this.tweens.add({
        targets: character.container,
        alpha: 0.3,
        duration: 100,
        yoyo: true,
        repeat: 3,
      })
    }

    if (character.hp <= 0) {
      // 角色死亡
      this.killCharacter(character)
    } else {
      // 继续攻击同一目标，直到杀死
      this.time.delayedCall(500, () => {
        this.continueAttackingTarget()
      })
    }
  }

  private continueAttackingTarget() {
    // 如果目标还活着且在床上，继续攻击
    if (this.ghostTargetNPC && this.ghostTargetNPC.state === 'hiding' && this.ghostTargetNPC.container) {
      // 移动到目标位置继续攻击
      this.tweens.add({
        targets: this.ghost,
        x: this.ghostTargetNPC.container.x,
        y: this.ghostTargetNPC.container.y,
        duration: 300,
        ease: 'Power1',
        onComplete: () => {
          if (this.ghostTargetNPC && this.ghostTargetNPC.state === 'hiding') {
            this.attackCharacter(this.ghostTargetNPC)
          } else {
            // 目标死了或逃跑了，找下一个
            this.ghostTargetNPC = null
            this.returnToCorridor()
          }
        },
      })
    } else {
      // 目标死了或逃跑了，找下一个
      this.ghostTargetNPC = null
      this.returnToCorridor()
    }
  }

  private killCharacter(character: NPC) {
    character.state = 'caught'
    character.hp = 0

    // 增加击杀计数，攻击力提升
    this.ghostKillCount++
    this.ghostTargetNPC = null

    // 显示击杀信息
    const killText = this.add
      .text(this.ghost.x, this.ghost.y - 50, `击杀 +1！攻击力: ${this.getGhostDamage()}`, {
        fontSize: '18px',
        color: '#ff00ff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)

    this.tweens.add({
      targets: killText,
      alpha: 0,
      y: this.ghost.y - 80,
      duration: 1000,
      onComplete: () => killText.destroy(),
    })

    // 更新表情
    if (character.container) {
      const label = character.container.getAt(3) as Phaser.GameObjects.Text
      label.setText('💀')

      // 消失动画
      this.tweens.add({
        targets: character.container,
        alpha: 0,
        scale: 0.5,
        duration: 500,
        onComplete: () => {
          character.container?.destroy()
          character.container = undefined
        },
      })
    }

    // 从房间移除
    if (character.roomId) {
      const room = this.mapData.rooms.find((r) => r.id === character.roomId)
      if (room) {
        room.npcs = room.npcs.filter((n) => n.id !== character.id)
      }
    }
    character.roomId = null
    character.isInBed = false

    // 更新 UI
    this.updateUI()

    // 检查游戏是否结束
    this.checkGameEnd()

    // 返回走廊找下一个目标
    this.time.delayedCall(500, () => {
      this.returnToCorridor()
    })
  }

  private updateHPBar(character: NPC) {
    if (!character.hpBar) return

    const hpPercent = character.hp / character.maxHP
    const barWidth = 40 * hpPercent
    const size = character.isPlayer ? 16 : 12

    character.hpBar.clear()

    // 颜色根据血量变化
    let color = 0x00ff00 // 绿色
    if (hpPercent <= 0.3) {
      color = 0xff0000 // 红色
    } else if (hpPercent <= 0.6) {
      color = 0xffff00 // 黄色
    }

    character.hpBar.fillStyle(color)
    character.hpBar.fillRect(-20, size + 5, barWidth, 6)
  }

  // 兼容旧代码
  private catchNPC(npc: NPC) {
    this.attackCharacter(npc)
  }

  private returnToCorridor() {
    this.ghostState = 'returning'
    this.ghostTargetRoom = null

    // 返回走廊后很快选择下一个目标
    this.time.delayedCall(500 + Math.random() * 1000, () => {
      if (this.ghostState === 'patrolling') {
        this.selectTargetRoom()
      }
    })
  }

  private redrawRoom(room: Room) {
    // 重新绘制被破门的房间（门变成破碎状态）
    const doorWidth = TILE_SIZE * 1.2
    const doorHeight = TILE_SIZE * 0.5

    let doorX = room.doorX - doorWidth / 2
    let doorY: number

    if (room.row === 'top') {
      // 上排房间，门在底部墙壁上
      doorY = room.y + room.height - doorHeight
    } else {
      // 下排房间，门在顶部墙壁上
      doorY = room.y
    }

    // 用黑色覆盖原来的门
    this.graphics.fillStyle(0x000000)
    this.graphics.fillRect(doorX - 4, doorY - 4, doorWidth + 8, doorHeight + 8)

    // 绘制破碎的门框
    this.graphics.fillStyle(0x3d1f0f)
    this.graphics.fillRect(doorX - 4, doorY - 4, 8, doorHeight + 8)
    this.graphics.fillRect(doorX + doorWidth - 4, doorY - 4, 8, doorHeight + 8)

    // 添加破门效果标记
    this.add.text(room.doorX, doorY + doorHeight / 2, '💥', { fontSize: '20px' }).setOrigin(0.5)
  }

  private checkGameEnd() {
    const player = this.getPlayerCharacter()

    // 玩家死亡，游戏结束
    if (player && player.state === 'caught') {
      this.playerDied()
      return
    }

    const aliveCount = this.npcs.filter((n) => n.state !== 'caught').length

    if (aliveCount === 0) {
      // 所有人都被抓了，游戏结束
      this.ghostWins()
    }
  }

  private playerDied() {
    this.scene.pause()

    const centerX = this.cameras.main.scrollX + this.cameras.main.width / 2
    const centerY = this.cameras.main.scrollY + this.cameras.main.height / 2

    this.add
      .text(centerX, centerY, '💀 你被阿飘抓走了！\n游戏结束', {
        fontSize: '48px',
        color: '#ff0000',
        align: 'center',
        backgroundColor: '#000000aa',
        padding: { x: 30, y: 20 },
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(100)

    this.add
      .text(centerX, centerY + 80, '点击重新开始', {
        fontSize: '24px',
        color: '#ffffff',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(100)

    this.input.once('pointerdown', () => {
      this.scene.restart()
    })
  }

  private ghostWins() {
    this.scene.pause()

    const centerX = this.cameras.main.scrollX + this.cameras.main.width / 2
    const centerY = this.cameras.main.scrollY + this.cameras.main.height / 2

    this.add
      .text(centerX, centerY, '👻 阿飘胜利！\n所有人都被抓走了...', {
        fontSize: '48px',
        color: '#9c27b0',
        align: 'center',
        backgroundColor: '#000000aa',
        padding: { x: 30, y: 20 },
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(100)

    this.add
      .text(centerX, centerY + 80, '点击重新开始', {
        fontSize: '24px',
        color: '#ffffff',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(100)

    this.input.once('pointerdown', () => {
      this.scene.restart()
    })
  }

  private checkCollision() {
    // 检测玩家和鬼魂的碰撞
    const distance = Phaser.Math.Distance.Between(
      this.player.x,
      this.player.y,
      this.ghost.x,
      this.ghost.y
    )

    if (distance < 40) {
      // 游戏结束
      this.gameOver()
    }
  }

  private gameOver() {
    // 暂停游戏
    this.scene.pause()

    // 显示游戏结束文字
    const centerX = this.cameras.main.scrollX + this.cameras.main.width / 2
    const centerY = this.cameras.main.scrollY + this.cameras.main.height / 2

    this.add.text(centerX, centerY, '💀 游戏结束 💀\n被鬼魂抓住了！', {
      fontSize: '48px',
      color: '#ff0000',
      align: 'center',
      backgroundColor: '#000000aa',
      padding: { x: 30, y: 20 },
    }).setOrigin(0.5).setScrollFactor(0).setDepth(100)

    // 点击重新开始
    this.add.text(centerX, centerY + 80, '点击重新开始', {
      fontSize: '24px',
      color: '#ffffff',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(100)

    this.input.once('pointerdown', () => {
      this.scene.restart()
    })
  }

  private drawCorridor() {
    const { corridorY, corridorHeight, totalWidth } = this.mapData

    // 走廊地板
    this.graphics.fillStyle(COLORS.corridor)
    this.graphics.fillRect(0, corridorY, totalWidth, corridorHeight)

    // 走廊边界线
    this.graphics.lineStyle(2, 0x4a4a6a)
    this.graphics.strokeRect(0, corridorY, totalWidth, corridorHeight)

    // 走廊地板纹理（横线）
    this.graphics.lineStyle(1, 0x4a4a6a, 0.3)
    for (let y = corridorY; y < corridorY + corridorHeight; y += TILE_SIZE / 2) {
      this.graphics.moveTo(0, y)
      this.graphics.lineTo(totalWidth, y)
    }
    this.graphics.strokePath()
  }

  private drawRooms() {
    for (const room of this.mapData.rooms) {
      this.drawRoom(room)
    }
  }

  private drawRoom(room: Room) {
    // 房间地板
    this.graphics.fillStyle(COLORS.roomFloor)
    this.graphics.fillRect(room.x, room.y, room.width, room.height)

    // 门的尺寸（需要在墙壁上留出门口）
    const doorWidth = TILE_SIZE * 1.2
    const doorLeft = room.doorX - doorWidth / 2
    const doorRight = room.doorX + doorWidth / 2

    // 房间墙壁（分段绘制，在门的位置留出缺口）
    this.graphics.lineStyle(4, COLORS.wall)

    // 左墙
    this.graphics.moveTo(room.x, room.y)
    this.graphics.lineTo(room.x, room.y + room.height)
    this.graphics.strokePath()

    // 右墙
    this.graphics.moveTo(room.x + room.width, room.y)
    this.graphics.lineTo(room.x + room.width, room.y + room.height)
    this.graphics.strokePath()

    if (room.row === 'top') {
      // 上排房间：上墙完整，下墙分两段（门口留空）
      this.graphics.moveTo(room.x, room.y)
      this.graphics.lineTo(room.x + room.width, room.y)
      this.graphics.strokePath()

      // 下墙左段
      this.graphics.moveTo(room.x, room.y + room.height)
      this.graphics.lineTo(doorLeft, room.y + room.height)
      this.graphics.strokePath()
      // 下墙右段
      this.graphics.moveTo(doorRight, room.y + room.height)
      this.graphics.lineTo(room.x + room.width, room.y + room.height)
      this.graphics.strokePath()
    } else {
      // 下排房间：下墙完整，上墙分两段（门口留空）
      this.graphics.moveTo(room.x, room.y + room.height)
      this.graphics.lineTo(room.x + room.width, room.y + room.height)
      this.graphics.strokePath()

      // 上墙左段
      this.graphics.moveTo(room.x, room.y)
      this.graphics.lineTo(doorLeft, room.y)
      this.graphics.strokePath()
      // 上墙右段
      this.graphics.moveTo(doorRight, room.y)
      this.graphics.lineTo(room.x + room.width, room.y)
      this.graphics.strokePath()
    }

    // 房间内墙壁纹理
    this.graphics.lineStyle(1, 0x3a3a50, 0.5)
    for (let x = room.x; x < room.x + room.width; x += TILE_SIZE) {
      this.graphics.moveTo(x, room.y)
      this.graphics.lineTo(x, room.y + room.height)
    }
    for (let y = room.y; y < room.y + room.height; y += TILE_SIZE) {
      this.graphics.moveTo(room.x, y)
      this.graphics.lineTo(room.x + room.width, y)
    }
    this.graphics.strokePath()

    // 绘制门
    this.drawDoor(room)

    // 绘制床（作为隐藏点的视觉提示）
    this.drawBed(room)
  }

  private drawDoor(room: Room) {
    const doorWidth = TILE_SIZE * 1.2
    const doorHeight = TILE_SIZE * 0.5

    let doorX = room.doorX - doorWidth / 2
    let doorY: number

    if (room.row === 'top') {
      // 上排房间，门在底部墙壁上
      doorY = room.y + room.height - doorHeight
    } else {
      // 下排房间，门在顶部墙壁上
      doorY = room.y
    }

    // 为每个房间创建独立的门图形对象
    room.doorGraphics = this.add.graphics()

    // 门框
    room.doorGraphics.fillStyle(COLORS.doorFrame)
    room.doorGraphics.fillRect(doorX - 4, doorY - 4, doorWidth + 8, doorHeight + 8)

    // 门（根据类型选择颜色）
    const doorColor = room.doorType === 'iron' ? 0xc0c0c0 : COLORS.door
    room.doorGraphics.fillStyle(doorColor)
    room.doorGraphics.fillRect(doorX, doorY, doorWidth, doorHeight)

    // 门把手
    room.doorGraphics.fillStyle(0xffd700)
    room.doorGraphics.fillCircle(doorX + doorWidth * 0.8, doorY + doorHeight / 2, 3)

    // 铁门显示特殊标记
    if (room.doorType === 'iron') {
      room.doorGraphics.lineStyle(2, 0x888888)
      room.doorGraphics.strokeRect(doorX + 5, doorY + 3, doorWidth - 10, doorHeight - 6)
    }
  }

  private getBedPositions(room: Room): { x: number; y: number }[] {
    const bedWidth = TILE_SIZE * 1.5
    const bedHeight = TILE_SIZE * 0.8
    const positions: { x: number; y: number }[] = []

    if (room.bedCount >= 1) {
      // 第一张床位置
      positions.push({
        x: room.x + TILE_SIZE * 0.5 + bedWidth / 2,
        y: room.y + TILE_SIZE * 0.5 + bedHeight / 2,
      })
    }

    if (room.bedCount >= 2) {
      // 第二张床位置（在右边）
      positions.push({
        x: room.x + room.width - TILE_SIZE * 0.5 - bedWidth / 2,
        y: room.y + TILE_SIZE * 0.5 + bedHeight / 2,
      })
    }

    return positions
  }

  private drawBed(room: Room) {
    const bedWidth = TILE_SIZE * 1.5
    const bedHeight = TILE_SIZE * 0.8

    // 绘制所有床位
    for (let i = 0; i < room.bedCount; i++) {
      let bedX: number
      let bedY = room.y + TILE_SIZE * 0.5

      if (i === 0) {
        // 第一张床在左边
        bedX = room.x + TILE_SIZE * 0.5
      } else {
        // 第二张床在右边
        bedX = room.x + room.width - TILE_SIZE * 0.5 - bedWidth
      }

      // 床架
      this.graphics.fillStyle(0x4a3728)
      this.graphics.fillRect(bedX, bedY, bedWidth, bedHeight)

      // 床垫
      this.graphics.fillStyle(0x6b8e9f)
      this.graphics.fillRect(bedX + 4, bedY + 4, bedWidth - 8, bedHeight - 8)

      // 枕头
      this.graphics.fillStyle(0xf5f5dc)
      this.graphics.fillRect(bedX + 8, bedY + 8, bedWidth * 0.3, bedHeight - 16)
    }
  }

  private drawMainDoor() {
    const { mainDoorX, mainDoorY, corridorY, corridorHeight } = this.mapData
    const doorWidth = TILE_SIZE * 1.5
    const doorHeight = TILE_SIZE

    // 从走廊到大门的通道
    const passageWidth = TILE_SIZE * 2
    const passageX = mainDoorX - passageWidth / 2
    const passageY = corridorY + corridorHeight
    const passageHeight = mainDoorY - passageY

    this.graphics.fillStyle(COLORS.corridor)
    this.graphics.fillRect(passageX, passageY, passageWidth, passageHeight)

    // 通道边界
    this.graphics.lineStyle(2, 0x4a4a6a)
    this.graphics.strokeRect(passageX, passageY, passageWidth, passageHeight)

    // 大门框
    this.graphics.fillStyle(0x2f1f0f)
    this.graphics.fillRect(
      mainDoorX - doorWidth / 2 - 8,
      mainDoorY - 8,
      doorWidth + 16,
      doorHeight + 16
    )

    // 大门
    this.graphics.fillStyle(COLORS.mainDoor)
    this.graphics.fillRect(mainDoorX - doorWidth / 2, mainDoorY, doorWidth, doorHeight)

    // 门的装饰
    this.graphics.lineStyle(3, 0x8b4513)
    this.graphics.strokeRect(
      mainDoorX - doorWidth / 2 + 10,
      mainDoorY + 10,
      doorWidth - 20,
      doorHeight - 20
    )

    // 门把手
    this.graphics.fillStyle(0xffd700)
    this.graphics.fillCircle(mainDoorX + doorWidth * 0.3, mainDoorY + doorHeight / 2, 5)

    // 大门标签
    this.add
      .text(mainDoorX, mainDoorY + doorHeight + 20, '[大门]', {
        fontSize: '16px',
        color: '#888888',
      })
      .setOrigin(0.5)
  }

  private drawRoomLabels() {
    for (const room of this.mapData.rooms) {
      // 房间号标签
      this.add
        .text(room.x + room.width / 2, room.y + room.height / 2, room.id, {
          fontSize: '24px',
          color: '#666666',
          fontStyle: 'bold',
        })
        .setOrigin(0.5)
    }
  }
}

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: '#0a0a14',
  parent: document.body,
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: MainScene,
}

new Phaser.Game(config)
