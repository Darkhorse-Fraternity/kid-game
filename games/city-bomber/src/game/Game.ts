import * as THREE from 'three';
import { Airplane } from './Airplane';
import { AntiAircraftGun } from './AntiAircraftGun';
import { Bomb } from './Bomb';
import { Bullet } from './Bullet';
import { City } from './City';
import { Explosion } from './Explosion';
import { Fire } from './Fire';
import { GroundObjects } from './GroundObjects';
import { Landscape } from './Landscape';
import { NetworkManager } from './NetworkManager';
import { RemoteAirplane } from './RemoteAirplane';

export class Game {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;

  private airplane!: Airplane;
  private city!: City;
  private city2!: City;
  private landscape!: Landscape;
  private groundObjects!: GroundObjects;
  private antiAircraftGuns: AntiAircraftGun[] = [];
  private bombs: Bomb[] = [];
  private bullets: Bullet[] = [];
  private remoteBullets: Bullet[] = [];
  private explosions: Explosion[] = [];
  private fires: Fire[] = [];

  private score = 0;
  private gameOver = false;
  private clock: THREE.Clock;

  private scoreElement!: HTMLElement;
  private buildingsElement!: HTMLElement;
  private gameOverElement!: HTMLElement;
  private finalScoreElement!: HTMLElement;
  private finalBuildingsElement!: HTMLElement;

  // 网络相关
  private networkManager: NetworkManager;
  private remoteAirplane: RemoteAirplane | null = null;
  private isMultiplayer = false;
  private gameStarted = false;
  private lobbyElement!: HTMLElement;
  private roomIdInput!: HTMLInputElement;
  private roomIdDisplay!: HTMLElement;
  private lobbyStatus!: HTMLElement;
  private networkUpdateInterval = 0.05; // 每50ms发送一次位置更新
  private networkUpdateTimer = 0;

  // 机枪相关
  private isFiring = false;
  private fireRate = 0.08; // 每0.08秒发射一颗子弹
  private fireTimer = 0;

  // 血量相关
  private health = 10;
  private maxHealth = 10;
  private healthElement!: HTMLElement;
  private remoteHealth = 10;

  // 雷达相关
  private radarCanvas!: HTMLCanvasElement;
  private radarCtx!: CanvasRenderingContext2D;
  private radarRange = 300; // 雷达探测范围

  constructor() {
    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87ceeb);
    this.scene.fog = new THREE.Fog(0x87ceeb, 50, 200);

    // Camera
    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.body.appendChild(this.renderer.domElement);

    // Clock
    this.clock = new THREE.Clock();

    // Network Manager
    this.networkManager = new NetworkManager();

    // UI Elements
    this.scoreElement = document.getElementById('score') as HTMLElement;
    this.buildingsElement = document.getElementById('buildings') as HTMLElement;
    this.gameOverElement = document.getElementById('game-over') as HTMLElement;
    this.finalScoreElement = document.getElementById('final-score') as HTMLElement;
    this.finalBuildingsElement = document.getElementById('final-buildings') as HTMLElement;
    this.lobbyElement = document.getElementById('lobby') as HTMLElement;
    this.roomIdInput = document.getElementById('room-id-input') as HTMLInputElement;
    this.roomIdDisplay = document.getElementById('room-id-display') as HTMLElement;
    this.lobbyStatus = document.getElementById('lobby-status') as HTMLElement;
    this.healthElement = document.getElementById('health') as HTMLElement;
    this.radarCanvas = document.getElementById('radar-canvas') as HTMLCanvasElement;
    this.radarCtx = this.radarCanvas.getContext('2d') as CanvasRenderingContext2D;

    // Setup scene
    this.setupLights();
    this.setupGround();

    // Ground objects (roads, cars, people, military bases, anti-aircraft guns)
    this.groundObjects = new GroundObjects();
    this.scene.add(this.groundObjects.group);

    // 湖泊和大桥
    this.landscape = new Landscape();
    this.scene.add(this.landscape.group);

    // Game objects - 两座城市
    this.city = new City(-200, 0); // 左边的城市
    this.scene.add(this.city.group);

    this.city2 = new City(250, 0); // 右边的城市（湖泊另一侧）
    this.scene.add(this.city2.group);

