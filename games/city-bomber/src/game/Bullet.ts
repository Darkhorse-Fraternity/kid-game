import * as THREE from 'three';

export class Bullet {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  active = true;
  life = 3; // 3秒后消失

  constructor(position: THREE.Vector3, direction: THREE.Vector3, speed = 100) {
    const geometry = new THREE.SphereGeometry(0.3, 8, 8);
    const material = new THREE.MeshBasicMaterial({ color: 0xffff00 });
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.copy(position);

    this.velocity = direction.clone().normalize().multiplyScalar(speed);
  }

  update(deltaTime: number): void {
    if (!this.active) return;

    this.mesh.position.add(this.velocity.clone().multiplyScalar(deltaTime));
    this.life -= deltaTime;

    // 超时或落地则失效
    if (this.life <= 0 || this.mesh.position.y < 0) {
      this.active = false;
    }
  }

  getPosition(): THREE.Vector3 {
    return this.mesh.position.clone();
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
  }
}
