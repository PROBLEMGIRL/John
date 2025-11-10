/**
 * John - Emotion Recognition System
 * AI 기반 실시간 감정 인식 웹 애플리케이션
 * 
 * @author Milky
 * @description ml5.js FaceAPI를 사용한 21가지 감정 분석 시스템
 */

// ================================
// Global Variables
// ================================
let video;
let faceapi;
let detections = [];
let isModelReady = false;
let lastFrameTime = 0;
let fps = 0;

// ================================
// 21 Emotion Library
// ================================
const emotionLibrary = {
    'neutral': [
        { name: 'Trust', korean: '신뢰', base: 0.3, variance: 0.2 },
        { name: 'Pensiveness', korean: '사려깊음', base: 0.25, variance: 0.15 },
        { name: 'Interest', korean: '관심', base: 0.2, variance: 0.2 },
        { name: 'Admiration', korean: '감탄', base: 0.15, variance: 0.1 }
    ],
    'happy': [
        { name: 'Joy', korean: '기쁨', base: 0.4, variance: 0.3 },
        { name: 'Optimism', korean: '낙관', base: 0.3, variance: 0.2 },
        { name: 'Ecstasy', korean: '황홀', base: 0.2, variance: 0.15 },
        { name: 'Tears of joy', korean: '감동', base: 0.15, variance: 0.1 }
    ],
    'sad': [
        { name: 'Sadness', korean: '슬픔', base: 0.35, variance: 0.25 },
        { name: 'Grief', korean: '비탄', base: 0.25, variance: 0.2 },
        { name: 'Pensiveness', korean: '우울', base: 0.2, variance: 0.15 },
        { name: 'Disappointment', korean: '실망', base: 0.15, variance: 0.1 }
    ],
    'angry': [
        { name: 'Anger', korean: '분노', base: 0.35, variance: 0.25 },
        { name: 'Rage', korean: '격노', base: 0.3, variance: 0.2 },
        { name: 'Annoyance', korean: '짜증', base: 0.25, variance: 0.2 },
        { name: 'Aggressiveness', korean: '공격성', base: 0.15, variance: 0.1 }
    ],
    'fearful': [
        { name: 'Fear', korean: '공포', base: 0.35, variance: 0.25 },
        { name: 'Terror', korean: '경악', base: 0.3, variance: 0.2 },
        { name: 'Apprehension', korean: '불안', base: 0.25, variance: 0.2 },
        { name: 'Vigilance', korean: '경계', base: 0.2, variance: 0.15 }
    ],
    'disgusted': [
        { name: 'Disgust', korean: '혐오', base: 0.4, variance: 0.3 },
        { name: 'Boredom', korean: '지루함', base: 0.3, variance: 0.2 }
    ],
    'surprised': [
        { name: 'Surprise', korean: '놀람', base: 0.4, variance: 0.3 },
        { name: 'Amazement', korean: '경탄', base: 0.3, variance: 0.2 }
    ]
};

// Color mapping for emotions
const emotionColors = {
    'happy': '#FFD700',
    'sad': '#4A90E2',
    'angry': '#E74C3C',
    'fearful': '#9B59B6',
    'disgusted': '#95A5A6',
    'surprised': '#F39C12',
    'neutral': '#3498DB'
};

// ================================
// p5.js Setup
// ================================
function setup() {
    console.log('🚀 Setup 시작...');
    
    // Create canvas
    let canvas = createCanvas(640, 480);
    canvas.parent('sketch-holder');
    
    // Initialize webcam
    video = createCapture(VIDEO, videoReady);
    video.size(640, 480);
    video.hide();
    
    console.log('📷 웹캠 초기화 중...');
}

// ================================
// Video Ready Callback
// ================================
function videoReady() {
    console.log('✅ 웹캠 준비 완료');
    
    // FaceAPI options
    const faceOptions = {
        withLandmarks: true,
        withExpressions: true,
        withDescriptors: false,
        minConfidence: 0.5
    };
    
    console.log('🤖 FaceAPI 모델 로딩 시작...');
    
    // Load FaceAPI model
    faceapi = ml5.faceApi(video, faceOptions, modelReady);
}

// ================================
// Model Ready Callback
// ================================
function modelReady() {
    console.log('✅ 모델 로드 완료!');
    isModelReady = true;
    
    // Hide loading overlay
    const loadingEl = document.getElementById('loading');
    if (loadingEl) {
        loadingEl.style.display = 'none';
    }
    
    // Start face detection
    faceapi.detect(gotFaces);
}

// ================================
// Face Detection Callback
// ================================
function gotFaces(error, result) {
    if (error) {
        console.error('❌ 감지 오류:', error);
        return;
    }
    
    detections = result;
    
    // Continue detection
    faceapi.detect(gotFaces);
}

// ================================
// p5.js Draw Loop
// ================================
function draw() {
    // Calculate FPS
    let currentTime = millis();
    if (currentTime - lastFrameTime > 0) {
        fps = floor(1000 / (currentTime - lastFrameTime));
        lastFrameTime = currentTime;
    }
    
    // Draw video (flipped)
    push();
    translate(width, 0);
    scale(-1, 1);
    image(video, 0, 0, width, height);
    pop();
    
    if (!isModelReady) {
        return;
    }
    
    // Draw face detections
    if (detections && detections.length > 0) {
        drawFaceDetections(detections);
        displayEmotions(detections);
        updateStats(detections.length);
    } else {
        showNoFaceMessage();
    }
}

// ================================
// Draw Face Detections
// ================================
function drawFaceDetections(detections) {
    for (let i = 0; i < detections.length; i++) {
        const alignedRect = detections[i].alignedRect;
        const x = width - alignedRect._box._x - alignedRect._box._width;
        const y = alignedRect._box._y;
        const boxWidth = alignedRect._box._width;
        const boxHeight = alignedRect._box._height;
        
        // Draw face box
        noFill();
        stroke(102, 126, 234);
        strokeWeight(3);
        rect(x, y, boxWidth, boxHeight);
        
        // Draw landmarks
        const landmarks = detections[i].landmarks;
        if (landmarks) {
            drawLandmarks(landmarks._positions, '#00FF00');
            drawFaceContour(landmarks._positions);
        }
    }
}

// ================================
// Draw Landmarks
// ================================
function drawLandmarks(positions, color) {
    fill(color);
    noStroke();
    
    for (let j = 0; j < positions.length; j++) {
        const x = width - positions[j]._x;
        const y = positions[j]._y;
        circle(x, y, 3);
    }
}

// ================================
// Draw Face Contour
// ================================
function drawFaceContour(positions) {
    stroke('#FF0000');
    strokeWeight(2);
    noFill();
    
    beginShape();
    for (let j = 0; j < positions.length; j++) {
        const x = width - positions[j]._x;
        const y = positions[j]._y;
        vertex(x, y);
    }
    endShape();
}

// ================================
// Display Emotions
// ================================
function displayEmotions(detections) {
    if (detections.length === 0) return;
    
    const expressions = detections[0].expressions;
    let allEmotions = [];
    
    // Expand to 21 emotions with dynamic variation
    for (let baseEmotion in expressions) {
        const intensity = expressions[base