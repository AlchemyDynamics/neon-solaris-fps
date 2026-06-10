export class Input {
  constructor(target = document.body) {
    this.target = target;
    this.keys = new Set();
    this.pressed = new Set();
    this.released = new Set();
    this.mouseButtons = new Set();
    this.mousePressed = new Set();
    this.mouseReleased = new Set();
    this.mouseDelta = { x: 0, y: 0 };
    this.wheelDelta = 0;
    this.pointerLocked = false;

    window.addEventListener("keydown", (event) => {
      if (!this.keys.has(event.code)) this.pressed.add(event.code);
      this.keys.add(event.code);
      if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.code)) {
        event.preventDefault();
      }
    });

    window.addEventListener("keyup", (event) => {
      this.keys.delete(event.code);
      this.released.add(event.code);
    });

    window.addEventListener("mousedown", (event) => {
      if (!this.mouseButtons.has(event.button)) this.mousePressed.add(event.button);
      this.mouseButtons.add(event.button);
      if (document.pointerLockElement !== this.target) this.lock();
    });

    window.addEventListener("mouseup", (event) => {
      this.mouseButtons.delete(event.button);
      this.mouseReleased.add(event.button);
    });

    window.addEventListener(
      "wheel",
      (event) => {
        this.wheelDelta += Math.sign(event.deltaY);
        event.preventDefault();
      },
      { passive: false }
    );

    window.addEventListener("mousemove", (event) => {
      if (!this.pointerLocked) return;
      this.mouseDelta.x += event.movementX;
      this.mouseDelta.y += event.movementY;
    });

    document.addEventListener("pointerlockchange", () => {
      this.pointerLocked = document.pointerLockElement === this.target;
    });
  }

  lock() {
    if (document.pointerLockElement !== this.target) {
      const request = this.target.requestPointerLock();
      if (request?.catch) request.catch(() => {});
    }
  }

  isDown(code) {
    return this.keys.has(code);
  }

  wasPressed(code) {
    return this.pressed.has(code);
  }

  consumePressed(code) {
    const has = this.pressed.has(code);
    this.pressed.delete(code);
    return has;
  }

  mouseDown(button) {
    return this.mouseButtons.has(button);
  }

  mouseWasPressed(button) {
    return this.mousePressed.has(button);
  }

  consumeWheel() {
    const delta = this.wheelDelta;
    this.wheelDelta = 0;
    return delta;
  }

  endFrame() {
    this.pressed.clear();
    this.released.clear();
    this.mousePressed.clear();
    this.mouseReleased.clear();
    this.mouseDelta.x = 0;
    this.mouseDelta.y = 0;
    this.wheelDelta = 0;
  }
}
