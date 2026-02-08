import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
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
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.set(0, 100, 200);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
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
      // Room geometry (simple box)
      const geometry = new THREE.BoxGeometry(room.dimensions.breadth, 50, room.dimensions.length);
      const material = new THREE.MeshPhongMaterial({ color: room.room_color });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(room.position[0], 25, room.position[1]);
      scene.add(mesh);

      // Add furniture (load GLB model for each item)
      const loader = new GLTFLoader();
      room.furniture.forEach(item => {
        loader.load('/src/assets/kitchen/sofa.glb', (gltf) => {
          const model = gltf.scene;
          model.scale.set(10, 10, 10); // Scale the model
          model.position.set(
            item.position[0] + room.position[0],
            0, // Adjust height if needed
            item.position[1] + room.position[1]
          );
          scene.add(model);
        }, undefined, (error) => {
          console.error('An error occurred while loading the model:', error);
        });
      });
    });

    // Lighting
    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(0, 200, 100);
    scene.add(light);
    scene.add(new THREE.AmbientLight(0x404040));

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

  return <div ref={mountRef} style={{ width: '100%', height: '500px' }} />;
}
