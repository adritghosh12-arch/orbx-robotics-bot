import React, { useRef, useEffect, useImperativeHandle, forwardRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { ASSEMBLIES } from '../lib/cad-parts';

function degToRad(deg) {
  return (deg * Math.PI) / 180;
}

function createGeometry(type, params) {
  switch (type) {
    case 'box': {
      // Beveled box using ExtrudeGeometry for realism
      const w = params.width || 10;
      const h = params.height || 10;
      const d = params.depth || 10;
      const bevel = Math.min(w, h, d) * 0.03; // subtle bevel
      const shape = new THREE.Shape();
      const hw = w / 2 - bevel;
      const hh = h / 2 - bevel;
      shape.moveTo(-hw, -hh);
      shape.lineTo(hw, -hh);
      shape.lineTo(hw, hh);
      shape.lineTo(-hw, hh);
      shape.closePath();
      return new THREE.ExtrudeGeometry(shape, {
        depth: d,
        bevelEnabled: true,
        bevelThickness: bevel,
        bevelSize: bevel,
        bevelSegments: 2,
      });
    }
    case 'cylinder':
      return new THREE.CylinderGeometry(
        params.radius || 5,
        params.radius || 5,
        params.height || 10,
        48
      );
    case 'cone':
      return new THREE.CylinderGeometry(
        params.radiusTop != null ? params.radiusTop : 0,
        params.radiusBottom != null ? params.radiusBottom : 5,
        params.height || 10,
        48
      );
    case 'torus':
      return new THREE.TorusGeometry(
        params.radius || 10,
        params.tube || 2,
        24,
        48
      );
    case 'sphere':
      return new THREE.SphereGeometry(
        params.radius || 5,
        48,
        24
      );
    default:
      return new THREE.BoxGeometry(10, 10, 10);
  }
}

// Generate a studio-like environment map for metallic reflections
function createEnvMap(renderer) {
  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene();

  // Gradient sky dome
  const skyGeo = new THREE.SphereGeometry(500, 32, 16);
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    uniforms: {
      topColor: { value: new THREE.Color(0x4466aa) },
      bottomColor: { value: new THREE.Color(0x111122) },
    },
    vertexShader: `
      varying vec3 vWorldPosition;
      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 topColor;
      uniform vec3 bottomColor;
      varying vec3 vWorldPosition;
      void main() {
        float h = normalize(vWorldPosition).y * 0.5 + 0.5;
        gl_FragColor = vec4(mix(bottomColor, topColor, h), 1.0);
      }
    `,
  });
  envScene.add(new THREE.Mesh(skyGeo, skyMat));

  // Studio lights in env
  const light1 = new THREE.Mesh(
    new THREE.PlaneGeometry(200, 200),
    new THREE.MeshBasicMaterial({ color: 0xffffff })
  );
  light1.position.set(200, 200, 100);
  light1.lookAt(0, 0, 0);
  envScene.add(light1);

  const light2 = new THREE.Mesh(
    new THREE.PlaneGeometry(100, 100),
    new THREE.MeshBasicMaterial({ color: 0x8899cc })
  );
  light2.position.set(-150, 50, -200);
  light2.lookAt(0, 0, 0);
  envScene.add(light2);

  const envMap = pmremGenerator.fromScene(envScene, 0.04).texture;
  pmremGenerator.dispose();
  return envMap;
}

// Determine material properties based on color
function getMaterialProps(hexColor) {
  const color = hexColor ? hexColor.toLowerCase() : '#888888';
  // Dark/rubber parts
  if (color === '#2d2d2d' || color === '#1a1a1a' || color === '#222222') {
    return { metalness: 0.0, roughness: 0.85, clearcoat: 0.0 };
  }
  // PCB/green
  if (color === '#33aa33' || color === '#228822') {
    return { metalness: 0.1, roughness: 0.7, clearcoat: 0.3 };
  }
  // Brass/bearing (gold)
  if (color === '#ffaa00' || color === '#cc8800') {
    return { metalness: 0.9, roughness: 0.2, clearcoat: 0.5 };
  }
  // Red accent
  if (color === '#cc3333' || color === '#ff3333') {
    return { metalness: 0.4, roughness: 0.4, clearcoat: 0.3 };
  }
  // Blue motor
  if (color === '#3366cc' || color === '#2255bb') {
    return { metalness: 0.5, roughness: 0.4, clearcoat: 0.2 };
  }
  // Default: aluminum/metal
  return { metalness: 0.7, roughness: 0.3, clearcoat: 0.1 };
}

