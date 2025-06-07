// SETTINGS AND CONFIGURATION
const settings = {
    physics: {
        gravityY: 0,
        wireframes: false,
        background: 'white'
    },
    whisking: {
        maxProgress: 100,
        baseWaveFrequency: 0.10,
        amplitudeGrowthRate: 0.35,
        initialWaveAmplitude: 20,
        progressIncrement: 0.1,
        longPressDuration: 1000
    },
    eggWhite: {
        size: 50,
        color: 'black',
        initialFrictionAir: 0.01,
        restitution: 0.5,
        maxFrictionAir: 0.5
    },
    constraint: {
        initialStiffness: 0.05,
        minStiffness: 0.001
    },
    logging: {
        maxDataPoints: 3600 // 60 seconds at 60 FPS
    }
};

const state = {
    // Engine and render objects
    engine: null,
    render: null,
    mouse: null,
    mouseConstraint: null,
    
    // Physical objects
    eggWhite: null,
    centerPoint: null,
    orbitConstraint: null,
    
    // Canvas dimensions
    centerX: 0,
    centerY: 0,
    radius: 150,
    
    // Whisking state
    isDragging: false,
    baseProgress: 0,
    whiskingProgress: 0,
    waveAmplitude: settings.whisking.initialWaveAmplitude,
    timeElapsed: 0,
    lastAngle: null,
    
    // Mouse tracking
    lastMouseX: null,
    lastMouseY: null,
    lastMouseTime: null,
    
    // Timing and metrics
    dragStartTime: null,
    pauseStartTime: null,
    pauseDurations: [],
    touchStartTime: null,
    
    // Data collection
    logs: [],
    cursorTrackData: [],
    speedBuckets: {},
    progressBuckets: {},
    lastLoggedBucket: -1,
    lastLoggedProgressBucket: -1,
    
    // UI elements
    logDiv: null,
    copyButton: null,
    
    // Wave data for visualization
    waveData: { times: [], progress: [] }
};

// SETUP FUNCTIONS

function setupMatterJS() {
    //  Matter.js modules
    // @ts-ignore
    const { Engine, Render, World, Bodies, Constraint, Mouse, MouseConstraint } = Matter;
    
    // create engine
    state.engine = Engine.create();
    // @ts-ignore
    state.engine.world.gravity.y = settings.physics.gravityY;
    
    //  center position
    // @ts-ignore
    state.centerX = window.innerWidth / 2;
    // @ts-ignore
    state.centerY = window.innerHeight / 2;
    
    state.render = Render.create({
        // @ts-ignore
        element: document.body,
        engine: state.engine,
        options: {
            // @ts-ignore
            width: window.innerWidth,
            // @ts-ignore
            height: window.innerHeight,
            wireframes: settings.physics.wireframes,
            background: settings.physics.background
        }
    });
    
    // create square
    state.eggWhite = Bodies.rectangle(
        state.centerX + state.radius, 
        state.centerY, 
        settings.eggWhite.size, 
        settings.eggWhite.size, 
        {
            render: { fillStyle: settings.eggWhite.color },
            frictionAir: settings.eggWhite.initialFrictionAir,
            restitution: settings.eggWhite.restitution
        }
    );
    // @ts-ignore
    state.eggWhite.originalFrictionAir = state.eggWhite.frictionAir;
    
    //  center point and constraint
    state.centerPoint = Bodies.circle(
        state.centerX, 
        state.centerY, 
        5, 
        { 
            isStatic: true, 
            render: { fillStyle: 'white' } 
        }
    );
    
    state.orbitConstraint = Constraint.create({
        bodyA: state.centerPoint,
        bodyB: state.eggWhite,
        length: state.radius,
        stiffness: 0,
        render: { visible: false }
    });
    
    // add bodies to world
    // @ts-ignore
    World.add(state.engine.world, [
        state.eggWhite, 
        state.centerPoint, 
        state.orbitConstraint
    ]);
    
    //  mouse control
    // @ts-ignore
    state.mouse = Mouse.create(state.render.canvas);
    state.mouseConstraint = MouseConstraint.create(state.engine, {
        mouse: state.mouse,
        constraint: {
            stiffness: settings.constraint.initialStiffness,
            render: { visible: false }
        }
    });
    // @ts-ignore
    state.mouseConstraint.constraint.originalStiffness = state.mouseConstraint.constraint.stiffness;
    
    // @ts-ignore
    World.add(state.engine.world, state.mouseConstraint);
}

