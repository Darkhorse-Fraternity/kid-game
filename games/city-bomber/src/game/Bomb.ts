import * as THREE from 'three';

export class Bomb {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  gravity = 30;
  active = true;

  constructor(position: THREE.Vector3, initialVelocity: THREE.Vector3) {
    const geometry = new THREE.SphereGeometry(0.5, 8, 8);
    const material = new THREE.MeshLambertMaterial({ color: 0x222222 });
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.copy(position);
    this.mesh.castShadow = true;

    this.velocity = initialVelocity.clone();
  }

  update(deltaTime: number): void {
    if (!this.active) return;

    this.velocity.y -= this.gravity * deltaTime;
    this.mesh.position.add(this.velocity.clone().multiplyScalar(deltaTime));

    // Check if hit ground
    if (this.mesh.position.y <= 0) {
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
