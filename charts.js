function safeCanvasSetup(canvas) {
  const context = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const width = canvas.clientWidth || 300;
  const height = canvas.clientHeight || 200;

  canvas.width = width * dpr;
  canvas.height = height * dpr;
  context.setTransform(dpr, 0, 0, dpr, 0, 0);

  return {
    context,
    width,
    height,
    dpr,
  };
}

function drawGrid(context, width, height, padding, steps = 4) {
  context.strokeStyle = 'rgba(148, 163, 184, 0.18)';
  context.lineWidth = 1;
  for (let i = 0; i <= steps; i += 1) {
    const y = padding.top + ((height - padding.top - padding.bottom) / steps) * i;
    context.beginPath();
    context.moveTo(padding.left, y);
    context.lineTo(width - padding.right, y);
    context.stroke();
  }
}

function formatPercentage(value) {
  return `${Math.round(value)}%`;
}

export function renderLineChart(canvas, labels, values, options = {}) {
  const { color = '#5b7cff', fillColor = 'rgba(91, 124, 255, 0.18)', yMax = 100, labelFormatter = formatPercentage } = options;
  const { context, width, height } = safeCanvasSetup(canvas);
  context.clearRect(0, 0, width, height);

  const padding = { top: 15, right: 20, bottom: 35, left: 35 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  drawGrid(context, width, height, padding, 4);

  context.strokeStyle = 'rgba(100, 116, 139, 0.35)';
  context.beginPath();
  context.moveTo(padding.left, padding.top);
  context.lineTo(padding.left, height - padding.bottom);
  context.lineTo(width - padding.right, height - padding.bottom);
  context.stroke();

  if (values.length === 0 || labels.length === 0) {
    context.fillStyle = '#8aa0c9';
    context.font = '14px sans-serif';
    context.fillText('No data available', width / 2 - 55, height / 2);
    return;
  }

  const points = values.map((value, index) => {
    const x = padding.left + (plotWidth / Math.max(values.length - 1, 1)) * index;
    const y = height - padding.bottom - ((value / yMax) * plotHeight);
    return { x, y, value, label: labels[index] };
  });

  context.beginPath();
  points.forEach((point, index) => {
    if (index === 0) {
      context.moveTo(point.x, point.y);
    } else {
      context.lineTo(point.x, point.y);
    }
  });
  context.strokeStyle = color;
  context.lineWidth = 2.5;
  context.stroke();

  context.beginPath();
  context.moveTo(points[0].x, height - padding.bottom);
  points.forEach((point) => context.lineTo(point.x, point.y));
  context.lineTo(points[points.length - 1].x, height - padding.bottom);
  context.closePath();
  context.fillStyle = fillColor;
  context.fill();

  points.forEach((point) => {
    context.beginPath();
    context.arc(point.x, point.y, 4, 0, Math.PI * 2);
    context.fillStyle = color;
    context.fill();
    context.fillStyle = '#cbd5e1';
    context.font = '11px sans-serif';
    context.textAlign = 'center';
    context.fillText(labelFormatter(point.value), point.x, point.y - 12);
  });

  context.fillStyle = '#8aa0c9';
  context.font = '11px sans-serif';
  context.textAlign = 'center';
  labels.forEach((label, index) => {
    const x = padding.left + (plotWidth / Math.max(labels.length - 1, 1)) * index;
    context.fillText(label, x, height - 10);
  });
}

export function renderBarChart(canvas, labels, values, options = {}) {
  const {
    colors = ['#5b7cff', '#2dd4bf', '#f59e0b', '#f87171', '#a78bfa'],
    maxValue = 100,
    formatter = formatPercentage,
  } = options;
  const { context, width, height } = safeCanvasSetup(canvas);
  context.clearRect(0, 0, width, height);

  const padding = { top: 15, right: 20, bottom: 35, left: 35 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  drawGrid(context, width, height, padding, 4);

  context.strokeStyle = 'rgba(100, 116, 139, 0.35)';
  context.beginPath();
  context.moveTo(padding.left, padding.top);
  context.lineTo(padding.left, height - padding.bottom);
  context.lineTo(width - padding.right, height - padding.bottom);
  context.stroke();

  if (values.length === 0 || labels.length === 0) {
    context.fillStyle = '#8aa0c9';
    context.font = '14px sans-serif';
    context.fillText('No data available', width / 2 - 55, height / 2);
    return;
  }

  const gap = 12;
  const barWidth = Math.max((plotWidth - gap * Math.max(values.length - 1, 0)) / values.length, 20);

  values.forEach((value, index) => {
    const x = padding.left + (index * (barWidth + gap)) + 4;
    const barHeight = (value / maxValue) * plotHeight;
    const y = height - padding.bottom - barHeight;

    context.fillStyle = colors[index % colors.length];
    context.fillRect(x, y, barWidth, barHeight);

    context.fillStyle = '#cbd5e1';
    context.font = '11px sans-serif';
    context.textAlign = 'center';
    context.fillText(formatter(value), x + barWidth / 2, y - 6);

    context.fillStyle = '#8aa0c9';
    context.fillText(labels[index], x + barWidth / 2, height - 10);
  });
}

export function renderDonutChart(canvas, completed, incomplete) {
  const { context, width, height } = safeCanvasSetup(canvas);
  context.clearRect(0, 0, width, height);

  const total = completed + incomplete;
  if (total === 0) {
    context.fillStyle = '#8aa0c9';
    context.font = '14px sans-serif';
    context.textAlign = 'center';
    context.fillText('No tasks yet', width / 2, height / 2);
    return;
  }

  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(width, height) * 0.32;

  const completedAngle = (completed / total) * Math.PI * 2;
  const incompleteAngle = Math.PI * 2 - completedAngle;

  context.beginPath();
  context.moveTo(centerX, centerY);
  context.arc(centerX, centerY, radius, -Math.PI / 2, -Math.PI / 2 + completedAngle);
  context.closePath();
  context.fillStyle = '#22c55e';
  context.fill();

  context.beginPath();
  context.moveTo(centerX, centerY);
  context.arc(centerX, centerY, radius, -Math.PI / 2 + completedAngle, -Math.PI / 2 + completedAngle + incompleteAngle);
  context.closePath();
  context.fillStyle = '#94a3b8';
  context.fill();

  context.beginPath();
  context.arc(centerX, centerY, radius * 0.55, 0, Math.PI * 2);
  context.fillStyle = '#0f172a';
  context.fill();

  context.fillStyle = '#f8fafc';
  context.font = '600 18px sans-serif';
  context.textAlign = 'center';
  const value = total === 0 ? 0 : Math.round((completed / total) * 100);
  context.fillText(`${value}%`, centerX, centerY + 6);
}
