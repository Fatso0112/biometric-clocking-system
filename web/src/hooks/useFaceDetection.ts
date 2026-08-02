import type { BoundingBox, FaceDetector as MediaPipeFaceDetector } from '@mediapipe/tasks-vision';
import { useEffect, useState, type RefObject } from 'react';
import { DEFAULT_FACE_GUIDANCE } from '../state/faceScanMachine';

export interface FaceDetectionState {
  faceDetected: boolean;
  aligned: boolean;
  boundingBox: BoundingBox | null;
  guidance: string;
  detectorReady: boolean;
  error: string | null;
}

const STABLE_ALIGNMENT_MS = 900;
const DETECTION_INTERVAL_MS = 100;
const BRIGHTNESS_INTERVAL_MS = 300;
const MIN_BRIGHTNESS = 55;
const MIN_FACE_HEIGHT_RATIO = 0.32;
const MAX_FACE_HEIGHT_RATIO = 0.78;
const CENTER_TOLERANCE = 0.13;

const initialDetectionState: FaceDetectionState = {
  faceDetected: false,
  aligned: false,
  boundingBox: null,
  guidance: DEFAULT_FACE_GUIDANCE,
  detectorReady: false,
  error: null,
};

function getAssetUrl(path: string) {
  const base = import.meta.env.BASE_URL.endsWith('/') ? import.meta.env.BASE_URL : `${import.meta.env.BASE_URL}/`;
  return new URL(`${base}${path}`, window.location.origin).toString();
}

function getLargestBoundingBox(detections: Array<{ boundingBox?: BoundingBox }>) {
  let largest: BoundingBox | null = null;
  let largestArea = 0;

  for (const detection of detections) {
    const box = detection.boundingBox;
    if (!box) continue;
    const area = box.width * box.height;
    if (area > largestArea) {
      largest = box;
      largestArea = area;
    }
  }

  return largest;
}

function measureBrightness(video: HTMLVideoElement, canvas: HTMLCanvasElement) {
  const width = 32;
  const height = 24;
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) return 255;

  context.drawImage(video, 0, 0, width, height);
  const pixels = context.getImageData(0, 0, width, height).data;
  let total = 0;
  let samples = 0;

  for (let index = 0; index < pixels.length; index += 64) {
    total += pixels[index] * 0.2126 + pixels[index + 1] * 0.7152 + pixels[index + 2] * 0.0722;
    samples += 1;
  }

  context.clearRect(0, 0, width, height);
  return samples > 0 ? total / samples : 255;
}

function sameBox(left: BoundingBox | null, right: BoundingBox | null) {
  if (left === right) return true;
  if (!left || !right) return false;
  return (
    Math.round(left.originX) === Math.round(right.originX) &&
    Math.round(left.originY) === Math.round(right.originY) &&
    Math.round(left.width) === Math.round(right.width) &&
    Math.round(left.height) === Math.round(right.height)
  );
}

function updateIfChanged(previous: FaceDetectionState, next: FaceDetectionState) {
  return previous.faceDetected === next.faceDetected &&
    previous.aligned === next.aligned &&
    previous.guidance === next.guidance &&
    previous.detectorReady === next.detectorReady &&
    previous.error === next.error &&
    sameBox(previous.boundingBox, next.boundingBox)
    ? previous
    : next;
}

