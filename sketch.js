/**
 * John - Emotion Recognition
 * Real-time emotion analysis with face-api.js
 */

const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.12/model';

let video;
let canvas;
let displaySize;
let isModelLoaded = false;
let lastTime = Date.now();
let frameCount = 0;
let fps = 0;

// 21 Emotion Library
const emotionLibrary = {
    'neutral': [
        { name: 'Trust', weight: 0.3 },
        { name: 'Pensiveness', weight: 0.25 },
        { name: 'Interest', weight: 0.2 },
        { name: 'Admiration', weight: 0.15 }
    ],
    'happy': [
        { name: 'Joy', weight: 0.4 },
        { name: 'Optimism', weight: 0.3 },
        { name: 'Ecstasy', weight: 0.2 },
        { name: 'Tears of Joy', weight: 0.15 }
    ],
    'sad': [
        { name: 'Sadness', weight: 0.35 },
        { name: 'Grief', weight: 0.25 },
        { name: 'Pensiveness', weight: 0.2 },
        { name: 'Disappointment', weight: 0.15 }
    ],
    'angry': [
        { name: 'Anger', weight: 0.35 },
        { name: 'Rage', weight: 0.3 },
        { name: 'Annoyance', weight: 0.25 },
        { name: 'Aggressiveness', weight: 0.15 }
    ],
    'fearful': [
        { name: 'Fear', weight: 0.35 },
        { name: 'Terror', weight: 0.3 },
        { name: 'Apprehension', weight: 0.25 },
        { name: 'Vigilance', weight: 0.2 }
    ],
    'disgusted': [
        { name: 'Disgust', weight: 0.4 },
        { name: 'Boredom', weight: 0.3 }
    ],
    'surprised': [
        { name: 'Surprise', weight: 0.4 },
        { name: 'Amazement', weight: 0.3 }
    ]
};

const emotionColors = {
    'happy': '#FFD700',
    'sad': '#4A90E2',
    'angry': '#E74C3C',
    'fearful': '#9B59B6',
    'disgusted': '#95A5A6',
    'surprised': '#F39C12',
    'neutral': '#3498DB'
};

// Initialize
async function init() {
    console.log('🚀 Initializing...');
    updateProgress(10, 'Starting webcam...');
    
    video = document.getElementById('video');
    canvas = document.getElementById('overlay');
    
    try {
        // Start webcam
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { width: 640, height: 480 } 
        });
        
        video.srcObject = stream;
        console.log('✅ Webcam connected');
        
        video.addEventListener('play', () => {
            console.log('▶️ Video playing');
            
            const videoWidth = video.videoWidth;
            const videoHeight = video.videoHeight;
            
            canvas.width = videoWidth;
            canvas.height = videoHeight;
            
            displaySize = { width: videoWidth, height: videoHeight };
            
            console.log(`📐 Video size: ${videoWidth} x ${videoHeight}`);
            
            loadModels();
        });
        
    } catch (err) {
        console.error('❌ Webcam error:', err);
        updateProgress(0, 'Please allow camera permission');
    }
}

// Load Models
async function loadModels() {
    updateProgress(30, 'Downloading AI models...');
    console.log('🤖 Loading models...');
    
    try {
        // Load required models only
        await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
        console.log('✅ Tiny Face Detector loaded');
        updateProgress(60, 'Loading landmark model...');
        
        await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
        console.log('✅ Face Landmark loaded');
        updateProgress(80, 'Loading expression model...');
        
        await faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL);
        console.log('✅ Face Expression loaded');
        
        updateProgress(100, 'Complete!');
        
        setTimeout(() => {
            document.getElementById('loading').style.display = 'none';
            isModelLoaded = true;
            console.log('🎬 Starting face detection!');
            detectFaces();
        }, 500);
        
    } catch (err) {
        console.error('❌ Model loading error:', err);
        updateProgress(0, 'Model loading failed');
    }
}

function updateProgress(percent, message) {
    document.getElementById('progress-fill').style.width = percent + '%';
    document.getElementById('loading-text').textContent = message;
    document.getElementById('loading-detail').textContent = `${Math.floor(percent)}%`;
}

// Face Detection Loop
async function detectFaces() {
    if (!isModelLoaded) return;
    
    // Calculate FPS
    frameCount++;
    const now = Date.now();
    if (now - lastTime >= 1000) {
        fps = frameCount;
        frameCount = 0;
        lastTime = now;
        document.getElementById('fps').textContent = fps;
    }
    
    try {
        // Detect faces + landmarks + expressions
        const detections = await faceapi
            .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
            .withFaceLandmarks()
            .withFaceExpressions();
        
        // Clear canvas
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        if (detections.length > 0) {
            console.log('👤 Face detected!');
            
            // Resize results
            const resizedDetections = faceapi.resizeResults(detections, displaySize);
            
            // Draw
            drawDetections(resizedDetections[0]);
            
            // Analyze emotions
            analyzeEmotions(resizedDetections[0]);
            
            document.getElementById('face-count').textContent = detections.length;
        } else {
            console.log('❌ No face detected');
            showNoFace();
        }
        
    } catch (err) {
        console.error('❌ Detection error:', err);
    }
    
    setTimeout(() => detectFaces(), 100);
}

