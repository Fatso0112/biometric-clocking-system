import { useCallback, useEffect, useRef } from 'react';

export type CameraAccessErrorCode =
  | 'permission_denied'
  | 'unsupported'
  | 'no_device'
  | 'unavailable'
  | 'cancelled';

export class CameraAccessError extends Error {
  constructor(
    public readonly code: CameraAccessErrorCode,
    message: string,
    public readonly originalError?: unknown,
  ) {
    super(message);
    this.name = 'CameraAccessError';
  }
}

function mapCameraError(error: unknown): CameraAccessError {
  if (error instanceof CameraAccessError) return error;

  if (error instanceof DOMException) {
    if (error.name === 'NotAllowedError' || error.name === 'SecurityError') {
      return new CameraAccessError('permission_denied', 'Camera permission was denied.', error);
    }
    if (error.name === 'NotFoundError' || error.name === 'OverconstrainedError') {
      return new CameraAccessError('no_device', 'No usable camera was found.', error);
    }
    if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
      return new CameraAccessError('unavailable', 'The camera is unavailable or already in use.', error);
    }
    if (error.name === 'AbortError') {
      return new CameraAccessError('cancelled', 'The camera request was cancelled.', error);
    }
  }

  return new CameraAccessError('unavailable', 'The camera could not be started.', error);
}

export function useCamera() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const requestIdRef = useRef(0);

  const stopCamera = useCallback(() => {
    requestIdRef.current += 1;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;

    const video = videoRef.current;
    if (video) {
      video.pause();
      video.srcObject = null;
      video.removeAttribute('src');
      video.load();
    }
  }, []);

  const startCamera = useCallback(async () => {
    if (import.meta.env.DEV && !window.isSecureContext) {
      console.warn('Camera access requires HTTPS or localhost. The current page is not a secure context.');
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      throw new CameraAccessError('unsupported', 'Camera access is not supported by this browser.');
    }

    stopCamera();
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: false,
      });

      if (requestId !== requestIdRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        throw new CameraAccessError('cancelled', 'The camera request was cancelled.');
      }

      if (stream.getVideoTracks().length === 0) {
        stream.getTracks().forEach((track) => track.stop());
        throw new CameraAccessError('no_device', 'No usable camera was found.');
      }

      streamRef.current = stream;
      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        await video.play();
      }

      return stream;
    } catch (error) {
      throw mapCameraError(error);
    }
  }, [stopCamera]);

  useEffect(() => stopCamera, [stopCamera]);

  return { videoRef, startCamera, stopCamera };
}
