/**
 * John - Educational Emotion Recognition
 * Multi-face detection with 21 emotions
 */

const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.12/model';

let video;
let canvas;
let displaySize;
let isModelLoaded = false;

// Current mode
let currentMode = 'analyze';

// Multi-face data
let allFaceData = [];

// Practice mode with 21 emotions
let targetEmotion = 'joy';
let practiceHistory = [];
const practiceEmotions = [
    'admiration', 'aggressiveness', 'amazement', 'annoyance', 'apprehension',
    'boredom', 'disappointment', 'disgust', 'ecstasy', 'grief',
    'interest', 'joy', 'optimism', 'pensiveness', 'rage',
    'sadness', 'surprise', 'tears of joy', 'terror', 'trust', 'vigilance'
];
let currentPracticeIndex = 11; // Start with 'joy'

// Emotion images mapping (21 emotions)
const emotionImages = {
    'admiration': 'emotions/admiration.png',
    'aggressiveness': 'emotions/aggressiveness.png',
    'amazement': 'emotions/amazement.png',
    'annoyance': 'emotions/annoyance.png',
    'apprehension': 'emotions/apprehension.png',
    'boredom': 'emotions/boredom.png',
    'disappointment': 'emotions/disappointment.png',
    'disgust': 'emotions/disgust.png',
    'ecstasy': 'emotions/ecstasy.png',
    'grief': 'emotions/grief.png',
    'interest': 'emotions/interest.png',
    'joy': 'emotions/joy.png',
    'optimism': 'emotions/optimism.png',
    'pensiveness': 'emotions/pensiveness.png',
    'rage': 'emotions/rage.png',
    'sadness': 'emotions/sadness.png',
    'surprise': 'emotions/surprise.png',
    'tears of joy': 'emotions/tears_of_joy.png',
    'terror': 'emotions/terror.png',
    'trust': 'emotions/trust.png',
    'vigilance': 'emotions/vigilance.png'
};

// Timeline data
let timelineData = [];
let timelineStartTime = Date.now();
let timelineChart = null;
let lastDominantEmotion = null;
let emotionChangeCount = 0;

