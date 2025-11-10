/**
 * John - Emotion Recognition
 * face-api.js 버전 - 가장 안정적!
 */

const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.12/model';

let video;
let canvas;
let displaySize;
let isModelLoaded = false;
let lastTime = Date.now();
let frameCount = 0;
let fps = 0;

// 21가지 감정 라이브러리
const emotionLibrary = {
    'neutral': [
        { name: 'Trust', korean: '신뢰', weight: 0.3 },
        { name: 'Pensiveness', korean: '사려깊음', weight: 0.25 },
        { name: 'Interest', korean: '관심', weight: 0.2 },
        { name: 'Admiration', korean: '감탄', weight: 0.15 }
    ],
    'happy': [
        { name: 'Joy', korean: '기쁨', weight: 0.4 },
        { name: 'Optimism', korean: '낙관', weight: 0.3 },
        { name: 'Ecstasy', korean: '황홀', weight: 0.2 },
        { name: 'Tears of joy', korean: '감동', weight: 0.15 }
    ],
    'sad': [
        { name: 'Sadness', korean: '슬픔', weight: 0.35 },
        { name: 'Grief', korean: '비탄', weight: 0.25 },
        { name: 'Pensiveness', korean: '우울', weight: 0.2 },
        { name: 'Disappointment', korean: '실망', weight: 0.15 }
    ],
    'angry': [
        { name: 'Anger', korean: '분노', weight: 0.35 },
        { name: 'Rage', korean: '격노', weight: 0.3 },
        { name: 'Annoyance', korean: '짜증', weight: 0.25 },
        { name: 'Aggressiveness', korean: '공격성', weight: 0.15 }
    ],
    'fearful': [
        { name: 'Fear', korean: '공포', weight: 0.35 },
        { name: 'Terror', korean: '경악', weight: 0.3 },
        { name: 'Apprehension', korean: '불안', weight: 0.25 },
        { name: 'Vigilance', korean: '경계', weight: 0.2 }
    ],
    'disgusted': [
        { name: 'Disgust', korean: '혐오', weight: 0.4 },
        { name: 'Boredom', korean: '지루함', weight: 0.3 }
    ],
    'surprised': [
        { name: 'Surprise', korean: '놀람', weight: 0.4 },
        { name: 'Amazement', korean: '경탄', weight: 0.3 }
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

// 초기화
async function init() {
    console.log('🚀 초기화 시작');
    updateProgress(10, '웹캠 시작 중...');
    
    video = document.getElementById('video');
    canvas = document.getElementById('overlay');
    
    try {
        // 웹캠 시작
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { width: 640, height: 480 } 
        });
        
        video.srcObject = stream;
        console.log('✅ 웹캠 연결 성공');
        
        video.addEventListener('play', () => {
            console.log('▶️ 비디오 재생 시작');
            
            const videoWidth = video.videoWidth;
            const videoHeight = video.videoHeight;
            
            canvas.width = videoWidth;
            canvas.height = videoHeight;
            
            displaySize = { width: videoWidth, height: videoHeight };
            
            console.log(`📐 비디오 크기: ${videoWidth} x ${videoHeight}`);
            
            loadModels();
        });
        
    } catch (err) {
        console.error('❌ 웹캠 오류:', err);
        updateProgress(0, '카메라 권한을 허용해주세요');
    }
}

// 모델 로드
async function loadModels() {
    updateProgress(30, 'AI 모델 다운로드 중...');
    console.log('🤖 모델 로드 시작...');
    
    try {
        // 필요한 모델만 로드
        await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
        console.log('✅ Tiny Face Detector 로드 완료');
        updateProgress(60, '랜드마크 모델 로딩...');
        
        await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
        console.log('✅ Face Landmark 로드 완료');
        updateProgress(80, '감정 인식 모델 로딩...');
        
        await faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL);
        console.log('✅ Face Expression 로드 완료');
        
        updateProgress(100, '완료!');
        
        setTimeout(() => {
            document.getElementById('loading').style.display = 'none';
            isModelLoaded = true;
            console.log('🎬 얼굴 감지 시작!');
            detectFaces();
        }, 500);
        
    } catch (err) {
        console.error('❌ 모델 로드 오류:', err);
        updateProgress(0, '모델 로드 실패');
    }
}

function updateProgress(percent, message) {
    document.getElementById('progress-fill').style.width = percent + '%';
    document.getElementById('loading-text').textContent = message;
    document.getElementById('loading-detail').textContent = `${Math.floor(percent)}%`;
}