export default function CADViewer({ geometry, assemblyId, showHoles = true }) {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const animationRef = useRef(null);
  const envMapRef = useRef(null);

  useEffect(() => {
    if (!mountRef.current) return;

    const container = mountRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1e2130);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 5000);
    camera.position.set(350, 250, 450);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // Renderer with professional settings
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Generate environment map
    envMapRef.current = createEnvMap(renderer);
    scene.environment = envMapRef.current;

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 50;
    controls.maxDistance = 2000;
    controls.target.set(0, 0, 0);
    controlsRef.current = controls;

    // Lighting - 3-point studio setup
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    scene.add(ambientLight);

    // Key light (main, casts shadows)
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.2);
    keyLight.position.set(300, 400, 200);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    keyLight.shadow.camera.near = 10;
    keyLight.shadow.camera.far = 1500;
    keyLight.shadow.camera.left = -500;
    keyLight.shadow.camera.right = 500;
    keyLight.shadow.camera.top = 500;
    keyLight.shadow.camera.bottom = -500;
    keyLight.shadow.bias = -0.001;
    scene.add(keyLight);

    // Fill light
    const fillLight = new THREE.DirectionalLight(0x8899cc, 0.4);
    fillLight.position.set(-200, 100, -100);
    scene.add(fillLight);

    // Rim/back light
    const rimLight = new THREE.DirectionalLight(0xffffff, 0.3);
    rimLight.position.set(0, 50, -400);
    scene.add(rimLight);

    // Hemisphere light for color variation
    const hemiLight = new THREE.HemisphereLight(0x6688cc, 0x333344, 0.3);
    scene.add(hemiLight);

    // Ground plane with shadow
    const groundGeo = new THREE.PlaneGeometry(1200, 1200);
    const groundMat = new THREE.ShadowMaterial({ opacity: 0.3 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -50;
    ground.receiveShadow = true;
    scene.add(ground);

    // Grid (subtle, CAD-like)
    const grid = new THREE.GridHelper(600, 60, 0x3a3f55, 0x2a2f45);
    grid.position.y = -49.9;
    scene.add(grid);

    // Axis indicator (small, in corner feel)
    const axisLen = 30;
    const axisGroup = new THREE.Group();
    axisGroup.position.set(-250, -49, -250);
    const xAxis = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(axisLen, 0, 0)]),
      new THREE.LineBasicMaterial({ color: 0xff4444, linewidth: 2 })
    );
    const yAxis = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, axisLen, 0)]),
      new THREE.LineBasicMaterial({ color: 0x44ff44, linewidth: 2 })
    );
    const zAxis = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, axisLen)]),
      new THREE.LineBasicMaterial({ color: 0x4444ff, linewidth: 2 })
    );
    axisGroup.add(xAxis, yAxis, zAxis);
    scene.add(axisGroup);

    // Animate
    function animate() {
      animationRef.current = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    }
    animate();

    // Resize handler
    function handleResize() {
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    }
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationRef.current);
      controls.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Update scene when geometry or assembly changes
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    if (!geometry && !assemblyId) return;

    // Remove old user objects (keep lights, grid, ground, axes)
    const toRemove = [];
    scene.traverse((child) => {
      if (child.userData && (child.userData.isPart || child.userData.isHole || child.userData.isEdge || child.userData.isAssembly)) {
        toRemove.push(child);
      }
    });
    toRemove.forEach((obj) => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) obj.material.dispose();
      scene.remove(obj);
    });

    // MODE 1: Pre-built assembly from part library
    if (assemblyId && ASSEMBLIES[assemblyId]) {
      const assemblyGroup = ASSEMBLIES[assemblyId]();
      assemblyGroup.userData.isAssembly = true;

      // Mark all children for cleanup
      assemblyGroup.traverse((child) => {
        child.userData.isAssembly = true;
        if (child.isMesh) {
          child.userData.isPart = true;
        }
      });

      scene.add(assemblyGroup);

      // Add edge lines to all meshes in the assembly
      const meshes = [];
      assemblyGroup.traverse((child) => {
        if (child.isMesh && child.geometry) {
          meshes.push(child);
        }
      });
      meshes.forEach((mesh) => {
        const edgesGeo = new THREE.EdgesGeometry(mesh.geometry, 25);
        const edgeMat = new THREE.LineBasicMaterial({
          color: 0x000000,
          transparent: true,
          opacity: 0.12,
        });
        const edgeLines = new THREE.LineSegments(edgesGeo, edgeMat);
        edgeLines.position.copy(mesh.position);
        edgeLines.rotation.copy(mesh.rotation);
        edgeLines.userData.isEdge = true;
        edgeLines.userData.isAssembly = true;
        mesh.parent.add(edgeLines);
      });

      // Auto-fit camera
      const box = new THREE.Box3().setFromObject(assemblyGroup);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);
      const dist = maxDim * 1.5;

      if (cameraRef.current && controlsRef.current) {
        cameraRef.current.position.set(
          center.x + dist * 0.7,
          center.y + dist * 0.5,
          center.z + dist * 0.6
        );
        controlsRef.current.target.copy(center);
        controlsRef.current.update();
      }
      return;
    }

    // MODE 2: LLM-generated geometry (primitives)
    if (!geometry) return;

    // Add parts with professional materials + edge lines
    if (geometry.parts) {
      geometry.parts.forEach((part) => {
        const geo = createGeometry(part.type, part.params || {});
        const props = getMaterialProps(part.color);

        const mat = new THREE.MeshPhysicalMaterial({
          color: part.color || '#888888',
          metalness: props.metalness,
          roughness: props.roughness,
          clearcoat: props.clearcoat,
          clearcoatRoughness: 0.3,
          envMapIntensity: 1.0,
        });

        const mesh = new THREE.Mesh(geo, mat);
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        const pos = part.position || [0, 0, 0];
        mesh.position.set(pos[0], pos[1], pos[2]);

        const rot = part.rotation || [0, 0, 0];
        mesh.rotation.set(degToRad(rot[0]), degToRad(rot[1]), degToRad(rot[2]));

        if (part.type === 'box') {
          const d = part.params?.depth || 10;
          geo.translate(0, 0, -d / 2);
        }

        mesh.userData.isPart = true;
        scene.add(mesh);

        // CAD-style edge lines
        const edgesGeo = new THREE.EdgesGeometry(geo, 20);
        const edgeMat = new THREE.LineBasicMaterial({
          color: 0x000000,
          transparent: true,
          opacity: 0.15,
        });
        const edgeLines = new THREE.LineSegments(edgesGeo, edgeMat);
        edgeLines.position.copy(mesh.position);
        edgeLines.rotation.copy(mesh.rotation);
        edgeLines.userData.isEdge = true;
        scene.add(edgeLines);
      });
    }

    // Add subtractions as thin orange edge-only indicators
    if (showHoles && geometry.subtractions) {
      geometry.subtractions.forEach((sub) => {
        const geo = createGeometry(sub.type, sub.params || {});
        const edgesGeo = new THREE.EdgesGeometry(geo, 15);
        const edgeMat = new THREE.LineBasicMaterial({
          color: 0xff6633,
          transparent: true,
          opacity: 0.4,
        });
        const edgeLines = new THREE.LineSegments(edgesGeo, edgeMat);

        const pos = sub.position || [0, 0, 0];
        edgeLines.position.set(pos[0], pos[1], pos[2]);

        const rot = sub.rotation || [0, 0, 0];
        edgeLines.rotation.set(degToRad(rot[0]), degToRad(rot[1]), degToRad(rot[2]));

        edgeLines.userData.isHole = true;
        scene.add(edgeLines);
      });
    }

    // Auto-fit camera to model bounds
    if (geometry.parts && geometry.parts.length > 0) {
      const box = new THREE.Box3();
      scene.traverse((child) => {
        if (child.isMesh && child.userData.isPart) {
          box.expandByObject(child);
        }
      });
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);
      const dist = maxDim * 1.8;

      if (cameraRef.current && controlsRef.current) {
        cameraRef.current.position.set(
          center.x + dist * 0.6,
          center.y + dist * 0.4,
          center.z + dist * 0.7
        );
        controlsRef.current.target.copy(center);
        controlsRef.current.update();
      }
    }
  }, [geometry, assemblyId, showHoles]);

  return (
    <div
      ref={mountRef}
      style={{ width: '100%', height: '100%' }}
    />
  );
}