function setupUI() {
    // create log display
    // @ts-ignore
    state.logDiv = document.createElement('div');
    // @ts-ignore
    state.logDiv.id = 'metricsLog';
    // @ts-ignore
    state.logDiv.style.position = 'absolute';
    // @ts-ignore
    state.logDiv.style.top = '0';
    // @ts-ignore
    state.logDiv.style.left = '0';
    // @ts-ignore
    state.logDiv.style.background = '#f0f0f0';
    // @ts-ignore
    state.logDiv.style.color = 'black';
    // @ts-ignore
    state.logDiv.style.padding = '10px';
    // @ts-ignore
    state.logDiv.style.maxHeight = '200px';
    // @ts-ignore
    state.logDiv.style.overflowY = 'scroll';
    // @ts-ignore
    state.logDiv.style.display = 'none';
    // @ts-ignore
    state.logDiv.style.zIndex = '1000';
    // @ts-ignore
    state.logDiv.style.fontSize = '12px';
    // @ts-ignore
    state.logDiv.style.border = '1px solid #ccc';
    // @ts-ignore
    document.body.appendChild(state.logDiv);
    
    // create copy button
    // @ts-ignore
    state.copyButton = document.createElement('button');
    // @ts-ignore
    state.copyButton.innerText = 'Copy Logs';
    // @ts-ignore
    state.copyButton.style.position = 'absolute';
    // @ts-ignore
    state.copyButton.style.top = '220px';
    // @ts-ignore
    state.copyButton.style.left = '0';
    // @ts-ignore
    state.copyButton.style.padding = '5px';
    // @ts-ignore
    state.copyButton.style.fontSize = '12px';
    // @ts-ignore
    document.body.appendChild(state.copyButton);
    
    // @ts-ignore
    state.copyButton.addEventListener('click', () => {
        const logText = state.logs.join('\n');
        // @ts-ignore
        navigator.clipboard.writeText(logText).then(() => {
            // @ts-ignore
            alert('Logs copied to clipboard!');
        }).catch(err => {
            // @ts-ignore
            alert('Failed to copy logs: ' + err);
        });
    });
}

function setupEventListeners() {
    // @ts-ignore
    const { Events, Body } = Matter;
    // @ts-ignore
    const canvas = document.querySelector('canvas');
    
    // Mouse events for dragging
    Events.on(state.mouseConstraint, 'mousedown', () => {
        // @ts-ignore
        if (state.mouseConstraint.body === state.eggWhite) {
            // @ts-ignore
            state.dragStartTime = performance.now();
            if (state.pauseStartTime) {
                // @ts-ignore
                const pauseDuration = (performance.now() - state.pauseStartTime) / 1000;
                // @ts-ignore
                state.pauseDurations.push(pauseDuration);
                state.pauseStartTime = null;
            }
        }
    });
    
    Events.on(state.mouseConstraint, 'mouseup', () => {
        if (state.isDragging) {
            endDrag();
        }
    });
    
    Events.on(state.mouseConstraint, 'enddrag', () => {
        if (state.isDragging) {
            endDrag();
        }
    });
    
    // Circle outline rendering
    Events.on(state.render, 'afterRender', () => {
        // @ts-ignore
        const context = state.render.context;
        context.beginPath();
        context.arc(state.centerX, state.centerY, state.radius, 0, 2 * Math.PI);
        context.strokeStyle = 'rgba(0, 0, 0, 0.02)';
        context.lineWidth = 40;
        context.stroke();
    });
    
    // Physics update
    Events.on(state.engine, 'afterUpdate', updateSimulation);
    
    // Keyboard shortcuts for logging
    // @ts-ignore
    document.addEventListener('keydown', (event) => {
        switch (event.key) {
            case 'c':
                logUserNotice();
                break;
            case 'd':
                outputAnalytics();
                break;
        }
    });
}

