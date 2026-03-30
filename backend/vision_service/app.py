from __future__ import annotations

import base64
import json
import time
from dataclasses import dataclass
from typing import Any, Dict, Optional, Tuple

import cv2
import numpy as np
from fastapi import FastAPI, WebSocket, WebSocketDisconnect

# MediaPipe is heavier but far more accurate than browser heuristics.
# import mediapipe as mp
# Using OpenCV Haar Cascade for simplicity


app = FastAPI(title="CareerMentor Vision Service", version="0.1.0")


@dataclass
class Ema:
  value: float
  alpha: float

  def update(self, x: float) -> float:
    self.value = (1.0 - self.alpha) * self.value + self.alpha * x
    return self.value


@dataclass
class ConnState:
  last_ts: float
  ema_motion: Ema
  ema_center_dx: Ema
  ema_center_dy: Ema
  ema_face_area: Ema
  ema_posture_slouch: Ema
  missing_face_streak: int
  present_face_streak: int
  prev_gray: Optional[np.ndarray]


def clamp(v: float, lo: float, hi: float) -> float:
  return max(lo, min(hi, v))


def decode_data_url_jpeg(data_url: str) -> Optional[np.ndarray]:
  # expected "data:image/jpeg;base64,...."
  if not data_url:
    return None
  if "," in data_url:
    _, b64 = data_url.split(",", 1)
  else:
    b64 = data_url
  try:
    raw = base64.b64decode(b64)
  except Exception:
    return None
  arr = np.frombuffer(raw, dtype=np.uint8)
  img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
  return img


def compute_motion(prev_gray: Optional[np.ndarray], gray: np.ndarray) -> Tuple[float, np.ndarray]:
  if prev_gray is None or prev_gray.shape != gray.shape:
    return 0.0, gray
  diff = cv2.absdiff(prev_gray, gray)
  # normalize motion into 0..1-ish
  motion = float(np.mean(diff) / 255.0)
  return motion, gray


def face_metrics_from_facemesh(
  face_landmarks: Any,
  w: int,
  h: int
) -> Tuple[float, float, float, float]:
  # Returns: cx, cy, face_area_ratio, yaw_proxy
  xs = [lm.x for lm in face_landmarks.landmark]
  ys = [lm.y for lm in face_landmarks.landmark]
  min_x, max_x = min(xs), max(xs)
  min_y, max_y = min(ys), max(ys)
  cx = (min_x + max_x) / 2.0
  cy = (min_y + max_y) / 2.0
  face_area_ratio = (max_x - min_x) * (max_y - min_y)

  # Head yaw proxy using nose tip vs eye midpoint.
  # (Not true gaze, but good enough to classify looking away.)
  # Mediapipe indices: nose tip ~ 1, left eye outer ~ 33, right eye outer ~ 263
  nose = face_landmarks.landmark[1]
  le = face_landmarks.landmark[33]
  re = face_landmarks.landmark[263]
  eye_mid_x = (le.x + re.x) / 2.0
  inter_eye = max(1e-6, abs(le.x - re.x))
  yaw_proxy = (nose.x - eye_mid_x) / inter_eye  # ~ -0.3..0.3 typical

  return cx, cy, face_area_ratio, yaw_proxy


def posture_metrics_from_pose(pose_landmarks: Any) -> Tuple[float, float]:
  # Returns: shoulders_slope (abs), slouch_proxy (higher is worse)
  # Indices: left_shoulder 11, right_shoulder 12, left_hip 23, right_hip 24
  ls = pose_landmarks.landmark[11]
  rs = pose_landmarks.landmark[12]
  lh = pose_landmarks.landmark[23]
  rh = pose_landmarks.landmark[24]

  shoulders_slope = abs(ls.y - rs.y)
  hip_mid_y = (lh.y + rh.y) / 2.0
  shoulder_mid_y = (ls.y + rs.y) / 2.0
  # If shoulders are too low relative to hips in normalized coords, likely slouch/lean.
  slouch_proxy = clamp((shoulder_mid_y - (hip_mid_y - 0.10)) / 0.25, 0.0, 1.0)
  return shoulders_slope, slouch_proxy


def classify(att_score: float) -> str:
  # att_score: 0 (bad) .. 1 (good)
  # Cycle through states based on score to ensure changes are visible
  if att_score >= 0.85:
    return "good"
  if att_score >= 0.60:
    return "warning"
  return "poor"


@app.get("/health")
def health() -> Dict[str, str]:
  return {"status": "ok"}


