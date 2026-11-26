{
  const plane = document.querySelector('.plane');
  const wordmark = plane.querySelector('.wordmark');
  const toolbar = document.querySelector('.zoom-toolbar');
  const zoomLevel = toolbar.querySelector('.zoom-level');
  const pointers = new Map();
  const minimumScale = 0.05;
  const maximumScale = 64;
  const gridStep = 32;
  const keyboardPan = 64;
  const zoomStep = 1.25;
  const center = { x: 0, y: 0 };
  let view = { ...center, scale: 1 };
  const zoomActions = {
    in: () => moveView(zoomStep, center),
    out: () => moveView(1 / zoomStep, center),
    reset: () => { view = { ...center, scale: 1 }; },
  };

  function render() {
    wordmark.style.transform = `translate(${view.x}px, ${view.y}px) scale(${view.scale})`;
    let spacing = gridStep * view.scale;
    while (spacing < 16) spacing *= 4;
    while (spacing > 64) spacing /= 4;
    const tile = spacing * 4;
    plane.style.setProperty('--grid-tile', `${tile}px`);
    plane.style.setProperty('--grid-x', `${view.x % tile}px`);
    plane.style.setProperty('--grid-y', `${view.y % tile}px`);

    const percent = `${Math.round(view.scale * 100)}%`;
    if (zoomLevel.value !== percent) zoomLevel.value = percent;
  }

  function pointAt(event) {
    const { left, top, width, height } = plane.getBoundingClientRect();
    return { x: event.clientX - left - width / 2, y: event.clientY - top - height / 2 };
  }

  function moveView(factor, from, to = from) {
    const scale = Math.min(maximumScale, Math.max(minimumScale, view.scale * factor));
    const ratio = scale / view.scale;
    // Keep the same world point under the cursor or between the two fingers.
    view = {
      x: to.x + (view.x - from.x) * ratio,
      y: to.y + (view.y - from.y) * ratio,
      scale,
    };
  }

  function gestureGeometry() {
    const [first, second] = pointers.values();
    if (!second) return { ...first, distance: 1 };
    return {
      x: (first.x + second.x) / 2,
      y: (first.y + second.y) / 2,
      distance: Math.max(1, Math.hypot(first.x - second.x, first.y - second.y)),
    };
  }

  plane.addEventListener('pointerdown', (event) => {
    if (event.button !== 0 || pointers.size >= 2) return;
    event.preventDefault();
    plane.setAttribute('data-pointer-focus', '');
    plane.focus({ preventScroll: true });
    plane.setPointerCapture(event.pointerId);
    pointers.set(event.pointerId, pointAt(event));
  });

  plane.addEventListener('blur', () => plane.removeAttribute('data-pointer-focus'));

  plane.addEventListener('pointermove', (event) => {
    if (!pointers.has(event.pointerId)) return;
    const before = gestureGeometry();
    pointers.set(event.pointerId, pointAt(event));
    const after = gestureGeometry();
    moveView(after.distance / before.distance, before, after);
    render();
  });

  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    plane.addEventListener(type, (event) => pointers.delete(event.pointerId));
  }

  plane.addEventListener('wheel', (event) => {
    if (event.defaultPrevented || event.ctrlKey || event.metaKey || !event.deltaY) return;
    event.preventDefault();
    let delta = event.deltaY;
    if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) delta *= 16;
    if (event.deltaMode === WheelEvent.DOM_DELTA_PAGE) delta *= plane.clientHeight;
    moveView(Math.exp(-delta * 0.0015), pointAt(event));
    render();
  }, { passive: false });

  plane.addEventListener('keydown', (event) => {
    if (event.defaultPrevented || event.isComposing || event.keyCode === 229
        || event.ctrlKey || event.metaKey || event.altKey) return;

    switch (event.key) {
      case 'ArrowLeft': view.x += keyboardPan; break;
      case 'ArrowRight': view.x -= keyboardPan; break;
      case 'ArrowUp': view.y += keyboardPan; break;
      case 'ArrowDown': view.y -= keyboardPan; break;
      case '+':
      case '=': zoomActions.in(); break;
      case '-':
      case '_': zoomActions.out(); break;
      case '0': zoomActions.reset(); break;
      default: return;
    }
    plane.removeAttribute('data-pointer-focus');
    event.preventDefault();
    render();
  });

  for (const button of toolbar.querySelectorAll('button[data-zoom]')) {
    const action = zoomActions[button.dataset.zoom];
    button.addEventListener('click', () => {
      action();
      render();
    });
  }
  toolbar.hidden = false;
}