function endDrag() {
    // @ts-ignore
    const { performance } = window;
    
    state.isDragging = false;
    state.lastAngle = null;
    
    if (state.dragStartTime) {
        const dragDuration = (performance.now() - state.dragStartTime) / 1000;
        const progressPercent = (state.whiskingProgress / settings.whisking.maxProgress) * 100;
        const currentBucket = Math.floor(progressPercent);
        
        if (!state.speedBuckets[currentBucket]) {
            state.speedBuckets[currentBucket] = { totalDuration: 0, count: 0 };
        }
        
        state.speedBuckets[currentBucket].totalDuration += dragDuration;
        state.speedBuckets[currentBucket].count++;
        
        log(`${getTimestamp()} - Drag duration: ${dragDuration.toFixed(2)} s at ${currentBucket}%`);
        state.dragStartTime = null;
    }
    
    state.pauseStartTime = performance.now();
}

// UPDATE FUNCTIONS

function updateSimulation() {
    // @ts-ignore
    const { Body } = Matter;
    // @ts-ignore
    const now = performance.now();
    
    // Update time tracking
    state.timeElapsed += 1 / 60;
    
    // Increase wave amplitude over time for growing waves
    state.waveAmplitude = settings.whisking.initialWaveAmplitude + 
                         settings.whisking.amplitudeGrowthRate * state.timeElapsed;
    
    // Calculate angle from center
    // @ts-ignore
    const dx = state.eggWhite.position.x - state.centerX;
    // @ts-ignore
    const dy = state.eggWhite.position.y - state.centerY;
    const currentAngle = Math.atan2(dy, dx);
    
    // Default speed - will be updated if we have previous mouse positions
    let speed = 0;
    
    // @ts-ignore
    if (state.mouseConstraint.body === state.eggWhite) {
        // Handle active dragging
        handleActiveDragging(currentAngle, now, speed);
    } else if (state.isDragging) {
        // Handle continued state updates when mouse released but still dragging
        handleContinuedDragging(speed);
    }
}

