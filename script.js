// --- Core Three.js Setup ---
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setClearColor(0x1a202c);
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
camera.position.z = 25;

// --- Lighting ---
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(0, 10, 10);
scene.add(directionalLight);

// --- Chithraguptan's 3D Body ---
const bodyParts = [], eyes = [], arms = [], legs = [], eyebrows = [];
let mouth;

// Head
const headGeometry = new THREE.SphereGeometry(2, 32, 32);
const headMaterial = new THREE.MeshLambertMaterial({ color: 0x32cd32 });
const head = new THREE.Mesh(headGeometry, headMaterial);
scene.add(head);
bodyParts.push(head);

// Eyes
const eyeGeometry = new THREE.SphereGeometry(0.4, 16, 16);
const eyeMaterial = new THREE.MeshLambertMaterial({ color: 0x000000 });
const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial.clone());
leftEye.position.set(-0.7, 0.5, 1.6);
head.add(leftEye);
eyes.push(leftEye);
const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial.clone());
rightEye.position.set(0.7, 0.5, 1.6);
head.add(rightEye);
eyes.push(rightEye);

// Mouth
const mouthGeometry = new THREE.TorusGeometry(0.8, 0.1, 8, 16, Math.PI);
const mouthMaterial = new THREE.MeshLambertMaterial({ color: 0x000000 });
mouth = new THREE.Mesh(mouthGeometry, mouthMaterial);
mouth.position.set(0, -0.6, 1.8);
mouth.rotation.x = -Math.PI / 16;
mouth.rotation.z = -Math.PI / 2;
head.add(mouth);

// Eyebrows
const eyebrowGeometry = new THREE.BoxGeometry(1, 0.15, 0.1);
const eyebrowMaterial = new THREE.MeshLambertMaterial({ color: 0x000000 });
const leftEyebrow = new THREE.Mesh(eyebrowGeometry, eyebrowMaterial.clone());
leftEyebrow.position.set(-0.7, 1.3, 1.8);
head.add(leftEyebrow);
eyebrows.push(leftEyebrow);
const rightEyebrow = new THREE.Mesh(eyebrowGeometry, eyebrowMaterial.clone());
rightEyebrow.position.set(0.7, 1.3, 1.8);
head.add(rightEyebrow);
eyebrows.push(rightEyebrow);

// Body segments with arms and legs
for (let i = 0; i < 10; i++) {
    const scale = 1.0 - (i / 10) * 0.5;
    const segmentRadius = 1 * scale;
    const bodyGeometry = new THREE.SphereGeometry(segmentRadius, 32, 32);
    const bodyMaterial = new THREE.MeshLambertMaterial({ color: 0x32cd32 });
    const bodySegment = new THREE.Mesh(bodyGeometry, bodyMaterial);
    const prevY = bodyParts[i] ? bodyParts[i].position.y : 0;
    const prevRadius = bodyParts[i] ? bodyParts[i].geometry.parameters.radius : 2;
    bodySegment.position.y = prevY - (prevRadius + segmentRadius + 0.5);
    scene.add(bodySegment);
    bodyParts.push(bodySegment);

    if (i === 0) {
        const armGeometry = new THREE.CylinderGeometry(0.2, 0.2, 1.5, 8);
        const armMaterial = new THREE.MeshLambertMaterial({ color: 0x32cd32 });
        const leftArm = new THREE.Mesh(armGeometry, armMaterial.clone());
        leftArm.position.set(-1.5, 0, 0);
        bodySegment.add(leftArm);
        arms.push(leftArm);
        const rightArm = new THREE.Mesh(armGeometry, armMaterial.clone());
        rightArm.position.set(1.5, 0, 0);
        bodySegment.add(rightArm);
        arms.push(rightArm);
    }
    if (i === 1) {
        const legGeometry = new THREE.CylinderGeometry(0.3, 0.3, 2, 8);
        const legMaterial = new THREE.MeshLambertMaterial({ color: 0x32cd32 });
        const leftLeg = new THREE.Mesh(legGeometry, legMaterial.clone());
        leftLeg.position.set(-1.2, -1, 0);
        leftLeg.rotation.z = Math.PI / 8;
        bodySegment.add(leftLeg);
        legs.push(leftLeg);
        const rightLeg = new THREE.Mesh(legGeometry, legMaterial.clone());
        rightLeg.position.set(1.2, -1, 0);
        rightLeg.rotation.z = -Math.PI / 8;
        bodySegment.add(rightLeg);
        legs.push(rightLeg);
    }
}

