export interface GestureAnalysisResult {
  attention: 'good' | 'warning' | 'poor';
  eyeContact: 'good' | 'warning' | 'poor';
  posture: 'good' | 'warning' | 'poor';
  faceDetected: boolean;
  confidence: number;
  details: string[];
}

// Face Detection API (Chromium) types are not always included in TS libs.
type DetectedFaceBox = { x: number; y: number; width: number; height: number };
type DetectedFace = { boundingBox: DetectedFaceBox };
type FaceDetectorLike = { detect: (image: CanvasImageSource) => Promise<DetectedFace[]> };

export class GestureAnalyzer {
  private video: HTMLVideoElement | null = null;
  private previousFrameData: ImageData | null = null;
  private frameCount = 0;
  private lastAnalysis = 0;

  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private faceDetector: FaceDetectorLike | null = null;
  private faceDetectorAvailable = false;
  
  private statusHistory: {
    attention: ('good' | 'warning' | 'poor')[];
    eyeContact: ('good' | 'warning' | 'poor')[];
    posture: ('good' | 'warning' | 'poor')[];
  } = {
    attention: [],
    eyeContact: [],
    posture: []
  };

  async loadModels(): Promise<void> {
    // Prefer native FaceDetector when available (Chromium). Fallback to
    // motion/brightness based heuristics when not available.
    const FaceDetectorCtor = (globalThis as unknown as { FaceDetector?: new (opts?: unknown) => FaceDetectorLike }).FaceDetector;
    if (FaceDetectorCtor) {
      try {
        this.faceDetector = new FaceDetectorCtor({ fastMode: true, maxDetectedFaces: 1 } as unknown);
        this.faceDetectorAvailable = true;
      } catch {
        this.faceDetector = null;
        this.faceDetectorAvailable = false;
      }
    } else {
      this.faceDetector = null;
      this.faceDetectorAvailable = false;
    }
  }

  setVideo(video: HTMLVideoElement): void {
    this.video = video;
    this.reset();
  }

  reset(): void {
    this.previousFrameData = null;
    this.frameCount = 0;
    this.statusHistory = { attention: [], eyeContact: [], posture: [] };
    this.canvas = null;
    this.ctx = null;
  }

  async analyzeFrame(): Promise<GestureAnalysisResult> {
    const now = Date.now();
    this.lastAnalysis = now;
    this.frameCount++;

    if (!this.video || this.video.readyState !== 4) {
      return { attention: 'good', eyeContact: 'good', posture: 'good', faceDetected: false, confidence: 0.3, details: ['Waiting for camera...'] };
    }

    try {
      const width = this.video.videoWidth || 640;
      const height = this.video.videoHeight || 480;

      if (!this.canvas) this.canvas = document.createElement('canvas');
      if (this.canvas.width !== width) this.canvas.width = width;
      if (this.canvas.height !== height) this.canvas.height = height;

      if (!this.ctx) this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
      if (!this.ctx) return this.getLatestResult();

      this.ctx.drawImage(this.video, 0, 0, width, height);
      const currentData = this.ctx.getImageData(0, 0, width, height);
      
      let motion = 0;
      let brightness = 0;
      
      const step = 8;
      for (let y = 0; y < height; y += step) {
        for (let x = 0; x < width; x += step) {
          const i = (y * width + x) * 4;
          const r = currentData.data[i];
          const g = currentData.data[i + 1];
          const b = currentData.data[i + 2];
          
          brightness += (r + g + b) / 3;
          
          if (this.previousFrameData) {
            const prevI = i;
            const diff = Math.abs(currentData.data[i] - this.previousFrameData.data[prevI]) +
                        Math.abs(currentData.data[i+1] - this.previousFrameData.data[prevI+1]) +
                        Math.abs(currentData.data[i+2] - this.previousFrameData.data[prevI+2]);
            if (diff > 30) motion++;
          }
        }
      }
      
      const totalPixels = (width / step) * (height / step);
      brightness = brightness / totalPixels;
      motion = motion / totalPixels;
      
      this.previousFrameData = currentData;

      const face = await this.detectPrimaryFace();
      const faceDetected = !!face;

      const attention = this.determineAttention(motion, brightness, faceDetected);
      const eyeContact = this.determineEyeContact(face, width, height);
      const posture = this.determinePosture(face, width, height);
      
      this.statusHistory.attention.push(attention);
      this.statusHistory.eyeContact.push(eyeContact);
      this.statusHistory.posture.push(posture);
      
      if (this.statusHistory.attention.length > 15) {
        this.statusHistory.attention.shift();
        this.statusHistory.eyeContact.shift();
        this.statusHistory.posture.shift();
      }
      
      const confidence = this.estimateConfidence(faceDetected, motion, brightness);

      return {
        attention,
        eyeContact,
        posture,
        faceDetected,
        confidence,
        details: this.generateDetails(attention, eyeContact, posture, motion, brightness, face)
      };
      
    } catch (e) {
      console.error('Frame analysis error:', e);
      return this.getLatestResult();
    }
  }

  private async detectPrimaryFace(): Promise<DetectedFaceBox | null> {
    if (!this.faceDetectorAvailable || !this.faceDetector || !this.canvas) return null;
    try {
      const faces = await this.faceDetector.detect(this.canvas);
      if (!faces?.length) return null;
      // pick the largest face (usually the user)
      const largest = faces
        .map(f => f.boundingBox)
        .filter(Boolean)
        .sort((a, b) => (b.width * b.height) - (a.width * a.height))[0];
      return largest ?? null;
    } catch {
      return null;
    }
  }

