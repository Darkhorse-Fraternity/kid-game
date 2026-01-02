import * as THREE from 'three';
import { Airplane } from './Airplane';
import { Bomb } from './Bomb';
import { City } from './City';
import { Explosion } from './Explosion';
import { Fire } from './Fire';
import { GroundObjects } from './GroundObjects';

export class Game {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;

  private airplane: Airplane;
  private city: City;
  private bombs: Bomb[] = [];
  private explosions: Explosion[] = [];
  private fires: Fire[] = [];

  private score = 0;
  private gameOver = false;
  private clock: THREE.Clock;

  private scoreElement: HTMLElement;
  private buildingsElement: HTMLElement;
  private gameOverElement: HTMLElement;
  private finalScoreElement: HTMLElement;
  private finalBuildingsElement: HTMLElement;

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

    // UI Elements
    this.scoreElement = document.getElementById('score')!;
    this.buildingsElement = document.getElementById('buildings')!;
    this.gameOverElement = document.getElementById('game-over')!;
    this.finalScoreElement = document.getElementById('final-score')!;
    this.finalBuildingsElement = document.getElementById('final-buildings')!;

    // Setup
    this.setupLights();
    this.setupGround();

    // Ground objects (roads, cars, people, military bases, anti-aircraft guns)
    const groundObjects = new GroundObjects();
    this.scene.add(groundObjects.group);

    // Game objects
    this.city = new City();
    this.scene.add(this.city.group);

    this.airplane = new Airplane();
    this.scene.add(this.airplane.group);

    // Events
    this.setupEvents();

    // Initial UI
    this.updateUI();

    // Start
    this.animate();
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
    const groundGeometry = new THREE.PlaneGeometry(500, 500);
    const groundMaterial = new THREE.MeshLambertMaterial({ color: 0x3a5f3a });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);
  }

  private setupEvents(): void {
    window.addEventListener('resize', () => this.onResize());
    window.addEventListener('keydown', (e) => this.onKeyDown(e));
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private onKeyDown(event: KeyboardEvent): void {
    if (event.code === 'Digit1' && !this.gameOver) {
      event.preventDefault();
      this.dropBomb();
    }
    if (event.code === 'KeyR') {
      location.reload();
    }
  }

  private dropBomb(): void {
    const position = this.airplane.getPosition();
    const direction = this.airplane.getDirection();

    // Give bomb some forward velocity based on airplane movement
    const velocity = direction.multiplyScalar(10);

    const bomb = new Bomb(position, velocity);
    this.bombs.push(bomb);
    this.scene.add(bomb.mesh);
  }

  private checkCollisions(): void {
    for (const bomb of this.bombs) {
      if (!bomb.active) continue;

      const bombPos = bomb.getPosition();

      for (const building of this.city.getActiveBuildings()) {
        const bbox = building.getBoundingBox();

        if (bbox.containsPoint(bombPos)) {
          // Hit!
          bomb.active = false;
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
    }
  }

  private updateUI(): void {
    this.scoreElement.textContent = `得分: ${this.score}`;
    this.buildingsElement.textContent = `建筑: ${this.city.getDestroyedCount()} / ${this.city.getTotalBuildings()}`;
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

  private cleanup(): void {
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

    if (!this.gameOver) {
      // Update airplane
      this.airplane.update(deltaTime);

      // Check for game over
      if (this.airplane.hasCompletedLoop()) {
        this.showGameOver();
      }

      // Update bombs
      for (const bomb of this.bombs) {
        bomb.update(deltaTime);
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

    // Render
    this.renderer.render(this.scene, this.camera);
  };
}
