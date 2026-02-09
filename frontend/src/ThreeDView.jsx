import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import assets from './assets/assets.json';
function parseRooms(response) {
  // Flatten furniture and create simple room geometry
  return response.map(room => ({
    ...room,
    furniture: room.furniture.map(item => ({
      ...item,
      // Add default scale/rotation/model_url if needed
      scale: 1,
      rotation: 0,
      model_url: null
    }))
  }));
}

export default function ThreeDView({ rooms }) {
  const mountRef = useRef(null);

  useEffect(() => {
    if (!rooms || rooms.length === 0) return;
    const mount = mountRef.current;
    const width = mount.clientWidth;
    const height = mount.clientHeight;

    // Scene setup
    const scene = new THREE.Scene();
    // Set background to white
    scene.background = new THREE.Color(0xffffff);
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.set(0, 100, 200);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setClearColor(0xffffff, 1); // White background
    renderer.setSize(width, height);
    mount.appendChild(renderer.domElement);

    // Orbit controls for interaction
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = false;
    controls.minDistance = 50;
    controls.maxDistance = 1000;
    controls.maxPolarAngle = Math.PI;

    // Add rooms
    rooms.forEach(room => {
      // Room geometry (simple box, but with highly transparent walls)
      const geometry = new THREE.BoxGeometry(room.dimensions.breadth, 50, room.dimensions.length);
      const material = new THREE.MeshPhysicalMaterial({
        color: room.room_color,
        transparent: true,
        opacity: 0.12, // More transparent
        transmission: 0.8, // Glass-like
        roughness: 0.1,
        metalness: 0.1,
        thickness: 0.5,
        side: THREE.DoubleSide
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(room.position[0], 25, room.position[1]);
      scene.add(mesh);

      // Add furniture (load GLB model for each item)
      const loader = new GLTFLoader();
      room.furniture.forEach(item => {
        const modelData = assets.models.find(model => model?.name?.toLowerCase() === item?.type?.toLowerCase());
        const modelPath = modelData ? modelData.path.replace('@assets', '/src/assets') : '/src/assets/living/coffee_table.glb';

        loader.load(modelPath, (gltf) => {
          const model = gltf.scene;
          model.scale.set(10, 10, 10); // Scale the model

          // Ensure furniture stays within room boundaries
          const adjustedX = Math.min(
            Math.max(item.position[0], -room.dimensions.breadth / 2 + 10),
            room.dimensions.breadth / 2 - 10
          );
          const adjustedZ = Math.min(
            Math.max(item.position[1], -room.dimensions.length / 2 + 10),
            room.dimensions.length / 2 - 10
          );

          model.position.set(
            adjustedX + room.position[0],
            0, // Adjust height if needed
            adjustedZ + room.position[1]
          );
          scene.add(model);
        }, undefined, (error) => {
          console.error('An error occurred while loading the model:', error);
        });
      });
    });

    // Lighting
    // Add soft ambient light
    scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    // Add a directional light for shadows and depth
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(100, 200, 100);
    dirLight.castShadow = true;
    scene.add(dirLight);
    // Add a hemisphere light for more natural look
    scene.add(new THREE.HemisphereLight(0xffffff, 0x888888, 0.5));

    // Add a grid helper for better visualization
    const grid = new THREE.GridHelper(1000, 40, 0xcccccc, 0xe0e0e0);
    grid.position.y = 0.1;
    scene.add(grid);

    // Animation loop
    function animate() {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    }
    animate();

    // Cleanup
    return () => {
      mount.removeChild(renderer.domElement);
    };
  }, [rooms]);

  return <div ref={mountRef} style={{ width: '1099px', height: '800px', background: '#fff', borderRadius: '12px', boxShadow: '0 2px 16px #ccc' }} />;
}