  private determineAttention(motion: number, brightness: number, faceDetected: boolean): 'good' | 'warning' | 'poor' {
    // Too dark => poor (can't reliably detect)
    if (brightness < 25) return 'poor';
    if (!faceDetected && this.faceDetectorAvailable) return 'poor';

    // Motion is a proxy for fidgeting / instability. These thresholds are tuned
    // for step=8 downsampling and diff>30.
    if (motion > 0.12) return 'poor';
    if (motion > 0.05) return 'warning';
    return 'good';
  }

  private determineEyeContact(face: DetectedFaceBox | null, width: number, height: number): 'good' | 'warning' | 'poor' {
    // With no face box, we can't estimate eye contact.
    if (!face) return this.faceDetectorAvailable ? 'poor' : 'warning';

    const cx = face.x + face.width / 2;
    const cy = face.y + face.height / 2;
    const nx = cx / width;
    const ny = cy / height;

    const dx = Math.abs(nx - 0.5);
    const dy = Math.abs(ny - 0.45);

    // If face center is near the middle of frame, assume better "eye contact".
    if (dx < 0.12 && dy < 0.12) return 'good';
    if (dx < 0.22 && dy < 0.20) return 'warning';
    return 'poor';
  }

  private determinePosture(face: DetectedFaceBox | null, width: number, height: number): 'good' | 'warning' | 'poor' {
    if (!face) return this.faceDetectorAvailable ? 'poor' : 'warning';

    const faceAreaRatio = (face.width * face.height) / (width * height);
    const yCenter = (face.y + face.height / 2) / height;

    // Too close / too far based on face area.
    if (faceAreaRatio < 0.03) return 'poor';     // very far / tiny face
    if (faceAreaRatio > 0.30) return 'poor';     // very close

    // Slouching / leaning down: face center too low in the frame.
    if (yCenter > 0.70) return 'warning';

    if (faceAreaRatio < 0.06 || faceAreaRatio > 0.22) return 'warning';
    return 'good';
  }

  private generateDetails(
    attention: 'good' | 'warning' | 'poor',
    eyeContact: 'good' | 'warning' | 'poor',
    posture: 'good' | 'warning' | 'poor',
    motion: number,
    brightness: number,
    face: DetectedFaceBox | null
  ): string[] {
    const details: string[] = [];
    
    if (attention === 'good') details.push('✓ Steady focus');
    else if (attention === 'warning') details.push('⚠ Slight movement');
    else details.push('✗ Too much movement');
    
    if (eyeContact === 'good') details.push('✓ Face centered');
    else if (eyeContact === 'warning') details.push('⚠ Face slightly off-center');
    else details.push('✗ Face off-center / not detected');
    
    if (posture === 'good') details.push('✓ Good position');
    else if (posture === 'warning') details.push('⚠ Adjust distance/height');
    else details.push('✗ Too far/close or not detected');
    
    details.push(`Motion: ${(motion * 100).toFixed(1)}%`);
    details.push(`Light: ${Math.round(brightness)}`);
    details.push(`Detector: ${this.faceDetectorAvailable ? 'FaceDetector' : 'Heuristics'}`);

    if (face) {
      details.push(`Face: ${Math.round(face.width)}×${Math.round(face.height)}`);
    }
    
    return details;
  }

  private estimateConfidence(faceDetected: boolean, motion: number, brightness: number): number {
    // 0..1 confidence that the assessment is meaningful (not a "model score").
    let c = 0.4;
    if (brightness >= 40) c += 0.15;
    if (brightness >= 70) c += 0.1;

    if (this.faceDetectorAvailable) {
      c += faceDetected ? 0.25 : -0.15;
    } else {
      // fallback is less reliable
      c -= 0.05;
    }

    // extreme motion reduces reliability
    if (motion > 0.12) c -= 0.1;
    if (motion < 0.03) c += 0.05;

    return Math.min(0.95, Math.max(0.1, c));
  }

  private getLatestResult(): GestureAnalysisResult {
    if (this.statusHistory.attention.length === 0) {
      return { attention: 'good', eyeContact: 'good', posture: 'good', faceDetected: true, confidence: 0.4, details: ['Initializing...'] };
    }
    
    const recent = (arr: ('good' | 'warning' | 'poor')[]) => arr.slice(-5);
    const attention = this.majority(recent(this.statusHistory.attention));
    const eyeContact = this.majority(recent(this.statusHistory.eyeContact));
    const posture = this.majority(recent(this.statusHistory.posture));
    
    return { attention, eyeContact, posture, faceDetected: true, confidence: 0.6, details: this.generateDetails(attention, eyeContact, posture, 0, 60, null) };
  }

  private majority(arr: ('good' | 'warning' | 'poor')[]): 'good' | 'warning' | 'poor' {
    if (arr.length === 0) return 'good';
    const counts = { good: arr.filter(v => v === 'good').length, warning: arr.filter(v => v === 'warning').length, poor: arr.filter(v => v === 'poor').length };
    if (counts.poor >= arr.length * 0.4) return 'poor';
    if (counts.warning >= arr.length * 0.4) return 'warning';
    return 'good';
  }

  isReady(): boolean {
    // "Ready" means we can at least run heuristics.
    return true;
  }
}

export const gestureAnalyzer = new GestureAnalyzer();
