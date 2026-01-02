import * as THREE from 'three';

interface Particle {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  life: number;
}

export class Explosion {
  particles: Particle[] = [];
  group: THREE.Group;
  active = true;
  lifetime = 1.5;
  elapsed = 0;

  constructor(position: THREE.Vector3) {
    this.group = new THREE.Group();
    this.createParticles(position);
  }

  private createParticles(position: THREE.Vector3): void {
    const colors = [0xff4400, 0xff6600, 0xff8800, 0xffaa00, 0xffcc00];
    const particleCount = 30;

    for (let i = 0; i < particleCount; i++) {
      const size = 0.3 + Math.random() * 0.7;
      const geometry = new THREE.BoxGeometry(size, size, size);
      const material = new THREE.MeshBasicMaterial({
        color: colors[Math.floor(Math.random() * colors.length)],
        transparent: true,
        opacity: 1
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.copy(position);

      const velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 20,
        Math.random() * 15 + 5,
        (Math.random() - 0.5) * 20
      );

      this.particles.push({
        mesh,
        velocity,
        life: 1
      });

      this.group.add(mesh);
    }
  }

  update(deltaTime: number): void {
    if (!this.active) return;

    this.elapsed += deltaTime;

    for (const particle of this.particles) {
      particle.velocity.y -= 20 * deltaTime;
      particle.mesh.position.add(particle.velocity.clone().multiplyScalar(deltaTime));
      particle.mesh.rotation.x += deltaTime * 5;
      particle.mesh.rotation.z += deltaTime * 3;

      particle.life = Math.max(0, 1 - this.elapsed / this.lifetime);
      (particle.mesh.material as THREE.MeshBasicMaterial).opacity = particle.life;
    }

    if (this.elapsed >= this.lifetime) {
      this.active = false;
    }
  }

  dispose(): void {
    for (const particle of this.particles) {
      particle.mesh.geometry.dispose();
      (particle.mesh.material as THREE.Material).dispose();
    }
  }
}
