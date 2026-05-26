// Pre-built parametric FTC part library
// These produce realistic Three.js geometry matching real goBILDA/REV hardware

import * as THREE from 'three';

// ─── goBILDA U-Channel (1120-0040-0480) ───────────────────────────────────
// Rectangular channel profile with lightening hole pattern
export function createChannel(length = 480, profile = 48) {
  const group = new THREE.Group();
  const wallThickness = 3;
  const halfP = profile / 2;
  const halfL = length / 2;

  // Bottom plate
  const bottom = new THREE.BoxGeometry(length, wallThickness, profile);
  const bottomMesh = makeMesh(bottom, '#555555');
  bottomMesh.position.y = -halfP + wallThickness / 2;
  group.add(bottomMesh);

  // Left wall
  const wall = new THREE.BoxGeometry(length, profile, wallThickness);
  const leftWall = makeMesh(wall.clone(), '#666666');
  leftWall.position.z = -halfP + wallThickness / 2;
  group.add(leftWall);

  // Right wall
  const rightWall = makeMesh(wall.clone(), '#666666');
  rightWall.position.z = halfP - wallThickness / 2;
  group.add(rightWall);

  // Hole pattern along bottom (8mm spacing, 4.2mm holes)
  const holeSpacing = 8;
  const holeCount = Math.floor((length - 16) / holeSpacing);
  for (let i = 0; i < holeCount; i++) {
    const x = -halfL + 8 + i * holeSpacing;
    // Bottom holes
    const hole = new THREE.CylinderGeometry(2.1, 2.1, wallThickness + 1, 8);
    const holeMesh = makeMesh(hole, '#1a1a2e');
    holeMesh.position.set(x, -halfP + wallThickness / 2, 0);
    group.add(holeMesh);
  }

  // Side wall holes (larger pattern, 16mm spacing)
  const sideHoleSpacing = 16;
  const sideHoleCount = Math.floor((length - 32) / sideHoleSpacing);
  for (let i = 0; i < sideHoleCount; i++) {
    const x = -halfL + 16 + i * sideHoleSpacing;
    for (const zSign of [-1, 1]) {
      const hole = new THREE.CylinderGeometry(2.1, 2.1, wallThickness + 1, 8);
      hole.rotateX(Math.PI / 2);
      const holeMesh = makeMesh(hole, '#1a1a2e');
      holeMesh.position.set(x, 0, zSign * (halfP - wallThickness / 2));
      group.add(holeMesh);
    }
  }

  return group;
}

// ─── Mecanum Wheel (100mm) ────────────────────────────────────────────────
export function createMecanumWheel(diameter = 100) {
  const group = new THREE.Group();
  const radius = diameter / 2;
  const hubRadius = radius * 0.45;
  const hubWidth = 35;

  // Outer hub ring
  const outerHub = new THREE.CylinderGeometry(radius * 0.7, radius * 0.7, hubWidth * 0.3, 32);
  const outerHubMesh = makeMesh(outerHub, '#333333');
  outerHubMesh.rotation.z = Math.PI / 2;
  group.add(outerHubMesh);

  // Inner hub
  const innerHub = new THREE.CylinderGeometry(hubRadius, hubRadius, hubWidth * 0.6, 32);
  const innerHubMesh = makeMesh(innerHub, '#444444');
  innerHubMesh.rotation.z = Math.PI / 2;
  group.add(innerHubMesh);

  // Hub bore
  const bore = new THREE.CylinderGeometry(4, 4, hubWidth, 16);
  const boreMesh = makeMesh(bore, '#111111');
  boreMesh.rotation.z = Math.PI / 2;
  group.add(boreMesh);

  // Rollers (angled at 45 degrees) - 9 rollers around the wheel
  const rollerCount = 9;
  const rollerRadius = 6;
  const rollerLength = 22;
  for (let i = 0; i < rollerCount; i++) {
    const angle = (i / rollerCount) * Math.PI * 2;
    const rollerGeo = new THREE.CylinderGeometry(rollerRadius, rollerRadius, rollerLength, 12);
    const rollerMesh = makeMesh(rollerGeo, '#2d2d2d');

    const x = Math.cos(angle) * (radius - rollerRadius - 2);
    const z = Math.sin(angle) * (radius - rollerRadius - 2);
    rollerMesh.position.set(0, x, z);
    // Angled at 45 degrees - characteristic of mecanum
    rollerMesh.rotation.set(angle, 0, Math.PI / 4);
    group.add(rollerMesh);
  }

  // Hub spokes (connecting inner to outer)
  for (let i = 0; i < 4; i++) {
    const angle = (i / 4) * Math.PI * 2;
    const spoke = new THREE.BoxGeometry(8, 3, radius * 0.4);
    const spokeMesh = makeMesh(spoke, '#555555');
    const dist = hubRadius + (radius * 0.7 - hubRadius) / 2;
    spokeMesh.position.set(0, Math.cos(angle) * dist, Math.sin(angle) * dist);
    spokeMesh.rotation.x = angle;
    group.add(spokeMesh);
  }

  return group;
}

