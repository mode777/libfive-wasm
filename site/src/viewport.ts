import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

export interface ViewportMesh {
    readonly verts: Float32Array;
    readonly tris: Uint32Array;
}

/**
 * A small studio-style three.js viewport: soft environment light, a shadow
 * catcher and an orbit camera framed to the current mesh.
 */
export class Viewport {
    private readonly container: HTMLElement;
    private readonly renderer: THREE.WebGLRenderer;
    private readonly scene = new THREE.Scene();
    private readonly camera = new THREE.PerspectiveCamera(38, 1, 0.01, 1000);
    private readonly controls: OrbitControls;
    private readonly resizeObserver: ResizeObserver;
    private readonly light: THREE.DirectionalLight;
    private readonly shadowPlane: THREE.Mesh;
    private readonly environment: THREE.Texture;

    private geometry: THREE.BufferGeometry | null = null;
    private mesh: THREE.Mesh | null = null;
    private material: THREE.MeshStandardMaterial | null = null;
    private frame = 0;
    private running = false;
    private active = true;
    private disposed = false;
    private wireframe = false;
    private flatShading = false;

    constructor(container: HTMLElement) {
        this.container = container;

        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true,
            powerPreference: 'high-performance',
        });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.0;
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.domElement.setAttribute(
            'aria-label',
            '3D model viewport',
        );
        this.renderer.domElement.setAttribute('role', 'img');
        container.append(this.renderer.domElement);

        const pmrem = new THREE.PMREMGenerator(this.renderer);
        const room = new RoomEnvironment();
        const environmentTarget = pmrem.fromScene(room, 0.04);
        this.environment = environmentTarget.texture;
        room.dispose();
        pmrem.dispose();
        this.scene.environment = this.environment;

        this.light = new THREE.DirectionalLight(0xfff1dd, 1.7);
        this.light.castShadow = true;
        this.light.shadow.mapSize.set(2048, 2048);
        this.light.shadow.bias = -0.0002;
        this.light.shadow.radius = 4;
        this.scene.add(this.light);
        this.scene.add(this.light.target);
        this.scene.add(new THREE.HemisphereLight(0xfff6e8, 0x3b332b, 0.35));

        this.shadowPlane = new THREE.Mesh(
            new THREE.PlaneGeometry(1, 1),
            new THREE.ShadowMaterial({
                color: 0x2a2118,
                opacity: 0.16,
            }),
        );
        this.shadowPlane.rotation.x = -Math.PI / 2;
        this.shadowPlane.receiveShadow = true;
        this.scene.add(this.shadowPlane);

        this.controls = new OrbitControls(
            this.camera,
            this.renderer.domElement,
        );
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.08;
        this.controls.enablePan = false;
        this.controls.minPolarAngle = 0.2;
        this.controls.maxPolarAngle = Math.PI - 0.2;
        this.controls.minDistance = 0.5;

        this.resizeObserver = new ResizeObserver(() => this.resize());
        this.resizeObserver.observe(container);
        this.resize();
        this.start();
    }

    setMesh({ verts, tris }: ViewportMesh): void {
        if (this.disposed) return;
        this.wireframe = false;
        this.flatShading = false;
        this.clearMesh();

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(verts, 3));
        geometry.setIndex(new THREE.BufferAttribute(tris, 1));
        // libfive is Z-up; three.js is Y-up. Rotate the display geometry so
        // columns stand upright and the ground plane is horizontal.
        geometry.rotateX(-Math.PI / 2);
        geometry.computeVertexNormals();
        geometry.computeBoundingBox();
        geometry.computeBoundingSphere();
        if (!geometry.boundingBox || !geometry.boundingSphere) return;

        const material = new THREE.MeshStandardMaterial({
            color: 0xd7bfa1,
            roughness: 0.62,
            metalness: 0.03,
            envMapIntensity: 0.55,
            wireframe: this.wireframe,
            flatShading: this.flatShading,
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        this.scene.add(mesh);

        this.geometry = geometry;
        this.material = material;
        this.mesh = mesh;

        this.frameMesh(geometry.boundingBox, geometry.boundingSphere);
        this.renderer.render(this.scene, this.camera);
    }

    setActive(active: boolean): void {
        this.active = active;
        if (active) this.start();
        else this.stop();
    }

    setWireframe(enabled: boolean): void {
        this.wireframe = enabled;
        if (this.material) {
            this.material.wireframe = enabled;
            this.material.needsUpdate = true;
        }
    }

    setFlatShading(enabled: boolean): void {
        this.flatShading = enabled;
        if (this.material) {
            this.material.flatShading = enabled;
            this.material.needsUpdate = true;
        }
    }

    dispose(): void {
        if (this.disposed) return;
        this.disposed = true;
        this.stop();
        this.resizeObserver.disconnect();
        this.controls.dispose();
        this.clearMesh();
        this.shadowPlane.geometry.dispose();
        (this.shadowPlane.material as THREE.Material).dispose();
        this.environment.dispose();
        this.renderer.dispose();
        this.renderer.domElement.remove();
    }

    private frameMesh(box: THREE.Box3, sphere: THREE.Sphere): void {
        const radius = Math.max(sphere.radius, 0.5);
        const center = sphere.center.clone();
        const groundY = box.min.y - radius * 0.015;

        this.shadowPlane.position.set(center.x, groundY, center.z);
        this.shadowPlane.scale.setScalar(radius * 5);

        this.light.position.set(
            center.x + radius * 1.7,
            groundY + radius * 3.1,
            center.z + radius * 2.1,
        );
        this.light.target.position.set(center.x, center.y, center.z);
        this.light.target.updateMatrixWorld();
        this.light.shadow.camera.left = -radius * 2.4;
        this.light.shadow.camera.right = radius * 2.4;
        this.light.shadow.camera.top = radius * 2.4;
        this.light.shadow.camera.bottom = -radius * 2.4;
        this.light.shadow.camera.near = 0.1;
        this.light.shadow.camera.far = radius * 10;
        this.light.shadow.camera.updateProjectionMatrix();

        this.camera.near = Math.max(radius / 100, 0.01);
        this.camera.far = radius * 30;
        this.camera.updateProjectionMatrix();

        const direction = new THREE.Vector3(1, 0.55, 1).normalize();
        this.camera.position
            .copy(center)
            .addScaledVector(direction, radius * 3.25);
        this.controls.target.copy(center);
        this.controls.minDistance = radius * 1.2;
        this.controls.maxDistance = radius * 8;
        this.controls.update();
    }

    private clearMesh(): void {
        if (this.mesh) {
            this.scene.remove(this.mesh);
            this.mesh = null;
        }
        this.geometry?.dispose();
        this.geometry = null;
        this.material?.dispose();
        this.material = null;
    }

    private resize(): void {
        if (this.disposed) return;
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        if (width === 0 || height === 0) return;
        this.renderer.setSize(width, height, false);
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.render(this.scene, this.camera);
    }

    private start(): void {
        if (this.running || this.disposed || !this.active) return;
        this.running = true;
        const tick = (): void => {
            if (!this.running || this.disposed || !this.active) {
                this.running = false;
                return;
            }
            this.controls.update();
            this.renderer.render(this.scene, this.camera);
            this.frame = requestAnimationFrame(tick);
        };
        this.frame = requestAnimationFrame(tick);
    }

    private stop(): void {
        this.running = false;
        cancelAnimationFrame(this.frame);
    }
}
