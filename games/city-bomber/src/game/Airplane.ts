import * as THREE from 'three';

export class Airplane {
  group: THREE.Group;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  rotation = 0; // 水平旋转角度
  pitch = 0; // 俯仰角度
  speed = 30;
  height = 40;

  // 按键状态
  keys = {
    up: false,
    down: false,
    left: false,
    right: false
  };

  constructor() {
    this.group = new THREE.Group();
    this.position = new THREE.Vector3(0, this.height, -60);
    this.velocity = new THREE.Vector3(0, 0, 1);
    this.createModel();
    this.setupControls();
    this.updatePosition();
  }

  private createModel(): void {
    const bodyMaterial = new THREE.MeshLambertMaterial({ color: 0x2244aa });
    const wingMaterial = new THREE.MeshLambertMaterial({ color: 0x3355bb });

    // 创建一个内部组，用于调整模型朝向（机头朝+Z方向）
    const modelGroup = new THREE.Group();

    // Fuselage (机身)
    const bodyGeometry = new THREE.CylinderGeometry(0.8, 0.8, 6, 8);
    bodyGeometry.rotateX(Math.PI / 2); // 沿Z轴方向
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    modelGroup.add(body);

    // Nose cone (机头) - 朝前(+Z)
    const noseGeometry = new THREE.ConeGeometry(0.8, 2, 8);
    noseGeometry.rotateX(Math.PI / 2);
    const nose = new THREE.Mesh(noseGeometry, bodyMaterial);
    nose.position.z = 4;
    modelGroup.add(nose);

    // Main wings (主翼)
    const wingGeometry = new THREE.BoxGeometry(10, 0.2, 2);
    const wings = new THREE.Mesh(wingGeometry, wingMaterial);
    wings.position.z = -0.5;
    modelGroup.add(wings);

    // Tail wing horizontal (水平尾翼)
    const tailWingGeometry = new THREE.BoxGeometry(4, 0.15, 1);
    const tailWing = new THREE.Mesh(tailWingGeometry, wingMaterial);
    tailWing.position.z = -3;
    modelGroup.add(tailWing);

    // Tail fin vertical (垂直尾翼)
    const tailFinGeometry = new THREE.BoxGeometry(0.15, 2, 1.5);
    const tailFin = new THREE.Mesh(tailFinGeometry, wingMaterial);
    tailFin.position.set(0, 1, -2.5);
    modelGroup.add(tailFin);

    this.group.add(modelGroup);
    this.group.castShadow = true;
  }

  private setupControls(): void {
    window.addEventListener('keydown', (e) => this.onKeyDown(e));
    window.addEventListener('keyup', (e) => this.onKeyUp(e));
  }

  private onKeyDown(event: KeyboardEvent): void {
    switch (event.code) {
      case 'ArrowUp':
        this.keys.up = true;
        break;
      case 'ArrowDown':
        this.keys.down = true;
        break;
      case 'ArrowLeft':
        this.keys.left = true;
        break;
      case 'ArrowRight':
        this.keys.right = true;
        break;
    }
  }

  private onKeyUp(event: KeyboardEvent): void {
    switch (event.code) {
      case 'ArrowUp':
        this.keys.up = false;
        break;
      case 'ArrowDown':
        this.keys.down = false;
        break;
      case 'ArrowLeft':
        this.keys.left = false;
        break;
      case 'ArrowRight':
        this.keys.right = false;
        break;
    }
  }

  update(deltaTime: number): void {
    const turnSpeed = 1.5;
    const pitchSpeed = 1.0;

    // 左右转向
    if (this.keys.left) {
      this.rotation += turnSpeed * deltaTime;
    }
    if (this.keys.right) {
      this.rotation -= turnSpeed * deltaTime;
    }

    // 上下俯仰（控制高度）
    if (this.keys.up) {
      this.pitch = Math.min(this.pitch + pitchSpeed * deltaTime, 0.5);
    } else if (this.keys.down) {
      this.pitch = Math.max(this.pitch - pitchSpeed * deltaTime, -0.5);
    } else {
      // 缓慢恢复水平
      this.pitch *= 0.95;
    }

    // 计算前进方向
    const direction = new THREE.Vector3(
      Math.sin(this.rotation),
      this.pitch,
      Math.cos(this.rotation)
    ).normalize();

    // 更新位置
    this.position.add(direction.multiplyScalar(this.speed * deltaTime));

    // 限制高度范围
    this.position.y = Math.max(15, Math.min(80, this.position.y));

    // 限制活动范围
    const maxRange = 120;
    this.position.x = Math.max(-maxRange, Math.min(maxRange, this.position.x));
    this.position.z = Math.max(-maxRange, Math.min(maxRange, this.position.z));

    this.updatePosition();
  }

  private updatePosition(): void {
    this.group.position.copy(this.position);

    // 设置飞机朝向
    this.group.rotation.y = this.rotation;
    this.group.rotation.z = this.keys.left ? 0.3 : this.keys.right ? -0.3 : 0; // 转弯时倾斜
    this.group.rotation.x = -this.pitch * 0.5; // 俯仰时机头上下
  }

  getPosition(): THREE.Vector3 {
    return this.position.clone();
  }

  getDirection(): THREE.Vector3 {
    return new THREE.Vector3(
      Math.sin(this.rotation),
      0,
      Math.cos(this.rotation)
    ).normalize();
  }

  hasCompletedLoop(): boolean {
    return false; // 不再使用循环结束条件
  }

  resetLoop(): void {
    // 不再需要
  }
}
