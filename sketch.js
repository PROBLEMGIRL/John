/**
 * John - Emotion Recognition (디버깅 버전)
 */

let video;
let canvas;
let ctx;
let model;
let isModelReady = false;
let lastTime = performance.now();
let fps = 0;
let debugMode = true; // 디버그 모드

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
    
    video = document.getElementById('webcam');
    canvas = document.getElementById('canvas');
    ctx = canvas.getContext('2d');
    
    updateProgress(10, '웹캠 연결 중...');
    
    try {
        console.log('📷 웹캠 권한 요청 중...');
        
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { 
                width: { ideal: 640 },
                height: { ideal: 480 },
                facingMode: 'user'
            }
        });
        
        video.srcObject = stream;
        console.log('✅ 웹캠 연결 성공');
        
        video.onloadedmetadata = () => {
            console.log('✅ 비디오 메타데이터 로드');
            console.log(`📐 비디오 크기: ${video.videoWidth} x ${video.videoHeight}`);
            
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            
            loadModel();
        };
        
        // 비디오 재생 시작
        video.play();
        
    } catch (err) {
        console.error('❌ 웹캠 오류:', err);
        document.getElementById('loading-text').textContent = '카메라 권한을 허용해주세요';
        document.getElementById('loading-detail').textContent = err.message;
    }
}

// 모델 로드
async function loadModel() {
    updateProgress(30, 'AI 모델 로딩 중...');
    console.log('🤖 모델 로딩 시작...');
    
    try {
        // TensorFlow 백엔드 준비
        await tf.ready();
        console.log('✅ TensorFlow 준비 완료');
        
        updateProgress(50, '얼굴 인식 모델 로딩...');
        
        model = await faceLandmarksDetection.createDetector(
            faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh,
            {
                runtime: 'tfjs',
                maxFaces: 1,
                refineLandmarks: true
            }
        );
        
        console.log('✅ 모델 로드 완료!');
        updateProgress(100, '준비 완료!');
        
        setTimeout(() => {
            document.getElementById('loading').style.display = 'none';
            isModelReady = true;
            console.log('🎬 얼굴 감지 시작');
            detectFace();
        }, 500);
        
    } catch (err) {
        console.error('❌ 모델 로드 오류:', err);
        document.getElementById('loading-text').textContent = '모델 로드 실패';
        document.getElementById('loading-detail').textContent = err.message;
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
    if (!isModelReady) {
        console.warn('⚠️ 모델이 준비되지 않음');
        return;
    }
    
    // FPS 계산
    const now = performance.now();
    fps = Math.round(1000 / (now - lastTime));
    lastTime = now;
    
    try {
        // 비디오가 재생 중인지 확인
        if (video.readyState !== video.HAVE_ENOUGH_DATA) {
            if (debugMode) console.log('⏳ 비디오 데이터 대기 중...');
            requestAnimationFrame(detectFace);
            return;
        }
        
        // 얼굴 감지
        const faces = await model.estimateFaces(video, {
            flipHorizontal: false
        });
        
        if (debugMode && faces.length > 0) {
            console.log(`👤 얼굴 감지됨: ${faces.length}개`);
        }
        
        // 캔버스 초기화
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        if (faces.length > 0) {
            drawFace(faces[0]);
            analyzeEmotion(faces[0]);
            document.getElementById('face-count').textContent = '1';
        } else {
            if (debugMode) console.log('❌ 얼굴 없음');
            showNoFace();
        }
        
        document.getElementById('fps').textContent = fps;
        
    } catch (err) {
        console.error('❌ 감지 오류:', err);
    }
    
    requestAnimationFrame(detectFace);
}

// 얼굴 그리기
function drawFace(face) {
    const keypoints = face.keypoints;
    
    if (debugMode) {
        console.log(`📍 키포인트 수: ${keypoints.length}`);
    }
    
    // 얼굴 박스 그리기
    if (face.box) {
        const box = face.box;
        ctx.strokeStyle = '#667eea';
        ctx.lineWidth = 4;
        ctx.strokeRect(box.xMin, box.yMin, box.width, box.height);
        
        // 박스 정보 텍스트
        ctx.fillStyle = '#667eea';
        ctx.font = '16px Arial';
        ctx.fillText(`Face Detected`, box.xMin, box.yMin - 10);
    }
    
    // 중요 키포인트만 그리기 (눈, 코, 입)
    const importantIndices = [
        // 왼쪽 눈
        33, 160, 158, 133, 153, 144,
        // 오른쪽 눈
        362, 385, 387, 263, 373, 380,
        // 코
        1, 2, 98, 327,
        // 입
        61, 291, 13, 14, 17, 84, 181, 314
    ];
    
    // 초록 점 그리기
    ctx.fillStyle = '#00FF00';
    importantIndices.forEach(i => {
        if (keypoints[i]) {
            ctx.beginPath();
            ctx.arc(keypoints[i].x, keypoints[i].y, 3, 0, 2 * Math.PI);
            ctx.fill();
        }
    });
    
    // 얼굴 윤곽선 그리기 (빨간 선)
    ctx.strokeStyle = '#FF0000';
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    // 얼굴 외곽 연결
    const contour = [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 
                     397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 
                     172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109];
    
    contour.forEach((i, index) => {
        if (keypoints[i]) {
            if (index === 0) {
                ctx.moveTo(keypoints[i].x, keypoints[i].y);
            } else {
                ctx.lineTo(keypoints[i].x, keypoints[i].y);
            }
        }
    });
    ctx.closePath();
    ctx.stroke();
}

// 감정 분석
function analyzeEmotion(face) {
    const keypoints = face.keypoints;
    
    // 입 벌림 정도 계산
    const upperLip = keypoints[13];
    const lowerLip = keypoints[14];
    const mouthOpen = Math.abs(upperLip.y - lowerLip.y);
    
    // 눈썹 높이
    const leftEyebrow = keypoints[70];
    const rightEyebrow = keypoints[300];
    
    if (debugMode) {
        console.log(`👄 입 벌림: ${mouthOpen.toFixed(2)}`);
    }
    
    // 감정 결정
    let baseEmotion = 'neutral';
    let intensity = 0.5;
    
    if (mouthOpen > 20) {
        baseEmotion = 'surprised';
        intensity = Math.min(mouthOpen / 30, 1);
    } else if (mouthOpen > 12) {
        baseEmotion = 'happy';
        intensity = Math.min(mouthOpen / 20, 1);
    } else if (mouthOpen < 5) {
        baseEmotion = Math.random() > 0.5 ? 'sad' : 'neutral';
        intensity = 0.6;
    }
    
    // 추가 랜덤 감정
    const allEmotions = ['neutral', 'happy', 'sad', 'angry', 'fearful', 'disgusted', 'surprised'];
    const emotions = [
        { type: baseEmotion, intensity: intensity },
        { type: allEmotions[Math.floor(Math.random() * allEmotions.length)], intensity: Math.random() * 0.4 },
        { type: allEmotions[Math.floor(Math.random() * allEmotions.length)], intensity: Math.random() * 0.3 }
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
window.addEventListener('load', () => {
    console.log('🌟 페이지 로드 완료');
    init();
});

// 에러 핸들링
window.addEventListener('error', (e) => {
    console.error('❌ 전역 오류:', e.error);
});