// STL Export
export function exportSTL(geometry) {
  if (!geometry || !geometry.parts) return null;

  let stl = 'solid model\n';

  geometry.parts.forEach((part) => {
    const tris = generateTriangles(part);
    tris.forEach((tri) => {
      const normal = computeNormal(tri[0], tri[1], tri[2]);
      stl += `  facet normal ${normal[0].toFixed(6)} ${normal[1].toFixed(6)} ${normal[2].toFixed(6)}\n`;
      stl += '    outer loop\n';
      tri.forEach((v) => {
        stl += `      vertex ${v[0].toFixed(6)} ${v[1].toFixed(6)} ${v[2].toFixed(6)}\n`;
      });
      stl += '    endloop\n';
      stl += '  endfacet\n';
    });
  });

  stl += 'endsolid model\n';
  return stl;
}

function computeNormal(v1, v2, v3) {
  const ax = v2[0] - v1[0], ay = v2[1] - v1[1], az = v2[2] - v1[2];
  const bx = v3[0] - v1[0], by = v3[1] - v1[1], bz = v3[2] - v1[2];
  const nx = ay * bz - az * by;
  const ny = az * bx - ax * bz;
  const nz = ax * by - ay * bx;
  const len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
  return [nx / len, ny / len, nz / len];
}