// 21 Emotion Library
const emotionLibrary = {
    'neutral': [
        { name: 'trust', weight: 0.3 },
        { name: 'pensiveness', weight: 0.25 },
        { name: 'interest', weight: 0.2 },
        { name: 'admiration', weight: 0.15 }
    ],
    'happy': [
        { name: 'joy', weight: 0.4 },
        { name: 'optimism', weight: 0.3 },
        { name: 'ecstasy', weight: 0.2 },
        { name: 'tears of joy', weight: 0.15 }
    ],
    'sad': [
        { name: 'sadness', weight: 0.35 },
        { name: 'grief', weight: 0.25 },
        { name: 'pensiveness', weight: 0.2 },
        { name: 'disappointment', weight: 0.15 }
    ],
    'angry': [
        { name: 'anger', weight: 0.35 },
        { name: 'rage', weight: 0.3 },
        { name: 'annoyance', weight: 0.25 },
        { name: 'aggressiveness', weight: 0.15 }
    ],
    'fearful': [
        { name: 'fear', weight: 0.35 },
        { name: 'terror', weight: 0.3 },
        { name: 'apprehension', weight: 0.25 },
        { name: 'vigilance', weight: 0.2 }
    ],
    'disgusted': [
        { name: 'disgust', weight: 0.4 },
        { name: 'boredom', weight: 0.3 }
    ],
    'surprised': [
        { name: 'surprise', weight: 0.4 },
        { name: 'amazement', weight: 0.3 }
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

const faceColors = ['#517bf2', '#FF6B6B', '#4CAF50', '#FFA726', '#9C27B0'];

// Initialize
async function init() {
    console.log('🚀 Initializing multi-face detection...');
    updateProgress(10, 'Starting webcam...');
    
    video = document.getElementById('video');
    canvas = document.getElementById('overlay');
    
    // Mode selector events
    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.addEventListener('click', () => switchMode(btn.dataset.mode));
    });
    
    // Practice mode button
    document.getElementById('next-emotion-btn').addEventListener('click', nextPracticeEmotion);
    
    // Timeline reset
    document.getElementById('timeline-reset').addEventListener('click', resetTimeline);
    
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { width: 640, height: 480 } 
        });
        
        video.srcObject = stream;
        console.log('✅ Webcam connected');
        
        video.addEventListener('play', () => {
            const videoWidth = video.videoWidth;
            const videoHeight = video.videoHeight;
            
            canvas.width = videoWidth;
            canvas.height = videoHeight;
            
            displaySize = { width: videoWidth, height: videoHeight };
            
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
    
    try {
        await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
        updateProgress(60, 'Loading landmark model...');
        
        await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
        updateProgress(80, 'Loading expression model...');
        
        await faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL);
        
        updateProgress(100, 'Complete!');
        
        setTimeout(() => {
            document.getElementById('loading').style.display = 'none';
            isModelLoaded = true;
            initTimeline();
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

// Mode switching
function switchMode(mode) {
    currentMode = mode;
    
    // Update buttons
    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.mode === mode);
    });
    
    // Update panels
    document.querySelectorAll('.mode-panel').forEach(panel => {
        panel.classList.remove('active');
    });
    document.getElementById(`${mode}-panel`).classList.add('active');
}

// Face Detection Loop
async function detectFaces() {
    if (!isModelLoaded) return;
    
    try {
        // Detect ALL faces
        const detections = await faceapi
            .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
            .withFaceLandmarks()
            .withFaceExpressions();
        
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        const faceCount = Math.min(detections.length, 5); // Max 5 faces
        
        if (faceCount > 0) {
            const resizedDetections = faceapi.resizeResults(detections.slice(0, 5), displaySize);
            
            // Draw all faces
            drawMultipleFaces(resizedDetections);
            
            // Analyze all faces
            allFaceData = analyzeMultipleFaces(resizedDetections);
            
            // Update display based on mode
            updateDisplay();
            
            // Update face count
            document.getElementById('face-count-display').textContent = `${faceCount} face${faceCount > 1 ? 's' : ''} detected`;
            
        } else {
            showNoFace();
        }
        
    } catch (err) {
        console.error('❌ Detection error:', err);
    }
    
    setTimeout(() => detectFaces(), 100);
}

// Draw multiple faces with different colors
function drawMultipleFaces(detections) {
    const ctx = canvas.getContext('2d');
    
    detections.forEach((detection, index) => {
        const color = faceColors[index % faceColors.length];
        const box = detection.detection.box;
        
        // Face box
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.strokeRect(box.x, box.y, box.width, box.height);
        
        // Face number label
        ctx.fillStyle = color;
        ctx.font = 'bold 20px Arial';
        ctx.fillText(`#${index + 1}`, box.x, box.y - 5);
        
        // Landmarks (subtle)
        const landmarks = detection.landmarks.positions;
        ctx.fillStyle = color;
        landmarks.forEach(point => {
            ctx.beginPath();
            ctx.arc(point.x, point.y, 1, 0, 2 * Math.PI);
            ctx.fill();
        });
    });
}

// Analyze multiple faces
function analyzeMultipleFaces(detections) {
    return detections.map((detection, index) => {
        const expressions = detection.expressions;
        
        // Get dominant emotion
        let dominant = { type: 'neutral', value: 0 };
        for (let emotion in expressions) {
            if (expressions[emotion] > dominant.value) {
                dominant = { type: emotion, value: expressions[emotion] };
            }
        }
        
        // Get top 3 extended emotions
        let allEmotions = [];
        if (emotionLibrary[dominant.type]) {
            emotionLibrary[dominant.type].forEach(emotion => {
                allEmotions.push({
                    name: emotion.name,
                    intensity: dominant.value * emotion.weight,
                    baseEmotion: dominant.type
                });
            });
        }
        
        allEmotions.sort((a, b) => b.intensity - a.intensity);
        
        return {
            id: index + 1,
            color: faceColors[index % faceColors.length],
            dominant: dominant,
            topEmotions: allEmotions.slice(0, 3),
            expressions: expressions
        };
    });
}

// Update display based on current mode
function updateDisplay() {
    switch(currentMode) {
        case 'analyze':
            updateAnalyzeMode();
            break;
        case 'practice':
            updatePracticeMode();
            break;
        case 'compare':
            updateCompareMode();
            break;
        case 'timeline':
            updateTimelineMode();
            break;
    }
}

// Analyze Mode
function updateAnalyzeMode() {
    const facesList = document.getElementById('faces-list');
    
    if (allFaceData.length === 0) {
        facesList.innerHTML = '<div class="no-face-message"><p>Waiting for faces...</p><small>Position 1-5 people in camera view</small></div>';
        return;
    }
    
    // Display individual faces
    let html = '';
    allFaceData.forEach(face => {
        html += `
            <div class="face-card" style="border-left: 4px solid ${face.color}">
                <div class="face-header">
                    <span class="face-id" style="color: ${face.color}">Person #${face.id}</span>
                    <span class="face-emotion">${face.topEmotions[0].name}</span>
                </div>
                <div class="face-emotions">
                    ${face.topEmotions.slice(0, 3).map(e => `
                        <div class="emotion-mini">
                            <span>${e.name}</span>
                            <span>${(e.intensity * 100).toFixed(0)}%</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    });
    
    facesList.innerHTML = html;
    
    // Group statistics
    updateGroupStats();
}

// Group Statistics
function updateGroupStats() {
    if (allFaceData.length === 0) return;
    
    // Aggregate emotions
    const emotionCounts = {};
    allFaceData.forEach(face => {
        const emotion = face.dominant.type;
        emotionCounts[emotion] = (emotionCounts[emotion] || 0) + 1;
    });
    
    // Create bars
    const barsHtml = Object.entries(emotionCounts)
        .sort((a, b) => b[1] - a[1])
        .map(([emotion, count]) => {
            const percentage = (count / allFaceData.length) * 100;
            return `
                <div class="emotion-bar">
                    <div class="bar-label">${emotion}</div>
                    <div class="bar-track">
                        <div class="bar-fill" style="width: ${percentage}%; background: ${emotionColors[emotion]}"></div>
                    </div>
                    <div class="bar-value">${count}</div>
                </div>
            `;
        }).join('');
    
    document.getElementById('group-emotion-bars').innerHTML = barsHtml;
    
    // Most common emotion
    const mostCommon = Object.entries(emotionCounts).sort((a, b) => b[1] - a[1])[0];
    document.getElementById('most-common-emotion').textContent = mostCommon ? mostCommon[0] : '-';
    
    // Diversity score (unique emotions / total people)
    const diversity = ((Object.keys(emotionCounts).length / allFaceData.length) * 100).toFixed(0);
    document.getElementById('diversity-score').textContent = `${diversity}%`;
}

// Practice Mode - 21 emotions
function updatePracticeMode() {
    if (allFaceData.length === 0) {
        document.getElementById('practice-score').textContent = '0%';
        document.getElementById('practice-progress').style.width = '0%';
        document.getElementById('practice-feedback').textContent = 'Position your face to start practice!';
        return;
    }
    
    // Use first face for practice
    const face = allFaceData[0];
    
    // Calculate match score based on target emotion
    let matchScore = 0;
    
    // Map 21 emotions to base emotions for scoring
    const emotionToBase = {
        'admiration': 'neutral',
        'aggressiveness': 'angry',
        'amazement': 'surprised',
        'annoyance': 'angry',
        'apprehension': 'fearful',
        'boredom': 'disgusted',
        'disappointment': 'sad',
        'disgust': 'disgusted',
        'ecstasy': 'happy',
        'grief': 'sad',
        'interest': 'neutral',
        'joy': 'happy',
        'optimism': 'happy',
        'pensiveness': 'sad',
        'rage': 'angry',
        'sadness': 'sad',
        'surprise': 'surprised',
        'tears of joy': 'happy',
        'terror': 'fearful',
        'trust': 'neutral',
        'vigilance': 'fearful'
    };
    
    const targetBase = emotionToBase[targetEmotion];
    matchScore = (face.expressions[targetBase] || 0) * 100;
    
    // Update display
    document.getElementById('practice-score').textContent = `${matchScore.toFixed(0)}%`;
    document.getElementById('practice-progress').style.width = `${matchScore}%`;
    
    // Feedback
    let feedback = '';
    if (matchScore > 80) {
        feedback = '🎉 Excellent! Perfect expression!';
    } else if (matchScore > 60) {
        feedback = '👍 Good job! Almost there!';
    } else if (matchScore > 40) {
        feedback = '😊 Getting better! Keep trying!';
    } else {
        feedback = '💪 Try to express the emotion more clearly!';
    }
    document.getElementById('practice-feedback').textContent = feedback;
}

function nextPracticeEmotion() {
    currentPracticeIndex = (currentPracticeIndex + 1) % practiceEmotions.length;
    targetEmotion = practiceEmotions[currentPracticeIndex];
    
    // Update image
    const imgElement = document.getElementById('target-emotion-img');
    if (imgElement) {
        imgElement.src = emotionImages[targetEmotion];
        imgElement.alt = targetEmotion;
    }
    
    // Update text (capitalize first letter)
    const displayName = targetEmotion.charAt(0).toUpperCase() + targetEmotion.slice(1);
    document.getElementById('target-emotion').textContent = displayName;
    
    // Add to history
    if (allFaceData.length > 0) {
        const score = document.getElementById('practice-score').textContent;
        practiceHistory.unshift({ emotion: displayName, score: score });
        practiceHistory = practiceHistory.slice(0, 5);
        
        updatePracticeHistory();
    }
}

function updatePracticeHistory() {
    const html = practiceHistory.map(item => `
        <div class="history-item">
            <span>${item.emotion}</span>
            <span class="history-score">${item.score}</span>
        </div>
    `).join('');
    
    document.getElementById('practice-history').innerHTML = html || '<p style="opacity: 0.6;">No attempts yet</p>';
}

// Compare Mode
function updateCompareMode() {
    const grid = document.getElementById('comparison-grid');
    
    if (allFaceData.length < 2) {
        grid.innerHTML = '<div class="no-comparison"><p>Need at least 2 faces to compare</p></div>';
        document.getElementById('comparison-insights-text').textContent = 'Position multiple people to see comparisons';
        return;
    }
    
    // Create comparison cards
    let html = '';
    allFaceData.forEach(face => {
        const displayName = face.topEmotions[0].name.charAt(0).toUpperCase() + face.topEmotions[0].name.slice(1);
        html += `
            <div class="compare-card" style="border-top: 3px solid ${face.color}">
                <div class="compare-header">Person #${face.id}</div>
                <div class="compare-emotion-name">${displayName}</div>
                <div class="compare-percentage">${(face.dominant.value * 100).toFixed(0)}%</div>
            </div>
        `;
    });
    
    grid.innerHTML = html;
    
    // Insights
    const emotions = allFaceData.map(f => f.dominant.type);
    const unique = [...new Set(emotions)];
    
    let insights = '';
    if (unique.length === 1) {
        insights = `All ${allFaceData.length} people are feeling ${unique[0]}! Strong emotional synchrony.`;
    } else if (unique.length === allFaceData.length) {
        insights = `Everyone is experiencing different emotions. High emotional diversity!`;
    } else {
        insights = `Mix of emotions detected. ${unique.length} different emotional states among ${allFaceData.length} people.`;
    }
    
    document.getElementById('comparison-insights-text').textContent = insights;
}

// Timeline Mode
function initTimeline() {
    const ctx = document.getElementById('timeline-chart').getContext('2d');
    
    timelineChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'Happy',
                    data: [],
                    borderColor: emotionColors.happy,
                    backgroundColor: emotionColors.happy + '33',
                    tension: 0.4
                },
                {
                    label: 'Sad',
                    data: [],
                    borderColor: emotionColors.sad,
                    backgroundColor: emotionColors.sad + '33',
                    tension: 0.4
                },
                {
                    label: 'Angry',
                    data: [],
                    borderColor: emotionColors.angry,
                    backgroundColor: emotionColors.angry + '33',
                    tension: 0.4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: { color: '#fff' }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 1,
                    ticks: { color: '#fff' },
                    grid: { color: 'rgba(255,255,255,0.1)' }
                },
                x: {
                    ticks: { color: '#fff' },
                    grid: { color: 'rgba(255,255,255,0.1)' }
                }
            }
        }
    });
}

