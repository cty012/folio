export type Point = { x: number; y: number };

/**
 * Places a relationship graph in a `width` × `height` box, leaving `padX`/`padY` free for labels.
 * Connected people get a force-directed layout; people with no relationships line up in a
 * lane along the left edge (or the bottom, in a tall box) so they never stretch the drawing.
 */
export function forceLayout(count: number, edges: [number, number][], groups: number[], width: number, height: number, padX = 64, padY = 44): Point[] {
  const linked = new Set(edges.flat());
  const connected = Array.from({ length: count }, (_, index) => index).filter(index => linked.has(index));
  const loners = Array.from({ length: count }, (_, index) => index).filter(index => !linked.has(index));
  if (!loners.length || !connected.length) return springLayout(count, edges, groups, width, height, padX, padY);
  const wide = width >= height;
  // The lane holds a grid of loners, about 96 × 76 px per person, and never more than 40% of the box.
  const room = wide ? height - 2 * padY : width - 2 * padX;
  const perLine = Math.max(1, Math.floor(room / (wide ? 76 : 96)) + 1);
  const lines = Math.ceil(loners.length / perLine);
  const lane = Math.min(lines * (wide ? 96 : 76) + (wide ? 24 : 16), (wide ? width : height) * 0.4);
  const index = new Map(connected.map((node, position) => [node, position]));
  const core = springLayout(connected.length, edges.map(([a, b]) => [index.get(a)!, index.get(b)!] as [number, number]), connected.map(node => groups[node]),
    wide ? width - lane : width, wide ? height : height - lane, padX, padY);
  const result: Point[] = new Array(count);
  connected.forEach((node, position) => { result[node] = wide ? { x: core[position].x + lane, y: core[position].y } : core[position]; });
  const columns = Math.ceil(loners.length / perLine);
  loners.forEach((node, position) => {
    const line = Math.floor(position / perLine), slot = position % perLine;
    const inLine = Math.min(perLine, loners.length - line * perLine);
    const along = inLine === 1 ? 0.5 : slot / (inLine - 1);
    const across = (line + 0.5) / columns;
    result[node] = wide
      ? { x: Math.round((padX * 0.75 + across * (lane - padX * 0.75)) * 10) / 10, y: Math.round((padY + along * room) * 10) / 10 }
      : { x: Math.round((padX + along * room) * 10) / 10, y: Math.round((height - lane + across * (lane - padY * 0.5)) * 10) / 10 };
  });
  return result;
}

/**
 * A deterministic force-directed layout (Fruchterman–Reingold). Nodes start on a circle in
 * group order, so people in the same category begin side by side; linked nodes pull together,
 * every pair pushes apart, and a weak pull keeps the drawing centred.
 */
