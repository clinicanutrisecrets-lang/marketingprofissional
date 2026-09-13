#!/usr/bin/env bash
# Os dois modelos do MediaPipe NAO ficam no repo (3,6 MB + 16 MB). Sao publicos
# e estaveis; este script os busca pra pasta do engine.
set -e
cd "$(dirname "$0")/engine"
B=https://storage.googleapis.com/mediapipe-models
[ -f face_landmarker.task ] || curl -sSfL -o face_landmarker.task \
  "$B/face_landmarker/face_landmarker/float16/1/face_landmarker.task"
[ -f seg_roupa.tflite ] || curl -sSfL -o seg_roupa.tflite \
  "$B/image_segmenter/selfie_multiclass_256x256/float32/1/selfie_multiclass_256x256.tflite"
ls -la face_landmarker.task seg_roupa.tflite