// Draw Detection Results
function drawDetections(detection) {
    const ctx = canvas.getContext('2d');
    
    // Face box
    const box = detection.detection.box;
    ctx.strokeStyle = '#517bf2';
    ctx.lineWidth = 4;
    ctx.strokeRect(box.x, box.y, box.width, box.height);
    
    // Landmark points (green)
    const landmarks = detection.landmarks.positions;
    ctx.fillStyle = '#00FF00';
    landmarks.forEach(point => {
        ctx.beginPath();
        ctx.arc(point.x, point.y, 2, 0, 2 * Math.PI);
        ctx.fill();
    });
    
    // Face contour (red)
    ctx.strokeStyle = '#FF0000';
    ctx.lineWidth = 2;
    
    // Jaw outline
    const jawOutline = landmarks.slice(0, 17);
    ctx.beginPath();
    jawOutline.forEach((point, i) => {
        if (i === 0) ctx.moveTo(point.x, point.y);
        else ctx.lineTo(point.x, point.y);
    });
    ctx.stroke();
    
    // Left eye
    const leftEye = landmarks.slice(36, 42);
    ctx.beginPath();
    leftEye.forEach((point, i) => {
        if (i === 0) ctx.moveTo(point.x, point.y);
        else ctx.lineTo(point.x, point.y);
    });
    ctx.closePath();
    ctx.stroke();
    
    // Right eye
    const rightEye = landmarks.slice(42, 48);
    ctx.beginPath();
    rightEye.forEach((point, i) => {
        if (i === 0) ctx.moveTo(point.x, point.y);
        else ctx.lineTo(point.x, point.y);
    });
    ctx.closePath();
    ctx.stroke();
    
    // Mouth
    const mouth = landmarks.slice(48, 68);
    ctx.beginPath();
    mouth.forEach((point, i) => {
        if (i === 0) ctx.moveTo(point.x, point.y);
        else ctx.lineTo(point.x, point.y);
    });
    ctx.closePath();
    ctx.stroke();
}

// Analyze Emotions
function analyzeEmotions(detection) {
    const expressions = detection.expressions;
    
    console.log('😊 Emotion data:', expressions);
    
    // Base 7 emotions
    let baseEmotions = [];
    for (let emotion in expressions) {
        baseEmotions.push({
            type: emotion,
            intensity: expressions[emotion]
        });
    }
    
    // Sort by intensity
    baseEmotions.sort((a, b) => b.intensity - a.intensity);
    
    // Expand to 21 emotions
    let allEmotions = [];
    baseEmotions.slice(0, 3).forEach(base => {
        if (emotionLibrary[base.type]) {
            emotionLibrary[base.type].forEach(emotion => {
                allEmotions.push({
                    name: emotion.name,
                    intensity: base.intensity * emotion.weight * (0.8 + Math.random() * 0.4),
                    baseEmotion: base.type
                });
            });
        }
    });
    
    allEmotions.sort((a, b) => b.intensity - a.intensity);
    const topEmotions = allEmotions.slice(0, 8);
    
    displayEmotions(topEmotions);
}

function displayEmotions(topEmotions) {
    if (topEmotions.length > 0) {
        document.getElementById('dominant-emotion').textContent = 
            `${topEmotions[0].name} (${(topEmotions[0].intensity * 100).toFixed(0)}%)`;
    }
    
    let html = '';
    topEmotions.forEach((emotion, index) => {
        const percentage = (emotion.intensity * 100).toFixed(1);
        const opacity = 0.4 + (emotion.intensity * 0.6);
        const delay = index * 0.05;
        const color = emotionColors[emotion.baseEmotion] || '#FFFFFF';
        
        html += `
            <div class="emotion-item" style="opacity: ${opacity}; animation-delay: ${delay}s; border-left: 4px solid ${color}">
                <div class="emotion-info">
                    <div class="emotion-korean">${emotion.name}</div>
                </div>
                <div class="emotion-percent">${percentage}%</div>
            </div>
        `;
    });
    
    document.getElementById('emotion-display').innerHTML = html;
}

function showNoFace() {
    document.getElementById('emotion-display').innerHTML = 
        '<div class="no-face">No face detected<br><small>Please position your face in the center</small></div>';
    document.getElementById('face-count').textContent = '0';
    document.getElementById('dominant-emotion').textContent = '-';
}

// Start
window.addEventListener('load', init);