// --- Game State Variables ---
let controlMode = 'mouse';
let handTargetPos = new THREE.Vector3(0, 0, 0);
let mood = "content";
let lastMousePos = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
let mouseSpeed = 0;
let lastMovementTime = Date.now();
let clickCount = 0;
let lastClickTime = 0;
let angryTimer = 0;
let randomTarget = new THREE.Vector3(0, 0, 0);
let lastTargetChange = Date.now();
let llmIsLoading = false;

// UI elements
const moodDisplay = document.getElementById('mood-display');
const cheerUpBtn = document.getElementById('cheer-up-btn');
const llmResponseBox = document.getElementById('llm-response-box');
const llmResponseText = document.getElementById('llm-response-text');
const closeBtn = llmResponseBox.querySelector('.close-btn');
const controlSwitchBtn = document.getElementById('control-switch-btn');

const moodColors = { "bored": 0x646464, "content": 0x32CD32, "playful": 0x00ff00, "sad": 0x464696, "angry": 0xff3232 };

// --- LLM API Integration ---
async function getLlmResponse(prompt) {
    if (llmIsLoading) return;
    llmIsLoading = true;
    llmResponseBox.style.display = 'block';
    llmResponseText.innerText = 'Chithraguptan is thinking...';
    cheerUpBtn.disabled = true;

    const makeApiCall = async () => {
        let chatHistory = [];
        chatHistory.push({ role: "user", parts: [{ text: prompt }] });
        const payload = { contents: chatHistory };
        const apiKey = ""; // API key is handled by the environment
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`API request failed with status ${response.status}`);
        }
        return response.json();
    };

    let retries = 0;
    const maxRetries = 3;
    const initialDelay = 1000;

    while (retries < maxRetries) {
        try {
            const result = await makeApiCall();
            if (result.candidates && result.candidates.length > 0 &&
                result.candidates[0].content && result.candidates[0].content.parts &&
                result.candidates[0].content.parts.length > 0) {
                const text = result.candidates[0].content.parts[0].text;
                llmResponseText.innerText = text;
            } else {
                llmResponseText.innerText = "I'm not sure what to say right now.";
            }
            llmIsLoading = false;
            cheerUpBtn.disabled = false;
            return;
        } catch (error) {
            console.error(`API Error (Attempt ${retries + 1}):`, error);
            retries++;
            if (retries >= maxRetries) {
                llmResponseText.innerText = "An error occurred. Please try again.";
                llmIsLoading = false;
                cheerUpBtn.disabled = false;
                return;
            }
            const delay = initialDelay * Math.pow(2, retries - 1);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
}

// --- MediaPipe Hand Tracking Setup ---
const videoElement = document.querySelector('.input_video');
let hands, camera_mp;
let isHandTrackingActive = false;
let lastGestureTime = 0;

function detectGesture(landmarks) {
    const indexTip = landmarks[8];
    const thumbTip = landmarks[4];
    const middleTip = landmarks[12];
    const ringTip = landmarks[16];
    const pinkyTip = landmarks[20];

    const indexPip = landmarks[6];
    const middlePip = landmarks[10];
    const ringPip = landmarks[14];
    const pinkyPip = landmarks[18];
    const thumbCmc = landmarks[2];

    const pinchDistance = Math.sqrt(
        Math.pow(indexTip.x - thumbTip.x, 2) +
        Math.pow(indexTip.y - thumbTip.y, 2) +
        Math.pow(indexTip.z - thumbTip.z, 2)
    );

    const isFist = indexTip.y > indexPip.y &&
        middleTip.y > middlePip.y &&
        ringTip.y > ringPip.y &&
        pinkyTip.y > pinkyPip.y &&
        thumbTip.x < thumbCmc.x;

    const isOpenPalm = indexTip.y < indexPip.y &&
        middleTip.y < middlePip.y &&
        ringTip.y < ringPip.y &&
        pinkyTip.y < pinkyPip.y;

    if (isFist) {
        return 'fist';
    } else if (pinchDistance < 0.08) {
        return 'pinch';
    } else if (isOpenPalm) {
        return 'open_palm';
    } else {
        return 'point';
    }
}

function onResults(results) {
    if (controlMode !== 'hand') return;

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        const landmarks = results.multiHandLandmarks[0];

        // Update hand position for navigation
        const indexTip = landmarks[8];
        handTargetPos.set(
            (1 - indexTip.x) * 40 - 20,
            -(indexTip.y) * 40 + 20,
            0
        );
        lastMovementTime = Date.now();

        // Detect gesture
        const detectedGesture = detectGesture(landmarks);

        // Apply mood based on gesture (with debouncing)
        const now = Date.now();
        if (now - lastGestureTime > 500) { // 500ms debounce
            switch (detectedGesture) {
                case 'fist':
                    mood = "angry";
                    angryTimer = now;
                    break;
                case 'pinch':
                    mood = "playful";
                    break;
                case 'open_palm':
                    mood = "content";
                    break;
            }
            lastGestureTime = now;
        }
    }
}

