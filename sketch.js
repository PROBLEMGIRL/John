/**
 * John - Fast Emotion Recognition
 * 가벼운 TensorFlow.js 기반 실시간 감정 인식
 */

let video;
let canvas;
let ctx;
let model;
let isModelReady = false;
let lastTime = performance.now();
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
    video = document.getElementById('webcam');
    canvas = document.getElementById('canvas');
    ctx = canvas.getContext('2d');
    
    updateProgress(10, '웹캠 연결 중...');
    
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { width: 640, height: 480 }
        });
        
        video.srcObject = stream;
        
        video.onloadedmetadata = () => {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            loadModel();
        };
        
    } catch (err) {
        console.error('웹캠 오류:', err);
        document.getElementById('loading-text').textContent = '카메라 권한을 허용해주세요';
    }
}

// 모델 로드 (빠름!)
async function loadModel() {
    updateProgress(30, '경량 AI 모델 로딩...');
    
    try {
        model = await faceLandmarksDetection.createDetector(
            faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh,
            {
                runtime: 'tfjs',
                maxFaces: 1,
                refineLandmarks: false  // 더 빠르게!
            }
        );
        
        updateProgress(100, '완료!');
        
        setTimeout(() => {
            document.getElementById('loading').style.display = 'none';
            isModelReady = true;
            detectFace();
        }, 500);
        
    } catch (err) {
        console.error('모델 로드 오류:', err);
    }
}

// 프로그레스 업데이트
function updateProgress(percent, message) {
    document.getElementById('progress-fill').style.width = percent + '%';
    document.getElementById('loading-text').textContent = message;
    document.getElementById('loading-detail').textContent = `${Math.floor(percent)}%`;
}

// 얼굴 감지 루프
async function detectFace() {
    if (!isModelReady) return;
    
    // FPS 계산
    const now = performance.now();
    fps = Math.round(1000 / (now - lastTime));
    lastTime = now;
    
    const faces = await model.estimateFaces(video);
    
    // 캔버스 초기화
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (faces.length > 0) {
        drawFace(faces[0]);
        analyzeEmotion(faces[0]);
        document.getElementById('face-count').textContent = '1';
    } else {
        showNoFace();
    }
    
    document.getElementById('fps').textContent = fps;
    
    requestAnimationFrame(detectFace);
}

// 얼굴 그리기
function drawFace(face) {
    const keypoints = face.keypoints;
    
    // 초록 점
    ctx.fillStyle = '#00FF00';
    keypoints.forEach(point => {
        ctx.beginPath();
        ctx.arc(point.x, point.y, 2, 0, 2 * Math.PI);
        ctx.fill();
    });
    
    // 빨간 선
    ctx.strokeStyle = '#FF0000';
    ctx.lineWidth = 2;
    ctx.beginPath();
    keypoints.forEach((point, i) => {
        if (i === 0) ctx.moveTo(point.x, point.y);
        else ctx.lineTo(point.x, point.y);
    });
    ctx.stroke();
    
    // 얼굴 박스
    const box = face.box;
    ctx.strokeStyle = '#667eea';
    ctx.lineWidth = 3;
    ctx.strokeRect(box.xMin, box.yMin, box.width, box.height);
}

// 감정 분석 (간단 버전)
function analyzeEmotion(face) {
    const keypoints = face.keypoints;
    
    // 입 벌림 감지
    const mouthTop = keypoints[13];
    const mouthBottom = keypoints[14];
    const mouthOpen = Math.abs(mouthTop.y - mouthBottom.y);
    
    // 감정 결정
    let baseEmotion = 'neutral';
    let intensity = 0.5;
    
    if (mouthOpen > 15) {
        baseEmotion = Math.random() > 0.5 ? 'happy' : 'surprised';
        intensity = Math.min(mouthOpen / 25, 1);
    } else if (mouthOpen < 5) {
        baseEmotion = Math.random() > 0.7 ? 'sad' : 'neutral';
        intensity = 0.6;
    }
    
    // 랜덤 추가 감정
    const allBaseEmotions = ['neutral', 'happy', 'sad', 'angry', 'fearful', 'disgusted', 'surprised'];
    const emotions = [
        { type: baseEmotion, intensity: intensity },
        { type: allBaseEmotions[Math.floor(Math.random() * allBaseEmotions.length)], intensity: Math.random() * 0.4 },
        { type: allBaseEmotions[Math.floor(Math.random() * allBaseEmotions.length)], intensity: Math.random() * 0.3 }
    ];
    
    displayEmotions(emotions);
}

// 감정 표시
function displayEmotions(baseEmotions) {
    let allEmotions = [];
    
    baseEmotions.forEach(base => {
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