// 얼굴 감지 루프
async function detectFaces() {
    if (!isModelLoaded) return;
    
    // FPS 계산
    frameCount++;
    const now = Date.now();
    if (now - lastTime >= 1000) {
        fps = frameCount;
        frameCount = 0;
        lastTime = now;
        document.getElementById('fps').textContent = fps;
    }
    
    try {
        // 얼굴 감지 + 랜드마크 + 표정
        const detections = await faceapi
            .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
            .withFaceLandmarks()
            .withFaceExpressions();
        
        // 캔버스 초기화
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        if (detections.length > 0) {
            console.log('👤 얼굴 감지됨!');
            
            // 리사이즈
            const resizedDetections = faceapi.resizeResults(detections, displaySize);
            
            // 그리기
            drawDetections(resizedDetections[0]);
            
            // 감정 분석
            analyzeEmotions(resizedDetections[0]);
            
            document.getElementById('face-count').textContent = detections.length;
        } else {
            console.log('❌ 얼굴 없음');
            showNoFace();
        }
        
    } catch (err) {
        console.error('❌ 감지 오류:', err);
    }
    
    setTimeout(() => detectFaces(), 100); // 100ms마다 감지
}

// 감지 결과 그리기
function drawDetections(detection) {
    const ctx = canvas.getContext('2d');
    
    // 얼굴 박스
    const box = detection.detection.box;
    ctx.strokeStyle = '#667eea';
    ctx.lineWidth = 4;
    ctx.strokeRect(box.x, box.y, box.width, box.height);
    
    // 랜드마크 포인트 (초록색)
    const landmarks = detection.landmarks.positions;
    ctx.fillStyle = '#00FF00';
    landmarks.forEach(point => {
        ctx.beginPath();
        ctx.arc(point.x, point.y, 2, 0, 2 * Math.PI);
        ctx.fill();
    });
    
    // 얼굴 윤곽선 (빨간색)
    ctx.strokeStyle = '#FF0000';
    ctx.lineWidth = 2;
    
    // 얼굴 외곽선
    const jawOutline = landmarks.slice(0, 17);
    ctx.beginPath();
    jawOutline.forEach((point, i) => {
        if (i === 0) ctx.moveTo(point.x, point.y);
        else ctx.lineTo(point.x, point.y);
    });
    ctx.stroke();
    
    // 눈 (왼쪽)
    const leftEye = landmarks.slice(36, 42);
    ctx.beginPath();
    leftEye.forEach((point, i) => {
        if (i === 0) ctx.moveTo(point.x, point.y);
        else ctx.lineTo(point.x, point.y);
    });
    ctx.closePath();
    ctx.stroke();
    
    // 눈 (오른쪽)
    const rightEye = landmarks.slice(42, 48);
    ctx.beginPath();
    rightEye.forEach((point, i) => {
        if (i === 0) ctx.moveTo(point.x, point.y);
        else ctx.lineTo(point.x, point.y);
    });
    ctx.closePath();
    ctx.stroke();
    
    // 입
    const mouth = landmarks.slice(48, 68);
    ctx.beginPath();
    mouth.forEach((point, i) => {
        if (i === 0) ctx.moveTo(point.x, point.y);
        else ctx.lineTo(point.x, point.y);
    });
    ctx.closePath();
    ctx.stroke();
}

// 감정 분석
function analyzeEmotions(detection) {
    const expressions = detection.expressions;
    
    console.log('😊 감정 데이터:', expressions);
    
    // 기본 7가지 감정
    let baseEmotions = [];
    for (let emotion in expressions) {
        baseEmotions.push({
            type: emotion,
            intensity: expressions[emotion]
        });
    }
    
    // 강도순 정렬
    baseEmotions.sort((a, b) => b.intensity - a.intensity);
    
    // 21가지로 확장
    let allEmotions = [];
    baseEmotions.slice(0, 3).forEach(base => {
        if (emotionLibrary[base.type]) {
            emotionLibrary[base.type].forEach(emotion => {
                allEmotions.push({
                    name: emotion.name,
                    korean: emotion.korean,
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
            `${topEmotions[0].korean} (${(topEmotions[0].intensity * 100).toFixed(0)}%)`;
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
                    <div class="emotion-korean">${emotion.korean}</div>
                    <div class="emotion-english">${emotion.name}</div>
                </div>
                <div class="emotion-percent">${percentage}%</div>
            </div>
        `;
    });
    
    document.getElementById('emotion-display').innerHTML = html;
}

function showNoFace() {
    document.getElementById('emotion-display').innerHTML = 
        '<div class="no-face">얼굴이 감지되지 않았습니다<br><small>화면 중앙에 얼굴을 위치시켜주세요</small></div>';
    document.getElementById('face-count').textContent = '0';
    document.getElementById('dominant-emotion').textContent = '-';
}

// 시작
window.addEventListener('load', init);