@app.websocket("/ws/gesture")
async def ws_gesture(ws: WebSocket) -> None:
  await ws.accept()

  # Load OpenCV Haar Cascade for face detection
  face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
  
  state = ConnState(
    last_ts=time.time(),
    ema_motion=Ema(0.0, 0.25),
    ema_center_dx=Ema(0.0, 0.20),
    ema_center_dy=Ema(0.0, 0.20),
    ema_face_area=Ema(0.08, 0.18),
    ema_posture_slouch=Ema(0.0, 0.20),
    missing_face_streak=0,
    present_face_streak=0,
    prev_gray=None,
  )

  try:
    while True:
      msg = await ws.receive_text()
      try:
        payload = json.loads(msg)
      except Exception:
        continue

      img = decode_data_url_jpeg(payload.get("image", ""))
      if img is None:
        await ws.send_json({
          "attention": "warning",
          "eyeContact": "warning",
          "posture": "warning",
          "faceDetected": False,
          "confidence": 0.2,
          "details": ["No frame decoded"],
        })
        continue

      h, w = img.shape[:2]
      if w > 640:
        scale = 640 / w
        img = cv2.resize(img, (int(w * scale), int(h * scale)))
        h, w = img.shape[:2]

      gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
      motion_raw, prev_gray = compute_motion(state.prev_gray, gray)
      state.prev_gray = prev_gray
      motion = state.ema_motion.update(motion_raw)

      # Use Haar Cascade for face detection
      faces = face_cascade.detectMultiScale(gray, 1.3, 5)
      face_detected = len(faces) > 0
      
      # Use raw values without heavy smoothing for responsiveness
      cx = cy = face_area = 0.0
      dx = dy = 0.0
      
      if face_detected:
        state.present_face_streak = min(30, state.present_face_streak + 1)
        state.missing_face_streak = 0
        # Get largest face
        x, y, fw, fh = max(faces, key=lambda f: f[2] * f[3])
        cx = (x + fw / 2) / w
        cy = (y + fh / 2) / h
        face_area = (fw * fh) / (w * h)
        # Raw offset from center (0.5, 0.5)
        dx = abs(cx - 0.5)
        dy = abs(cy - 0.5)
      else:
        state.missing_face_streak = min(30, state.missing_face_streak + 1)
        state.present_face_streak = 0

      # --- Simple Scoring ---
      # Attention: based on motion and face presence
      if not face_detected:
        if state.missing_face_streak >= 8:
          attention_score = 0.3
        elif state.missing_face_streak >= 4:
          attention_score = 0.5
        else:
          attention_score = 0.7
      elif motion > 0.03:
        attention_score = 0.3
      elif motion > 0.015:
        attention_score = 0.6
      else:
        attention_score = 0.9

      # Eye contact: based on face position (dx = horizontal offset)
      if face_detected:
        # If face is centered (dx < 0.1), good; otherwise warning/poor
        if dx < 0.08:
          eye_score = 0.9
        elif dx < 0.15:
          eye_score = 0.6
        else:
          eye_score = 0.25
      else:
        eye_score = 0.2 if state.missing_face_streak >= 5 else 0.5

      # Posture: based on face size (too far = small face, too close = large face)
      # Typical normalized face area: 0.05 (far) to 0.2 (close)
      if face_detected:
        if 0.06 <= face_area <= 0.18:
          posture_score = 0.85
        elif 0.04 <= face_area < 0.06 or 0.18 < face_area <= 0.25:
          posture_score = 0.5
        else:
          posture_score = 0.2
      else:
        posture_score = 0.3

      attention = classify(attention_score)
      eye_contact = classify(eye_score)
      posture = classify(posture_score)

      # Confidence: higher when face is present and tracking is stable.
      conf = 0.35
      conf += 0.35 if face_detected else -0.10
      conf += clamp(1.0 - (motion / 0.20), 0.0, 1.0) * 0.20
      conf = clamp(conf, 0.1, 0.95)

      details = [
        f"motion={motion:.3f}",
        f"face={'yes' if face_detected else 'no'} streak={state.present_face_streak}/{state.missing_face_streak}",
      ]
      if face_detected:
        details.append(f"center_dx={dx:.3f} center_dy={dy:.3f}")
        details.append(f"face_area={face_area:.3f}")

      # Confidence
      conf = 0.5
      if face_detected:
        conf = 0.7
      if motion > 0.05:
        conf -= 0.2

      await ws.send_json({
        "attention": attention,
        "eyeContact": eye_contact,
        "posture": posture,
        "faceDetected": face_detected,
        "confidence": conf,
        "details": details,
        "raw": {
          "attentionScore": attention_score,
          "eyeScore": eye_score,
          "postureScore": posture_score,
        },
      })
  except WebSocketDisconnect:
    return
