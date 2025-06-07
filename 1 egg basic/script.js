// Import Matter.js modules
// @ts-ignore
const Engine = Matter.Engine;
// @ts-ignore
const Render = Matter.Render;
// @ts-ignore
const World = Matter.World;
// @ts-ignore
const Bodies = Matter.Bodies;
// @ts-ignore
const Constraint = Matter.Constraint;
// @ts-ignore
const Mouse = Matter.Mouse;
// @ts-ignore
const MouseConstraint = Matter.MouseConstraint;
// @ts-ignore
const Events = Matter.Events;
// @ts-ignore
const Body = Matter.Body;

const settings = {
  physics: {
    gravityX: 0,
    gravityY: 0
  },
  whiskingSimulation: {
    maxWhisking: 100,
    frictionAirInitial: 0.01,
    frictionAirFinal: 1.0,
    stiffnessInitial: 0.05,
    stiffnessFinal: 0.001,
    angularDamping: 0.3,
    whiskingSensitivity: 0.1,
    whiskingDecayRate: 0.9
  },
  render: {
    wireframes: false,
    background: 'white'
  },
  eggWhite: {
    width: 50,
    height: 50,
    color: 'black',
    restitution: 0.5
  },
  orbitConstraint: {
    radius: 150,
    stiffness: 0
  }
};

const state = {
  engine: null,
  render: null,
  eggWhite: null,
  centerPoint: null,
  mouseConstraint: null,
  whiskingProgress: 0,
  lastAngle: null,
  isDragging: false,
  cursorTrackData: [],
  lastMouseX: null,
  lastMouseY: null,
  lastMouseTime: null,
  centerX: 0,
  centerY: 0
};

function setup() {
  // create engine and world
  state.engine = Engine.create();
  // @ts-ignore
  state.engine.world.gravity.x = settings.physics.gravityX;
  // @ts-ignore
  state.engine.world.gravity.y = settings.physics.gravityY;

  // setup dimensions
  // @ts-ignore
  state.centerX = window.innerWidth / 2;
  // @ts-ignore
  state.centerY = window.innerHeight / 2;

  // create renderer
  state.render = Render.create({
    // @ts-ignore
    element: document.body,
    engine: state.engine,
    options: {
      // @ts-ignore
      width: window.innerWidth,
      // @ts-ignore
      height: window.innerHeight,
      wireframes: settings.render.wireframes,
      background: settings.render.background
    }
  });

  setupEggWhite();
  
  setupMouseConstraint();

  setupEventListeners();

  Render.run(state.render);
  Engine.run(state.engine);
}

// setup the egg white and its constraints
function setupEggWhite() {
  // create the object 
  state.eggWhite = Bodies.rectangle(
    state.centerX + settings.orbitConstraint.radius, 
    state.centerY, 
    settings.eggWhite.width, 
    settings.eggWhite.height, 
    {
      render: { fillStyle: settings.eggWhite.color },
      frictionAir: settings.whiskingSimulation.frictionAirInitial,
      restitution: settings.eggWhite.restitution
    }
  );
  
  // create a static center point
  state.centerPoint = Bodies.circle(state.centerX, state.centerY, 5, { 
    isStatic: true, 
    render: { fillStyle: 'white' } 
  });
  
  // create the contraint
  const orbitConstraint = Constraint.create({
    bodyA: state.centerPoint,
    bodyB: state.eggWhite,
    length: settings.orbitConstraint.radius,
    stiffness: settings.orbitConstraint.stiffness,
    render: { visible: false }
  });
  
  // add all bodies to the world
  // @ts-ignore
  World.add(state.engine.world, [state.eggWhite, state.centerPoint, orbitConstraint]);
}

// setup the mouse constraint
function setupMouseConstraint() {
  // @ts-ignore
  const mouse = Mouse.create(state.render.canvas);
  state.mouseConstraint = MouseConstraint.create(state.engine, {
    mouse: mouse,
    constraint: {
      stiffness: settings.whiskingSimulation.stiffnessInitial,
      render: { visible: false }
    }
  });
  
  // @ts-ignore
  World.add(state.engine.world, state.mouseConstraint);
}

// setup event listeners
function setupEventListeners() {
  Events.on(state.engine, 'afterUpdate', updateSimulation);
  
  // mouse up event
  Events.on(state.mouseConstraint, 'mouseup', () => {
    if (state.isDragging) {
      state.isDragging = false;
      state.lastAngle = null;
    }
  });
  
  // keyboard events
  // @ts-ignore
  document.addEventListener('keydown', handleKeyPress);
}

function updateSimulation() {
  if (isEggWhiteBeingDragged()) {
    handleDragging();
  } else if (state.isDragging) {
    handleReleasedDragging();
  }
}

// check if the egg white is being dragged
function isEggWhiteBeingDragged() {
  // @ts-ignore
  return state.mouseConstraint.body === state.eggWhite;
}

// handle dragging of the egg white
function handleDragging() {
  state.isDragging = true;
  
  // calculate the current angle of the eggWhite relative to the center
  // @ts-ignore
  const dx = state.eggWhite.position.x - state.centerX;
  // @ts-ignore
  const dy = state.eggWhite.position.y - state.centerY;
  const currentAngle = Math.atan2(dy, dx);

  updateWhiskingProgress(currentAngle);
  updatePhysicsProperties();
  trackMouseMovement();
  
  // @ts-ignore
  state.lastAngle = currentAngle;
}

