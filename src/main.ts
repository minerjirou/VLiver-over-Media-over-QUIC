import "./styles.css";
import { PublisherController } from "./publisher";
import { SubscriberController } from "./subscriber";

const publisherCanvas = document.getElementById("publisher-canvas") as HTMLCanvasElement;
const publisherPreview = document.getElementById("publisher-preview") as HTMLVideoElement;
const subscriberCanvas = document.getElementById("subscriber-canvas") as HTMLCanvasElement;
const subscriberVideo = document.getElementById("subscriber-video") as HTMLVideoElement;

const publisherStart = document.getElementById("publisher-start") as HTMLButtonElement;
const publisherStop = document.getElementById("publisher-stop") as HTMLButtonElement;
const subscriberStart = document.getElementById("subscriber-start") as HTMLButtonElement;
const subscriberStop = document.getElementById("subscriber-stop") as HTMLButtonElement;
const subscriberFullscreen = document.getElementById("subscriber-fullscreen") as HTMLButtonElement;

const publisherStatus = document.getElementById("publisher-status") as HTMLParagraphElement;
const subscriberStatus = document.getElementById("subscriber-status") as HTMLParagraphElement;
const subscriberLatency = document.getElementById("subscriber-latency-value") as HTMLParagraphElement;

const publisherController = new PublisherController(publisherCanvas, publisherPreview);
const subscriberController = new SubscriberController(subscriberCanvas, subscriberVideo);

function parseResolution(value: string) {
  const [width, height] = value.split("x").map((segment) => Number(segment));
  return { width, height, frameRate: value === "640x360" ? 30 : 60 };
}

publisherStart.addEventListener("click", async () => {
  publisherStart.disabled = true;
  publisherStatus.textContent = "接続中...";

  const relayUrl = (document.getElementById("publisher-url") as HTMLInputElement).value;
  const resolution = parseResolution(
    (document.getElementById("publisher-resolution") as HTMLSelectElement).value
  );
  const bitrate = Number((document.getElementById("publisher-bitrate") as HTMLInputElement).value);
  const codec = (document.getElementById("publisher-codec") as HTMLSelectElement)
    .value as "vp8" | "h264" | "av1";
  const vrmFile = (document.getElementById("publisher-vrm") as HTMLInputElement).files?.[0];

  try {
    await publisherController.start({
      relayUrl,
      resolution,
      bitrateKbps: bitrate,
      codec,
      vrmFile
    });
    publisherStatus.textContent = "配信中";
    publisherStop.disabled = false;
  } catch (error) {
    publisherStatus.textContent = `接続失敗: ${String(error)}`;
    publisherStart.disabled = false;
  }
});

publisherStop.addEventListener("click", async () => {
  await publisherController.stop();
  publisherStatus.textContent = "停止しました";
  publisherStart.disabled = false;
  publisherStop.disabled = true;
});

subscriberStart.addEventListener("click", async () => {
  subscriberStart.disabled = true;
  subscriberStatus.textContent = "接続中...";

  const relayUrl = (document.getElementById("subscriber-url") as HTMLInputElement).value;
  const showLatency = (document.getElementById("subscriber-latency") as HTMLInputElement).checked;

  try {
    await subscriberController.start({ relayUrl, showLatency });
    subscriberController.setLatencyDisplay(showLatency);
    subscriberStatus.textContent = "視聴中";
    subscriberStop.disabled = false;
  } catch (error) {
    subscriberStatus.textContent = `接続失敗: ${String(error)}`;
    subscriberStart.disabled = false;
  }
});

subscriberStop.addEventListener("click", async () => {
  await subscriberController.stop();
  subscriberStatus.textContent = "停止しました";
  subscriberLatency.textContent = "";
  subscriberStart.disabled = false;
  subscriberStop.disabled = true;
});

subscriberFullscreen.addEventListener("click", async () => {
  const element = subscriberCanvas.parentElement ?? subscriberCanvas;
  if (document.fullscreenElement) {
    await document.exitFullscreen();
  } else {
    await element.requestFullscreen();
  }
});

const latencyToggle = document.getElementById("subscriber-latency") as HTMLInputElement;
latencyToggle.addEventListener("change", () => {
  subscriberController.setLatencyDisplay(latencyToggle.checked);
});

function updateLatency() {
  subscriberLatency.textContent = subscriberController.getLatencyValue();
  requestAnimationFrame(updateLatency);
}

updateLatency();