    this.airplane = new Airplane();
    this.scene.add(this.airplane.group);

    // 防空炮
    this.setupAntiAircraftGuns();

    // Events
    this.setupEvents();
    this.setupLobbyEvents();
    this.setupNetworkEvents();

    // 显示大厅，隐藏游戏UI
    this.showLobby();

    // 页面卸载时断开连接（防止热更新导致对方卡死）
    window.addEventListener('beforeunload', () => {
      this.networkManager.disconnect();
    });

    // Start render loop (but game logic waits for start)
    this.animate();
  }

  private showLobby(): void {
    if (this.lobbyElement) {
      this.lobbyElement.style.display = 'block';
    }
    this.scoreElement.style.display = 'none';
    this.buildingsElement.style.display = 'none';
    this.gameStarted = false;
  }

  private hideLobby(): void {
    if (this.lobbyElement) {
      this.lobbyElement.style.display = 'none';
    }
    this.scoreElement.style.display = 'block';
    this.buildingsElement.style.display = 'block';
  }

  private setupLobbyEvents(): void {
    const singlePlayerBtn = document.getElementById('single-player-btn');
    const createRoomBtn = document.getElementById('create-room-btn');
    const joinRoomBtn = document.getElementById('join-room-btn');

    singlePlayerBtn?.addEventListener('click', () => {
      this.startSinglePlayer();
    });

    createRoomBtn?.addEventListener('click', () => {
      this.createRoom();
    });

    joinRoomBtn?.addEventListener('click', () => {
      const roomId = this.roomIdInput?.value.trim();
      if (roomId) {
        this.joinRoom(roomId);
      }
    });
  }

  private startSinglePlayer(): void {
    this.isMultiplayer = false;
    this.gameStarted = true;
    this.hideLobby();
    this.updateUI();
  }

  private async createRoom(): Promise<void> {
    try {
      this.lobbyStatus.textContent = '正在连接服务器...';
      await this.networkManager.connect();
      this.lobbyStatus.textContent = '已连接，正在创建房间...';
      this.networkManager.createRoom();
    } catch (error) {
      console.error('Connection error:', error);
      this.lobbyStatus.textContent = '连接失败，请确保服务器已启动 (npm run server)';
    }
  }

  private async joinRoom(roomId: string): Promise<void> {
    try {
      this.lobbyStatus.textContent = '正在连接服务器...';
      await this.networkManager.connect();
      this.lobbyStatus.textContent = '已连接，正在加入房间...';
      this.networkManager.joinRoom(roomId);
    } catch (error) {
      console.error('Connection error:', error);
      this.lobbyStatus.textContent = '连接失败，请确保服务器已启动 (npm run server)';
    }
  }

  private setupNetworkEvents(): void {
    this.networkManager.on('room_created', (data: unknown) => {
      const msg = data as { roomId: string; playerNumber: number };
      this.roomIdDisplay.textContent = `房间号: ${msg.roomId}`;
      this.lobbyStatus.textContent = '等待其他玩家加入...';
      this.isMultiplayer = true;
      // 玩家1从左侧出发
      this.airplane.position.set(-50, 40, 0);
      this.airplane.rotation = 0;
    });

    this.networkManager.on('room_joined', (data: unknown) => {
      const msg = data as { roomId: string; playerNumber: number };
      this.roomIdDisplay.textContent = `房间号: ${msg.roomId}`;
      this.lobbyStatus.textContent = '已加入房间，等待游戏开始...';
      this.isMultiplayer = true;
      // 玩家2从右侧出发，面向左边
      this.airplane.position.set(50, 40, 0);
      this.airplane.rotation = Math.PI;
    });

    this.networkManager.on('player_joined', () => {
      this.lobbyStatus.textContent = '对手已加入，游戏即将开始...';
    });

    this.networkManager.on('game_start', () => {
      this.gameStarted = true;
      this.hideLobby();
      this.updateUI();
      // 创建远程飞机 (对方颜色为红色)
      const remoteColor = this.networkManager.playerNumber === 1 ? 0xaa2222 : 0x2222aa;
      const remoteStartPos = this.networkManager.playerNumber === 1
        ? { x: 50, y: 40, z: 0 }
        : { x: -50, y: 40, z: 0 };
      this.remoteAirplane = new RemoteAirplane('remote', remoteColor);
      this.remoteAirplane.position.set(remoteStartPos.x, remoteStartPos.y, remoteStartPos.z);
      this.scene.add(this.remoteAirplane.group);
    });

    this.networkManager.on('player_state', (data: unknown) => {
      const msg = data as {
        playerId: string;
        data: { position: { x: number; y: number; z: number }; rotation: number; pitch: number; speed: number };
      };
      if (this.remoteAirplane) {
        this.remoteAirplane.updateFromNetwork(msg.data);
      }
    });

    this.networkManager.on('bullet_fired', (data: unknown) => {
      const msg = data as {
        data: { position: { x: number; y: number; z: number }; direction: { x: number; y: number; z: number } };
      };
      const pos = new THREE.Vector3(msg.data.position.x, msg.data.position.y, msg.data.position.z);
      const dir = new THREE.Vector3(msg.data.direction.x, msg.data.direction.y, msg.data.direction.z);
      const bullet = new Bullet(pos, dir);
      this.remoteBullets.push(bullet);
      this.scene.add(bullet.mesh);
    });

    this.networkManager.on('bomb_dropped', (data: unknown) => {
      const msg = data as {
        data: { position: { x: number; y: number; z: number }; velocity: { x: number; y: number; z: number } };
      };
      const pos = new THREE.Vector3(msg.data.position.x, msg.data.position.y, msg.data.position.z);
      const vel = new THREE.Vector3(msg.data.velocity.x, msg.data.velocity.y, msg.data.velocity.z);
      const bomb = new Bomb(pos, vel);
      this.bombs.push(bomb);
      this.scene.add(bomb.mesh);
    });

    this.networkManager.on('player_killed', (data: unknown) => {
      const msg = data as { playerId: string; data: { killerId: string } };
      if (msg.playerId === this.networkManager.playerId) {
        // 本机被击落
        const explosion = new Explosion(this.airplane.getPosition());
        this.explosions.push(explosion);
        this.scene.add(explosion.group);
        this.respawnAirplane();
      } else if (this.remoteAirplane) {
        // 对方被击落
        const explosion = new Explosion(this.remoteAirplane.getPosition());
        this.explosions.push(explosion);
        this.scene.add(explosion.group);
        this.score += 1000;
        this.updateUI();
        // 对方复活
        setTimeout(() => {
          if (this.remoteAirplane) {
            this.remoteAirplane.alive = true;
            this.remoteAirplane.group.visible = true;
          }
        }, 2000);
      }
    });

    this.networkManager.on('player_damaged', (data: unknown) => {
      const msg = data as { playerId: string; data: { health: number; attackerId: string } };
      if (msg.playerId === this.networkManager.playerId) {
        // 本机被击中
        this.health = msg.data.health;
        this.updateHealthUI();
        if (this.health <= 0) {
          const explosion = new Explosion(this.airplane.getPosition());
          this.explosions.push(explosion);
          this.scene.add(explosion.group);
        }
      } else {
        // 对方被击中
        this.remoteHealth = msg.data.health;
      }
    });

    this.networkManager.on('player_respawn', (data: unknown) => {
      const msg = data as { playerId: string; data: { health: number } };
      if (msg.playerId === this.networkManager.playerId) {
        // 本机复活
        this.health = msg.data.health;
        this.updateHealthUI();
      } else {
        // 对方复活
        this.remoteHealth = msg.data.health;
        if (this.remoteAirplane) {
          this.remoteAirplane.alive = true;
          this.remoteAirplane.group.visible = true;
        }
      }
    });

    this.networkManager.on('player_left', () => {
      this.lobbyStatus.textContent = '对手已离开';
      if (this.remoteAirplane) {
        this.scene.remove(this.remoteAirplane.group);
        this.remoteAirplane = null;
      }
    });

    this.networkManager.on('error', (data: unknown) => {
      const msg = data as { message: string };
      this.lobbyStatus.textContent = `错误: ${msg.message}`;
    });
  }

  private setupLights(): void {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(50, 100, 50);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 500;
    directionalLight.shadow.camera.left = -100;
    directionalLight.shadow.camera.right = 100;
    directionalLight.shadow.camera.top = 100;
    directionalLight.shadow.camera.bottom = -100;
    this.scene.add(directionalLight);
  }

  private setupGround(): void {
    // 扩大地图以容纳两座城市和湖泊
    const groundGeometry = new THREE.PlaneGeometry(1000, 600);
    const groundMaterial = new THREE.MeshLambertMaterial({ color: 0x3a5f3a });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);
  }

  private setupAntiAircraftGuns(): void {
    // 只放置1个防空炮
    const gun = new AntiAircraftGun(0, 50);
    this.antiAircraftGuns.push(gun);
    this.scene.add(gun.group);
  }

  private setupEvents(): void {
    window.addEventListener('resize', () => this.onResize());
    window.addEventListener('keydown', (e) => this.onKeyDown(e));
    window.addEventListener('keyup', (e) => this.onKeyUp(e));
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private onKeyDown(event: KeyboardEvent): void {
    if (!this.gameStarted) return;

    if (event.code === 'Digit1' && !this.gameOver) {
      event.preventDefault();
      this.dropBomb();
    }
    if (event.code === 'Digit2' && !this.gameOver) {
      event.preventDefault();
      this.isFiring = true;
    }
    if (event.code === 'KeyR') {
      location.reload();
    }
  }

  private onKeyUp(event: KeyboardEvent): void {
    if (event.code === 'Digit2') {
      this.isFiring = false;
    }
  }

  private fireBullet(): void {
    const position = this.airplane.getPosition();
    const direction = this.airplane.getDirection();

    // 子弹从飞机前方发射
    const bulletPos = position.clone().add(direction.clone().multiplyScalar(5));
    const bullet = new Bullet(bulletPos, direction);
    this.bullets.push(bullet);
    this.scene.add(bullet.mesh);

    // 发送网络消息
    if (this.isMultiplayer && this.networkManager.connected) {
      this.networkManager.sendBulletFired({
        position: { x: bulletPos.x, y: bulletPos.y, z: bulletPos.z },
        direction: { x: direction.x, y: direction.y, z: direction.z },
      });
    }
  }

  private dropBomb(): void {
    const position = this.airplane.getPosition();
    const direction = this.airplane.getDirection();

    // Give bomb some forward velocity based on airplane movement
    const velocity = direction.clone().multiplyScalar(10);

    const bomb = new Bomb(position, velocity);
    this.bombs.push(bomb);
    this.scene.add(bomb.mesh);

    // 发送网络消息
    if (this.isMultiplayer && this.networkManager.connected) {
      this.networkManager.sendBombDropped({
        position: { x: position.x, y: position.y, z: position.z },
        velocity: { x: velocity.x, y: velocity.y, z: velocity.z },
      });
    }
  }

  private checkCollisions(): void {
    // 合并两座城市的建筑
    const allBuildings = [
      ...this.city.getActiveBuildings(),
      ...this.city2.getActiveBuildings()
    ];

    // 检查炸弹碰撞
    for (const bomb of this.bombs) {
      if (!bomb.active) continue;

      const bombPos = bomb.getPosition();
      let hitBuilding = false;

      // 检查与建筑碰撞
      for (const building of allBuildings) {
        const bbox = building.getBoundingBox();

        if (bbox.containsPoint(bombPos)) {
          // 击中建筑
          bomb.active = false;
          hitBuilding = true;
          this.score += building.getScore();

          // Create explosion
          const explosion = new Explosion(bombPos);
          this.explosions.push(explosion);
          this.scene.add(explosion.group);

          // 建筑起火燃烧（不消失）
          building.startBurning();

          // 创建火焰效果
          const firePos = building.getWorldPosition();
          const fire = new Fire(firePos, building.height);
          this.fires.push(fire);
          this.scene.add(fire.group);

          this.updateUI();
          break;
        }
      }

      // 如果没有击中建筑，检查是否碰到地面或桥
      if (!hitBuilding && bomb.active) {
        // 桥面高度约8，检查是否在桥上
        const onBridge = Math.abs(bombPos.z) < 8 && Math.abs(bombPos.x) < 60;
        const bridgeHeight = 8;

        if (onBridge && bombPos.y <= bridgeHeight) {
          // 击中桥面
          bomb.active = false;
          const explosionPos = bombPos.clone();
          explosionPos.y = bridgeHeight;
          const explosion = new Explosion(explosionPos);
          this.explosions.push(explosion);
          this.scene.add(explosion.group);

          // 桥面起火
          const fire = new Fire(explosionPos, 5);
          this.fires.push(fire);
          this.scene.add(fire.group);
        } else if (bombPos.y <= 0) {
          // 击中地面
          bomb.active = false;
          const explosionPos = bombPos.clone();
          explosionPos.y = 0;
          const explosion = new Explosion(explosionPos);
          this.explosions.push(explosion);
          this.scene.add(explosion.group);

          // 地面起火
          const fire = new Fire(explosionPos, 3);
          this.fires.push(fire);
          this.scene.add(fire.group);
        }
      }
    }

    // 检查飞机碰撞
    if (!this.gameOver) {
      const planePos = this.airplane.getPosition();
      let crashed = false;

      // 检查与建筑碰撞
      const planeBox = new THREE.Box3(
        new THREE.Vector3(planePos.x - 3, planePos.y - 1, planePos.z - 3),
        new THREE.Vector3(planePos.x + 3, planePos.y + 1, planePos.z + 3)
      );

      for (const building of allBuildings) {
        const bbox = building.getBoundingBox();
        if (planeBox.intersectsBox(bbox)) {
          crashed = true;
          break;
        }
      }

      // 检查与地面碰撞
      if (!crashed && planePos.y <= 1) {
        crashed = true;
      }

      // 检查与桥碰撞
      if (!crashed) {
        const onBridge = Math.abs(planePos.z) < 8 && Math.abs(planePos.x) < 60;
        if (onBridge && planePos.y <= 10) {
          crashed = true;
        }
      }

      // 检查与山碰撞
      if (!crashed) {
        const mountainData = [
          { x: -40, z: 80, height: 45, radius: 25 },
          { x: 0, z: 100, height: 60, radius: 30 },
          { x: 40, z: 85, height: 50, radius: 28 },
          { x: -70, z: 70, height: 35, radius: 20 },
          { x: 70, z: 75, height: 40, radius: 22 },
          { x: -45, z: -80, height: 50, radius: 26 },
          { x: 5, z: -95, height: 55, radius: 28 },
          { x: 50, z: -85, height: 45, radius: 24 },
          { x: -75, z: -65, height: 38, radius: 20 },
          { x: 75, z: -70, height: 42, radius: 22 },
        ];

        for (const m of mountainData) {
          const dx = planePos.x - m.x;
          const dz = planePos.z - m.z;
          const dist = Math.sqrt(dx * dx + dz * dz);
          // 锥形山：底部半径为m.radius，顶部为0
          const heightAtDist = m.height * (1 - dist / m.radius);
          if (dist < m.radius && planePos.y <= heightAtDist) {
            crashed = true;
            break;
          }
        }
      }

      // 飞机坠毁 - 复活而不是游戏结束
      if (crashed) {
        const explosion = new Explosion(planePos);
        this.explosions.push(explosion);
        this.scene.add(explosion.group);

        // 复活飞机
        this.respawnAirplane();
      }
    }
  }

  private respawnAirplane(): void {
    // 先隐藏飞机
    this.airplane.group.visible = false;

    // 2秒后复活
    setTimeout(() => {
      // 重置飞机位置到安全高度
      this.airplane.position.set(0, 50, 0);
      this.airplane.rotation = 0;
      this.airplane.pitch = 0;
      this.airplane.speed = 30;
      this.airplane.group.visible = true;
    }, 2000);
  }

  private updateUI(): void {
    this.scoreElement.textContent = `得分: ${this.score}`;
    const totalDestroyed = this.city.getDestroyedCount() + this.city2.getDestroyedCount();
    const totalBuildings = this.city.getTotalBuildings() + this.city2.getTotalBuildings();
    this.buildingsElement.textContent = `建筑: ${totalDestroyed} / ${totalBuildings}`;
    this.updateHealthUI();
  }

  private updateHealthUI(): void {
    const hearts = '❤️'.repeat(this.health) + '🖤'.repeat(this.maxHealth - this.health);
    this.healthElement.textContent = `血量: ${hearts}`;
  }

  private updateRadar(): void {
    const ctx = this.radarCtx;
    const size = 150;
    const center = size / 2;
    const myPos = this.airplane.getPosition();
    const myRotation = this.airplane.rotation;
    const scale = (center - 10) / this.radarRange;

    // 坐标转换函数：世界坐标 -> 雷达坐标
    const toRadar = (worldX: number, worldZ: number): { x: number; y: number } => {
      const dx = worldX - myPos.x;
      const dz = worldZ - myPos.z;
      const cos = Math.cos(-myRotation);
      const sin = Math.sin(-myRotation);
      const rx = dx * cos - dz * sin;
      const rz = dx * sin + dz * cos;
      return {
        x: center + rx * scale,
        y: center - rz * scale,
      };
    };

    // 清空画布
    ctx.clearRect(0, 0, size, size);

    // 画雷达背景圆
    ctx.fillStyle = 'rgba(0, 40, 0, 0.8)';
    ctx.beginPath();
    ctx.arc(center, center, center - 2, 0, Math.PI * 2);
    ctx.fill();

    // 画空气墙边界（地图边界 500x300）
    ctx.strokeStyle = 'rgba(255, 0, 0, 0.6)';
    ctx.lineWidth = 2;
    const bounds = [
      { x: -500, z: -300 },
      { x: 500, z: -300 },
      { x: 500, z: 300 },
      { x: -500, z: 300 },
    ];
    ctx.beginPath();
    const p0 = toRadar(bounds[0].x, bounds[0].z);
    ctx.moveTo(p0.x, p0.y);
    for (let i = 1; i <= bounds.length; i++) {
      const p = toRadar(bounds[i % bounds.length].x, bounds[i % bounds.length].z);
      ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();

    // 画同心圆
    ctx.strokeStyle = 'rgba(0, 255, 0, 0.3)';
    ctx.lineWidth = 1;
    for (let r = 25; r < center; r += 25) {
      ctx.beginPath();
      ctx.arc(center, center, r, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 画十字线
    ctx.beginPath();
    ctx.moveTo(center, 0);
    ctx.lineTo(center, size);
    ctx.moveTo(0, center);
    ctx.lineTo(size, center);
    ctx.stroke();

    // 画高射炮位置（黄色方块）
    ctx.fillStyle = '#ff0';
    for (const gun of this.antiAircraftGuns) {
      const gunRadar = toRadar(gun.position.x, gun.position.z);
      const dist = Math.sqrt((gun.position.x - myPos.x) ** 2 + (gun.position.z - myPos.z) ** 2);
      if (dist < this.radarRange) {
        ctx.fillRect(gunRadar.x - 3, gunRadar.y - 3, 6, 6);
      }
    }

    // 本机位置（中心绿色三角形，指向前方）
    ctx.fillStyle = '#0f0';
    ctx.beginPath();
    ctx.moveTo(center, center - 6); // 前方
    ctx.lineTo(center - 4, center + 4);
    ctx.lineTo(center + 4, center + 4);
    ctx.closePath();
    ctx.fill();

    // 显示敌机位置
    if (this.remoteAirplane?.alive) {
      const enemyPos = this.remoteAirplane.getPosition();
      const dist = Math.sqrt((enemyPos.x - myPos.x) ** 2 + (enemyPos.z - myPos.z) ** 2);

      if (dist < this.radarRange) {
        const enemyRadar = toRadar(enemyPos.x, enemyPos.z);

        // 画敌机（红点）
        ctx.fillStyle = '#f00';
        ctx.beginPath();
        ctx.arc(enemyRadar.x, enemyRadar.y, 5, 0, Math.PI * 2);
        ctx.fill();

        // 敌机血量指示
        ctx.fillStyle = '#fff';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`${this.remoteHealth}`, enemyRadar.x, enemyRadar.y - 8);
      }
    }

    // 扫描线效果
    const time = Date.now() / 1000;
    const scanAngle = (time % 2) * Math.PI;
    ctx.strokeStyle = 'rgba(0, 255, 0, 0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(center, center);
    ctx.lineTo(
      center + Math.cos(scanAngle) * (center - 5),
      center - Math.sin(scanAngle) * (center - 5)
    );
    ctx.stroke();
  }

  private takeDamage(amount: number): void {
    this.health -= amount;
    this.updateHealthUI();

    if (this.health <= 0) {
      // 死亡，爆炸并复活
      const explosion = new Explosion(this.airplane.getPosition());
      this.explosions.push(explosion);
      this.scene.add(explosion.group);
      this.health = this.maxHealth;
      this.respawnAirplane();
    }
  }

  private showGameOver(): void {
    this.gameOver = true;
    this.gameOverElement.style.display = 'block';
    this.finalScoreElement.textContent = `最终得分: ${this.score}`;
    this.finalBuildingsElement.textContent = `摧毁建筑: ${this.city.getDestroyedCount()} / ${this.city.getTotalBuildings()}`;
  }

  private updateCamera(): void {
    const planePos = this.airplane.getPosition();
    const planeDir = this.airplane.getDirection();

    // Position camera behind and above the airplane
    const cameraOffset = planeDir.clone().multiplyScalar(-25);
    cameraOffset.y = 15;

    this.camera.position.copy(planePos).add(cameraOffset);
    this.camera.lookAt(planePos.x, planePos.y - 10, planePos.z);
  }

  private checkBulletCollisions(): void {
    const allBuildings = [
      ...this.city.getActiveBuildings(),
      ...this.city2.getActiveBuildings()
    ];

    // 检查本地子弹碰撞（击中对方飞机）
    for (const bullet of this.bullets) {
      if (!bullet.active) continue;

      const bulletPos = bullet.getPosition();

      // 检查子弹是否击中远程飞机
      if (this.remoteAirplane?.alive) {
        const remotePos = this.remoteAirplane.getPosition();
        const dist = bulletPos.distanceTo(remotePos);
        if (dist < 5) {
          bullet.active = false;

          // 敌机扣1血
          this.remoteHealth -= 1;
          this.score += 100; // 命中得分

          // 通知服务器击中对方
          if (this.networkManager.connected) {
            this.networkManager.sendPlayerHit('remote');
          }

          if (this.remoteHealth <= 0) {
            // 敌机死亡，爆炸
            const explosion = new Explosion(remotePos);
            this.explosions.push(explosion);
            this.scene.add(explosion.group);

            // 隐藏敌机
            this.remoteAirplane.alive = false;
            this.remoteAirplane.group.visible = false;

            // 击杀加分
            this.score += 1000;

            // 2秒后敌机复活
            setTimeout(() => {
              if (this.remoteAirplane) {
                this.remoteAirplane.alive = true;
                this.remoteAirplane.group.visible = true;
                this.remoteHealth = 10; // 复活满血
              }
            }, 2000);
          }

          this.updateUI();
          continue;
        }
      }

      // 检查子弹与建筑碰撞
      for (const building of allBuildings) {
        const bbox = building.getBoundingBox();
        if (bbox.containsPoint(bulletPos)) {
          bullet.active = false;
          this.score += 10;

          // 小爆炸效果
          const explosion = new Explosion(bulletPos);
          this.explosions.push(explosion);
          this.scene.add(explosion.group);

          // 建筑起火
          building.startBurning();
          const firePos = building.getWorldPosition();
          const fire = new Fire(firePos, building.height);
          this.fires.push(fire);
          this.scene.add(fire.group);

          this.updateUI();
          break;
        }
      }

      // 检查子弹与防空炮碰撞
      if (bullet.active) {
        for (const gun of this.antiAircraftGuns) {
          const gunPos = gun.position;
          const dist = bulletPos.distanceTo(gunPos);
          if (dist < 3) {
            bullet.active = false;
            this.score += 50;

            const explosion = new Explosion(bulletPos);
            this.explosions.push(explosion);
            this.scene.add(explosion.group);

            // 移除防空炮
            this.scene.remove(gun.group);
            this.antiAircraftGuns = this.antiAircraftGuns.filter(g => g !== gun);

            this.updateUI();
            break;
          }
        }
      }
    }

    // 检查远程子弹碰撞（对方的子弹击中本机）
    const myPlanePos = this.airplane.getPosition();
    for (const bullet of this.remoteBullets) {
      if (!bullet.active) continue;

      const bulletPos = bullet.getPosition();
      const dist = bulletPos.distanceTo(myPlanePos);
      if (dist < 5) {
        bullet.active = false;
        // 本机被击中，扣1血
        this.takeDamage(1);
      }
    }
  }

  private cleanup(): void {
    // Remove inactive bullets
    this.bullets = this.bullets.filter(bullet => {
      if (!bullet.active) {
        this.scene.remove(bullet.mesh);
        bullet.dispose();
        return false;
      }
      return true;
    });

    // Remove inactive remote bullets
    this.remoteBullets = this.remoteBullets.filter(bullet => {
      if (!bullet.active) {
        this.scene.remove(bullet.mesh);
        bullet.dispose();
        return false;
      }
      return true;
    });

    // Remove inactive bombs
    this.bombs = this.bombs.filter(bomb => {
      if (!bomb.active) {
        this.scene.remove(bomb.mesh);
        bomb.dispose();
        return false;
      }
      return true;
    });

    // Remove finished explosions
    this.explosions = this.explosions.filter(explosion => {
      if (!explosion.active) {
        this.scene.remove(explosion.group);
        explosion.dispose();
        return false;
      }
      return true;
    });

    // Remove finished fires
    this.fires = this.fires.filter(fire => {
      if (!fire.active) {
        this.scene.remove(fire.group);
        fire.dispose();
        return false;
      }
      return true;
    });
  }

  private animate = (): void => {
    requestAnimationFrame(this.animate);

    const deltaTime = this.clock.getDelta();

    // Update ground objects (moving cars)
    this.groundObjects.update(deltaTime);

    if (!this.gameOver && this.gameStarted) {
      // Update airplane
      this.airplane.update(deltaTime);

      // 发送网络位置更新
      if (this.isMultiplayer && this.networkManager.connected) {
        this.networkUpdateTimer += deltaTime;
        if (this.networkUpdateTimer >= this.networkUpdateInterval) {
          this.networkUpdateTimer = 0;
          const pos = this.airplane.getPosition();
          this.networkManager.sendPlayerUpdate({
            position: { x: pos.x, y: pos.y, z: pos.z },
            rotation: this.airplane.rotation,
            pitch: this.airplane.pitch,
            speed: this.airplane.speed,
          });
        }
      }

      // 更新远程飞机
      if (this.remoteAirplane) {
        this.remoteAirplane.update(deltaTime);
      }

      // Check for game over
      if (this.airplane.hasCompletedLoop()) {
        this.showGameOver();
      }

      // Update bombs
      for (const bomb of this.bombs) {
        bomb.update(deltaTime);
      }

      // 机枪连射
      if (this.isFiring) {
        this.fireTimer += deltaTime;
        if (this.fireTimer >= this.fireRate) {
          this.fireTimer = 0;
          this.fireBullet();
        }
      }

      // Update bullets and check for hits
      for (const bullet of this.bullets) {
        bullet.update(deltaTime);
      }

      // Update remote bullets
      for (const bullet of this.remoteBullets) {
        bullet.update(deltaTime);
      }

      this.checkBulletCollisions();

      // Update anti-aircraft guns and check if airplane is hit
      const airplanePos = this.airplane.getPosition();
      for (const gun of this.antiAircraftGuns) {
        const hit = gun.update(deltaTime, airplanePos, this.scene);
        if (hit) {
          // Airplane hit by anti-aircraft fire - respawn instead of game over
          const explosion = new Explosion(airplanePos);
          this.explosions.push(explosion);
          this.scene.add(explosion.group);
          this.respawnAirplane();
          break;
        }
      }

      // Check collisions
      this.checkCollisions();
    }

    // Update explosions (even after game over for visual effect)
    for (const explosion of this.explosions) {
      explosion.update(deltaTime);
    }

    // Update fires
    for (const fire of this.fires) {
      fire.update(deltaTime);
    }

    // Cleanup
    this.cleanup();

    // Update camera
    this.updateCamera();

    // 更新雷达（多人模式）
    if (this.isMultiplayer && this.gameStarted) {
      this.updateRadar();
    }

    // Render
    this.renderer.render(this.scene, this.camera);
  };
}
