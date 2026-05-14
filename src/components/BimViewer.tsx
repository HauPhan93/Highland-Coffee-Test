import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stage, PerspectiveCamera, Environment, Grid, Float, ContactShadows } from '@react-three/drei';
import { Suspense, useMemo } from 'react';
import * as THREE from 'three';

function ArchitecturalModel() {
  // Create a more interesting architectural-looking model using basic shapes
  const structure = useMemo(() => {
    const group = new THREE.Group();
    
    // Base slab
    const slabGeom = new THREE.BoxGeometry(10, 0.5, 8);
    const slabMat = new THREE.MeshStandardMaterial({ color: '#f0f0f0', metalness: 0.1, roughness: 0.8 });
    const slab = new THREE.Mesh(slabGeom, slabMat);
    slab.position.y = -0.25;
    group.add(slab);

    // Some columns
    const colGeom = new THREE.BoxGeometry(0.4, 4, 0.4);
    const colMat = new THREE.MeshStandardMaterial({ color: '#333', metalness: 0.8, roughness: 0.2 });
    
    [[-4.5, -3.5], [4.5, -3.5], [-4.5, 3.5], [4.5, 3.5]].forEach(([x, z]) => {
      const col = new THREE.Mesh(colGeom, colMat);
      col.position.set(x, 2, z);
      group.add(col);
    });

    // Glass curtain walls (Transparent)
    const glassGeom = new THREE.BoxGeometry(9.8, 3.8, 0.1);
    const glassMat = new THREE.MeshPhysicalMaterial({ 
      color: '#88ccff', 
      transparent: true, 
      opacity: 0.25,
      metalness: 0.9,
      roughness: 0.05,
      transmission: 0.9,
      thickness: 0.5
    });
    
    // Front Glass
    const wall1 = new THREE.Mesh(glassGeom, glassMat);
    wall1.position.set(0, 1.9, 3.9);
    group.add(wall1);

    // Right Glass
    const sideGlassGeom = new THREE.BoxGeometry(0.1, 3.8, 7.8);
    const wall3 = new THREE.Mesh(sideGlassGeom, glassMat);
    wall3.position.set(4.9, 1.9, 0);
    group.add(wall3);

    // Inner Highlands-themed elements
    // Main Counter
    const counterGeom = new THREE.BoxGeometry(5, 1.2, 1.5);
    const counterMat = new THREE.MeshStandardMaterial({ color: '#E31837', roughness: 0.3 });
    const counter = new THREE.Mesh(counterGeom, counterMat);
    counter.position.set(-2, 0.6, 0);
    group.add(counter);

    // Back Shelf
    const shelfGeom = new THREE.BoxGeometry(0.5, 3.5, 4);
    const shelfMat = new THREE.MeshStandardMaterial({ color: '#271916' }); // Coffee dark brown
    const shelf = new THREE.Mesh(shelfGeom, shelfMat);
    shelf.position.set(-4.5, 1.75, 0);
    group.add(shelf);

    // Some tables and chairs
    const tableGeom = new THREE.CylinderGeometry(0.6, 0.6, 0.1, 24);
    const tableMat = new THREE.MeshStandardMaterial({ color: '#fff', metalness: 0.2, roughness: 0.5 });
    const chairGeom = new THREE.CylinderGeometry(0.25, 0.25, 0.5, 16);
    const chairMat = new THREE.MeshStandardMaterial({ color: '#b45309' }); // Wood color

    for (let i = 0; i < 4; i++) {
      const tx = 2.5;
      const tz = -3 + i * 2;
      
      const table = new THREE.Mesh(tableGeom, tableMat);
      table.position.set(tx, 0.9, tz);
      group.add(table);

      // 2 chairs per table
      [[0.8, 0], [-0.8, 0]].forEach(([ox, oz]) => {
        const chair = new THREE.Mesh(chairGeom, chairMat);
        chair.position.set(tx + ox, 0.25, tz + oz);
        group.add(chair);
      });
    }

    // Modern Ceiling lights
    const trackGeom = new THREE.BoxGeometry(8, 0.1, 0.1);
    const trackMat = new THREE.MeshStandardMaterial({ color: '#000' });
    const track = new THREE.Mesh(trackGeom, trackMat);
    track.position.set(0, 3.9, 0);
    group.add(track);

    const lightGeom = new THREE.CylinderGeometry(0.1, 0.1, 0.3, 16);
    const lightMat = new THREE.MeshStandardMaterial({ emissive: '#fff6e0', emissiveIntensity: 3, color: '#fff' });
    for (let i = 0; i < 4; i++) {
      const light = new THREE.Mesh(lightGeom, lightMat);
      light.position.set(-3 + i * 2, 3.75, 0);
      group.add(light);
    }

    return group;
  }, []);

  return <primitive object={structure} />;
}

export default function BimViewer() {
  return (
    <div className="w-full h-full bg-[#1a1a1a]">
      <Canvas shadows dpr={[1, 2]}>
        <PerspectiveCamera makeDefault position={[12, 10, 12]} fov={35} />
        <Suspense fallback={null}>
          <Stage environment="city" intensity={0.5} shadows={false}>
            <ArchitecturalModel />
          </Stage>
          <Environment preset="city" />
          <ContactShadows opacity={0.4} scale={20} blur={2.4} far={4.5} />
        </Suspense>
        <Grid 
          infiniteGrid 
          fadeDistance={30} 
          fadeStrength={5} 
          cellSize={1} 
          sectionSize={5} 
          sectionColor="#E31837" 
          sectionThickness={1.5}
        />
        <OrbitControls makeDefault minPolarAngle={0} maxPolarAngle={Math.PI / 1.75} />
      </Canvas>
      <div className="absolute top-4 left-4 z-10 pointer-events-none">
        <div className="bg-black/60 backdrop-blur-md border border-white/10 px-3 py-1 rounded-md mb-2">
          <p className="text-[7px] text-white/50 uppercase font-mono tracking-widest">Render Mode</p>
          <p className="text-[9px] text-white font-black uppercase tracking-widest">Ray-Traced Preview</p>
        </div>
      </div>
    </div>
  );
}
