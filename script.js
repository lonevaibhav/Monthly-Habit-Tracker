const habitsInput = document.getElementById('habits-input');
const generateBtn = document.getElementById('generate-btn');
const clearBtn = document.getElementById('clear-btn');
const trackerSection = document.getElementById('tracker-section');
const trackerTable = document.getElementById('tracker-table');
const daySelect = document.getElementById('day-select');
const feedbackText = document.getElementById('feedback-text');
const analysisText = document.getElementById('analysis-text');
const scoreChart = document.getElementById('score-chart');

const STORAGE_KEY = 'monthlyHabitTrackerData';
const HISTORY_KEY = 'monthlyHabitTrackerHistory';
const DAYS = 30;
const MAX_HISTORY = 10;

let historySection = null;
let historyList = null;

function initHistoryElements() {
  historySection = document.getElementById('history-section');
  historyList = document.getElementById('history-list');
}

function buildTracker(habits, savedData = {}) {
  trackerTable.innerHTML = '';

  const headRow = document.createElement('tr');
  const habitHeader = document.createElement('th');
  habitHeader.textContent = 'Habit / Day';
  headRow.appendChild(habitHeader);

  for (let day = 1; day <= DAYS; day += 1) {
    const dayHeader = document.createElement('th');
    dayHeader.textContent = day;
    headRow.appendChild(dayHeader);
  }

  trackerTable.appendChild(headRow);

  habits.forEach((habit, habitIndex) => {
    const row = document.createElement('tr');
    const nameCell = document.createElement('td');
    nameCell.className = 'habit-name';
    nameCell.textContent = habit;
    row.appendChild(nameCell);

    for (let day = 1; day <= DAYS; day += 1) {
      const cell = document.createElement('td');
      const label = document.createElement('label');
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.dataset.habitIndex = habitIndex.toString();
      checkbox.dataset.day = day.toString();

      const checked = savedData?.[habitIndex]?.[day] === true;
      checkbox.checked = checked;

      checkbox.addEventListener('change', () => {
        const newState = persistCheckboxState(habits, trackerTable);
        updateSummary(habits, newState);
      });

      label.appendChild(checkbox);
      cell.appendChild(label);
      row.appendChild(cell);
    }

    trackerTable.appendChild(row);
  });
}

function getHabitsFromInput() {
  const lines = habitsInput.value.split('\n');
  return lines
    .map(line => line.trim())
    .filter(line => line.length > 0);
}

function persistTracker(habits, state) {
  const payload = {
    habits,
    state,
    updatedAt: new Date().toISOString(),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

function persistCheckboxState(habits, table) {
  const state = {};

  habits.forEach((_, habitIndex) => {
    state[habitIndex] = {};
  });

  table.querySelectorAll('input[type="checkbox"]').forEach(input => {
    const habitIndex = input.dataset.habitIndex;
    const day = input.dataset.day;
    state[habitIndex][day] = input.checked;
  });

  persistTracker(habits, state);
  return state;
}

function loadSavedTracker() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function loadHistory() {
  const raw = localStorage.getItem(HISTORY_KEY);
  if (!raw) return [];

  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveToHistory(habits, state) {
  const history = loadHistory();
  const snapshot = {
    id: Date.now(),
    habits,
    state,
    createdAt: new Date().toISOString(),
    totalScore: Object.values(state).reduce((sum, dayScores) => {
      return sum + Object.values(dayScores).filter(v => v === true).length;
    }, 0),
  };

  history.unshift(snapshot);
  if (history.length > MAX_HISTORY) {
    history.pop();
  }

  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  renderHistory();
}

function renderHistory() {
  const history = loadHistory();
  if (!historyList || !historySection) return;

  if (history.length === 0) {
    historySection.classList.add('hidden');
    return;
  }

  historySection.classList.remove('hidden');
  historyList.innerHTML = '';

  history.forEach(snapshot => {
    const date = new Date(snapshot.createdAt);
    const formattedDate = date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const item = document.createElement('div');
    item.className = 'history-item';

    const score = snapshot.totalScore;
    const maxScore = snapshot.habits.length * DAYS;
    const percentage = maxScore > 0 ? ((score / maxScore) * 100).toFixed(0) : 0;

    const habitsPreview = snapshot.habits.slice(0, 2).join(', ') + (snapshot.habits.length > 2 ? ` +${snapshot.habits.length - 2} more` : '');

    item.innerHTML = `
      <div class="history-item-date">${formattedDate}</div>
      <div class="history-item-habits">
        ${snapshot.habits.length} habit${snapshot.habits.length === 1 ? '' : 's'}
        <span>${habitsPreview}</span>
      </div>
      <div class="history-item-score">Score: ${score} points (${percentage}%)</div>
      <div class="history-item-actions">
        <button data-action="view" data-id="${snapshot.id}">View</button>
        <button data-action="restore" data-id="${snapshot.id}">Restore</button>
      </div>
    `;

    historyList.appendChild(item);
  });

  historyList.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const action = btn.dataset.action;
      const id = parseInt(btn.dataset.id, 10);
      const snapshot = history.find(s => s.id === id);
      if (!snapshot) return;

      if (action === 'restore') {
        habitsInput.value = snapshot.habits.join('\n');
        showTracker(snapshot.habits, snapshot.state);
        persistTracker(snapshot.habits, snapshot.state);
      } else if (action === 'view') {
        showHistoryModal(snapshot);
      }
    });
  });
}

