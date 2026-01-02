import * as THREE from 'three';

export class RemoteAirplane {
  group: THREE.Group;
  position: THREE.Vector3;
  targetPosition: THREE.Vector3;
  rotation = 0;
  targetRotation = 0;
  pitch = 0;
  targetPitch = 0;
  speed = 30;
  alive = true;
  playerId: string;

  private lerpFactor = 0.15; // 插值因子，用于平滑移动

  constructor(playerId: string, color = 0xaa2222) {
    this.playerId = playerId;
    this.group = new THREE.Group();
    this.position = new THREE.Vector3(50, 40, 0);
    this.targetPosition = this.position.clone();
    this.createModel(color);
    this.updatePosition();
  }

  private createModel(color: number): void {
    const bodyMaterial = new THREE.MeshLambertMaterial({ color });
    const wingMaterial = new THREE.MeshLambertMaterial({ color: color + 0x111111 });

    const modelGroup = new THREE.Group();

    // Fuselage (机身)
    const bodyGeometry = new THREE.CylinderGeometry(0.8, 0.8, 6, 8);
    bodyGeometry.rotateX(Math.PI / 2);
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    modelGroup.add(body);

    // Nose cone (机头)
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

  updateFromNetwork(data: {
    position: { x: number; y: number; z: number };
    rotation: number;
    pitch: number;
    speed: number;
  }): void {
    this.targetPosition.set(data.position.x, data.position.y, data.position.z);
    this.targetRotation = data.rotation;
    this.targetPitch = data.pitch;
    this.speed = data.speed;
  }

  update(_deltaTime: number): void {
    if (!this.alive) return;

    // 平滑插值位置
    this.position.lerp(this.targetPosition, this.lerpFactor);

    // 平滑插值旋转
    this.rotation += (this.targetRotation - this.rotation) * this.lerpFactor;
    this.pitch += (this.targetPitch - this.pitch) * this.lerpFactor;

    this.updatePosition();
  }

  private updatePosition(): void {
    this.group.position.copy(this.position);
    this.group.rotation.y = this.rotation;
    this.group.rotation.x = -this.pitch * 0.5;
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

  destroy(): void {
    this.alive = false;
    this.group.visible = false;
  }
}