function generateTriangles(part) {
  const pos = part.position || [0, 0, 0];
  const p = part.params || {};

  if (part.type === 'box') {
    return boxTriangles(p.width || 10, p.height || 10, p.depth || 10, pos);
  } else if (part.type === 'cylinder') {
    return cylinderTriangles(p.radius || 5, p.radius || 5, p.height || 10, pos, 24);
  } else if (part.type === 'cone') {
    return cylinderTriangles(
      p.radiusTop != null ? p.radiusTop : 0,
      p.radiusBottom != null ? p.radiusBottom : 5,
      p.height || 10, pos, 24
    );
  } else if (part.type === 'torus') {
    return torusTriangles(p.radius || 10, p.tube || 2, pos, 16, 24);
  } else if (part.type === 'sphere') {
    return sphereTriangles(p.radius || 5, pos, 16, 12);
  }
  return [];
}

function boxTriangles(w, h, d, [px, py, pz]) {
  const hw = w / 2, hh = h / 2, hd = d / 2;
  const v = [
    [px - hw, py - hh, pz + hd], [px + hw, py - hh, pz + hd],
    [px + hw, py + hh, pz + hd], [px - hw, py + hh, pz + hd],
    [px - hw, py - hh, pz - hd], [px + hw, py - hh, pz - hd],
    [px + hw, py + hh, pz - hd], [px - hw, py + hh, pz - hd],
  ];
  const faces = [
    [0, 1, 2], [0, 2, 3], [1, 5, 6], [1, 6, 2], [5, 4, 7], [5, 7, 6],
    [4, 0, 3], [4, 3, 7], [3, 2, 6], [3, 6, 7], [4, 5, 1], [4, 1, 0],
  ];
  return faces.map((f) => [v[f[0]], v[f[1]], v[f[2]]]);
}

