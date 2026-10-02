import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

const gameRoot = document.getElementById('game-root');
const scoreEl = document.getElementById('score');
const livesEl = document.getElementById('lives');
const overlay = document.getElementById('overlay');
const startButton = document.getElementById('start-button');

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x020b15);
scene.fog = new THREE.Fog(0x020b15, 18, 48);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 4, 18);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
gameRoot.appendChild(renderer.domElement);

const ambientLight = new THREE.AmbientLight(0xcfeaff, 0.9);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0x8edbff, 1.2);
dirLight.position.set(5, 10, 8);
scene.add(dirLight);

const starsGeometry = new THREE.BufferGeometry();
const starCount = 2000;
const starPositions = new Float32Array(starCount * 3);
for (let i = 0; i < starCount; i += 1) {
  const i3 = i * 3;
  starPositions[i3] = (Math.random() - 0.5) * 80;
  starPositions[i3 + 1] = (Math.random() - 0.5) * 40;
  starPositions[i3 + 2] = (Math.random() - 0.5) * 90 - 20;
}
starsGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
const starMaterial = new THREE.PointsMaterial({
  color: 0x9fe9ff,
  size: 0.18,
  transparent: true,
  opacity: 0.9,
});
const stars = new THREE.Points(starsGeometry, starMaterial);
scene.add(stars);

const world = new THREE.Group();
scene.add(world);

const player = new THREE.Group();
const playerBody = new THREE.Mesh(
  new THREE.BoxGeometry(1.4, 0.8, 2.4),
  new THREE.MeshStandardMaterial({ color: 0x43d0ff, emissive: 0x0b5b77, metalness: 0.2, roughness: 0.3 })
);
playerBody.position.y = 0.4;
player.add(playerBody);

const cockpit = new THREE.Mesh(
  new THREE.SphereGeometry(0.6, 16, 16),
  new THREE.MeshStandardMaterial({ color: 0xf5fdff, emissive: 0x6de2ff, transparent: true, opacity: 0.9 })
);
cockpit.scale.set(1, 0.7, 1.1);
cockpit.position.set(0, 0.9, 0.2);
player.add(cockpit);

const wingLeft = new THREE.Mesh(
  new THREE.BoxGeometry(0.8, 0.12, 1.6),
  new THREE.MeshStandardMaterial({ color: 0x7a6eff, emissive: 0x1d1b70, metalness: 0.35, roughness: 0.25 })
);
wingLeft.position.set(-1.3, -0.1, 0);
player.add(wingLeft);

const wingRight = wingLeft.clone();
wingRight.position.x = 1.3;
player.add(wingRight);

player.position.set(0, 0, 11);
world.add(player);

const bullets = [];
const enemies = [];
const particles = [];

let score = 0;
let lives = 3;
let gameRunning = false;
let lastTime = 0;
let spawnTimer = 0;
let fireCooldown = 0;

const keys = {
  ArrowLeft: false,
  ArrowRight: false,
  ArrowUp: false,
  ArrowDown: false,
  a: false,
  d: false,
  w: false,
  s: false,
};

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

function setOverlayVisible(show) {
  overlay.classList.toggle('visible', show);
}

function updateHud() {
  scoreEl.textContent = String(score);
  livesEl.textContent = String(lives);
}

function createExplosion(position) {
  const material = new THREE.MeshStandardMaterial({
    color: 0xff8f5c,
    emissive: 0xff5f3c,
    emissiveIntensity: 1,
    transparent: true,
    opacity: 0.9,
  });

  for (let i = 0; i < 12; i += 1) {
    const particle = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), material.clone());
    particle.position.copy(position);
    particle.userData.velocity = new THREE.Vector3(
      (Math.random() - 0.5) * 0.25,
      (Math.random() - 0.5) * 0.25,
      (Math.random() - 0.5) * 0.25
    );
    particle.userData.life = 0.7 + Math.random() * 0.4;
    scene.add(particle);
    particles.push(particle);
  }
}

function spawnEnemy() {
  const enemyGroup = new THREE.Group();
  const enemyBody = new THREE.Mesh(
    new THREE.BoxGeometry(1.2, 1.2, 1.2),
    new THREE.MeshStandardMaterial({ color: 0xff7a59, emissive: 0x7d1f10, metalness: 0.3, roughness: 0.4 })
  );
  enemyGroup.add(enemyBody);

  const eyeLeft = new THREE.Mesh(
    new THREE.SphereGeometry(0.12, 8, 8),
    new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.7 })
  );
  eyeLeft.position.set(-0.25, 0.15, 0.7);
  enemyGroup.add(eyeLeft);

  const eyeRight = eyeLeft.clone();
  eyeRight.position.x = 0.25;
  enemyGroup.add(eyeRight);

  const x = (Math.random() - 0.5) * 16;
  const y = (Math.random() - 0.5) * 8;
  enemyGroup.position.set(x, y, -16);
  enemyGroup.userData.speed = 0.12 + Math.random() * 0.12;
  enemyGroup.userData.wobble = Math.random() * Math.PI * 2;
  world.add(enemyGroup);
  enemies.push(enemyGroup);
}

