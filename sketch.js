let video;
let faceapi;
let detections = [];
let isModelReady = false;
let lastFrameTime = 0;
let fps = 0;

// 무드보드 21가지 감정 전체 매핑
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

function setup() {
    console.log('🚀 Setup 시작...');
    
    let canvas = createCanvas(640, 480);
    canvas.parent('sketch-holder');
    
    // 웹캠 시작
    video = createCapture(VIDEO, videoReady);
    video.size(640, 480);
    video.hide();
    
    console.log('📷 웹캠 초기화 중...');
}

function videoReady() {
    console.log('✅ 웹캠 준비 완료');
    
    // FaceAPI 모델 로드
    const faceOptions = {
        withLandmarks: true,
        withExpressions: true,
        withDescriptors: false,
        minConfidence: 0.5
    };
    
    console.log('🤖 FaceAPI 모델 로딩 시작...');
    
    faceapi = ml5.faceApi(video, faceOptions, modelReady);
}

function modelReady() {
    console.log('✅ 모델 로드 완료!');
    isModelReady = true;
    
    // 로딩 화면 숨기기
    document.getElementById('loading').style.display = 'none';
    
    // 얼굴 감지 시작
    faceapi.detect(gotFaces);
}

function gotFaces(error, result) {
    if (error) {
        console.error('❌ 감지 오류:', error);
        return;
    }
    
    detections = result;
    
    // 계속 감지
    faceapi.detect(gotFaces);
}

function draw() {
    // FPS 계산
    let currentTime = millis();
    if (currentTime - lastFrameTime > 0) {
        fps = floor(1000 / (currentTime - lastFrameTime));
        lastFrameTime = currentTime;
    }
    
    // 비디오 표시
    push();
    translate(width, 0);
    scale(-1, 1); // 좌우 반전
    image(video, 0, 0, width, height);
    pop();
    
    if (!isModelReady) {
        return;
    }
    
    // 얼굴 감지 결과 표시
    if (detections && detections.length > 0) {
        drawFaceDetections(detections);
        displayEmotions(detections);
        
        // 통계 업데이트
        document.getElementById('face-count').textContent = detections.length;
        document.getElementById('fps').textContent = fps;
    } else {
        // 얼굴 없음
        document.getElementById('emotion-display').innerHTML = 
            '<div class="no-face">얼굴이 감지되지 않았습니다<br><small>화면 중앙에 얼굴을 위치시켜주세요</small></div>';
        document.getElementById('face-count').textContent = '0';
        document.getElementById('dominant-emotion').textContent = '-';
        document.getElementById('fps').textContent = fps;
    }
}

function drawFaceDetections(detections) {
    for (let i = 0; i < detections.length; i++) {
        const alignedRect = detections[i].alignedRect;
        const x = width - alignedRect._box._x - alignedRect._box._width; // 좌우 반전 보정
        const y = alignedRect._box._y;
        const boxWidth = alignedRect._box._width;
        const boxHeight = alignedRect._box._height;
        
        // 얼굴 박스
        noFill();
        stroke(102, 126, 234);
        strokeWeight(3);
        rect(x, y, boxWidth, boxHeight);
        
        // 랜드마크 포인트
        const landmarks = detections[i].landmarks;
        
        if (landmarks) {
            // 주요 포인트 그리기
            drawLandmarks(landmarks._positions, '#00FF00');
            
            // 연결선 그리기
            drawFaceContour(landmarks._positions);
        }
    }
}

function drawLandmarks(positions, color) {
    fill(color);
    noStroke();
    
    for (let j = 0; j < positions.length; j++) {
        const x = width - positions[j]._x; // 좌우 반전 보정
        const y = positions[j]._y;
        circle(x, y, 3);
    }
}

function drawFaceContour(positions) {
    stroke('#FF0000');
    strokeWeight(2);
    noFill();
    
    // 얼굴 윤곽선 연결
    beginShape();
    for (let j = 0; j < positions.length; j++) {
        const x = width - positions[j]._x;
        const y = positions[j]._y;
        vertex(x, y);
    }
    endShape();
}

function displayEmotions(detections) {
    if (detections.length === 0) return;
    
    const expressions = detections[0].expressions;
    
    // 21가지 감정으로 확장 및 동적 변화
    let allEmotions = [];
    
    for (let baseEmotion in expressions) {
        const intensity = expressions[baseEmotion];
        
        if (emotionLibrary[baseEmotion]) {
            emotionLibrary[baseEmotion].forEach(emotion => {
                // 동적 변화를 위한 랜덤 요소 추가
                const randomFactor = 1 + (Math.random() - 0.5) * emotion.variance;
                const finalIntensity = intensity * emotion.base * randomFactor;
                
                allEmotions.push({
                    name: emotion.name,
                    korean: emotion.korean,
                    intensity: Math.min(Math.max(finalIntensity, 0), 1),
                    baseEmotion: baseEmotion
                });
            });
        }
    }
    
    // 강도순 정렬
    allEmotions.sort((a, b) => b.intensity - a.intensity);
    
    // 상위 8개 표시 (더 다양하게)
    const topEmotions = allEmotions.slice(0, 8);
    
    // 주요 감정
    if (topEmotions.length > 0) {
        document.getElementById('dominant-emotion').textContent = 
            `${topEmotions[0].korean} (${(topEmotions[0].intensity * 100).toFixed(0)}%)`;
    }
    
    // 감정 목록 HTML 생성
    let html = '';
    
    topEmotions.forEach((emotion, index) => {
        const percentage = (emotion.intensity * 100).toFixed(1);
        const opacity = 0.4 + (emotion.intensity * 0.6);
        const delay = index * 0.05;
        
        // 감정별 색상
        const colorMap = {
            'happy': '#FFD700',
            'sad': '#4A90E2',
            'angry': '#E74C3C',
            'fearful': '#9B59B6',
            'disgusted': '#95A5A6',
            'surprised': '#F39C12',
            'neutral': '#3498DB'
        };
        
        const color = colorMap[emotion.baseEmotion] || '#FFFFFF';
        
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
/* 기존 #loading 스타일 아래에 추가 */

.progress-bar {
    width: 200px;
    height: 8px;
    background: rgba(255, 255, 255, 0.2);
    border-radius: 10px;
    overflow: hidden;
    margin: 10px 0;
}

.progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #667eea, #764ba2);
    width: 0%;
    transition: width 0.3s ease;
    border-radius: 10px;
}

#loading-detail {
    font-size: 0.85rem;
    opacity: 0.7;
    margin-top: 5px;
}