function updateTimelineMode() {
    if (allFaceData.length === 0) return;
    
    // Record data every ~2 seconds
    const now = Date.now();
    const elapsed = Math.floor((now - timelineStartTime) / 1000);
    
    if (timelineData.length === 0 || elapsed > timelineData[timelineData.length - 1].time + 2) {
        // Average emotions across all faces
        const avgEmotions = {
            happy: 0,
            sad: 0,
            angry: 0
        };
        
        allFaceData.forEach(face => {
            avgEmotions.happy += face.expressions.happy || 0;
            avgEmotions.sad += face.expressions.sad || 0;
            avgEmotions.angry += face.expressions.angry || 0;
        });
        
        Object.keys(avgEmotions).forEach(key => {
            avgEmotions[key] /= allFaceData.length;
        });
        
        timelineData.push({
            time: elapsed,
            ...avgEmotions
        });
        
        // Update chart
        if (timelineChart) {
            timelineChart.data.labels.push(elapsed + 's');
            timelineChart.data.datasets[0].data.push(avgEmotions.happy);
            timelineChart.data.datasets[1].data.push(avgEmotions.sad);
            timelineChart.data.datasets[2].data.push(avgEmotions.angry);
            
            // Keep last 30 points
            if (timelineChart.data.labels.length > 30) {
                timelineChart.data.labels.shift();
                timelineChart.data.datasets.forEach(ds => ds.data.shift());
            }
            
            timelineChart.update('none');
        }
        
        // Update stats
        document.getElementById('timeline-duration').textContent = `Duration: ${elapsed}s`;
        
        // Track dominant emotion changes
        const currentDominant = allFaceData[0].dominant.type;
        if (lastDominantEmotion && lastDominantEmotion !== currentDominant) {
            emotionChangeCount++;
        }
        lastDominantEmotion = currentDominant;
        
        document.getElementById('emotion-changes').textContent = emotionChangeCount;
        
        // Calculate peak and average
        if (timelineData.length > 0) {
            let peakEmotion = 'happy';
            let peakValue = 0;
            
            ['happy', 'sad', 'angry'].forEach(emotion => {
                const maxVal = Math.max(...timelineData.map(d => d[emotion]));
                if (maxVal > peakValue) {
                    peakValue = maxVal;
                    peakEmotion = emotion;
                }
            });
            
            document.getElementById('peak-emotion').textContent = peakEmotion;
            document.getElementById('avg-emotion').textContent = currentDominant;
        }
    }
}

function resetTimeline() {
    timelineData = [];
    timelineStartTime = Date.now();
    emotionChangeCount = 0;
    lastDominantEmotion = null;
    
    if (timelineChart) {
        timelineChart.data.labels = [];
        timelineChart.data.datasets.forEach(ds => ds.data = []);
        timelineChart.update();
    }
    
    document.getElementById('timeline-duration').textContent = 'Duration: 0s';
    document.getElementById('peak-emotion').textContent = '-';
    document.getElementById('avg-emotion').textContent = '-';
    document.getElementById('emotion-changes').textContent = '0';
}

function showNoFace() {
    document.getElementById('face-count-display').textContent = '0 faces detected';
    
    if (currentMode === 'analyze') {
        document.getElementById('faces-list').innerHTML = '<div class="no-face-message"><p>Waiting for faces...</p><small>Position 1-5 people in camera view</small></div>';
        document.getElementById('group-emotion-bars').innerHTML = '';
        document.getElementById('most-common-emotion').textContent = '-';
        document.getElementById('diversity-score').textContent = '-';
    }
}

// Start
window.addEventListener('load', init);
