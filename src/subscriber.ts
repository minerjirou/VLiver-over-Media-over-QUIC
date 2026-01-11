import { createMediaSubscriber, type MediaSubscriber } from "moqt-js";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

export type SubscriberOptions = {
  relayUrl: string;
  showLatency: boolean;
};

type SubscriberState = {
  subscriber: MediaSubscriber | null;
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  controls: OrbitControls;
  cube: THREE.Mesh;
  video: HTMLVideoElement;
  canvas: HTMLCanvasElement;
  animationId: number | null;
  latencyStart: number | null;
};

export class SubscriberController {
  private state: SubscriberState;

  constructor(canvas: HTMLCanvasElement, video: HTMLVideoElement) {
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setClearColor(0x0b0d12, 1);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.set(0, 1, 2.5);

    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;

    const geometry = new THREE.BoxGeometry(0.6, 0.6, 0.6);
    const material = new THREE.MeshStandardMaterial({ color: 0x6d7bff });
    const cube = new THREE.Mesh(geometry, material);
    cube.position.set(0, 1, 0);

    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(2, 2, 2);
    scene.add(light, new THREE.AmbientLight(0xffffff, 0.6), cube);

    this.state = {
      subscriber: null,
      renderer,
      scene,
      camera,
      controls,
      cube,
      video,
      canvas,
      animationId: null,
      latencyStart: null
    };

    this.handleResize();
    window.addEventListener("resize", () => this.handleResize());
  }

  async start(options: SubscriberOptions): Promise<void> {
    this.state.subscriber = await createMediaSubscriber(options.relayUrl, {
      namespace: ["live"]
    });

    await this.state.subscriber.start();
    this.state.video.srcObject = this.state.subscriber.mediaStream;
    this.state.latencyStart = performance.now();
    this.animate();
  }

  async stop(): Promise<void> {
    if (this.state.subscriber) {
      await this.state.subscriber.stop();
    }

    if (this.state.animationId) {
      cancelAnimationFrame(this.state.animationId);
    }

    this.state.subscriber = null;
    this.state.video.srcObject = null;
  }

  setLatencyDisplay(enabled: boolean): void {
    if (!enabled) {
      this.state.latencyStart = null;
    } else if (!this.state.latencyStart) {
      this.state.latencyStart = performance.now();
    }
  }

  getLatencyValue(): string {
    if (!this.state.latencyStart) {
      return "";
    }
    const elapsed = performance.now() - this.state.latencyStart;
    return `視聴開始から ${Math.round(elapsed)}ms`;
  }

  private handleResize(): void {
    const { canvas, renderer, camera } = this.state;
    const width = canvas.clientWidth || 640;
    const height = canvas.clientHeight || 360;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  private animate = (): void => {
    const { renderer, scene, camera, controls, cube } = this.state;
    cube.rotation.y += 0.003;
    controls.update();
    renderer.render(scene, camera);
    this.state.animationId = requestAnimationFrame(this.animate);
  };
}
