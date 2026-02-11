import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import assets from './assets/assets.json';

export default function ThreeDView({ rooms }) {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const raycasterRef = useRef(new THREE.Raycaster());
  const mouseRef = useRef(new THREE.Vector2());
  const furnitureObjectsRef = useRef([]);
  const wallsRef = useRef([]);
  const cameraRef = useRef(null);
  
  const [selectedFurniture, setSelectedFurniture] = useState(null);
  const [hoveredFurniture, setHoveredFurniture] = useState(null);

  useEffect(() => {
    if (!rooms || rooms.length === 0) return;
    const mount = mountRef.current;
    const width = mount.clientWidth;
    const height = mount.clientHeight;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf5f5f5);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 5000);
    cameraRef.current = camera;
    
    // Calculate total scene bounds - ensure rooms don't overlap
    let totalWidth = 0;
    let maxDepth = 0;
    
    // Calculate layout - rooms side by side
    const roomPositions = [];
    let currentX = 0;
    
    rooms.forEach((room, index) => {
      const roomWidth = room.dimensions.breadth;
      const roomDepth = room.dimensions.length;
      
      // Position rooms side by side (no overlap)
      roomPositions.push({
        x: currentX + roomWidth / 2,
        z: roomDepth / 2
      });
      
      currentX += roomWidth; // Move to next room position
      totalWidth += roomWidth;
      maxDepth = Math.max(maxDepth, roomDepth);
    });
    
    const centerX = totalWidth / 2;
    const centerZ = maxDepth / 2;
    const maxDimension = Math.max(totalWidth, maxDepth);
    
    const cameraDistance = maxDimension * 1.2;
    camera.position.set(centerX - cameraDistance * 0.7, cameraDistance * 0.6, centerZ + cameraDistance * 0.7);
    camera.lookAt(centerX, 30, centerZ);

    const renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      powerPreference: "high-performance"
    });
    renderer.setClearColor(0xf5f5f5, 1);
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mount.appendChild(renderer.domElement);

    // Orbit controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = false;
    controls.minDistance = 50;
    controls.maxDistance = maxDimension * 3;
    controls.target.set(centerX, 30, centerZ);
    controls.maxPolarAngle = Math.PI / 2.1;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(centerX + 500, 500, centerZ + 500);
    dirLight.castShadow = true;
    dirLight.shadow.camera.left = -totalWidth;
    dirLight.shadow.camera.right = totalWidth;
    dirLight.shadow.camera.top = maxDepth;
    dirLight.shadow.camera.bottom = -maxDepth;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    scene.add(dirLight);

    const fillLight = new THREE.DirectionalLight(0xffffff, 0.4);
    fillLight.position.set(centerX - 300, 300, centerZ - 300);
    scene.add(fillLight);

    const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0x888888, 0.5);
    scene.add(hemisphereLight);

    // Store furniture objects and walls
    const furnitureObjects = [];
    const walls = [];

    // Use a single shared color for all scene materials
    const singleColor = 0xcccccc;
    const sharedMaterialProps = {
      color: singleColor,
      roughness: 0.9,
      metalness: 0.0,
      side: THREE.DoubleSide,
      flatShading: false,
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1,
      transparent: false,
      opacity: 1.0
    };

    const wallMaterial = new THREE.MeshStandardMaterial(sharedMaterialProps);
    const brickWallMaterial = wallMaterial;
    const floorMaterial = wallMaterial;
    const doorFrameMaterial = wallMaterial;
    const windowFrameMaterial = wallMaterial;

    // Add rooms with proper walls - NO OVERLAP
    rooms.forEach((room, roomIndex) => {
      const roomGroup = new THREE.Group();
      roomGroup.name = `room-${roomIndex}`;

      const roomWidth = room.dimensions.breadth;
      const roomDepth = room.dimensions.length;
      const wallHeight = 80;
      const wallThickness = 5;

      // Use calculated position (rooms side by side)
      const cx = roomPositions[roomIndex].x;
      const cz = roomPositions[roomIndex].z;

      // Create room floor - smooth, no texture
      const floorGeom = new THREE.BoxGeometry(roomWidth, 2, roomDepth);
      const roomFloor = new THREE.Mesh(floorGeom, floorMaterial);
      roomFloor.position.set(cx, 1, cz);
      roomFloor.receiveShadow = true;
      roomFloor.castShadow = false;
      roomGroup.add(roomFloor);

      // Wall material for this room
      const useBrick = roomIndex % 2 === 1;
      const currentWallMat = useBrick ? brickWallMaterial : wallMaterial;

      // NORTH WALL (front, minimum Z)
      const northGeom = new THREE.BoxGeometry(roomWidth, wallHeight, wallThickness);
      const northWall = new THREE.Mesh(northGeom, wallMaterial.clone());
      northWall.position.set(cx, wallHeight / 2, cz - roomDepth / 2);
      northWall.castShadow = true;
      northWall.receiveShadow = true;
      // Normal points in -Z direction (north/front)
      northWall.userData.normal = new THREE.Vector3(0, 0, -1);
      northWall.userData.wallType = 'vertical';
      walls.push(northWall);
      roomGroup.add(northWall);

      // SOUTH WALL (back, maximum Z) - plain wall (no doors)
      const southGeom = new THREE.BoxGeometry(roomWidth, wallHeight, wallThickness);
      const southWall = new THREE.Mesh(southGeom, wallMaterial.clone());
      southWall.position.set(cx, wallHeight / 2, cz + roomDepth / 2);
      southWall.castShadow = true;
      southWall.receiveShadow = true;
      // Normal points in +Z direction (south/back)
      southWall.userData.normal = new THREE.Vector3(0, 0, 1);
      southWall.userData.wallType = 'vertical';
      walls.push(southWall);
      roomGroup.add(southWall);

      // EAST WALL (right side, maximum X) - plain wall (no windows)
      const eastGeom = new THREE.BoxGeometry(wallThickness, wallHeight, roomDepth);
      const eastWall = new THREE.Mesh(eastGeom, currentWallMat.clone());
      eastWall.position.set(cx + roomWidth / 2, wallHeight / 2, cz);
      eastWall.castShadow = true;
      eastWall.receiveShadow = true;
      // Normal points in +X direction (east/right)
      eastWall.userData.normal = new THREE.Vector3(1, 0, 0);
      eastWall.userData.wallType = 'vertical';
      walls.push(eastWall);
      roomGroup.add(eastWall);

      // WEST WALL (left side, minimum X)
      // First room: solid wall
      // Other rooms: shared with previous room (no wall needed)
      if (roomIndex === 0) {
        const westGeom = new THREE.BoxGeometry(wallThickness, wallHeight, roomDepth);
        const westWall = new THREE.Mesh(westGeom, wallMaterial.clone());
        westWall.position.set(cx - roomWidth / 2, wallHeight / 2, cz);
        westWall.castShadow = true;
        westWall.receiveShadow = true;
        // Normal points in -X direction (west/left)
        westWall.userData.normal = new THREE.Vector3(-1, 0, 0);
        westWall.userData.wallType = 'vertical';
        walls.push(westWall);
        roomGroup.add(westWall);
      }

      scene.add(roomGroup);

      // Load furniture models
      const loader = new GLTFLoader();
      room.furniture.forEach((item, itemIndex) => {
        const modelData = assets.models.find(
          model => model?.name?.toLowerCase() === item?.type?.toLowerCase()
        );
        let modelPath;
        if (modelData) {
          modelPath = modelData.path.replace('@assets', '/src/assets');
        } else {
          const itemType = item?.type?.toLowerCase() || '';
          let bestMatch = null;
          let bestScore = 0;
          for (const model of assets.models) {
            const modelName = model?.name?.toLowerCase() || '';
            let score = 0;
            if (modelName && itemType) {
              for (let i = 0; i < itemType.length; i++) {
                for (let j = i + 1; j <= itemType.length; j++) {
                  const substr = itemType.substring(i, j);
                  if (substr.length > 2 && modelName.includes(substr)) {
                    score = Math.max(score, substr.length);
                  }
                }
              }
            }
            if (score > bestScore) {
              bestScore = score;
              bestMatch = model;
            }
          }
          if (bestMatch) {
            modelPath = bestMatch.path.replace('@assets', '/src/assets');
          } else {
            modelPath = assets.models[0].path.replace('@assets', '/src/assets');
          }
        }

        loader.load(
          modelPath,
          (gltf) => {
            const model = gltf.scene;
            model.scale.multiplyScalar(25);

            // Compute bounding box and clamp the model so it stays within room interior
            const bbox = new THREE.Box3().setFromObject(model);
            const size = bbox.getSize(new THREE.Vector3());

            const halfRoomW = roomWidth / 2;
            const halfRoomD = roomDepth / 2;
            const margin = 2; // safety margin to avoid touching walls

            // Available placement range for the model center relative to room center
            const maxX = halfRoomW - wallThickness - size.x / 2 - margin;
            const minX = -halfRoomW + wallThickness + size.x / 2 + margin;
            const maxZ = halfRoomD - wallThickness - size.z / 2 - margin;
            const minZ = -halfRoomD + wallThickness + size.z / 2 + margin;

            let placedX = item.position[0];
            let placedZ = item.position[1];

            if (minX <= maxX) placedX = Math.min(Math.max(placedX, minX), maxX);
            else placedX = 0; // model too wide — center it

            if (minZ <= maxZ) placedZ = Math.min(Math.max(placedZ, minZ), maxZ);
            else placedZ = 0; // model too deep — center it

            // Position Y so the model rests on top of the floor (floor top at y=2)
            const floorTopY = 2;
            const yPos = size.y / 2 + floorTopY;

            model.position.set(
              placedX + cx,
              yPos,
              placedZ + cz
            );

            model.traverse((child) => {
              if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
              }
            });

            model.userData = {
              type: item.type,
              roomIndex,
              itemIndex,
              roomType: room.roomtype,
              originalPosition: model.position.clone(),
              isInteractive: true
            };

            // No bounding-box helper: removed green highlight

            furnitureObjects.push(model);
            scene.add(model);
          },
          undefined,
          (error) => {
            console.error('Error loading model:', error);
          }
        );
      });
    });

    furnitureObjectsRef.current = furnitureObjects;
    wallsRef.current = walls;

    // Function to update wall visibility based on camera angle
    function updateWallVisibility() {
      const cameraDirection = new THREE.Vector3();
      camera.getWorldDirection(cameraDirection);

      walls.forEach(wall => {
        if (wall.userData.wallType === 'vertical') {
          // Get the wall's position in world space
          const wallWorldPos = new THREE.Vector3();
          wall.getWorldPosition(wallWorldPos);

          // Calculate direction from camera to wall
          const toWall = new THREE.Vector3().subVectors(wallWorldPos, camera.position);
          toWall.normalize();

          // Get wall normal (already stored in userData)
          const wallNormal = wall.userData.normal.clone();

          // Calculate dot product between camera direction and wall normal
          // If the wall is facing the camera (dot product < 0), hide it
          const dot = toWall.dot(wallNormal);

          // Hide walls that are between the camera and the room interior
          // Threshold of -0.3 means walls at a slight angle are also hidden
          if (dot < -0.1) {
            wall.material.opacity = 0;
            wall.visible = false;
          } else {
            wall.material.opacity = 1.0;
            wall.visible = true;
          }
        }
      });
    }

    // Mouse interaction handlers
    const onMouseMove = (event) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycasterRef.current.setFromCamera(mouseRef.current, camera);
      const intersects = raycasterRef.current.intersectObjects(furnitureObjects, true);

      if (intersects.length > 0) {
        let object = intersects[0].object;
        while (object.parent && !object.userData.isInteractive) {
          object = object.parent;
        }
        
        if (object.userData.isInteractive) {
          setHoveredFurniture(object.userData);
          renderer.domElement.style.cursor = 'pointer';
        } else {
          setHoveredFurniture(null);
          renderer.domElement.style.cursor = 'default';
        }
      } else {
        setHoveredFurniture(null);
        renderer.domElement.style.cursor = 'default';
      }
    };

    const onClick = (event) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycasterRef.current.setFromCamera(mouseRef.current, camera);
      const intersects = raycasterRef.current.intersectObjects(furnitureObjects, true);

      if (intersects.length > 0) {
        let object = intersects[0].object;
        while (object.parent && !object.userData.isInteractive) {
          object = object.parent;
        }
        
        if (object.userData.isInteractive) {
          // Select the object (no bounding-box helper toggling)
          setSelectedFurniture(object.userData);
        }
      } else {
        // Clicked empty space: deselect (no helper to hide)
        setSelectedFurniture(null);
      }
    };

    renderer.domElement.addEventListener('mousemove', onMouseMove);
    renderer.domElement.addEventListener('click', onClick);

    // Animation loop
    function animate() {
      requestAnimationFrame(animate);
      controls.update();
      updateWallVisibility(); // Update wall visibility each frame
      renderer.render(scene, camera);
    }
    animate();

    // Cleanup
    return () => {
      renderer.domElement.removeEventListener('mousemove', onMouseMove);
      renderer.domElement.removeEventListener('click', onClick);
      mount.removeChild(renderer.domElement);
    };
  }, [rooms]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh' }}>
      <div 
        ref={mountRef} 
        style={{ 
          width: '100%', 
          height: '100%', 
          background: '#f5f5f5'
        }} 
      />
      
      {hoveredFurniture && (
        <div style={{
          position: 'absolute',
          top: '20px',
          left: '20px',
          background: 'rgba(0,0,0,0.85)',
          color: 'white',
          padding: '10px 16px',
          borderRadius: '8px',
          fontSize: '14px',
          pointerEvents: 'none',
          fontFamily: 'system-ui, -apple-system, sans-serif'
        }}>
          <strong>{hoveredFurniture.type}</strong>
          <div style={{ fontSize: '12px', opacity: 0.9, marginTop: '2px' }}>
            {hoveredFurniture.roomType}
          </div>
        </div>
      )}

      {selectedFurniture && (
        <div style={{
          position: 'absolute',
          top: '20px',
          right: '20px',
          background: 'white',
          padding: '16px',
          borderRadius: '12px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
          minWidth: '200px',
          fontFamily: 'system-ui, -apple-system, sans-serif'
        }}>
          <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px', color: '#333' }}>
            {selectedFurniture.type}
          </div>
          <div style={{ fontSize: '13px', color: '#666', marginBottom: '4px' }}>
            Room: {selectedFurniture.roomType}
          </div>
          <button
            onClick={() => setSelectedFurniture(null)}
            style={{
              marginTop: '12px',
              padding: '6px 12px',
              fontSize: '13px',
              borderRadius: '6px',
              border: '1px solid #ddd',
              background: 'white',
              cursor: 'pointer',
              width: '100%'
            }}
          >
            Deselect
          </button>
        </div>
      )}

      <div style={{
        position: 'absolute',
        bottom: '20px',
        left: '20px',
        background: 'rgba(255,255,255,0.95)',
        padding: '12px 16px',
        borderRadius: '8px',
        fontSize: '12px',
        color: '#666',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        lineHeight: '1.6'
      }}>
        <strong style={{ color: '#333', display: 'block', marginBottom: '4px' }}>Controls:</strong>
        Drag to rotate • Scroll to zoom • Right-click to pan
      </div>
    </div>
  );
}