function showHistoryModal(snapshot) {
  const date = new Date(snapshot.createdAt);
  const formattedDate = date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const score = snapshot.totalScore;
  const maxScore = snapshot.habits.length * DAYS;
  const percentage = maxScore > 0 ? ((score / maxScore) * 100).toFixed(0) : 0;

  let message = `Plan from ${formattedDate}\n\nHabits:\n${snapshot.habits.map(h => '• ' + h).join('\n')}\n\nTotal Score: ${score}/${maxScore} points (${percentage}%)\n\nClick "Restore" to load this plan.`;
  window.alert(message);
}

function showTracker(habits, savedData = {}) {
  if (habits.length === 0) {
    trackerSection.classList.add('hidden');
    return;
  }

  trackerSection.classList.remove('hidden');
  buildTracker(habits, savedData);
  updateSummary(habits, savedData);
}

function updateSummary(habits, savedData = {}) {
  const scores = computeDailyScores(habits, savedData);
  populateDaySelect();
  updateSelectedDaySummary(scores, habits.length);
  updateMonthAnalysis(scores, habits.length);
  drawScoreChart(scores, habits.length);
}

function computeDailyScores(habits, state = {}) {
  return Array.from({ length: DAYS }, (_, idx) => {
    const day = idx + 1;
    return habits.reduce((sum, _, habitIndex) => {
      return sum + (state?.[habitIndex]?.[day] === true ? 1 : 0);
    }, 0);
  });
}

function populateDaySelect() {
  const selectedValue = parseInt(daySelect.value, 10) || 1;
  daySelect.innerHTML = '';

  for (let day = 1; day <= DAYS; day += 1) {
    const option = document.createElement('option');
    option.value = day;
    option.textContent = `Day ${day}`;
    daySelect.appendChild(option);
  }

  daySelect.value = selectedValue <= DAYS ? selectedValue : 1;
}

function updateSelectedDaySummary(scores, habitCount) {
  const selectedDay = parseInt(daySelect.value, 10) || 1;
  const score = scores[selectedDay - 1] ?? 0;
  feedbackText.textContent = getFeedbackMessage(score, habitCount);
}

function getFeedbackMessage(score, totalHabits) {
  if (totalHabits === 0) {
    return 'Enter habits and generate a plan to get daily feedback.';
  }

  if (score === 0) {
    return 'No habits completed on this day yet. Start small and build momentum tomorrow.';
  }

  if (score === totalHabits) {
    return `Perfect day! You completed all ${totalHabits} habit${totalHabits === 1 ? '' : 's'} today.`;
  }

  const ratio = score / totalHabits;
  if (ratio >= 0.8) {
    return `Great day! You completed ${score}/${totalHabits} habits. Keep this consistency going.`;
  }
  if (ratio >= 0.5) {
    return `Good progress — ${score}/${totalHabits} habits finished. Focus on the remaining habits tomorrow.`;
  }
  return `You completed ${score}/${totalHabits} habits. Use this as a reminder to make one more small step next time.`;
}