function springLayout(count: number, edges: [number, number][], groups: number[], width: number, height: number, padX: number, padY: number): Point[] {
  const cx = width / 2, cy = height / 2;
  if (count === 0) return [];
  if (count === 1) return [{ x: cx, y: cy }];
  const order = Array.from({ length: count }, (_, index) => index).sort((a, b) => groups[a] - groups[b] || a - b);
  const radius = Math.min(width - 2 * padX, height - 2 * padY) / 2;
  const position: Point[] = new Array(count);
  order.forEach((node, slot) => {
    const angle = (slot / count) * Math.PI * 2 - Math.PI / 2;
    position[node] = { x: cx + Math.cos(angle) * radius, y: cy + Math.sin(angle) * radius };
  });
  const k = 0.8 * Math.sqrt(((width - 2 * padX) * (height - 2 * padY)) / count);
  let temperature = Math.min(width, height) / 8;
  const dx = new Float64Array(count), dy = new Float64Array(count);
  const pull = 0.06 * k / 40;
  for (let step = 0; step < 300; step++) {
    dx.fill(0); dy.fill(0);
    for (let a = 0; a < count; a++) for (let b = a + 1; b < count; b++) {
      const x = position[a].x - position[b].x, y = position[a].y - position[b].y;
      const distance = Math.max(Math.hypot(x, y), 0.01);
      const force = (k * k) / distance * (groups[a] === groups[b] ? 0.85 : 1.15);
      dx[a] += (x / distance) * force; dy[a] += (y / distance) * force;
      dx[b] -= (x / distance) * force; dy[b] -= (y / distance) * force;
    }
    for (const [a, b] of edges) {
      const x = position[a].x - position[b].x, y = position[a].y - position[b].y;
      const distance = Math.max(Math.hypot(x, y), 0.01);
      const force = (distance * distance) / k;
      dx[a] -= (x / distance) * force; dy[a] -= (y / distance) * force;
      dx[b] += (x / distance) * force; dy[b] += (y / distance) * force;
    }
    for (let node = 0; node < count; node++) {
      dx[node] += (cx - position[node].x) * pull;
      dy[node] += (cy - position[node].y) * pull;
      const length = Math.hypot(dx[node], dy[node]);
      if (length > 0) {
        const move = Math.min(length, temperature);
        position[node] = { x: position[node].x + (dx[node] / length) * move, y: position[node].y + (dy[node] / length) * move };
      }
    }
    temperature = Math.max(temperature * 0.97, 0.6);
  }
  // Turn the drawing so its long side runs along the box's long side.
  const meanX = position.reduce((sum, point) => sum + point.x, 0) / count, meanY = position.reduce((sum, point) => sum + point.y, 0) / count;
  let xx = 0, yy = 0, xy = 0;
  for (const point of position) { xx += (point.x - meanX) ** 2; yy += (point.y - meanY) ** 2; xy += (point.x - meanX) * (point.y - meanY); }
  const angle = 0.5 * Math.atan2(2 * xy, xx - yy) - (width >= height ? 0 : Math.PI / 2);
  const cos = Math.cos(-angle), sin = Math.sin(-angle);
  const turned = position.map(point => ({ x: (point.x - meanX) * cos - (point.y - meanY) * sin, y: (point.x - meanX) * sin + (point.y - meanY) * cos }));
  // Fit it to the box, letting each axis stretch a little further than the other.
  const xs = turned.map(point => point.x), ys = turned.map(point => point.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const spanX = Math.max(maxX - minX, 1), spanY = Math.max(maxY - minY, 1);
  const fitX = (width - 2 * padX) / spanX, fitY = (height - 2 * padY) / spanY;
  const scale = Math.min(fitX, fitY, 2.4);
  const scaleX = Math.min(fitX, scale * 1.6), scaleY = Math.min(fitY, scale * 1.6);
  const fitted = turned.map(point => ({
    x: (width - spanX * scaleX) / 2 + (point.x - minX) * scaleX,
    y: (height - spanY * scaleY) / 2 + (point.y - minY) * scaleY,
  }));
  separate(fitted, width, height, padX, padY);
  return fitted.map(point => ({ x: Math.round(point.x * 10) / 10, y: Math.round(point.y * 10) / 10 }));
}

/** Pushes apart nodes that sit closer than `gap`, keeping them inside the padded box. */
function separate(points: Point[], width: number, height: number, padX: number, padY: number, gap = 92) {
  for (let pass = 0; pass < 60; pass++) {
    let moved = false;
    for (let a = 0; a < points.length; a++) for (let b = a + 1; b < points.length; b++) {
      const x = points[b].x - points[a].x, y = points[b].y - points[a].y;
      const distance = Math.hypot(x, y);
      if (distance >= gap) continue;
      moved = true;
      // Coincident points part along a fixed, index-based direction to stay deterministic.
      const ux = distance > 0.01 ? x / distance : Math.cos(a + b), uy = distance > 0.01 ? y / distance : Math.sin(a + b);
      const push = (gap - distance) / 2;
      points[a] = { x: points[a].x - ux * push, y: points[a].y - uy * push };
      points[b] = { x: points[b].x + ux * push, y: points[b].y + uy * push };
    }
    for (const point of points) {
      point.x = Math.min(Math.max(point.x, padX), width - padX);
      point.y = Math.min(Math.max(point.y, padY), height - padY);
    }
    if (!moved) break;
  }
}