// update whisking progress based on angle changes
function updateWhiskingProgress(currentAngle) {
  if (state.lastAngle !== null) {
    // calculate the angular difference (in radians)
    let angleDiff = currentAngle - state.lastAngle;
    if (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
    if (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
    
    state.whiskingProgress += Math.abs(angleDiff) * settings.whiskingSimulation.whiskingSensitivity;
    if (state.whiskingProgress > settings.whiskingSimulation.maxWhisking) {
      state.whiskingProgress = settings.whiskingSimulation.maxWhisking;
    }
  }
}

// update physics properties based on whisking progress
function updatePhysicsProperties() {
  const progressRatio = state.whiskingProgress / settings.whiskingSimulation.maxWhisking;
  
  // update friction 
  // @ts-ignore
  state.eggWhite.frictionAir = settings.whiskingSimulation.frictionAirInitial + (settings.whiskingSimulation.frictionAirFinal - settings.whiskingSimulation.frictionAirInitial) * progressRatio;
  
  // @ts-ignore
  Body.setAngularVelocity(state.eggWhite, state.eggWhite.angularVelocity * settings.whiskingSimulation.angularDamping);
  
  if (state.whiskingProgress >= settings.whiskingSimulation.maxWhisking) {
    Body.setAngularVelocity(state.eggWhite, 0);
    // @ts-ignore
    state.eggWhite.frictionAir = 0.5; 
  }
  
  // C/D ratio by reducing mouse constraint stiffness
  // @ts-ignore
  state.mouseConstraint.constraint.stiffness = settings.whiskingSimulation.stiffnessInitial - (settings.whiskingSimulation.stiffnessInitial - settings.whiskingSimulation.stiffnessFinal) * progressRatio;
  
  // update visual appearance
  // @ts-ignore
  state.eggWhite.render.fillStyle = 'black'; 
}

// mouse movement for analysis
function trackMouseMovement() {
  let speed = 0;
  // @ts-ignore
  const now = performance.now();
  // @ts-ignore
  const mouse = state.mouseConstraint.mouse;

  if (state.lastMouseX !== null && state.lastMouseY !== null && state.lastMouseTime !== null) {
    const dx = mouse.position.x - state.lastMouseX;
    const dy = mouse.position.y - state.lastMouseY;
    const dt = (now - state.lastMouseTime) / 1000; 

    if (dt > 0) {
      const distance = Math.sqrt(dx * dx + dy * dy);
      speed = distance / dt; 
    }
  }

  // Save current for next frame
  state.lastMouseX = mouse.position.x;
  state.lastMouseY = mouse.position.y;
  state.lastMouseTime = now;

  // @ts-ignore
  state.cursorTrackData.push({
    timestamp: now,
    whiskingProgress: state.whiskingProgress,
    mouseSpeed: speed
  });
}

// post-dragging state changes
function handleReleasedDragging() {
  // gradually decrease whiskingProgress when not dragging
  state.whiskingProgress -= settings.whiskingSimulation.whiskingDecayRate;
  if (state.whiskingProgress < 0) state.whiskingProgress = 0;

  const progressRatio = state.whiskingProgress / settings.whiskingSimulation.maxWhisking;
  
  // @ts-ignore
  state.eggWhite.frictionAir = settings.whiskingSimulation.frictionAirInitial + 0.49 * progressRatio;
  // @ts-ignore
  state.mouseConstraint.constraint.stiffness = settings.whiskingSimulation.stiffnessInitial - 0.049 * progressRatio;

  if (state.whiskingProgress >= settings.whiskingSimulation.maxWhisking) {
    Body.setAngularVelocity(state.eggWhite, 0);
  }
}

function handleKeyPress(event) {
  switch (event.key) {
    case 'c': // User noticed texture change
      logTextureChangeNoticed();
      break;
    case 'd': // dump all collected cursor tracking data
      logTrackingData();
      break;
  }
}

function getTimestamp() {
  return new Date().toISOString();
}

function logTextureChangeNoticed() {
  // @ts-ignore
  console.log(
    `${getTimestamp()} - User noticed change at whiskingProgress: ${state.whiskingProgress.toFixed(2)} ` +
    `(${(state.whiskingProgress / settings.whiskingSimulation.maxWhisking * 100).toFixed(2)}%), ` +
    // @ts-ignore
    `frictionAir: ${state.eggWhite.frictionAir.toFixed(3)}, ` +
    // @ts-ignore
    `stiffness: ${state.mouseConstraint.constraint.stiffness.toFixed(4)}`
  );
}

function calculateAverageSpeedByProgress() {
  const buckets = {}; // object to store speed sums and counts per bucket

  // 1. Fill buckets
  state.cursorTrackData.forEach(entry => {
    // @ts-ignore
    const progressPercent = (entry.whiskingProgress / settings.whiskingSimulation.maxWhisking) * 100;
    const bucket = Math.floor(progressPercent / 5) * 5; 

    if (!buckets[bucket]) {
      buckets[bucket] = { totalSpeed: 0, count: 0 };
    }

    // @ts-ignore
    buckets[bucket].totalSpeed += entry.mouseSpeed;
    buckets[bucket].count++;
  });

  // 2. Calculate averages
  const averages = {};
  for (const bucket in buckets) {
    averages[bucket] = buckets[bucket].totalSpeed / buckets[bucket].count;
  }

  return averages;
}

function logTrackingData() {
  const avgSpeeds = calculateAverageSpeedByProgress();
  // @ts-ignore
  console.log('Average mouse speeds by 5% progress:', avgSpeeds);
}

setup();