// ─── HD Hex Motor + Gearbox ──────────────────────────────────────────────
export function createMotor() {
  const group = new THREE.Group();

  // Motor body (cylinder)
  const body = new THREE.CylinderGeometry(18, 18, 55, 24);
  const bodyMesh = makeMesh(body, '#2a2a2a');
  bodyMesh.rotation.z = Math.PI / 2;
  group.add(bodyMesh);

  // Motor end cap
  const endCap = new THREE.CylinderGeometry(18, 16, 5, 24);
  const endCapMesh = makeMesh(endCap, '#333333');
  endCapMesh.rotation.z = Math.PI / 2;
  endCapMesh.position.x = -30;
  group.add(endCapMesh);

  // Gearbox housing (box)
  const gearbox = new THREE.BoxGeometry(40, 40, 40);
  const gearboxMesh = makeMesh(gearbox, '#444455');
  gearboxMesh.position.x = 28 + 20;
  group.add(gearboxMesh);

  // Output shaft
  const shaft = new THREE.CylinderGeometry(4, 4, 25, 12);
  const shaftMesh = makeMesh(shaft, '#888888');
  shaftMesh.rotation.z = Math.PI / 2;
  shaftMesh.position.x = 48 + 12;
  group.add(shaftMesh);

  // Mounting flange
  const flange = new THREE.CylinderGeometry(22, 22, 3, 24);
  const flangeMesh = makeMesh(flange, '#555555');
  flangeMesh.rotation.z = Math.PI / 2;
  flangeMesh.position.x = 48;
  group.add(flangeMesh);

  // Mounting holes on flange
  for (let i = 0; i < 4; i++) {
    const angle = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const hole = new THREE.CylinderGeometry(2, 2, 5, 8);
    const holeMesh = makeMesh(hole, '#111111');
    holeMesh.rotation.z = Math.PI / 2;
    holeMesh.position.set(48, Math.cos(angle) * 16, Math.sin(angle) * 16);
    group.add(holeMesh);
  }

  // Wire connector
  const connector = new THREE.BoxGeometry(8, 6, 12);
  const connMesh = makeMesh(connector, '#33aa33');
  connMesh.position.set(-20, 18, 0);
  group.add(connMesh);

  return group;
}

// ─── Motor Mount Bracket ─────────────────────────────────────────────────
export function createMotorMount() {
  const group = new THREE.Group();

  // L-bracket vertical
  const vertical = new THREE.BoxGeometry(50, 60, 3);
  const vertMesh = makeMesh(vertical, '#777777');
  group.add(vertMesh);

  // L-bracket horizontal
  const horizontal = new THREE.BoxGeometry(50, 3, 30);
  const horizMesh = makeMesh(horizontal, '#777777');
  horizMesh.position.set(0, -30 + 1.5, 15);
  group.add(horizMesh);

  // Mounting holes
  for (let row = -1; row <= 1; row++) {
    for (let col = -1; col <= 1; col++) {
      const hole = new THREE.CylinderGeometry(2.5, 2.5, 5, 8);
      hole.rotateX(Math.PI / 2);
      const holeMesh = makeMesh(hole, '#222222');
      holeMesh.position.set(col * 16, row * 16, 0);
      group.add(holeMesh);
    }
  }

  return group;
}

// ─── Bearing Block ───────────────────────────────────────────────────────
export function createBearingBlock() {
  const group = new THREE.Group();

  // Block body
  const block = new THREE.BoxGeometry(32, 24, 16);
  const blockMesh = makeMesh(block, '#777788');
  group.add(blockMesh);

  // Bearing bore
  const bore = new THREE.TorusGeometry(6, 2.5, 12, 24);
  const boreMesh = makeMesh(bore, '#ffaa00');
  boreMesh.rotation.y = Math.PI / 2;
  group.add(boreMesh);

  // Mounting holes
  for (const xOff of [-10, 10]) {
    for (const yOff of [-8, 8]) {
      const hole = new THREE.CylinderGeometry(2, 2, 18, 8);
      const holeMesh = makeMesh(hole, '#222222');
      holeMesh.position.set(xOff, yOff, 0);
      group.add(holeMesh);
    }
  }

  return group;
}