async function startHandTracking() {
    try {
        hands = new Hands({
            locateFile: (file) => {
                return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
            }
        });

        hands.setOptions({
            maxNumHands: 1,
            modelComplexity: 1,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5
        });

        hands.onResults(onResults);

        camera_mp = new Camera(videoElement, {
            onFrame: async () => {
                await hands.send({ image: videoElement });
            },
            width: 640,
            height: 480
        });

        await camera_mp.start();
        isHandTrackingActive = true;
        videoElement.style.display = 'block';

    } catch (error) {
        console.error('Hand tracking initialization failed:', error);
        alert('Hand tracking failed to start. Please ensure camera permissions are granted.');
    }
}

function stopHandTracking() {
    if (camera_mp) {
        camera_mp.stop();
        isHandTrackingActive = false;
        videoElement.style.display = 'none';
    }
}

// --- Event Listeners ---
controlSwitchBtn.addEventListener('click', async () => {
    if (controlMode === 'mouse') {
        controlMode = 'hand';
        controlSwitchBtn.innerHTML = "Switch to Mouse Control 🖱️";
        await startHandTracking();
    } else {
        controlMode = 'mouse';
        controlSwitchBtn.innerHTML = "Switch to Hand Control 🖐️";
        stopHandTracking();
    }
});

window.addEventListener('mousemove', (event) => {
    if (controlMode !== 'mouse') return;
    const dx = event.clientX - lastMousePos.x;
    const dy = event.clientY - lastMousePos.y;
    mouseSpeed = Math.sqrt(dx * dx + dy * dy);
    lastMousePos = { x: event.clientX, y: event.clientY };
    lastMovementTime = Date.now();
});

window.addEventListener('mousedown', (event) => {
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(bodyParts, true);

    if (intersects.length > 0) {
        const now = Date.now();
        if (now - lastClickTime < 500) {
            clickCount++;
        } else {
            clickCount = 1;
        }
        lastClickTime = now;
    }
});

cheerUpBtn.addEventListener('click', () => {
    let prompt = "";
    switch (mood) {
        case "bored":
            prompt = "Provide a fun and engaging activity for a pet that seems bored. The response should be concise and no more than 20 words.";
            break;
        case "sad":
            prompt = "Generate a kind and uplifting message to comfort a pet that is sad. The response should be concise and no more than 20 words.";
            break;
        case "angry":
            prompt = "Offer a single, calming technique or piece of advice to soothe an angry pet. The response should be concise and no more than 20 words.";
            break;
        default:
            prompt = "Generate a short, playful, and fun fact about a lizard or gecko.";
            break;
    }
    getLlmResponse(prompt);
});

closeBtn.addEventListener('click', () => {
    llmResponseBox.style.display = 'none';
});

