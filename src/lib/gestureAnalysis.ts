export interface GestureAnalysisResult {
  attention: 'good' | 'warning' | 'poor';
  eyeContact: 'good' | 'warning' | 'poor';
  posture: 'good' | 'warning' | 'poor';
  faceDetected: boolean;
  confidence: number;
  details: string[];
}

export class GestureAnalyzer {
  private video: HTMLVideoElement | null = null;

  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private ws: WebSocket | null = null;
  private wsUrl: string | null = null;
  private pending: Array<(value: GestureAnalysisResult) => void> = [];
  private lastResult: GestureAnalysisResult = {
    attention: 'good',
    eyeContact: 'good',
    posture: 'good',
    faceDetected: false,
    confidence: 0.3,
    details: ['Initializing...']
  };

  async loadModels(): Promise<void> {
    this.wsUrl = import.meta.env.VITE_GESTURE_WS_URL || 'ws://localhost:8001/ws/gesture';
  }

  setVideo(video: HTMLVideoElement): void {
    this.video = video;
    this.reset();
  }

  reset(): void {
    this.canvas = null;
    this.ctx = null;
    this.pending = [];
    this.lastResult = {
      attention: 'good',
      eyeContact: 'good',
      posture: 'good',
      faceDetected: false,
      confidence: 0.3,
      details: ['Initializing...']
    };
  }

  private ensureWs(): void {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) return;
    const url = this.wsUrl || 'ws://localhost:8001/ws/gesture';
    this.ws = new WebSocket(url);

    this.ws.onmessage = (evt) => {
      try {
        const data = JSON.parse(evt.data);
        const result: GestureAnalysisResult = {
          attention: data.attention,
          eyeContact: data.eyeContact,
          posture: data.posture,
          faceDetected: !!data.faceDetected,
          confidence: typeof data.confidence === 'number' ? data.confidence : 0.4,
          details: Array.isArray(data.details) ? data.details : [],
        };
        this.lastResult = result;
        const resolver = this.pending.shift();
        resolver?.(result);
      } catch {
        // ignore malformed messages
      }
    };

    this.ws.onerror = () => {
      // surface via lastResult on next request
      this.lastResult = {
        attention: 'warning',
        eyeContact: 'warning',
        posture: 'warning',
        faceDetected: false,
        confidence: 0.2,
        details: ['Vision service connection error'],
      };
      const resolver = this.pending.shift();
      resolver?.(this.lastResult);
    };

    this.ws.onclose = () => {
      // allow reconnect next call
      this.ws = null;
    };
  }

  async analyzeFrame(): Promise<GestureAnalysisResult> {
    if (!this.video || this.video.readyState !== 4) {
      return {
        attention: 'good',
        eyeContact: 'good',
        posture: 'good',
        faceDetected: false,
        confidence: 0.3,
        details: ['Waiting for camera...'],
      };
    }

    try {
      this.ensureWs();

      const width = this.video.videoWidth || 640;
      const height = this.video.videoHeight || 480;
      const targetW = 320;
      const targetH = Math.round((height / width) * targetW);

      if (!this.canvas) this.canvas = document.createElement('canvas');
      this.canvas.width = targetW;
      this.canvas.height = targetH;

      if (!this.ctx) this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
      if (!this.ctx) return this.lastResult;

      this.ctx.drawImage(this.video, 0, 0, targetW, targetH);
      const dataUrl = this.canvas.toDataURL('image/jpeg', 0.65);

      const ws = this.ws;
      if (!ws) return this.lastResult;

      const resultPromise = new Promise<GestureAnalysisResult>((resolve) => this.pending.push(resolve));
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ image: dataUrl, ts: Date.now() }));
      } else {
        // If not open yet, return last known.
        return this.lastResult;
      }

      // Timeout: don't hang UI if backend is slow/unavailable.
      const timeoutMs = 900;
      const timeoutPromise = new Promise<GestureAnalysisResult>((resolve) =>
        setTimeout(() => resolve(this.lastResult), timeoutMs)
      );

      return await Promise.race([resultPromise, timeoutPromise]);
    } catch (e) {
      return {
        attention: 'warning',
        eyeContact: 'warning',
        posture: 'warning',
        faceDetected: false,
        confidence: 0.2,
        details: ['Vision service unavailable'],
      };
    }
  }

  isReady(): boolean {
    return true;
  }
}

export const gestureAnalyzer = new GestureAnalyzer();