// ─── Servo (SRS Programmer style) ───────────────────────────────────────
export function createServo() {
  const group = new THREE.Group();

  // Body
  const body = new THREE.BoxGeometry(40, 20, 38);
  const bodyMesh = makeMesh(body, '#222222');
  group.add(bodyMesh);

  // Mounting tabs
  const tab = new THREE.BoxGeometry(54, 2.5, 10);
  const tabMesh = makeMesh(tab, '#333333');
  tabMesh.position.y = 10;
  group.add(tabMesh);

  // Output spline
  const spline = new THREE.CylinderGeometry(6, 6, 5, 16);
  const splineMesh = makeMesh(spline, '#888888');
  splineMesh.position.set(10, 12.5, 0);
  group.add(splineMesh);

  return group;
}

// ─── Electronics Plate / REV Control Hub ─────────────────────────────────
export function createControlHub() {
  const group = new THREE.Group();

  // Main board
  const board = new THREE.BoxGeometry(130, 8, 85);
  const boardMesh = makeMesh(board, '#1a3d1a');
  group.add(boardMesh);

  // Heatsink fins
  for (let i = 0; i < 8; i++) {
    const fin = new THREE.BoxGeometry(40, 12, 1.5);
    const finMesh = makeMesh(fin, '#555555');
    finMesh.position.set(20, 10, -30 + i * 8);
    group.add(finMesh);
  }

  // Connectors
  for (let i = 0; i < 4; i++) {
    const conn = new THREE.BoxGeometry(12, 8, 8);
    const connMesh = makeMesh(conn, '#ffaa00');
    connMesh.position.set(-45 + i * 25, 8, 35);
    group.add(connMesh);
  }

  // USB port
  const usb = new THREE.BoxGeometry(8, 4, 10);
  const usbMesh = makeMesh(usb, '#cccccc');
  usbMesh.position.set(60, 6, 0);
  group.add(usbMesh);

  return group;
}

// ─── Axle (8mm hex shaft) ────────────────────────────────────────────────
export function createAxle(length = 120) {
  const group = new THREE.Group();
  const shaft = new THREE.CylinderGeometry(4, 4, length, 6); // 6-sided = hex
  const shaftMesh = makeMesh(shaft, '#888888');
  shaftMesh.rotation.z = Math.PI / 2;
  group.add(shaftMesh);
  return group;
}

// ─── Standoff / Spacer ──────────────────────────────────────────────────
export function createStandoff(height = 30) {
  const group = new THREE.Group();
  const body = new THREE.CylinderGeometry(3, 3, height, 6);
  const bodyMesh = makeMesh(body, '#888888');
  group.add(bodyMesh);
  return group;
}

