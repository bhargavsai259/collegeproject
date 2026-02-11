  import React, { useEffect, useRef, useState } from 'react';
  import * as THREE from 'three';
  import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
  import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
  import assets from './assets/assets.json';

  export default function ThreeDView({ rooms }) {
    const mountRef = useRef(null);
    const sceneRef = useRef(null);
    const cameraRef = useRef(null);
    const rendererRef = useRef(null);
    const controlsRef = useRef(null);
    const raycasterRef = useRef(new THREE.Raycaster());
    const mouseRef = useRef(new THREE.Vector2());
    const furnitureObjectsRef = useRef([]);
    
    const [selectedFurniture, setSelectedFurniture] = useState(null);
    const [viewMode, setViewMode] = useState('perspective'); // perspective, top, front, side
    const [showGrid, setShowGrid] = useState(true);
    const [showRoomWalls, setShowRoomWalls] = useState(true);
    const [wallOpacity, setWallOpacity] = useState(0.12);
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
      
      // Calculate total scene bounds to position camera optimally
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
      
      // Position camera to see entire scene
      const cameraDistance = maxDimension * 1.2;
      camera.position.set(centerX, cameraDistance * 0.8, centerZ + cameraDistance * 0.8);
      camera.lookAt(centerX, 0, centerZ);
      cameraRef.current = camera;

      const renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setClearColor(0xf5f5f5, 1);
      renderer.setSize(width, height);
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      rendererRef.current = renderer;
      mount.appendChild(renderer.domElement);

      // Orbit controls
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;
      controls.screenSpacePanning = false;
      controls.minDistance = 100;
      controls.maxDistance = maxDimension * 3;
      controls.target.set(centerX, 0, centerZ);
      controlsRef.current = controls;

      // Lighting
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
      scene.add(ambientLight);

      const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
      dirLight.position.set(500, 500, 500);
      dirLight.castShadow = true;
      dirLight.shadow.camera.left = -1000;
      dirLight.shadow.camera.right = 1000;
      dirLight.shadow.camera.top = 1000;
      dirLight.shadow.camera.bottom = -1000;
      dirLight.shadow.mapSize.width = 2048;
      dirLight.shadow.mapSize.height = 2048;
      scene.add(dirLight);

      const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0x888888, 0.4);
      scene.add(hemisphereLight);

      // Grid helper - size based on scene
      const gridSize = Math.max(maxDimension * 2, 1000);
      const grid = new THREE.GridHelper(gridSize, 50, 0xcccccc, 0xe0e0e0);
      grid.position.set(centerX, 0.1, centerZ);
      grid.visible = showGrid;
      grid.name = 'gridHelper';
      scene.add(grid);

      // Floor plane for shadows - match grid size
      const floorGeometry = new THREE.PlaneGeometry(gridSize * 1.5, gridSize * 1.5);
      const floorMaterial = new THREE.ShadowMaterial({ opacity: 0.1 });
      const floor = new THREE.Mesh(floorGeometry, floorMaterial);
      floor.rotation.x = -Math.PI / 2;
      floor.position.set(centerX, 0, centerZ);
      floor.receiveShadow = true;
      scene.add(floor);

      // Store furniture objects for interaction
      const furnitureObjects = [];

      // Add rooms with furniture
      rooms.forEach((room, roomIndex) => {
        // Room walls (box outline)
        const roomGroup = new THREE.Group();
        roomGroup.name = `room-${roomIndex}`;

        // Create room box
        const geometry = new THREE.BoxGeometry(
          room.dimensions.breadth,
          80,
          room.dimensions.length
        );
        
        const material = new THREE.MeshPhysicalMaterial({
          color: room.room_color || 0xffffff,
          transparent: true,
          opacity: wallOpacity,
          transmission: 0.8,
          roughness: 0.1,
          metalness: 0.05,
          thickness: 0.5,
          side: THREE.DoubleSide
        });
        
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(room.position[0], 40, room.position[1]);
        mesh.visible = showRoomWalls;
        mesh.name = 'roomWall';
        roomGroup.add(mesh);

        // Room floor outline
        const edgesGeometry = new THREE.EdgesGeometry(
          new THREE.BoxGeometry(room.dimensions.breadth, 1, room.dimensions.length)
        );
        const edgesMaterial = new THREE.LineBasicMaterial({ color: 0x333333, linewidth: 2 });
        const edges = new THREE.LineSegments(edgesGeometry, edgesMaterial);
        edges.position.set(room.position[0], 0.5, room.position[1]);
        roomGroup.add(edges);

        // Add room label
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 512;
        canvas.height = 128;
        context.fillStyle = '#333333';
        context.font = 'bold 48px Arial';
        context.textAlign = 'center';
        context.fillText(`${room.roomtype} (Room ${room.roomno})`, 256, 64);
        
        const texture = new THREE.CanvasTexture(canvas);
        const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
        const sprite = new THREE.Sprite(spriteMaterial);
        sprite.scale.set(100, 25, 1);
        sprite.position.set(room.position[0], 90, room.position[1]);
        roomGroup.add(sprite);

        scene.add(roomGroup);

        // Load furniture models
        const loader = new GLTFLoader();
        room.furniture.forEach((item, itemIndex) => {
          const modelData = assets.models.find(
            model => model?.name?.toLowerCase() === item?.type?.toLowerCase()
          );
          const modelPath = modelData 
            ? modelData.path.replace('@assets', '/src/assets')
            : '/src/assets/living/coffee_table.glb';

          loader.load(
            modelPath,
            (gltf) => {
              const model = gltf.scene;
              model.scale.set(10, 10, 10);

              // Keep furniture within room boundaries
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
                0,
                adjustedZ + room.position[1]
              );

              // Enable shadows
              model.traverse((child) => {
                if (child.isMesh) {
                  child.castShadow = true;
                  child.receiveShadow = true;
                }
              });

              // Store metadata for interaction
              model.userData = {
                type: item.type,
                roomIndex,
                itemIndex,
                roomType: room.roomtype,
                originalPosition: model.position.clone(),
                isInteractive: true
              };

              // Create bounding box helper (initially hidden)
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

        // Raycast for hover effect
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
            // Deselect previous
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
            
            // Show bounding box
            if (object.userData.boundingBoxHelper) {
              object.userData.boundingBoxHelper.visible = true;
            }
          }
        } else {
          // Deselect
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
    }, [rooms, showGrid, showRoomWalls, wallOpacity]);

    // Update camera view mode
    useEffect(() => {
      if (!cameraRef.current || !controlsRef.current || !rooms || rooms.length === 0) return;

      const camera = cameraRef.current;
      const controls = controlsRef.current;

      // Calculate scene center
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
      const cameraDistance = maxDimension * 1.2;

      switch (viewMode) {
        case 'top':
          camera.position.set(centerX, cameraDistance * 1.5, centerZ);
          camera.lookAt(centerX, 0, centerZ);
          controls.target.set(centerX, 0, centerZ);
          controls.enabled = true;
          break;
        case 'front':
          camera.position.set(centerX, cameraDistance * 0.4, centerZ + cameraDistance);
          camera.lookAt(centerX, 0, centerZ);
          controls.target.set(centerX, 0, centerZ);
          controls.enabled = true;
          break;
        case 'side':
          camera.position.set(centerX + cameraDistance, cameraDistance * 0.4, centerZ);
          camera.lookAt(centerX, 0, centerZ);
          controls.target.set(centerX, 0, centerZ);
          controls.enabled = true;
          break;
        default: // perspective
          camera.position.set(centerX, cameraDistance * 0.8, centerZ + cameraDistance * 0.8);
          camera.lookAt(centerX, 0, centerZ);
          controls.target.set(centerX, 0, centerZ);
          controls.enabled = true;
      }
    }, [viewMode, rooms]);

    // Update grid visibility
    useEffect(() => {
      if (!sceneRef.current) return;
      const grid = sceneRef.current.getObjectByName('gridHelper');
      if (grid) grid.visible = showGrid;
    }, [showGrid]);

    // Update wall visibility and opacity
    useEffect(() => {
      if (!sceneRef.current) return;
      sceneRef.current.traverse((obj) => {
        if (obj.name === 'roomWall') {
          obj.visible = showRoomWalls;
          obj.material.opacity = wallOpacity;
        }
      });
    }, [showRoomWalls, wallOpacity]);

    const resetCamera = () => {
      setViewMode('perspective');
    };

    return (
      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
        {/* 3D Viewport */}
        <div style={{ position: 'relative' }}>
          <div 
            ref={mountRef} 
            style={{ 
              width: '1099px', 
              height: '800px', 
              background: '#f5f5f5', 
              borderRadius: '12px', 
              boxShadow: '0 2px 16px rgba(0,0,0,0.1)',
              position: 'relative'
            }} 
          />
          
          {/* Hover tooltip */}
          {hoveredFurniture && !selectedFurniture && (
            <div style={{
              position: 'absolute',
              top: '16px',
              left: '16px',
              background: 'rgba(0,0,0,0.8)',
              color: 'white',
              padding: '8px 12px',
              borderRadius: '6px',
              fontSize: '14px',
              pointerEvents: 'none'
            }}>
              {hoveredFurniture.type} in {hoveredFurniture.roomType}
            </div>
          )}
        </div>

        {/* Control Panel */}
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '20px',
          boxShadow: '0 2px 16px rgba(0,0,0,0.1)',
          minWidth: '280px',
          maxWidth: '350px'
        }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', color: '#333' }}>Controls</h3>
          
          {/* View Mode */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '14px' }}>
              View Mode
            </label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {['perspective', 'top', 'front', 'side'].map(mode => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  style={{
                    padding: '6px 12px',
                    fontSize: '13px',
                    borderRadius: '6px',
                    border: viewMode === mode ? '2px solid #646cff' : '1px solid #ddd',
                    background: viewMode === mode ? '#e8eaff' : 'white',
                    cursor: 'pointer',
                    textTransform: 'capitalize'
                  }}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          {/* Display Options */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '14px' }}>
              Display
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
                <input 
                  type="checkbox" 
                  checked={showGrid}
                  onChange={(e) => setShowGrid(e.target.checked)}
                />
                Show Grid
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
                <input 
                  type="checkbox" 
                  checked={showRoomWalls}
                  onChange={(e) => setShowRoomWalls(e.target.checked)}
                />
                Show Room Walls
              </label>
            </div>
          </div>

          {/* Wall Opacity */}
          {showRoomWalls && (
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '14px' }}>
                Wall Opacity: {Math.round(wallOpacity * 100)}%
              </label>
              <input 
                type="range"
                min="0"
                max="0.5"
                step="0.05"
                value={wallOpacity}
                onChange={(e) => setWallOpacity(parseFloat(e.target.value))}
                style={{ width: '100%' }}
              />
            </div>
          )}

          {/* Reset Button */}
          <button
            onClick={resetCamera}
            style={{
              width: '100%',
              padding: '10px',
              fontSize: '14px',
              borderRadius: '6px',
              border: '1px solid #ddd',
              background: 'white',
              cursor: 'pointer',
              marginBottom: '20px'
            }}
          >
            Reset Camera
          </button>

          {/* Selected Furniture Info */}
          {selectedFurniture && (
            <div style={{
              padding: '12px',
              background: '#f0f7ff',
              borderRadius: '8px',
              border: '1px solid #c3dafe'
            }}>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '16px', color: '#1e40af' }}>
                Selected Furniture
              </h4>
              <div style={{ fontSize: '14px', color: '#333', lineHeight: '1.6' }}>
                <p style={{ margin: '4px 0' }}><strong>Type:</strong> {selectedFurniture.type}</p>
                <p style={{ margin: '4px 0' }}><strong>Room:</strong> {selectedFurniture.roomType}</p>
                <p style={{ margin: '4px 0' }}><strong>Room #:</strong> {rooms[selectedFurniture.roomIndex]?.roomno}</p>
              </div>
              <button
                onClick={() => setSelectedFurniture(null)}
                style={{
                  marginTop: '10px',
                  padding: '6px 12px',
                  fontSize: '12px',
                  borderRadius: '4px',
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

          {/* Instructions */}
          <div style={{
            marginTop: '20px',
            padding: '12px',
            background: '#f9f9f9',
            borderRadius: '8px',
            fontSize: '13px',
            lineHeight: '1.5',
            color: '#666'
          }}>
            <strong style={{ display: 'block', marginBottom: '6px', color: '#333' }}>Instructions:</strong>
            • Click furniture to select<br />
            • Drag to rotate view<br />
            • Scroll to zoom<br />
            • Right-click drag to pan
          </div>
        </div>
      </div>
    );
  }