function updateMonthAnalysis(scores, habitCount) {
  if (habitCount === 0 || scores.length === 0) {
    analysisText.textContent = 'Generate your plan to see month-end totals, average score, and your best days.';
    return;
  }

  const totalPoints = scores.reduce((sum, value) => sum + value, 0);
  const bestScore = Math.max(...scores);
  const bestDays = scores.reduce((days, value, idx) => {
    if (value === bestScore) days.push(idx + 1);
    return days;
  }, []);
  const average = (totalPoints / scores.length).toFixed(1);
  const percentage = ((totalPoints / (scores.length * habitCount)) * 100).toFixed(0);
  const missedDays = scores.filter(value => value < habitCount).length;

  analysisText.textContent = `This month you scored ${totalPoints} points over ${scores.length} days, averaging ${average} out of ${habitCount} habits per day (${percentage}% completion). Best day${bestDays.length === 1 ? '' : 's'}: ${bestDays.join(', ')}. ${missedDays === 0 ? 'You completed every habit every day — excellent consistency!' : `You had ${missedDays} day${missedDays === 1 ? '' : 's'} with room to improve.`}`;
}

function drawScoreChart(scores, habitCount) {
  const ctx = scoreChart.getContext('2d');
  const width = scoreChart.width;
  const height = scoreChart.height;
  ctx.clearRect(0, 0, width, height);

  if (!scores.length || habitCount === 0) {
    ctx.fillStyle = '#6b7280';
    ctx.font = '16px Inter, sans-serif';
    ctx.fillText('No score data available yet.', 24, height / 2);
    return;
  }

  const margin = 40;
  const chartWidth = width - margin * 2;
  const chartHeight = height - margin * 2;
  const maxScore = Math.max(habitCount, ...scores);
  const stepY = chartHeight / maxScore;
  const stepX = chartWidth / (scores.length - 1);

  ctx.strokeStyle = '#dbeafe';
  ctx.lineWidth = 1;
  for (let i = 0; i <= maxScore; i += 1) {
    const y = margin + chartHeight - i * stepY;
    ctx.beginPath();
    ctx.moveTo(margin, y);
    ctx.lineTo(width - margin, y);
    ctx.stroke();
  }

  ctx.beginPath();
  ctx.moveTo(margin, margin + chartHeight - scores[0] * stepY);
  scores.forEach((value, index) => {
    const x = margin + index * stepX;
    const y = margin + chartHeight - value * stepY;
    ctx.lineTo(x, y);
  });
  ctx.strokeStyle = '#4338ca';
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.fillStyle = '#4338ca';
  scores.forEach((value, index) => {
    const x = margin + index * stepX;
    const y = margin + chartHeight - value * stepY;
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.fillStyle = '#111827';
  ctx.font = '12px Inter, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('Points', 12, margin - 6);
  ctx.fillText('Day', width - 40, height - 10);
}

function clearPlan() {
  localStorage.removeItem(STORAGE_KEY);
  habitsInput.value = '';
  trackerSection.classList.add('hidden');
  trackerTable.innerHTML = '';
}

generateBtn.addEventListener('click', () => {
  const habits = getHabitsFromInput();
  if (habits.length === 0) {
    window.alert('Please enter at least one habit.');
    return;
  }

  const saved = loadSavedTracker();
  const savedData = saved && arraysEqual(saved.habits, habits) ? saved.state : {};
  showTracker(habits, savedData);
  persistTracker(habits, savedData);
  saveToHistory(habits, savedData);
});

clearBtn.addEventListener('click', () => {
  if (window.confirm('Clear the saved plan and start fresh?')) {
    clearPlan();
  }
});

daySelect.addEventListener('change', () => {
  const habits = getHabitsFromInput();
  const saved = loadSavedTracker();
  const savedData = saved && arraysEqual(saved.habits, habits) ? saved.state : {};
  const scores = computeDailyScores(habits, savedData);
  updateSelectedDaySummary(scores, habits.length);
});

function arraysEqual(a, b) {
  if (a.length !== b.length) return false;
  return a.every((value, index) => value === b[index]);
}

window.addEventListener('DOMContentLoaded', () => {
  initHistoryElements();
  renderHistory();
  
  const saved = loadSavedTracker();
  if (!saved) return;

  habitsInput.value = saved.habits.join('\n');
  showTracker(saved.habits, saved.state);
});
