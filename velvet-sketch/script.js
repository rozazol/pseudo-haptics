const settings = {
    ballRadius: 20,           
    smoothCDRatio: 2,      
    roughCDRatio: 0.3,       
    neutralCDRatio: 1.0,      
    jitterAmount: 6,          
    updateSpeed: 0.1         
};

const state = {
    dragging: false,
    dragOffset: { x: 0, y: 0 },
    objectPos: { x: window.innerWidth / 2, y: window.innerHeight / 2 },  
    lastMousePos: { x: 0, y: 0 }  
};

const ball = document.getElementById('ball');

function onMouseDown(e) {
    // @ts-ignore
    const ballRect = ball.getBoundingClientRect();
    const mouseX = e.clientX;
    const mouseY = e.clientY;
    const dx = mouseX - (ballRect.left + ballRect.width / 2);
    const dy = mouseY - (ballRect.top + ballRect.height / 2);
    if (dx * dx + dy * dy < settings.ballRadius * settings.ballRadius) {
        state.dragging = true;
        state.dragOffset.x = mouseX - state.objectPos.x;
        state.dragOffset.y = mouseY - state.objectPos.y;
        state.lastMousePos.x = mouseX;
        state.lastMousePos.y = mouseY;
    }
}

function onMouseMove(e) {
    if (state.dragging) {
        const mouseX = e.clientX;
        const mouseY = e.clientY;

        // Calculate dragging direction
        const dx = mouseX - state.lastMousePos.x;
        const dy = mouseY - state.lastMousePos.y;
        const magnitude = Math.sqrt(dx * dx + dy * dy);
        if (magnitude > 0) {
            // check if dragging left (negative dx) or right (positive dx)
            const isDraggingLeft = dx < 0;
            const isDraggingRight = dx > 0;

            // Smooth when dragging left, rough when dragging right
            let cdRatio, jitterAmount;
            if (isDraggingLeft) {
                cdRatio = settings.smoothCDRatio;  
                jitterAmount = 0;                  
            } else if (isDraggingRight) {
                cdRatio = settings.roughCDRatio;   
                jitterAmount = settings.jitterAmount;  
            } else {
                // Neutral case (e.g., vertical movement with no horizontal component)
                cdRatio = settings.neutralCDRatio;
                jitterAmount = 0;
            }

            const targetX = mouseX - state.dragOffset.x;
            const targetY = mouseY - state.dragOffset.y;
            state.objectPos.x += (targetX - state.objectPos.x) * cdRatio * settings.updateSpeed;
            state.objectPos.y += (targetY - state.objectPos.y) * cdRatio * settings.updateSpeed;

            // Add jitter for rough directions
            state.objectPos.x += (Math.random() - 0.5) * jitterAmount;
            state.objectPos.y += (Math.random() - 0.5) * jitterAmount;

            // Update ball position
            // @ts-ignore
            ball.style.left = state.objectPos.x + 'px';
            // @ts-ignore
            ball.style.top = state.objectPos.y + 'px';
        }

        state.lastMousePos.x = mouseX;
        state.lastMousePos.y = mouseY;
    }
}

function onMouseUp() {
    state.dragging = false;
}


window.addEventListener('mousedown', onMouseDown);
window.addEventListener('mousemove', onMouseMove);
window.addEventListener('mouseup', onMouseUp);

// @ts-ignore
ball.style.left = state.objectPos.x + 'px';
// @ts-ignore
ball.style.top = state.objectPos.y + 'px';