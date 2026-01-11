import { FilesetResolver, FaceLandmarker } from "@mediapipe/tasks-vision";
import { createMediaPublisher, type MediaPublisher } from "moqt-js";
import * as THREE from "three";
import { VRMLoaderPlugin, type VRM } from "@pixiv/three-vrm";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { readFromOpfs, writeToOpfs } from "./opfs";

export type PublisherOptions = {
  relayUrl: string;
  resolution: { width: number; height: number; frameRate: number };
  bitrateKbps: number;
  codec: "vp8" | "h264" | "av1";
  vrmFile?: File | null;
};

type PublisherState = {
  mediaStream: MediaStream | null;
  publisher: MediaPublisher | null;
  faceLandmarker: FaceLandmarker | null;
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  vrm: VRM | null;
  video: HTMLVideoElement;
  canvas: HTMLCanvasElement;
  animationId: number | null;
};

const VRM_CACHE_NAME = "cached-avatar.vrm";

export class PublisherController {
  private state: PublisherState;

  constructor(canvas: HTMLCanvasElement, preview: HTMLVideoElement) {
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setClearColor(0x0b0d12, 1);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
    camera.position.set(0, 1.4, 2.6);

    const light = new THREE.DirectionalLight(0xffffff, 1.1);
    light.position.set(1, 2, 2);
    scene.add(light, new THREE.AmbientLight(0xffffff, 0.4));

    this.state = {
      mediaStream: null,
      publisher: null,
      faceLandmarker: null,
      renderer,
      scene,
      camera,
      vrm: null,
      video: preview,
      canvas,
      animationId: null
    };

    this.handleResize();
    window.addEventListener("resize", () => this.handleResize());
  }

  async start(options: PublisherOptions): Promise<void> {
    const { relayUrl, resolution, vrmFile } = options;
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: resolution.width,
        height: resolution.height,
        frameRate: resolution.frameRate
      },
      audio: true
    });

    this.state.video.srcObject = stream;
    this.state.mediaStream = stream;

    await this.ensureFaceLandmarker();
    await this.loadVrm(vrmFile);

    this.state.publisher = await createMediaPublisher(
      relayUrl,
      { namespace: ["live"] },
      {
        video: {
          bitrate: options.bitrateKbps * 1000,
          codec: options.codec
        },
        audio: {
          codec: "opus"
        }
      }
    );

    const canvasStream = this.state.canvas.captureStream(resolution.frameRate);
    const composedStream = new MediaStream([
      ...canvasStream.getVideoTracks(),
      ...stream.getAudioTracks()
    ]);

    await this.state.publisher.start(composedStream);
    this.animate();
  }

  async stop(): Promise<void> {
    if (this.state.publisher) {
      await this.state.publisher.stop();
    }

    this.state.mediaStream?.getTracks().forEach((track) => track.stop());

    if (this.state.animationId) {
      cancelAnimationFrame(this.state.animationId);
    }

    this.state.publisher = null;
    this.state.mediaStream = null;
  }

  private handleResize(): void {
    const { canvas, renderer, camera } = this.state;
    const width = canvas.clientWidth || 640;
    const height = canvas.clientHeight || 360;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  private async ensureFaceLandmarker(): Promise<void> {
    if (this.state.faceLandmarker) {
      return;
    }

    const filesetResolver = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22-rc.20250304/wasm"
    );

    this.state.faceLandmarker = await FaceLandmarker.createFromOptions(
      filesetResolver,
      {
        baseOptions: {
          modelAssetPath:
            "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task"
        },
        outputFaceBlendshapes: true,
        outputFacialTransformationMatrixes: true,
        runningMode: "VIDEO"
      }
    );
  }

  private async loadVrm(vrmFile?: File | null): Promise<void> {
    let vrmBuffer: ArrayBuffer | null = null;

    if (vrmFile) {
      vrmBuffer = await vrmFile.arrayBuffer();
      await writeToOpfs(VRM_CACHE_NAME, vrmBuffer);
    } else {
      vrmBuffer = await readFromOpfs(VRM_CACHE_NAME);
    }

    if (!vrmBuffer) {
      return;
    }

    const loader = new GLTFLoader();
    loader.register((parser) => new VRMLoaderPlugin(parser));

    const gltf = await loader.parseAsync(vrmBuffer, "");
    const vrm = gltf.userData.vrm as VRM;

    if (this.state.vrm) {
      this.state.scene.remove(this.state.vrm.scene);
    }

    vrm.scene.rotation.y = Math.PI;
    this.state.scene.add(vrm.scene);
    this.state.vrm = vrm;
  }

  private animate = (): void => {
    const { renderer, scene, camera, faceLandmarker, video, vrm } = this.state;
    if (faceLandmarker && video.readyState >= HTMLMediaElement.HAVE_ENOUGH_DATA) {
      const results = faceLandmarker.detectForVideo(video, performance.now());
      if (vrm && results.facialTransformationMatrixes?.length) {
        const matrix = results.facialTransformationMatrixes[0].data;
        this.applyFaceMatrixToVrm(vrm, matrix);
      }
    }

    renderer.render(scene, camera);
    this.state.animationId = requestAnimationFrame(this.animate);
  };

  private applyFaceMatrixToVrm(vrm: VRM, matrixData: Float32Array): void {
    const matrix = new THREE.Matrix4();
    matrix.fromArray(matrixData);
    const position = new THREE.Vector3();
    const rotation = new THREE.Quaternion();
    const scale = new THREE.Vector3();
    matrix.decompose(position, rotation, scale);

    const head = vrm.humanoid?.getNormalizedBoneNode("head");
    if (!head) {
      return;
    }

    head.quaternion.slerp(rotation, 0.5);
  }
}