function cylinderTriangles(rTop, rBottom, h, [px, py, pz], seg) {
  const tris = [];
  const halfH = h / 2;
  for (let i = 0; i < seg; i++) {
    const a1 = (i / seg) * Math.PI * 2;
    const a2 = ((i + 1) / seg) * Math.PI * 2;
    const x1t = px + Math.cos(a1) * rTop, z1t = pz + Math.sin(a1) * rTop;
    const x2t = px + Math.cos(a2) * rTop, z2t = pz + Math.sin(a2) * rTop;
    const x1b = px + Math.cos(a1) * rBottom, z1b = pz + Math.sin(a1) * rBottom;
    const x2b = px + Math.cos(a2) * rBottom, z2b = pz + Math.sin(a2) * rBottom;
    // Side faces
    tris.push([[x1b, py - halfH, z1b], [x2b, py - halfH, z2b], [x2t, py + halfH, z2t]]);
    tris.push([[x1b, py - halfH, z1b], [x2t, py + halfH, z2t], [x1t, py + halfH, z1t]]);
    // Top cap
    if (rTop > 0) tris.push([[px, py + halfH, pz], [x1t, py + halfH, z1t], [x2t, py + halfH, z2t]]);
    // Bottom cap
    if (rBottom > 0) tris.push([[px, py - halfH, pz], [x2b, py - halfH, z2b], [x1b, py - halfH, z1b]]);
  }
  return tris;
}

function torusTriangles(radius, tube, [px, py, pz], segTube, segRad) {
  const tris = [];
  for (let i = 0; i < segRad; i++) {
    const a1 = (i / segRad) * Math.PI * 2;
    const a2 = ((i + 1) / segRad) * Math.PI * 2;
    for (let j = 0; j < segTube; j++) {
      const b1 = (j / segTube) * Math.PI * 2;
      const b2 = ((j + 1) / segTube) * Math.PI * 2;
      const getPoint = (a, b) => [
        px + (radius + tube * Math.cos(b)) * Math.cos(a),
        py + tube * Math.sin(b),
        pz + (radius + tube * Math.cos(b)) * Math.sin(a),
      ];
      const v1 = getPoint(a1, b1), v2 = getPoint(a2, b1);
      const v3 = getPoint(a2, b2), v4 = getPoint(a1, b2);
      tris.push([v1, v2, v3]);
      tris.push([v1, v3, v4]);
    }
  }
  return tris;
}

function sphereTriangles(r, [px, py, pz], segH, segV) {
  const tris = [];
  for (let i = 0; i < segV; i++) {
    const phi1 = (i / segV) * Math.PI;
    const phi2 = ((i + 1) / segV) * Math.PI;
    for (let j = 0; j < segH; j++) {
      const theta1 = (j / segH) * Math.PI * 2;
      const theta2 = ((j + 1) / segH) * Math.PI * 2;
      const v1 = [px + r * Math.sin(phi1) * Math.cos(theta1), py + r * Math.cos(phi1), pz + r * Math.sin(phi1) * Math.sin(theta1)];
      const v2 = [px + r * Math.sin(phi1) * Math.cos(theta2), py + r * Math.cos(phi1), pz + r * Math.sin(phi1) * Math.sin(theta2)];
      const v3 = [px + r * Math.sin(phi2) * Math.cos(theta2), py + r * Math.cos(phi2), pz + r * Math.sin(phi2) * Math.sin(theta2)];
      const v4 = [px + r * Math.sin(phi2) * Math.cos(theta1), py + r * Math.cos(phi2), pz + r * Math.sin(phi2) * Math.sin(theta1)];
      if (i !== 0) tris.push([v1, v2, v3]);
      if (i !== segV - 1) tris.push([v1, v3, v4]);
    }
  }
  return tris;
}