export function useFaceDetection(videoRef: RefObject<HTMLVideoElement>, enabled: boolean) {
  const [detection, setDetection] = useState<FaceDetectionState>(initialDetectionState);

  useEffect(() => {
    if (!enabled) {
      setDetection(initialDetectionState);
      return;
    }

    let cancelled = false;
    let detector: MediaPipeFaceDetector | null = null;
    let animationFrame = 0;
    let lastInferenceAt = 0;
    let lastBrightnessAt = 0;
    let lastBrightness = 255;
    let lastVideoTime = -1;
    let alignedSince: number | null = null;
    const brightnessCanvas = document.createElement('canvas');

    const setNextDetection = (next: FaceDetectionState) => {
      if (!cancelled) setDetection((previous) => updateIfChanged(previous, next));
    };

    const renderLoop = () => {
      if (cancelled || !detector) return;

      const video = videoRef.current;
      const now = performance.now();
      if (
        !video ||
        video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA ||
        video.videoWidth === 0 ||
        video.currentTime === lastVideoTime ||
        now - lastInferenceAt < DETECTION_INTERVAL_MS
      ) {
        animationFrame = requestAnimationFrame(renderLoop);
        return;
      }

      lastInferenceAt = now;
      lastVideoTime = video.currentTime;

      try {
        const result = detector.detectForVideo(video, now);
        const boundingBox = getLargestBoundingBox(result.detections);

        if (!boundingBox) {
          alignedSince = null;
          setNextDetection({
            faceDetected: false,
            aligned: false,
            boundingBox: null,
            guidance: DEFAULT_FACE_GUIDANCE,
            detectorReady: true,
            error: null,
          });
          animationFrame = requestAnimationFrame(renderLoop);
          return;
        }

        if (now - lastBrightnessAt >= BRIGHTNESS_INTERVAL_MS) {
          lastBrightness = measureBrightness(video, brightnessCanvas);
          lastBrightnessAt = now;
        }

        const faceHeightRatio = boundingBox.height / video.videoHeight;
        const faceCenterX = boundingBox.originX + boundingBox.width / 2;
        const faceCenterY = boundingBox.originY + boundingBox.height / 2;
        const horizontallyCentered = Math.abs(faceCenterX - video.videoWidth / 2) <= video.videoWidth * CENTER_TOLERANCE;
        const verticallyCentered = Math.abs(faceCenterY - video.videoHeight / 2) <= video.videoHeight * CENTER_TOLERANCE;

        let guidance = 'Hold still';
        let alignedCandidate = true;

        if (lastBrightness < MIN_BRIGHTNESS) {
          guidance = 'Move to a brighter area';
          alignedCandidate = false;
        } else if (faceHeightRatio < MIN_FACE_HEIGHT_RATIO) {
          guidance = 'Move closer';
          alignedCandidate = false;
        } else if (faceHeightRatio > MAX_FACE_HEIGHT_RATIO) {
          guidance = 'Move back slightly';
          alignedCandidate = false;
        } else if (!horizontallyCentered || !verticallyCentered) {
          guidance = 'Center your face in the frame';
          alignedCandidate = false;
        }

        if (!alignedCandidate) {
          alignedSince = null;
        } else if (alignedSince === null) {
          alignedSince = now;
        }

        const aligned = alignedCandidate && alignedSince !== null && now - alignedSince >= STABLE_ALIGNMENT_MS;
        if (aligned) guidance = 'Face aligned — ready to scan';

        setNextDetection({
          faceDetected: true,
          aligned,
          boundingBox,
          guidance,
          detectorReady: true,
          error: null,
        });
      } catch {
        setNextDetection({
          ...initialDetectionState,
          error: 'Face detection could not be started on this device.',
        });
        return;
      }

      animationFrame = requestAnimationFrame(renderLoop);
    };

    const initialiseDetector = async () => {
      try {
        const { FaceDetector, FilesetResolver } = await import('@mediapipe/tasks-vision');
        const wasmRoot = getAssetUrl('mediapipe/wasm').replace(/\/$/, '');
        const fileset = await FilesetResolver.forVisionTasks(wasmRoot);
        const createdDetector = await FaceDetector.createFromOptions(fileset, {
          baseOptions: { modelAssetPath: getAssetUrl('mediapipe/models/blaze_face_short_range.tflite') },
          runningMode: 'VIDEO',
          minDetectionConfidence: 0.6,
          minSuppressionThreshold: 0.3,
        });

        if (cancelled) {
          createdDetector.close();
          return;
        }

        detector = createdDetector;
        setNextDetection({ ...initialDetectionState, detectorReady: true });
        animationFrame = requestAnimationFrame(renderLoop);
      } catch {
        setNextDetection({
          ...initialDetectionState,
          error: 'Face detection could not be started on this device.',
        });
      }
    };

    void initialiseDetector();

    return () => {
      cancelled = true;
      cancelAnimationFrame(animationFrame);
      detector?.close();
      const context = brightnessCanvas.getContext('2d');
      context?.clearRect(0, 0, brightnessCanvas.width, brightnessCanvas.height);
      brightnessCanvas.width = 1;
      brightnessCanvas.height = 1;
    };
  }, [enabled, videoRef]);

  return detection;
}
