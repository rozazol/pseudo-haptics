  // SETTINGS
  const settings = {
    // Canvas settings
    // @ts-ignore
    width: window.innerWidth,
    // @ts-ignore
    height: window.innerHeight,
    background: 'white',
    
    // Physics settings
    gravity: 0,
    initialFrictionAir: 0.01,
    maxFrictionAir: 1.0,
    
    // Constraint settings
    initialStiffness: 0.005,
    minStiffness: 0.001,
    
    // UI settings
    showWireframes: false,
    showLogs: false
  };

// STATE
const state = {
    // Physics objects
    engine: null,
    render: null,
    world: null,
    eggWhite: null,
    centerPoint: null,
    orbitConstraint: null,
    mouse: null,
    mouseConstraint: null,
    
    // Simulation parameters
    centerX: 0,
    centerY: 0,
    radius: 150,
    
    // Whisking progress tracking
    whiskingProgress: 0,
    maxWhisking: 100,
    displayedProgress: 0,
    lastAngle: null,
    isDragging: false,
    
    // Mouse/touch tracking
    lastMouseX: null,
    lastMouseY: null,
    lastMouseTime: null,
    cursorTrackData: [],
    dragStartTime: null,
    pauseStartTime: null,
    pauseDurations: [],
    
    // Progress freeze tracking
    isProgressFrozen: false,
    freezeStartTime: null,
    freezeDuration: 0,
    lastCheckedBucket: -1,
    lastUnfrozenTime: null,
    frozenProgressValue: 0,
    frozenWhiskingProgress: 0,
    
    // Logging
    logs: [],
    logDiv: null,
    progressDisplay: null,
    speedBuckets: {},
    lastLoggedBucket: -1,
    lastProgressLogBucket: -1,
    
    // Touch events
    touchStartTime: null,
    longPressDuration: 1000
  };
  
  function setupMatter() {
    // @ts-ignore
    const Engine = Matter.Engine;
    // @ts-ignore
    const Render = Matter.Render;
    // @ts-ignore
    // @ts-ignore
    const World = Matter.World;
    
    // Create engine and disable gravity
    state.engine = Engine.create();
    // @ts-ignore
    state.engine.world.gravity.y = settings.gravity;
    // @ts-ignore
    state.world = state.engine.world;
    
    // the center position for circular motion
    state.centerX = settings.width / 2;
    state.centerY = settings.height / 2;
    
    // Create renderer
    state.render = Render.create({
      // @ts-ignore
      element: document.body,
      engine: state.engine,
      options: {
        width: settings.width,
        height: settings.height,
        wireframes: settings.showWireframes,
        background: settings.background
      }
    });
  }
  
  function createBodies() {
    // @ts-ignore
    // @ts-ignore
    const { Engine, Render, World, Bodies, Constraint, Mouse, MouseConstraint } = Matter;

    
    //  the egg white object
    state.eggWhite = Bodies.rectangle(
      state.centerX + state.radius, 
      state.centerY, 
      50, 
      50, 
      {
        render: { fillStyle: 'black' },
        frictionAir: settings.initialFrictionAir,
        restitution: 0.5
      }
    );
    // @ts-ignore
    state.eggWhite.originalFrictionAir = state.eggWhite.frictionAir;


    //  a static center point
    state.centerPoint = Bodies.circle(
      state.centerX, 
      state.centerY, 
      5, 
      { 
        isStatic: true, 
        render: { fillStyle: 'white' } 
      }
    );
    
    //  the constraint connecting the egg white to the center
    state.orbitConstraint = Constraint.create({
      bodyA: state.centerPoint,
      bodyB: state.eggWhite,
      length: state.radius,
      stiffness: 0,
      render: { visible: false }
    });
    
    // Add all bodies to the world
    World.add(state.world, [state.eggWhite, state.centerPoint, state.orbitConstraint]);
  }
  
  function setupMouseInteraction() {
    // @ts-ignore
    const Mouse = Matter.Mouse;
    // @ts-ignore
    const MouseConstraint = Matter.MouseConstraint;
    // @ts-ignore
    const World = Matter.World;
    
    // @ts-ignore
    state.mouse = Mouse.create(state.render.canvas);
    state.mouseConstraint = MouseConstraint.create(state.engine, {
      mouse: state.mouse,
      constraint: {
        stiffness: settings.initialStiffness,
        render: { visible: false }
      }
    });
    
    // @ts-ignore
    state.mouseConstraint.constraint.originalStiffness = state.mouseConstraint.constraint.stiffness;
    
    World.add(state.world, state.mouseConstraint);
  }
  
  function createUI() {
    // Create progress display
    // @ts-ignore
    state.progressDisplay = document.createElement('div');
    // @ts-ignore
    state.progressDisplay.id = 'progressDisplay';
    // @ts-ignore
    state.progressDisplay.style.position = 'absolute';
    // @ts-ignore
    state.progressDisplay.style.top = '10px';
    // @ts-ignore
    state.progressDisplay.style.left = '10px';
    // @ts-ignore
    state.progressDisplay.style.background = '#f0f0f0';
    // @ts-ignore
    state.progressDisplay.style.padding = '5px';
    // @ts-ignore
    state.progressDisplay.style.fontSize = '16px';
    // @ts-ignore
    state.progressDisplay.style.zIndex = '1000';
    // @ts-ignore
    state.progressDisplay.innerText = 'Progress: 0%';
    // @ts-ignore
    // document.body.appendChild(state.progressDisplay);
    
    // Create log div
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
    
    // Create copy logs button
    // @ts-ignore
    const copyButton = document.createElement('button');
    copyButton.innerText = 'Copy Logs';
    copyButton.style.position = 'absolute';
    copyButton.style.top = '220px';
    copyButton.style.left = '0';
    copyButton.style.padding = '5px';
    copyButton.style.fontSize = '12px';
    // @ts-ignore
    document.body.appendChild(copyButton);
    
    copyButton.addEventListener('click', () => {
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
    const Events = Matter.Events;
    
    // Mouse interaction events
    Events.on(state.mouseConstraint, 'mousedown', handleMouseDown);
    Events.on(state.mouseConstraint, 'mouseup', handleMouseUp);
    Events.on(state.mouseConstraint, 'enddrag', handleEndDrag);
    
    // Physics update event
    Events.on(state.engine, 'afterUpdate', updateSimulation);
    
    // Touch events for long-press toggle
    // @ts-ignore
    const canvas = document.querySelector('canvas');
    canvas.addEventListener('touchstart', handleTouchStart);
    canvas.addEventListener('touchend', handleTouchEnd);
    canvas.addEventListener('touchmove', handleTouchMove);
    
    // Keyboard events
    // @ts-ignore
    document.addEventListener('keydown', handleKeyDown);
  }
  
  // Event handlers
  function handleMouseDown() {
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
  }
  
  function handleMouseUp() {
    if (state.isDragging) {
      endDragging();
    }
  }
  
  function handleEndDrag() {
    if (state.isDragging) {
      endDragging();
    }
  }
  
  function endDragging() {
    state.isDragging = false;
    state.lastAngle = null;
    
    if (state.dragStartTime) {
      // @ts-ignore
      const dragDuration = (performance.now() - state.dragStartTime) / 1000;
      const progressPercent = (state.whiskingProgress / state.maxWhisking) * 100;
      const currentBucket = Math.floor(progressPercent);
      
      updateSpeedBucket(currentBucket, { dragDuration });
      
      log(`${getTimestamp()} - Drag duration: ${dragDuration.toFixed(2)} s at whiskingProgress: ${progressPercent.toFixed(2)}%, displayedProgress: ${state.displayedProgress.toFixed(2)}%`);
      state.dragStartTime = null;
    }
    
    // @ts-ignore
    state.pauseStartTime = performance.now();
  }
  
  function handleTouchStart(event) {
    if (event.touches.length === 1) {
      // @ts-ignore
      state.touchStartTime = Date.now();
      event.preventDefault();
    }
  }
  
  // @ts-ignore
  function handleTouchEnd(event) {
    if (state.touchStartTime) {
      const touchEndTime = Date.now();
      if (touchEndTime - state.touchStartTime >= state.longPressDuration) {
        // @ts-ignore
        state.logDiv.style.display = state.logDiv.style.display === 'none' ? 'block' : 'none';
      }
      state.touchStartTime = null;
    }
  }
  
  function handleTouchMove(event) {
    if (event.touches.length === 1) {
      event.preventDefault();
    }
  }
  
  function handleKeyDown(event) {
    switch (event.key) {
      case 'c':
        // @ts-ignore
        log(`${getTimestamp()} - User noticed change at whiskingProgress: ${state.whiskingProgress.toFixed(2)} (${(state.whiskingProgress / state.maxWhisking * 100).toFixed(2)}%), frictionAir: ${state.eggWhite.frictionAir.toFixed(3)}, stiffness: ${state.mouseConstraint.constraint.stiffness.toFixed(4)}`);
        break;
      case 'd':
        logAnalytics();
        break;
    }
  }
  
  // Utility functions
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
  
  function getTimestamp() {
    return new Date().toISOString();
  }
  
  function calculateProgressRate() {
    // @ts-ignore
    const now = performance.now();
    const timeWindow = 1000; // 1-second window
    // @ts-ignore
    const recentData = state.cursorTrackData.filter(entry => now - entry.timestamp <= timeWindow);
  
    if (recentData.length < 2) {
      return null;
    }
  
    const firstEntry = recentData[0];
    const lastEntry = recentData[recentData.length - 1];
    const progressDiff = lastEntry.whiskingProgress - firstEntry.whiskingProgress;
    const timeDiff = (lastEntry.timestamp - firstEntry.timestamp) / 1000;
  
    if (timeDiff === 0) {
      return null;
    }
  
    return progressDiff / timeDiff;
  }
  
  function updateSpeedBucket(bucket, data = {}) {
    if (!state.speedBuckets[bucket]) {
      state.speedBuckets[bucket] = { 
        totalSpeed: 0, 
        totalDuration: 0,
        count: 0 
      };
    }
    
    const sb = state.speedBuckets[bucket];
    
    if (data.speed !== undefined) sb.totalSpeed += data.speed;
    if (data.dragDuration !== undefined) sb.totalDuration += data.dragDuration;
    
    sb.count++;
  }
  
  function logBucketMetrics(bucket) {
    if (bucket < 0 || !state.speedBuckets[bucket]) return;
    
    const sb = state.speedBuckets[bucket];
    const avgSpeed = sb.totalSpeed / sb.count;
    const avgAngularVelocity = sb.totalAngularVelocity / sb.count;
    const avgDeviation = sb.totalDeviation / sb.count;
    const avgEffort = sb.totalEffort / sb.count;
    
    log(`${getTimestamp()} - at whiskingProgress: ${bucket}%, displayedProgress: ${state.displayedProgress.toFixed(2)}%: Speed: ${avgSpeed.toFixed(2)} px/s, Angular Velocity: ${avgAngularVelocity.toFixed(4)} rad/s, Deviation: ${avgDeviation.toFixed(2)} px, Effort: ${avgEffort.toFixed(2)}`);
  }
  
  function logAnalytics() {
    const calculateAveragesByMetric = (metric) => {
      const buckets = {};
      
      state.cursorTrackData.forEach(entry => {
        // @ts-ignore
        const progressPercent = (entry.whiskingProgress / state.maxWhisking) * 100;
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
    };
  
    // @ts-ignore
    console.log('Average mouse speeds by 1% progress:', calculateAveragesByMetric('mouseSpeed'));
    // @ts-ignore
    console.log('Pause durations:', state.pauseDurations);
  }
  
  function updateFrozenProgress() {
    // @ts-ignore
    const now = performance.now();
    
    if (state.isProgressFrozen) {
      // Keep the progress frozen
      state.displayedProgress = state.frozenProgressValue;
      
      // Check if freeze duration has elapsed
      // @ts-ignore
      if (now - state.freezeStartTime >= state.freezeDuration) {
        state.isProgressFrozen = false;
        state.lastUnfrozenTime = now;
        state.freezeStartTime = null;
        
        // don't jump to catch up, just continue from where frozen
        state.displayedProgress = state.frozenProgressValue;
        
        state.frozenWhiskingProgress = state.whiskingProgress;
        
        const progressPercent = (state.whiskingProgress / state.maxWhisking) * 100;
        console.log(`${getTimestamp()} - Progress unfrozen. Displayed Progress: ${state.displayedProgress}`);
    }
    } else {
      // Normal progress update
      const progressIncrement = (state.whiskingProgress - state.frozenWhiskingProgress) / state.maxWhisking * 100;
      state.displayedProgress = state.frozenProgressValue + progressIncrement;
      
      // Ensure progress stays within bounds
      state.displayedProgress = Math.max(0, state.displayedProgress);
      if (state.whiskingProgress >= state.maxWhisking) {
        state.displayedProgress = 100;
      }
      
      // Update reference values
      state.frozenProgressValue = state.displayedProgress;
      state.frozenWhiskingProgress = state.whiskingProgress;
    }
  }
  
  function checkFreezeProgress(progressPercent) {
    // @ts-ignore
    const now = performance.now();
    const freezeBucket = Math.floor(progressPercent / 10) * 10; // check every 10%
    
    if (!state.isProgressFrozen && 
        freezeBucket >= 0 && 
        freezeBucket !== state.lastCheckedBucket && 
        freezeBucket < 100 && 
        (!state.lastUnfrozenTime || now - state.lastUnfrozenTime > 2000)) {
      
      // 50% chance to freeze
      const shouldFreeze = freezeBucket === 0 || Math.random() < 0.5;
      if (shouldFreeze) {
        state.isProgressFrozen = true;
        state.freezeStartTime = now;
        state.frozenProgressValue = state.displayedProgress;
        state.frozenWhiskingProgress = state.whiskingProgress;
        
        //  freeze duration
        const progressRate = calculateProgressRate();
        let targetProgressIncrease = 0.15 + Math.random() * 0.10; // 10-25%
        targetProgressIncrease *= state.maxWhisking;
        
        if (progressRate && progressRate > 0) {
          state.freezeDuration = (targetProgressIncrease / progressRate) * 1000;
          state.freezeDuration = Math.min(Math.max(state.freezeDuration, 1000), 10000); // 1-10 seconds
        } else {
          state.freezeDuration = 8000 + Math.random() * 5000; // random first freeze duration
        }
        
        const offset = (progressPercent - state.displayedProgress).toFixed(2);
        console.log(`${getTimestamp()} - Progress frozen at whiskingProgress: ${progressPercent.toFixed(2)}%, displayedProgress: ${state.displayedProgress.toFixed(2)}% for ${state.freezeDuration.toFixed(0)} ms (target ${targetProgressIncrease.toFixed(2)} progress, offset ${offset}%)`);
      }
      state.lastCheckedBucket = freezeBucket;
    }
  }
  
  function updateSimulation() {
    // @ts-ignore
    const Body = Matter.Body;
    
    // Calculate the current angle of the eggWhite relative to the center
    // @ts-ignore
    const dx = state.eggWhite.position.x - state.centerX;
    // @ts-ignore
    const dy = state.eggWhite.position.y - state.centerY;
    const currentAngle = Math.atan2(dy, dx);
    
    let speed = 0;
    // @ts-ignore
    const now = performance.now();
    
    // @ts-ignore
    if (state.mouseConstraint.body === state.eggWhite) {
      state.isDragging = true;
      
      //  whisking progress based on angular movement
      if (state.lastAngle !== null) {
        let angleDiff = currentAngle - state.lastAngle;
        if (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
        if (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
        state.whiskingProgress += Math.abs(angleDiff) * 0.1;
        state.whiskingProgress = Math.min(state.whiskingProgress, state.maxWhisking);
      }
      // @ts-ignore
      state.lastAngle = currentAngle;
      
      //  physics based on progress
      const progressRatio = state.displayedProgress / 200;
      // @ts-ignore
      state.eggWhite.frictionAir = settings.initialFrictionAir + (settings.maxFrictionAir - settings.initialFrictionAir) * progressRatio;
      
      const angularDamping = 0.3;
      // @ts-ignore
      Body.setAngularVelocity(state.eggWhite, state.eggWhite.angularVelocity * angularDamping);
      
      if (state.whiskingProgress >= state.maxWhisking) {
        Body.setAngularVelocity(state.eggWhite, 0);
        // @ts-ignore
        state.eggWhite.frictionAir = 0.5;
        state.displayedProgress = 100;
        state.frozenProgressValue = 100;
        state.frozenWhiskingProgress = state.maxWhisking;
      }
      
      // Update constraint stiffness
      // @ts-ignore
      state.mouseConstraint.constraint.stiffness = settings.initialStiffness - (settings.initialStiffness - settings.minStiffness) * progressRatio;
      
      // Calculate cursor speed
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
      // log progress at 1% increments
      const progressPercent = (state.whiskingProgress / state.maxWhisking) * 100;
      const currentBucket = Math.floor(progressPercent);
      
      updateSpeedBucket(currentBucket, { 
        speed,
      });
      
      if (currentBucket > state.lastProgressLogBucket) {
        const offset = (progressPercent - state.displayedProgress).toFixed(2);
        log(`${getTimestamp()} - Progress update: whiskingProgress: ${progressPercent.toFixed(2)}%, displayedProgress: ${state.displayedProgress.toFixed(2)}%, offset: ${offset}%`);
        state.lastProgressLogBucket = currentBucket;
      }
      
      // log metrics for the previous bucket when moving to a new one
      const previousBucket = currentBucket - 1;
      if (previousBucket >= 0 && previousBucket > state.lastLoggedBucket) {
        logBucketMetrics(previousBucket);
        state.lastLoggedBucket = previousBucket;
      }
      
      // check if we should freeze progress
      checkFreezeProgress(progressPercent);
      
    //   // Uudate the frozen/displayed progress
      updateFrozenProgress();
      
      //  cursor track data
      // @ts-ignore
      state.cursorTrackData.push({
        timestamp: now,
        whiskingProgress: state.whiskingProgress,
        mouseSpeed: speed,
        displayedProgress: state.displayedProgress,
        offset: progressPercent - state.displayedProgress
      });
      
      // @ts-ignore
      state.lastMouseX = state.mouse.position.x;
      // @ts-ignore
      state.lastMouseY = state.mouse.position.y;
      state.lastMouseTime = now;
    } else if (state.isDragging) {
      state.whiskingProgress -= 0.9;
      state.whiskingProgress = Math.max(0, state.whiskingProgress);
      
      // update physics based on progress
      const progressRatio = state.displayedProgress / 100;
      // @ts-ignore
      state.eggWhite.frictionAir = 0.5 + 0.49 * progressRatio;
      // @ts-ignore
      state.mouseConstraint.constraint.stiffness = 0.5 - 0.049 * progressRatio;
      
      // check for completion
      if (state.whiskingProgress >= state.maxWhisking) {
        Body.setAngularVelocity(state.eggWhite, 0);
        state.displayedProgress = 100;
        state.frozenProgressValue = 100;
        state.frozenWhiskingProgress = state.maxWhisking;
      }
      
      // Update frozen/displayed progress
      updateFrozenProgress();
      
      // log progress changes
      const progressPercent = (state.whiskingProgress / state.maxWhisking) * 100;
      const currentBucket = Math.floor(progressPercent);
      
      if (currentBucket > state.lastProgressLogBucket) {
        const offset = (progressPercent - state.displayedProgress).toFixed(2);
        console.log(`${getTimestamp()} - Progress update: whiskingProgress: ${progressPercent.toFixed(2)}%, displayedProgress: ${state.displayedProgress.toFixed(2)}%, offset: ${offset}%`);
        state.lastProgressLogBucket = currentBucket;
      }
      
      // log bucket metrics when appropriate
      // @ts-ignore
      updateSpeedBucket(currentBucket, { speed, angularVelocity, deviation, effort });
      
      const previousBucket = currentBucket - 1;
      if (previousBucket >= 0 && previousBucket > state.lastLoggedBucket && state.speedBuckets[previousBucket]) {
        logBucketMetrics(previousBucket);
        state.lastLoggedBucket = previousBucket;
      }
    }
    
    //  progress display
    // @ts-ignore
    state.progressDisplay.innerText = `Progress: ${Math.floor(state.displayedProgress)}%`;
  }
  
  function setup() {
    setupMatter();
    createBodies();
    setupMouseInteraction();
    createUI();
    setupEventListeners();
    
    // @ts-ignore
    const { Render, Engine } = Matter;
    Render.run(state.render);
    // @ts-ignore
    Engine.run(state.engine);
  }
  
  setup();