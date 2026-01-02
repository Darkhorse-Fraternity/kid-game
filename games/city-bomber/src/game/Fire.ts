import * as THREE from 'three';

interface FireParticle {
  mesh: THREE.Mesh;
  baseY: number;
  speed: number;
  offset: number;
}

export class Fire {
  group: THREE.Group;
  particles: FireParticle[] = [];
  active = true;
  elapsed = 0;
  duration = 100000; // 持续燃烧

  constructor(position: THREE.Vector3, buildingHeight: number) {
    this.group = new THREE.Group();
    this.group.position.copy(position);
    this.createFire(buildingHeight);
  }

  private createFire(buildingHeight: number): void {
    const fireColors = [0xff4500, 0xff6600, 0xff8c00, 0xffa500, 0xffcc00];
    const particleCount = 20;

    for (let i = 0; i < particleCount; i++) {
      const size = 0.5 + Math.random() * 1;
      const geometry = new THREE.SphereGeometry(size, 6, 6);
      const material = new THREE.MeshBasicMaterial({
        color: fireColors[Math.floor(Math.random() * fireColors.length)],
        transparent: true,
        opacity: 0.9
      });

      const mesh = new THREE.Mesh(geometry, material);
      const baseY = Math.random() * buildingHeight * 0.8;
      mesh.position.set(
        (Math.random() - 0.5) * 3,
        baseY,
        (Math.random() - 0.5) * 3
      );

      this.particles.push({
        mesh,
        baseY,
        speed: 2 + Math.random() * 3,
        offset: Math.random() * Math.PI * 2
      });

      this.group.add(mesh);
    }

    // 添加烟雾粒子
    for (let i = 0; i < 10; i++) {
      const size = 1 + Math.random() * 2;
      const geometry = new THREE.SphereGeometry(size, 6, 6);
      const material = new THREE.MeshBasicMaterial({
        color: 0x333333,
        transparent: true,
        opacity: 0.5
      });

      const mesh = new THREE.Mesh(geometry, material);
      const baseY = buildingHeight * 0.5 + Math.random() * buildingHeight * 0.5;
      mesh.position.set(
        (Math.random() - 0.5) * 4,
        baseY,
        (Math.random() - 0.5) * 4
      );

      this.particles.push({
        mesh,
        baseY,
        speed: 3 + Math.random() * 2,
        offset: Math.random() * Math.PI * 2
      });

      this.group.add(mesh);
    }
  }

  update(deltaTime: number): void {
    if (!this.active) return;

    this.elapsed += deltaTime;

    for (const particle of this.particles) {
      // 火焰向上飘动
      particle.mesh.position.y = particle.baseY + Math.sin(this.elapsed * particle.speed + particle.offset) * 2;
      particle.mesh.position.x += Math.sin(this.elapsed * 2 + particle.offset) * deltaTime * 0.5;

      // 缩放抖动
      const scale = 0.8 + Math.sin(this.elapsed * 10 + particle.offset) * 0.3;
      particle.mesh.scale.setScalar(scale);
    }

    // 逐渐减弱
    if (this.elapsed > this.duration * 0.6) {
      const fade = 1 - (this.elapsed - this.duration * 0.6) / (this.duration * 0.4);
      for (const particle of this.particles) {
        (particle.mesh.material as THREE.MeshBasicMaterial).opacity = fade * 0.9;
      }
    }

    if (this.elapsed >= this.duration) {
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