function fireBullet() {
  if (!gameRunning) return;
  if (fireCooldown > 0) return;

  const bullet = new THREE.Mesh(
    new THREE.SphereGeometry(0.14, 10, 10),
    new THREE.MeshStandardMaterial({ color: 0x8bfffe, emissive: 0x4ddfff, emissiveIntensity: 1.2 })
  );
  bullet.position.copy(player.position);
  bullet.position.z += 1.4;
  bullet.userData.speed = 0.8;
  scene.add(bullet);
  bullets.push(bullet);
  fireCooldown = 0.18;
}

function resetGame() {
  score = 0;
  lives = 3;
  gameRunning = true;
  spawnTimer = 0;
  fireCooldown = 0;
  updateHud();

  for (const bullet of bullets) scene.remove(bullet);
  for (const enemy of enemies) world.remove(enemy);
  for (const particle of particles) scene.remove(particle);
  bullets.length = 0;
  enemies.length = 0;
  particles.length = 0;

  player.position.set(0, 0, 11);
  setOverlayVisible(false);
}

function loseLife() {
  lives -= 1;
  updateHud();
  createExplosion(player.position.clone());

  if (lives <= 0) {
    gameRunning = false;
    setOverlayVisible(true);
    overlay.querySelector('h1').textContent = 'Game Over';
    overlay.querySelector('p').innerHTML = `最終スコア: <strong>${score}</strong><br />もう一度挑戦してみよう！`;
    startButton.textContent = 'RESTART';
  }
}

function updatePlayer(delta) {
  const moveSpeed = 9.5 * delta * 60;
  let moveX = 0;
  let moveY = 0;

  if (keys.ArrowLeft || keys.a) moveX -= 1;
  if (keys.ArrowRight || keys.d) moveX += 1;
  if (keys.ArrowUp || keys.w) moveY += 1;
  if (keys.ArrowDown || keys.s) moveY -= 1;

  player.position.x += moveX * moveSpeed;
  player.position.y += moveY * moveSpeed;
  player.position.x = clamp(player.position.x, -9, 9);
  player.position.y = clamp(player.position.y, -6, 6);
}

function updateBullets(delta) {
  for (let i = bullets.length - 1; i >= 0; i -= 1) {
    const bullet = bullets[i];
    bullet.position.z -= bullet.userData.speed * delta * 60;

    if (bullet.position.z < -22) {
      scene.remove(bullet);
      bullets.splice(i, 1);
      continue;
    }

    for (let j = enemies.length - 1; j >= 0; j -= 1) {
      const enemy = enemies[j];
      const dist = bullet.position.distanceTo(enemy.position);
      if (dist < 1.3) {
        scene.remove(bullet);
        bullets.splice(i, 1);
        world.remove(enemy);
        enemies.splice(j, 1);
        score += 10;
        createExplosion(enemy.position.clone());
        updateHud();
        break;
      }
    }
  }
}

function updateEnemies(delta) {
  for (let i = enemies.length - 1; i >= 0; i -= 1) {
    const enemy = enemies[i];
    enemy.position.z += delta * 60 * enemy.userData.speed * 1.8;
    enemy.position.x += Math.sin((performance.now() * 0.001) + enemy.userData.wobble) * 0.025;

    if (enemy.position.distanceTo(player.position) < 1.8) {
      world.remove(enemy);
      enemies.splice(i, 1);
      loseLife();
      continue;
    }

    if (enemy.position.z > 18) {
      world.remove(enemy);
      enemies.splice(i, 1);
      loseLife();
    }
  }
}

function updateParticles(delta) {
  for (let i = particles.length - 1; i >= 0; i -= 1) {
    const p = particles[i];
    p.userData.life -= delta;
    p.position.addScaledVector(p.userData.velocity, delta * 60);
    p.scale.multiplyScalar(0.98);

    if (p.userData.life <= 0) {
      scene.remove(p);
      particles.splice(i, 1);
    }
  }
}

function animate(delta) {
  if (gameRunning) {
    updatePlayer(delta);
    fireCooldown = Math.max(0, fireCooldown - delta);

    spawnTimer -= delta;
    if (spawnTimer <= 0) {
      spawnEnemy();
      spawnTimer = Math.max(0.5, 1.4 - score * 0.01);
    }

    updateBullets(delta);
    updateEnemies(delta);
    updateParticles(delta);

    stars.rotation.z += delta * 0.02;
    stars.rotation.x += delta * 0.012;
  }

  camera.lookAt(player.position.x * 0.4, 0, 0);
  renderer.render(scene, camera);
}

function onKeyChange(event, pressed) {
  if (event.key in keys) {
    keys[event.key] = pressed;
  }
  if (event.code === 'Space' && pressed) {
    fireBullet();
  }
  if (event.code === 'Enter' && pressed && !gameRunning) {
    resetGame();
  }
}

window.addEventListener('keydown', (event) => onKeyChange(event, true));
window.addEventListener('keyup', (event) => onKeyChange(event, false));
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

startButton.addEventListener('click', () => {
  resetGame();
});

function gameLoop(timestamp) {
  const delta = Math.min((timestamp - lastTime) / 1000 || 0.016, 0.033);
  lastTime = timestamp;
  animate(delta);
  requestAnimationFrame(gameLoop);
}

updateHud();
setOverlayVisible(true);
overlay.querySelector('h1').textContent = 'Neon Sky Defender';
overlay.querySelector('p').innerHTML = 'WASD / 矢印で移動。スペースで攻撃。<br />敵を撃ち落としてスコアを伸ばそう！';
startButton.textContent = 'START';
requestAnimationFrame(gameLoop);