// --- Animation Loop ---
function animate() {
    requestAnimationFrame(animate);

    const now = Date.now();
    const timeSinceMovement = (now - lastMovementTime) / 1000;

    if (clickCount >= 3 && now - lastClickTime < 1500) {
        mood = "angry";
        angryTimer = now;
        clickCount = 0;
    }

    if (controlMode === 'mouse' || !isHandTrackingActive) {
        if (mood === "angry") {
            if (mouseSpeed < 5 && now - angryTimer > 3000) {
                mood = "content";
            } else if (now - angryTimer > 10000) {
                mood = "content";
            }
        } else if (mood === 'playful') {
            if (timeSinceMovement > 5) {
                mood = 'content';
            }
        } else {
            if (mouseSpeed > 50 && controlMode === 'mouse') {
                mood = "playful";
            } else if (timeSinceMovement > 15) {
                mood = "angry";
                angryTimer = now;
            } else if (timeSinceMovement > 10) {
                mood = "sad";
            } else if (timeSinceMovement > 3) {
                mood = "bored";
            } else {
                mood = "content";
            }
        }
    }

    moodDisplay.innerText = `Mood: ${mood.charAt(0).toUpperCase() + mood.slice(1)}`;

    // Position calculation
    const targetPosition = new THREE.Vector3();
    if (mood === "angry") {
        if (now - lastTargetChange > 2000) {
            randomTarget.set(
                (Math.random() - 0.5) * 50,
                (Math.random() - 0.5) * 50,
                (Math.random() - 0.5) * 50
            );
            lastTargetChange = now;
        }
        targetPosition.copy(randomTarget);
    } else {
        if (controlMode === 'mouse') {
            targetPosition.set(
                (lastMousePos.x / window.innerWidth) * 40 - 20,
                -(lastMousePos.y / window.innerHeight) * 40 + 20,
                0
            );
        } else {
            targetPosition.copy(handTargetPos);
        }
    }

    // Apply movement
    head.position.lerp(targetPosition, 0.05);
    for (let i = 1; i < bodyParts.length; i++) {
        bodyParts[i].position.lerp(bodyParts[i - 1].position, 0.1);
    }

    // Visual effects
    const pulse = 1 + Math.sin(now * 0.005) * 0.1;
    head.scale.set(pulse, pulse, pulse);
    const time = now * 0.01;

    // Mood-based animations
    if (mood === 'playful') {
        arms.forEach(arm => { arm.rotation.z = Math.sin(time * 2); });
        legs.forEach(leg => { leg.rotation.x = Math.sin(time); });
    } else if (mood === 'angry') {
        arms.forEach(arm => { arm.rotation.x = -Math.PI / 2; });
        legs.forEach(leg => { leg.rotation.x = 0; });
    } else {
        arms.forEach(arm => { arm.rotation.set(0, 0, 0); });
        legs.forEach(leg => {
            leg.rotation.set(0, 0, Math.PI / 8 * (leg.position.x > 0 ? -1 : 1));
        });
    }

    // Eye color changes
    const sadColor = new THREE.Color(0x5555ff);
    if (mood === 'sad') {
        eyes.forEach(eye => eye.material.color.lerp(sadColor, 0.1));
    } else {
        eyes.forEach(eye => eye.material.color.lerp(new THREE.Color(0x000000), 0.1));
    }

    // Facial expressions
    const smileRotationZ = -Math.PI / 2;
    const frownRotationZ = Math.PI / 2;

    switch (mood) {
        case 'content':
        case 'playful':
            mouth.rotation.z = smileRotationZ;
            mouth.scale.set(1, 1, 1);
            eyebrows.forEach(b => b.visible = false);
            break;
        case 'sad':
            mouth.rotation.z = frownRotationZ;
            mouth.scale.set(0.7, 1, 1);
            eyebrows.forEach(b => b.visible = true);
            eyebrows[0].rotation.z = -Math.PI / 8;
            eyebrows[1].rotation.z = Math.PI / 8;
            break;
        case 'angry':
            mouth.rotation.z = frownRotationZ;
            mouth.scale.set(1, 0.7, 1);
            eyebrows.forEach(b => b.visible = true);
            eyebrows[0].rotation.z = Math.PI / 8;
            eyebrows[1].rotation.z = -Math.PI / 8;
            break;
        case 'bored':
            mouth.rotation.z = smileRotationZ;
            mouth.scale.set(1, 0.1, 1);
            eyebrows.forEach(b => b.visible = false);
            break;
    }

    // Color changes
    const currentColor = new THREE.Color(head.material.color);
    const targetColor = new THREE.Color(moodColors[mood]);
    currentColor.lerp(targetColor, 0.05);

    bodyParts.forEach(part => {
        part.material.color.copy(currentColor);
        part.children.forEach(child => {
            if (child.isMesh && child.material) {
                if (eyes.indexOf(child) === -1 &&
                    child !== mouth &&
                    eyebrows.indexOf(child) === -1) {
                    child.material.color.copy(currentColor);
                }
            }
        });
    });

    renderer.render(scene, camera);
}

// Start animation loop
animate();

// Handle window resize
window.addEventListener('resize', () => {
    const newWidth = window.innerWidth;
    const newHeight = window.innerHeight;
    renderer.setSize(newWidth, newHeight);
    camera.aspect = newWidth / newHeight;
    camera.updateProjectionMatrix();
});