function handleActiveDragging(currentAngle, now, speed) {
    // @ts-ignore
    const { Body } = Matter;
    
    state.isDragging = true;
    
    if (state.lastAngle !== null) {
        // Calculate angle difference
        let angleDiff = currentAngle - state.lastAngle;
        if (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
        if (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
        
        // update progress
        state.baseProgress += Math.abs(angleDiff) * settings.whisking.progressIncrement;
        if (state.baseProgress > settings.whisking.maxProgress) {
            state.baseProgress = settings.whisking.maxProgress;
        }
        
        // calculate dynamic wave properties
        const dynamicAmplitude = state.waveAmplitude * (0.5 + 0.5 * Math.sin(0.02 * state.timeElapsed * 2 * Math.PI));
        const waveOffset = dynamicAmplitude * Math.sin(settings.whisking.baseWaveFrequency * state.timeElapsed * 2 * Math.PI);
        
        // update whisking progress with wave effect
        state.whiskingProgress = Math.max(0, Math.min(settings.whisking.maxProgress, state.baseProgress + waveOffset));
        
        // calculate speed if we have previous mouse positions
        if (state.lastMouseX !== null && state.lastMouseY !== null && state.lastMouseTime !== null) {
            // @ts-ignore
            const dx = state.mouse.position.x - state.lastMouseX;
            // @ts-ignore
            const dy = state.mouse.position.y - state.lastMouseY;
            const dt = (now - state.lastMouseTime) / 1000;
            
            if (dt > 0) {
                const distance = Math.sqrt(dx * dx + dy * dy);
                speed = distance / dt;
            }
        }
        
        // update progress buckets for metrics
        updateMetrics(speed, waveOffset);
    }
    
    // Store current angle for next frame
    state.lastAngle = currentAngle;
    
    // Calculate progress ratio
    const progressRatio = state.whiskingProgress / settings.whisking.maxProgress;
    
    // @ts-ignore
    state.eggWhite.frictionAir = settings.eggWhite.initialFrictionAir + 0.99 * progressRatio;
    
    const angularDamping = 0.3;
    // @ts-ignore
    Body.setAngularVelocity(state.eggWhite, state.eggWhite.angularVelocity * angularDamping);
    
    if (state.whiskingProgress >= settings.whisking.maxProgress) {
        Body.setAngularVelocity(state.eggWhite, 0);
        // @ts-ignore
        state.eggWhite.frictionAir = settings.eggWhite.maxFrictionAir;
    }
    
    // Update constraint stiffness
    // @ts-ignore
    state.mouseConstraint.constraint.stiffness = settings.constraint.initialStiffness - 
                                               (settings.constraint.initialStiffness - settings.constraint.minStiffness) * progressRatio;

    // @ts-ignore
    
    // @ts-ignore
    state.cursorTrackData.push({
        // @ts-ignore
        timestamp: performance.now(),
        whiskingProgress: state.whiskingProgress,
        mouseSpeed: speed,
    });
    
    // @ts-ignore
    state.lastMouseX = state.mouse.position.x;
    // @ts-ignore
    state.lastMouseY = state.mouse.position.y;
    state.lastMouseTime = now;
}

function handleContinuedDragging(speed) {
    // @ts-ignore
    const { Body } = Matter;
    
    // calculate dynamic wave effect
    const dynamicAmplitude = state.waveAmplitude * (0.5 + 0.5 * Math.sin(0.02 * state.timeElapsed * 2 * Math.PI));
    const waveOffset = dynamicAmplitude * Math.sin(settings.whisking.baseWaveFrequency * state.timeElapsed * 2 * Math.PI);
    
    // update whisking progress with wave effect
    state.whiskingProgress = Math.max(0, Math.min(settings.whisking.maxProgress, state.baseProgress + waveOffset));
    
    // calculate progress ratio
    const progressRatio = state.whiskingProgress / settings.whisking.maxProgress;
    
    // @ts-ignore
    state.eggWhite.frictionAir = settings.eggWhite.initialFrictionAir + 0.49 * progressRatio;
    // @ts-ignore
    state.mouseConstraint.constraint.stiffness = settings.constraint.initialStiffness - 
                                               (settings.constraint.initialStiffness - settings.constraint.minStiffness) * progressRatio;
    
    if (state.whiskingProgress >= settings.whisking.maxProgress) {
        Body.setAngularVelocity(state.eggWhite, 0);
    }
    
    updateMetrics(speed, waveOffset);
    
    //cCalculate extra metrics for specific progress percentage
    const progressPercent = (state.whiskingProgress / settings.whisking.maxProgress) * 100;
    const currentBucket = Math.floor(progressPercent);
    
    // initialize bucket if needed
    if (!state.speedBuckets[currentBucket]) {
        state.speedBuckets[currentBucket] = { 
            totalSpeed: 0, 
            totalAngularVelocity: 0, 
            totalDeviation: 0, 
            totalEffort: 0, 
            count: 0 
        };
    }
    
    // Update bucket with metrics
    state.speedBuckets[currentBucket].totalSpeed += speed;
    // @ts-ignore
    state.speedBuckets[currentBucket].totalAngularVelocity += state.eggWhite.angularVelocity || 0;
    
    state.speedBuckets[currentBucket].count++;
    
    // log metrics for previous bucket if we've moved to a new bucket
    const previousBucket = currentBucket - 1;
    if (previousBucket >= 0 && previousBucket > state.lastLoggedBucket && state.speedBuckets[previousBucket]) {
        logBucketMetrics(previousBucket);
        state.lastLoggedBucket = previousBucket;
    }
}

function updateMetrics(speed, waveOffset) {
    // calculate percentage of base progress (without wave)
    const baseProgressPercent = (state.baseProgress / settings.whisking.maxProgress) * 100;
    const currentProgressBucket = Math.floor(baseProgressPercent);
    
    // initialize bucket if needed
    if (!state.progressBuckets[currentProgressBucket]) {
        state.progressBuckets[currentProgressBucket] = {
            totalTime: 0,
            totalBaseProgress: 0,
            totalSpeed: 0,
            totalWaveOffset: 0,
            totalWhiskingProgress: 0,
            count: 0
        };
    }
    
    // update bucket with metrics
    state.progressBuckets[currentProgressBucket].totalTime += state.timeElapsed;
    state.progressBuckets[currentProgressBucket].totalBaseProgress += state.baseProgress;
    state.progressBuckets[currentProgressBucket].totalSpeed += speed;
    state.progressBuckets[currentProgressBucket].totalWaveOffset += waveOffset;
    state.progressBuckets[currentProgressBucket].totalWhiskingProgress += state.whiskingProgress;
    state.progressBuckets[currentProgressBucket].count++;
    
    // Log metrics for previous bucket if we've moved to a new bucket
    const previousProgressBucket = currentProgressBucket - 1;
    if (previousProgressBucket >= 0 && 
        previousProgressBucket > state.lastLoggedProgressBucket && 
        state.progressBuckets[previousProgressBucket]) {
        
        logProgressBucketMetrics(previousProgressBucket);
        state.lastLoggedProgressBucket = previousProgressBucket;
    }
}

// UTILITY FUNCTIONS

function logBucketMetrics(bucket) {
    const avgSpeed = state.speedBuckets[bucket].totalSpeed / state.speedBuckets[bucket].count;
    const avgAngularVelocity = state.speedBuckets[bucket].totalAngularVelocity / state.speedBuckets[bucket].count;
    const avgDeviation = state.speedBuckets[bucket].totalDeviation / state.speedBuckets[bucket].count;
    const avgEffort = state.speedBuckets[bucket].totalEffort / state.speedBuckets[bucket].count;
    
    log(`${getTimestamp()} - at ${bucket}%: Speed: ${avgSpeed.toFixed(2)} px/s, Angular Velocity: ${avgAngularVelocity.toFixed(4)} rad/s, Deviation: ${avgDeviation.toFixed(2)} px, Effort: ${avgEffort.toFixed(2)}`);
}

function logProgressBucketMetrics(bucket) {
    const metrics = state.progressBuckets[bucket];
    const avgTime = metrics.totalTime / metrics.count;
    const avgBaseProgress = metrics.totalBaseProgress / metrics.count;
    const avgSpeed = metrics.totalSpeed / metrics.count;
    const avgWaveOffset = metrics.totalWaveOffset / metrics.count;
    const avgWhiskingProgress = metrics.totalWhiskingProgress / metrics.count;
    
    log(`${getTimestamp()} - Time: ${avgTime.toFixed(2)}s - Base Progress: ${avgBaseProgress.toFixed(2)} (${bucket}%), Cursor Speed: ${avgSpeed.toFixed(2)} px/s, Wave Offset: ${avgWaveOffset.toFixed(2)}, Whisking Progress: ${avgWhiskingProgress.toFixed(2)}`);
}

function logUserNotice() {
    // @ts-ignore
    log(`${getTimestamp()} - User noticed change at whiskingProgress: ${state.whiskingProgress.toFixed(2)} (${(state.whiskingProgress / settings.whisking.maxProgress * 100).toFixed(2)}%), frictionAir: ${state.eggWhite.frictionAir.toFixed(3)}, stiffness: ${state.mouseConstraint.constraint.stiffness.toFixed(4)}`);
}

function outputAnalytics() {
    const avgSpeeds = calculateAveragesByMetric(state.cursorTrackData, 'mouseSpeed');

    
    // @ts-ignore
    console.log('Average mouse speeds by 1% progress:', avgSpeeds);
    // @ts-ignore
    console.log('Pause durations:', state.pauseDurations);
}

function calculateAveragesByMetric(data, metric) {
    const buckets = {};

    data.forEach(entry => {
        const progressPercent = (entry.whiskingProgress / settings.whisking.maxProgress) * 100;
        const bucket = Math.floor(progressPercent);

        if (!buckets[bucket]) {
            buckets[bucket] = { total: 0, count: 0 };
        }

        buckets[bucket].total += entry[metric];
        buckets[bucket].count++;
    });

    const averages = {};
    for (const bucket in buckets) {
        averages[bucket] = buckets[bucket].total / buckets[bucket].count;
    }

    return averages;
}

function getTimestamp() {
    return new Date().toISOString();
}

function log(message) {
    // @ts-ignore
    state.logs.push(message);
    // @ts-ignore
    localStorage.setItem('metricsLogs', state.logs.join('\n'));
    // @ts-ignore
    state.logDiv.innerHTML += message + '<br>';
    // @ts-ignore
    state.logDiv.scrollTop = state.logDiv.scrollHeight;
}


function setup() {
    setupMatterJS();
    setupUI();
    setupEventListeners();
    
    // @ts-ignore
    const { Render, Engine } = Matter;
    Render.run(state.render);
    Engine.run(state.engine);
}

// @ts-ignore
window.addEventListener('load', setup);