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
    
    // Calculate total scene bounds
    let minX = Infinity, maxX = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;
    
    rooms.forEach(room => {
      const halfBreadth = room.dimensions.breadth / 2;
      const halfLength = room.dimensions.length / 2;
      minX = Math.min(minX, room.position[0] - halfBreadth);
      maxX = Math.max(maxX, room.position[0] + halfBreadth);
      minZ = Math.min(minZ, room.position[1] - halfLength);
      maxZ = Math.max(maxZ, room.position[1] + halfLength);
    });
    
    const centerX = (minX + maxX) / 2;
    const centerZ = (minZ + maxZ) / 2;
    const sceneWidth = maxX - minX;
    const sceneDepth = maxZ - minZ;
    const maxDimension = Math.max(sceneWidth, sceneDepth);
    
    const cameraDistance = maxDimension * 1.5;
    camera.position.set(centerX - cameraDistance * 0.7, cameraDistance * 0.6, centerZ + cameraDistance * 0.7);
    camera.lookAt(centerX, 0, centerZ);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
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
    controls.maxPolarAngle = Math.PI / 2.1; // Prevent going below floor

    // Lighting - improved for better visibility
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    // Main directional light
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(centerX + 500, 500, centerZ + 500);
    dirLight.castShadow = true;
    dirLight.shadow.camera.left = -maxDimension;
    dirLight.shadow.camera.right = maxDimension;
    dirLight.shadow.camera.top = maxDimension;
    dirLight.shadow.camera.bottom = -maxDimension;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    scene.add(dirLight);

    // Secondary fill light
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.4);
    fillLight.position.set(centerX - 300, 300, centerZ - 300);
    scene.add(fillLight);

    const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0x888888, 0.5);
    scene.add(hemisphereLight);

    // Store furniture objects
    const furnitureObjects = [];

    // Wall material - single sided, visible only from outside
    const createWallMaterial = (color, isBrick = false) => {
      return new THREE.MeshStandardMaterial({
        color: color,
        roughness: isBrick ? 0.9 : 0.8,
        metalness: 0.1,
        side: THREE.FrontSide // Only render front face (outside)
      });
    };

    // Floor material
    const floorMaterial = new THREE.MeshStandardMaterial({
      color: 0xd4a574, // Warmer wood tone
      roughness: 0.8,
      metalness: 0.1
    });

    // Add rooms with proper walls
    rooms.forEach((room, roomIndex) => {
      const roomGroup = new THREE.Group();
      roomGroup.name = `room-${roomIndex}`;

      const roomWidth = room.dimensions.breadth;
      const roomDepth = room.dimensions.length;
      const wallHeight = 80;
      const wallThickness = 5;

      // Room center position
      const cx = room.position[0];
      const cz = room.position[1];

      // Create room floor
      const floorGeom = new THREE.BoxGeometry(roomWidth, 2, roomDepth);
      const roomFloor = new THREE.Mesh(floorGeom, floorMaterial);
      roomFloor.position.set(cx, 1, cz);
      roomFloor.receiveShadow = true;
      roomFloor.castShadow = false;
      roomGroup.add(roomFloor);

      // Determine wall colors - alternate between cream and brick
      const wallColor = 0xf5f5dc; // Cream
      const brickColor = 0xb8734f; // Brick
      const useBrick = roomIndex % 2 === 1;

      // Wall dimensions for each side
      const walls = [];

      // NORTH WALL (front, -Z side)
      const northGeom = new THREE.BoxGeometry(roomWidth, wallHeight, wallThickness);
      const northWall = new THREE.Mesh(northGeom, createWallMaterial(wallColor));
      northWall.position.set(cx, wallHeight / 2, cz - roomDepth / 2);
      northWall.castShadow = true;
      northWall.receiveShadow = true;
      walls.push(northWall);

      // SOUTH WALL (back, +Z side) - with door if not last room
      const hasDoor = roomIndex < rooms.length - 1;
      
      if (hasDoor) {
        // Create wall segments around door
        const doorWidth = 35;
        const doorHeight = 65;
        const doorX = 0; // Center of wall
        
        // Left segment
        const leftWidth = (roomWidth - doorWidth) / 2 - 2;
        if (leftWidth > 0) {
          const leftGeom = new THREE.BoxGeometry(leftWidth, wallHeight, wallThickness);
          const leftWall = new THREE.Mesh(leftGeom, createWallMaterial(wallColor));
          leftWall.position.set(cx - roomWidth / 2 + leftWidth / 2, wallHeight / 2, cz + roomDepth / 2);
          leftWall.castShadow = true;
          leftWall.receiveShadow = true;
          walls.push(leftWall);
        }
        
        // Right segment
        const rightWidth = (roomWidth - doorWidth) / 2 - 2;
        if (rightWidth > 0) {
          const rightGeom = new THREE.BoxGeometry(rightWidth, wallHeight, wallThickness);
          const rightWall = new THREE.Mesh(rightGeom, createWallMaterial(wallColor));
          rightWall.position.set(cx + roomWidth / 2 - rightWidth / 2, wallHeight / 2, cz + roomDepth / 2);
          rightWall.castShadow = true;
          rightWall.receiveShadow = true;
          walls.push(rightWall);
        }
        
        // Top segment above door
        const topGeom = new THREE.BoxGeometry(doorWidth, wallHeight - doorHeight, wallThickness);
        const topWall = new THREE.Mesh(topGeom, createWallMaterial(wallColor));
        topWall.position.set(cx + doorX, doorHeight + (wallHeight - doorHeight) / 2, cz + roomDepth / 2);
        topWall.castShadow = true;
        topWall.receiveShadow = true;
        walls.push(topWall);
        
        // Door frame
        const frameGeom = new THREE.BoxGeometry(doorWidth + 4, doorHeight + 4, wallThickness + 2);
        const frameMat = new THREE.MeshStandardMaterial({ color: 0x654321, side: THREE.DoubleSide });
        const doorFrame = new THREE.Mesh(frameGeom, frameMat);
        doorFrame.position.set(cx + doorX, doorHeight / 2, cz + roomDepth / 2);
        walls.push(doorFrame);
        
      } else {
        // Solid south wall
        const southGeom = new THREE.BoxGeometry(roomWidth, wallHeight, wallThickness);
        const southWall = new THREE.Mesh(southGeom, createWallMaterial(wallColor));
        southWall.position.set(cx, wallHeight / 2, cz + roomDepth / 2);
        southWall.castShadow = true;
        southWall.receiveShadow = true;
        walls.push(southWall);
      }

      // EAST WALL (right, +X side) - with window
      const hasWindow = true;
      
      if (hasWindow) {
        const windowWidth = 45;
        const windowHeight = 35;
        const windowY = 45; // Height from floor
        
        // Bottom segment
        const bottomGeom = new THREE.BoxGeometry(wallThickness, windowY - 2, roomDepth);
        const bottomWall = new THREE.Mesh(bottomGeom, createWallMaterial(useBrick ? brickColor : wallColor, useBrick));
        bottomWall.position.set(cx + roomWidth / 2, (windowY - 2) / 2, cz);
        bottomWall.castShadow = true;
        bottomWall.receiveShadow = true;
        walls.push(bottomWall);
        
        // Top segment
        const topHeight = wallHeight - windowY - windowHeight - 2;
        const topGeom = new THREE.BoxGeometry(wallThickness, topHeight, roomDepth);
        const topWall = new THREE.Mesh(topGeom, createWallMaterial(useBrick ? brickColor : wallColor, useBrick));
        topWall.position.set(cx + roomWidth / 2, windowY + windowHeight + topHeight / 2, cz);
        topWall.castShadow = true;
        topWall.receiveShadow = true;
        walls.push(topWall);
        
        // Left side of window
        const leftDepth = (roomDepth - windowWidth) / 2;
        const leftGeom = new THREE.BoxGeometry(wallThickness, windowHeight, leftDepth);
        const leftWall = new THREE.Mesh(leftGeom, createWallMaterial(useBrick ? brickColor : wallColor, useBrick));
        leftWall.position.set(cx + roomWidth / 2, windowY + windowHeight / 2, cz - roomDepth / 2 + leftDepth / 2);
        leftWall.castShadow = true;
        leftWall.receiveShadow = true;
        walls.push(leftWall);
        
        // Right side of window
        const rightDepth = (roomDepth - windowWidth) / 2;
        const rightGeom = new THREE.BoxGeometry(wallThickness, windowHeight, rightDepth);
        const rightWall = new THREE.Mesh(rightGeom, createWallMaterial(useBrick ? brickColor : wallColor, useBrick));
        rightWall.position.set(cx + roomWidth / 2, windowY + windowHeight / 2, cz + roomDepth / 2 - rightDepth / 2);
        rightWall.castShadow = true;
        rightWall.receiveShadow = true;
        walls.push(rightWall);
        
        // Window frame
        const frameGeom = new THREE.BoxGeometry(wallThickness + 4, windowHeight + 4, windowWidth + 4);
        const frameMat = new THREE.MeshStandardMaterial({ color: 0xffffff, side: THREE.DoubleSide });
        const windowFrame = new THREE.Mesh(frameGeom, frameMat);
        windowFrame.position.set(cx + roomWidth / 2, windowY + windowHeight / 2, cz);
        walls.push(windowFrame);
        
        // Window glass
        const glassGeom = new THREE.BoxGeometry(1, windowHeight, windowWidth);
        const glassMat = new THREE.MeshPhysicalMaterial({
          color: 0x88ccff,
          transparent: true,
          opacity: 0.25,
          transmission: 0.9,
          roughness: 0.1,
          metalness: 0.0,
          side: THREE.DoubleSide
        });
        const windowGlass = new THREE.Mesh(glassGeom, glassMat);
        windowGlass.position.set(cx + roomWidth / 2, windowY + windowHeight / 2, cz);
        walls.push(windowGlass);
        
      } else {
        // Solid east wall
        const eastGeom = new THREE.BoxGeometry(wallThickness, wallHeight, roomDepth);
        const eastWall = new THREE.Mesh(eastGeom, createWallMaterial(useBrick ? brickColor : wallColor, useBrick));
        eastWall.position.set(cx + roomWidth / 2, wallHeight / 2, cz);
        eastWall.castShadow = true;
        eastWall.receiveShadow = true;
        walls.push(eastWall);
      }

      // WEST WALL (left, -X side)
      const westGeom = new THREE.BoxGeometry(wallThickness, wallHeight, roomDepth);
      const westWall = new THREE.Mesh(westGeom, createWallMaterial(wallColor));
      westWall.position.set(cx - roomWidth / 2, wallHeight / 2, cz);
      westWall.castShadow = true;
      westWall.receiveShadow = true;
      walls.push(westWall);

      // Add all walls to room group
      walls.forEach(wall => roomGroup.add(wall));

      // Add room label (floating text)
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.width = 512;
      canvas.height = 128;
      context.fillStyle = '#333333';
      context.font = 'bold 48px Arial';
      context.textAlign = 'center';
      context.fillText(`${room.roomtype} ${room.roomno}`, 256, 64);
      
      const texture = new THREE.CanvasTexture(canvas);
      const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
      const sprite = new THREE.Sprite(spriteMaterial);
      sprite.scale.set(80, 20, 1);
      sprite.position.set(cx, wallHeight + 15, cz);
      roomGroup.add(sprite);

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
            model.scale.set(10, 10, 10);

            // Clamp furniture position within room bounds
            const adjustedX = Math.min(
              Math.max(item.position[0], -roomWidth / 2 + 15),
              roomWidth / 2 - 15
            );
            const adjustedZ = Math.min(
              Math.max(item.position[1], -roomDepth / 2 + 15),
              roomDepth / 2 - 15
            );

            model.position.set(
              adjustedX + cx,
              2, // Place on floor
              adjustedZ + cz
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

            const bbox = new THREE.Box3().setFromObject(model);
            const helper = new THREE.Box3Helper(bbox, 0x00ff00);
            helper.visible = false;
            helper.name = 'boundingBoxHelper';
            scene.add(helper);
            model.userData.boundingBoxHelper = helper;

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
          if (selectedFurniture) {
            const prevObj = furnitureObjects.find(
              obj => obj.userData.roomIndex === selectedFurniture.roomIndex &&
                    obj.userData.itemIndex === selectedFurniture.itemIndex
            );
            if (prevObj?.userData.boundingBoxHelper) {
              prevObj.userData.boundingBoxHelper.visible = false;
            }
          }

          setSelectedFurniture(object.userData);
          
          if (object.userData.boundingBoxHelper) {
            object.userData.boundingBoxHelper.visible = true;
          }
        }
      } else {
        if (selectedFurniture) {
          const obj = furnitureObjects.find(
            obj => obj.userData.roomIndex === selectedFurniture.roomIndex &&
                  obj.userData.itemIndex === selectedFurniture.itemIndex
          );
          if (obj?.userData.boundingBoxHelper) {
            obj.userData.boundingBoxHelper.visible = false;
          }
        }
        setSelectedFurniture(null);
      }
    };

    renderer.domElement.addEventListener('mousemove', onMouseMove);
    renderer.domElement.addEventListener('click', onClick);

    // Animation loop
    function animate() {
      requestAnimationFrame(animate);
      controls.update();
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
      
      {/* Minimal hover tooltip */}
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

      {/* Selected furniture info - minimal */}
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

      {/* Simple instructions */}
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