// ─── Helper: create mesh with material ──────────────────────────────────
function makeMesh(geometry, color) {
  const mat = new THREE.MeshPhysicalMaterial({
    color: color,
    metalness: getMetalness(color),
    roughness: getRoughness(color),
    clearcoat: 0.1,
    clearcoatRoughness: 0.4,
  });
  const mesh = new THREE.Mesh(geometry, mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function getMetalness(color) {
  const c = color.toLowerCase();
  if (c.includes('1a') || c.includes('2d') || c.includes('22')) return 0.0; // rubber/dark
  if (c.includes('aa') || c === '#ffaa00') return 0.85; // brass
  if (c === '#888888' || c === '#777788' || c === '#777777') return 0.75; // aluminum
  if (c.includes('55') || c.includes('66') || c.includes('44')) return 0.6; // steel
  return 0.3;
}

function getRoughness(color) {
  const c = color.toLowerCase();
  if (c.includes('2d') || c.includes('1a')) return 0.9; // rubber
  if (c === '#ffaa00') return 0.2; // polished brass
  if (c === '#888888') return 0.25; // polished aluminum
  return 0.45;
}

// ─── Part registry ──────────────────────────────────────────────────────
export const PART_LIBRARY = {
  'channel-480': { create: () => createChannel(480, 48), desc: 'goBILDA U-Channel 480mm' },
  'channel-320': { create: () => createChannel(320, 48), desc: 'goBILDA U-Channel 320mm' },
  'channel-240': { create: () => createChannel(240, 48), desc: 'goBILDA U-Channel 240mm' },
  'channel-160': { create: () => createChannel(160, 48), desc: 'goBILDA U-Channel 160mm' },
  'mecanum-wheel': { create: () => createMecanumWheel(100), desc: 'Mecanum Wheel 100mm' },
  'hd-hex-motor': { create: () => createMotor(), desc: 'REV HD Hex Motor + Gearbox' },
  'motor-mount': { create: () => createMotorMount(), desc: 'Motor Mount L-Bracket' },
  'bearing-block': { create: () => createBearingBlock(), desc: 'Bearing Block' },
  'servo': { create: () => createServo(), desc: 'Servo' },
  'control-hub': { create: () => createControlHub(), desc: 'REV Control Hub' },
  'axle-120': { create: () => createAxle(120), desc: '8mm Hex Axle 120mm' },
  'axle-80': { create: () => createAxle(80), desc: '8mm Hex Axle 80mm' },
  'standoff-30': { create: () => createStandoff(30), desc: 'Standoff 30mm' },
  'standoff-50': { create: () => createStandoff(50), desc: 'Standoff 50mm' },
};

// ─── Full mecanum drivetrain assembly (pre-built) ────────────────────────
export function createMecanumDrivetrain() {
  const group = new THREE.Group();
  group.userData.name = 'Mecanum Drivetrain Assembly';

  // Frame rails (2 side channels)
  const leftRail = createChannel(420, 48);
  leftRail.position.set(0, 0, -140);
  leftRail.rotation.y = 0;
  group.add(leftRail);

  const rightRail = createChannel(420, 48);
  rightRail.position.set(0, 0, 140);
  group.add(rightRail);

  // Cross members (front and back)
  const frontCross = createChannel(240, 48);
  frontCross.position.set(175, 0, 0);
  frontCross.rotation.y = Math.PI / 2;
  group.add(frontCross);

  const rearCross = createChannel(240, 48);
  rearCross.position.set(-175, 0, 0);
  rearCross.rotation.y = Math.PI / 2;
  group.add(rearCross);

  // Middle cross brace
  const midCross = createChannel(240, 48);
  midCross.position.set(0, 0, 0);
  midCross.rotation.y = Math.PI / 2;
  group.add(midCross);

  // 4 Mecanum wheels
  const wheelPositions = [
    { x: 190, z: -155, name: 'FL' },
    { x: 190, z: 155, name: 'FR' },
    { x: -190, z: -155, name: 'RL' },
    { x: -190, z: 155, name: 'RR' },
  ];

  wheelPositions.forEach((wp) => {
    const wheel = createMecanumWheel(100);
    wheel.position.set(wp.x, -24, wp.z);
    group.add(wheel);

    // Axle
    const axle = createAxle(80);
    axle.position.set(wp.x, -24, wp.z);
    axle.rotation.y = Math.PI / 2;
    group.add(axle);

    // Bearing blocks (2 per wheel)
    const bearing1 = createBearingBlock();
    bearing1.position.set(wp.x, -15, wp.z + (wp.z > 0 ? -30 : 30));
    bearing1.rotation.y = Math.PI / 2;
    group.add(bearing1);
  });

  // 4 Motors with mounts
  const motorPositions = [
    { x: 150, z: -100, ry: 0 },
    { x: 150, z: 100, ry: Math.PI },
    { x: -150, z: -100, ry: 0 },
    { x: -150, z: 100, ry: Math.PI },
  ];

  motorPositions.forEach((mp) => {
    const motor = createMotor();
    motor.position.set(mp.x, 10, mp.z);
    motor.rotation.y = mp.ry;
    group.add(motor);

    const mount = createMotorMount();
    mount.position.set(mp.x - 20, 0, mp.z);
    mount.rotation.y = mp.ry;
    group.add(mount);
  });

  // Control hub on top
  const hub = createControlHub();
  hub.position.set(0, 40, 0);
  group.add(hub);

  // Standoffs for electronics
  const standoffPositions = [
    [-50, 24, -30], [50, 24, -30], [-50, 24, 30], [50, 24, 30],
  ];
  standoffPositions.forEach(([x, y, z]) => {
    const standoff = createStandoff(16);
    standoff.position.set(x, y, z);
    group.add(standoff);
  });

  return group;
}

// List of available pre-built assemblies
export const ASSEMBLIES = {
  'mecanum-drivetrain': createMecanumDrivetrain,
};
