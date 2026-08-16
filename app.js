import {
  addTask,
  clearAllTasks,
  deleteTask,
  exportAppData,
  getAllTasks,
  getTaskStatsForDate,
  importAppData,
  updateTask,
  validateTaskInput,
} from './database.js';
import { renderBarChart, renderDonutChart, renderLineChart } from './charts.js';

const DEFAULT_SETTINGS = {
  dailyGoal: 8,
  defaultPriority: 'medium',
  defaultCategory: 'Other',
  timeFormat: '24h',
  confirmDelete: true,
  theme: 'light',
};

const state = {
  tasks: [],
  selectedDate: getLocalDateString(new Date()),
  activeView: 'dashboard',
  theme: localStorage.getItem('task-tracker-theme') || 'light',
  calendarMonth: new Date().getMonth(),
  calendarYear: new Date().getFullYear(),
};

const elements = {
  pageTitle: document.getElementById('pageTitle'),
  todayDateLabel: document.getElementById('todayDateLabel'),
  totalTasksToday: document.getElementById('totalTasksToday'),
  completedTasksToday: document.getElementById('completedTasksToday'),
  remainingTasksToday: document.getElementById('remainingTasksToday'),
  todayProgressBar: document.getElementById('todayProgressBar').firstElementChild,
  todayProgressText: document.getElementById('todayProgressText'),
  datePicker: document.getElementById('datePicker'),
  searchInput: document.getElementById('searchInput'),
  statusFilter: document.getElementById('statusFilter'),
  priorityFilter: document.getElementById('priorityFilter'),
  categoryFilter: document.getElementById('categoryFilter'),
  sortFilter: document.getElementById('sortFilter'),
  taskList: document.getElementById('taskList'),
  dateTabs: [...document.querySelectorAll('.date-tab')],
  navItems: [...document.querySelectorAll('.nav-item')],
  dailyChart: document.getElementById('dailyChart'),
  weeklyChart: document.getElementById('weeklyChart'),
  monthlyChart: document.getElementById('monthlyChart'),
  taskSplitChart: document.getElementById('taskSplitChart'),
  calendarGrid: document.getElementById('calendarGrid'),
  calendarMonthLabel: document.getElementById('calendarMonthLabel'),
  prevMonthBtn: document.getElementById('prevMonthBtn'),
  nextMonthBtn: document.getElementById('nextMonthBtn'),
  overallCompletionValue: document.getElementById('overallCompletionValue'),
  overallCompletionBar: document.getElementById('overallCompletionBar'),
  progressLabelText: document.getElementById('progressLabelText'),
  totalTrackedTasksValue: document.getElementById('totalTrackedTasksValue'),
  completedTrackedTasksValue: document.getElementById('completedTrackedTasksValue'),
  incompleteTrackedTasksValue: document.getElementById('incompleteTrackedTasksValue'),
  dailyGoalValue: document.getElementById('dailyGoalValue'),
  productivityScoreValue: document.getElementById('productivityScoreValue'),
  streakValue: document.getElementById('streakValue'),
  settingsGoal: document.getElementById('settingsGoal'),
  settingsPriority: document.getElementById('settingsPriority'),
  settingsCategory: document.getElementById('settingsCategory'),
  settingsTimeFormat: document.getElementById('settingsTimeFormat'),
  settingsConfirmDelete: document.getElementById('settingsConfirmDelete'),
  saveSettingsBtn: document.getElementById('saveSettingsBtn'),
  addTaskBtn: document.getElementById('addTaskBtn'),
  exportBtn: document.getElementById('exportBtn'),
  importBtn: document.getElementById('importBtn'),
  importFileInput: document.getElementById('importFileInput'),
  themeToggle: document.getElementById('themeToggle'),
  resetDataBtn: document.getElementById('resetDataBtn'),
  taskModal: document.getElementById('taskModal'),
  taskForm: document.getElementById('taskForm'),
  taskModalTitle: document.getElementById('taskModalTitle'),
  taskId: document.getElementById('taskId'),
  taskTitle: document.getElementById('taskTitle'),
  taskDescription: document.getElementById('taskDescription'),
  taskDate: document.getElementById('taskDate'),
  taskPriority: document.getElementById('taskPriority'),
  taskCategory: document.getElementById('taskCategory'),
  taskRecurrence: document.getElementById('taskRecurrence'),
  taskStartTime: document.getElementById('taskStartTime'),
  taskDueTime: document.getElementById('taskDueTime'),
  taskCustomCategory: document.getElementById('taskCustomCategory'),
  customCategoryWrap: document.getElementById('customCategoryWrap'),
  closeTaskModalBtn: document.getElementById('closeTaskModalBtn'),
  cancelTaskBtn: document.getElementById('cancelTaskBtn'),
  toastContainer: document.getElementById('toastContainer'),
  mobileNavToggle: document.getElementById('mobileNavToggle'),
  taskDetailsPanel: document.getElementById('taskDetailsPanel'),
  taskDetailsContent: document.getElementById('taskDetailsContent'),
  closeDetailsBtn: document.getElementById('closeDetailsBtn'),
};

document.addEventListener('DOMContentLoaded', init);

const SETTINGS_KEY = 'task-tracker-settings';

function getSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
    return { ...DEFAULT_SETTINGS, ...saved };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

function saveSettings(settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

function syncSettingsUI() {
  const settings = getSettings();
  elements.settingsGoal.value = settings.dailyGoal || 8;
  elements.settingsPriority.value = settings.defaultPriority || 'medium';
  elements.settingsCategory.value = settings.defaultCategory || 'Other';
  elements.settingsTimeFormat.value = settings.timeFormat || '24h';
  elements.settingsConfirmDelete.checked = settings.confirmDelete !== false;
}

function saveSettingsFromUI() {
  const settings = {
    dailyGoal: Number(elements.settingsGoal.value) || 8,
    defaultPriority: elements.settingsPriority.value,
    defaultCategory: elements.settingsCategory.value,
    timeFormat: elements.settingsTimeFormat.value,
    confirmDelete: elements.settingsConfirmDelete.checked,
  };
  saveSettings(settings);
  showToast('Settings saved', 'success');
}

function formatTime(value, format = getSettings().timeFormat || '24h') {
  if (!value) return '—';
  const [hours, minutes] = value.split(':');
  const hour = Number(hours);
  const minute = minutes || '00';

  if (format === '12h') {
    const suffix = hour >= 12 ? 'PM' : 'AM';
    const hour12 = (hour % 12) || 12;
    return `${hour12}:${minute} ${suffix}`;
  }

  return `${String(hour).padStart(2, '0')}:${minute}`;
}

function applyTheme() {
  document.body.classList.toggle('dark', state.theme === 'dark');
  elements.themeToggle.textContent = state.theme === 'dark' ? '☀️' : '🌙';
  localStorage.setItem('task-tracker-theme', state.theme);
}

function toggleTheme() {
  state.theme = state.theme === 'dark' ? 'light' : 'dark';
  applyTheme();
}

function addDays(date, offset) {
  const next = new Date(date);
  next.setDate(next.getDate() + offset);
  return next;
}

function getLocalDateString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getDateFromLabel(label) {
  const [month, day] = label.split(' ');
  const currentYear = new Date().getFullYear();
  return new Date(`${currentYear} ${month} ${day}`).toISOString().slice(0, 10);
}

function getRelativeDate(type) {
  const today = new Date();
  const offset = type === 'yesterday' ? -1 : type === 'tomorrow' ? 1 : 0;
  return getLocalDateString(addDays(today, offset));
}

function formatDateLabel(dateString) {
  const date = new Date(dateString + 'T12:00:00');
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function getShortDateLabel(dateString) {
  const date = new Date(dateString + 'T12:00:00');
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getStatsForDate(tasks, date) {
  const matching = tasks.filter((task) => task.date === date);
  const total = matching.length;
  const completed = matching.filter((task) => task.completed).length;
  const incomplete = total - completed;
  const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);
  return { total, completed, incomplete, percentage };
}

function getProgressLabel(percentage) {
  if (percentage === 100) return 'Complete';
  if (percentage >= 75) return 'Very good progress';
  if (percentage >= 50) return 'Good progress';
  if (percentage >= 25) return 'Moderate progress';
  return 'Low progress';
}

function getCompletionClass(percentage) {
  if (percentage === 100) return 'complete';
  if (percentage >= 75) return 'high';
  if (percentage >= 50) return 'medium';
  return 'low';
}

function isTaskOverdue(task) {
  if (task.completed) return false;
  if (!task.date) return false;
  const when = `${task.date}T${task.dueTime || '23:59'}`;
  return new Date(when) < new Date();
}

function getProductivityScore(tasks) {
  if (!tasks.length) return 0;
  const completed = tasks.filter((task) => task.completed).length;
  const completionPct = Math.round((completed / tasks.length) * 100);
  const highPriorityCompleted = tasks.filter((task) => task.completed && task.priority === 'high').length;
  const overdue = tasks.filter((task) => isTaskOverdue(task)).length;
  const score = Math.min(100, Math.round(completionPct * 0.55 + highPriorityCompleted * 12 + Math.max(0, 20 - overdue * 5)));
  return score;
}

function getCurrentStreak(tasks) {
  const dates = [...new Set(tasks.filter((task) => task.completed).map((task) => task.date))].sort();
  if (!dates.length) return 0;

  let streak = 0;
  const pointer = new Date();
  pointer.setHours(0, 0, 0, 0);

  for (let offset = 0; offset < 365; offset += 1) {
    const dateKey = getLocalDateString(addDays(pointer, -offset));
    if (dates.includes(dateKey)) {
      streak += 1;
    } else if (streak > 0) {
      break;
    }
  }

  return streak;
}

function getLongestStreak(tasks) {
  if (!tasks.length) return 0;
  const completedDates = [...new Set(tasks.filter((task) => task.completed).map((task) => task.date))].sort();
  if (!completedDates.length) return 0;

  let longest = 0;
  let current = 0;
  for (let i = 0; i < completedDates.length; i += 1) {
    const date = new Date(`${completedDates[i]}T12:00:00`);
    if (i === 0) {
      current = 1;
      longest = 1;
      continue;
    }
    const prev = new Date(`${completedDates[i - 1]}T12:00:00`);
    const diffDays = Math.round((date - prev) / (1000 * 60 * 60 * 24));
    if (diffDays === 1) {
      current += 1;
      longest = Math.max(longest, current);
    } else {
      current = 1;
    }
  }
  return longest;
}

function buildStreakHistory(tasks) {
  const history = [];
  const completedDates = new Set(tasks.filter((task) => task.completed).map((task) => task.date));
  for (let offset = 35; offset >= 0; offset -= 1) {
    const d = addDays(new Date(), -offset);
    const key = getLocalDateString(d);
    history.push({ key, done: completedDates.has(key) });
  }
  return history;
}

function getFilteredTasks() {
  const query = elements.searchInput.value.trim().toLowerCase();
  const statusFilter = elements.statusFilter.value;
  const priorityFilter = elements.priorityFilter.value;
  const categoryFilter = elements.categoryFilter.value;
  const sortValue = elements.sortFilter.value;

  let filtered = state.tasks.filter((task) => task.date === state.selectedDate);

  if (query) {
    filtered = filtered.filter((task) => `${task.title} ${task.description || ''} ${task.category || ''}`.toLowerCase().includes(query));
  }
  if (statusFilter === 'completed') filtered = filtered.filter((task) => task.completed);
  if (statusFilter === 'incomplete') filtered = filtered.filter((task) => !task.completed);
  if (priorityFilter !== 'all') filtered = filtered.filter((task) => task.priority === priorityFilter);
  if (categoryFilter !== 'all') filtered = filtered.filter((task) => (task.category || 'Other') === categoryFilter);

  filtered.sort((a, b) => {
    if (sortValue === 'date-asc') return new Date(a.date) - new Date(b.date);
    if (sortValue === 'priority-high') {
      const score = { high: 3, medium: 2, low: 1 };
      return score[b.priority] - score[a.priority];
    }
    if (sortValue === 'priority-low') {
      const score = { low: 3, medium: 2, high: 1 };
      return score[b.priority] - score[a.priority];
    }
    if (sortValue === 'time-asc') {
      const timeA = a.startTime || a.dueTime || '23:59';
      const timeB = b.startTime || b.dueTime || '23:59';
      return timeA.localeCompare(timeB) || new Date(a.createdAt) - new Date(b.createdAt);
    }
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  return filtered;
}

function renderDashboard() {
  const today = getLocalDateString(new Date());
  const todayStats = getStatsForDate(state.tasks, today);
  const totalOverall = state.tasks.length;
  const completedOverall = state.tasks.filter((task) => task.completed).length;
  const overallPercent = totalOverall === 0 ? 0 : Math.round((completedOverall / totalOverall) * 100);

  elements.todayDateLabel.textContent = formatDateLabel(today);
  elements.totalTasksToday.textContent = todayStats.total;
  elements.completedTasksToday.textContent = todayStats.completed;
  elements.remainingTasksToday.textContent = todayStats.incomplete;

  elements.todayProgressBar.style.width = `${todayStats.percentage}%`;
  elements.todayProgressText.textContent = `${todayStats.percentage}%`;

  elements.overallCompletionValue.textContent = `${overallPercent}%`;
  elements.overallCompletionBar.style.width = `${overallPercent}%`;
  elements.progressLabelText.textContent = getProgressLabel(overallPercent);
  elements.totalTrackedTasksValue.textContent = totalOverall;
  elements.completedTrackedTasksValue.textContent = completedOverall;
  elements.incompleteTrackedTasksValue.textContent = totalOverall - completedOverall;

  const settings = getSettings();
  const completedToday = todayStats.completed;
  elements.dailyGoalValue.textContent = `${completedToday}/${settings.dailyGoal || 8}`;
  elements.productivityScoreValue.textContent = `${getProductivityScore(state.tasks)}`;
  elements.streakValue.textContent = `${getCurrentStreak(state.tasks)} days`;

  const streakPanel = document.getElementById('streakHistory');
  if (streakPanel) {
    const history = buildStreakHistory(state.tasks);
    streakPanel.innerHTML = history
      .map(({ key, done }) => `<span class="streak-cell ${done ? 'done' : ''}" title="${key}">${done ? '✓' : ''}</span>`)
      .join('');
  }

  const longest = document.getElementById('longestStreakValue');
  if (longest) longest.textContent = `${getLongestStreak(state.tasks)} days`;
}

function renderTaskList() {
  const tasks = getFilteredTasks();

  if (!tasks.length) {
    elements.taskList.innerHTML = `
      <div class="empty-state">
        <div>
          <div class="empty-state-illustration" aria-hidden="true"></div>
          <p>No tasks for this day</p>
        </div>
      </div>
    `;
    return;
  }

  elements.taskList.innerHTML = tasks.map((task) => {
    const description = task.description ? `<p class="task-description">${escapeHtml(task.description)}</p>` : '';
    const category = task.category || 'Other';
    const dueBadge = task.dueTime ? `<span class="task-time">Due ${formatTime(task.dueTime, getSettings().timeFormat || '24h')}</span>` : '';
    const recurrence = task.recurrence && task.recurrence !== 'none' ? `<span class="task-recurrence">${task.recurrence}</span>` : '';
    const overdueClass = isTaskOverdue(task) ? 'overdue' : '';

    return `
      <article class="task-item ${task.completed ? 'completed' : ''} ${overdueClass}" data-id="${task.id}">
        <input class="task-check" type="checkbox" ${task.completed ? 'checked' : ''} aria-label="Mark task complete" />
        <div class="task-main">
          <div class="task-meta">
            <h3 class="task-title">${escapeHtml(task.title)}</h3>
            <span class="priority-pill ${task.priority}">${task.priority}</span>
            <span class="task-category">${escapeHtml(category)}</span>
            ${recurrence}
            ${dueBadge}
          </div>
          ${description}
        </div>
        <div class="task-actions">
          <button class="task-action-btn" data-action="view">Details</button>
          <button class="task-action-btn" data-action="edit">Edit</button>
          <button class="task-action-btn delete" data-action="delete">Delete</button>
        </div>
      </article>
    `;
  }).join('');
}

function renderStatistics() {
  const today = getLocalDateString(new Date());
  const todayStats = getStatsForDate(state.tasks, today);
  const total = state.tasks.length;
  const completed = state.tasks.filter((task) => task.completed).length;
  const incomplete = total - completed;
  elements.totalTasksToday.textContent = todayStats.total;
  elements.completedTasksToday.textContent = todayStats.completed;
  elements.remainingTasksToday.textContent = todayStats.incomplete;
  elements.todayProgressBar.style.width = `${todayStats.percentage}%`;
  elements.todayProgressText.textContent = `${todayStats.percentage}%`;
  elements.totalTrackedTasksValue.textContent = total;
  elements.completedTrackedTasksValue.textContent = completed;
  elements.incompleteTrackedTasksValue.textContent = incomplete;
  const goal = getSettings().dailyGoal || 8;
  elements.dailyGoalValue.textContent = `${todayStats.completed}/${goal}`;
  elements.productivityScoreValue.textContent = `${getProductivityScore(state.tasks)}`;
  elements.streakValue.textContent = `${getCurrentStreak(state.tasks)} days`;
  const longest = document.getElementById('longestStreakValue');
  if (longest) longest.textContent = `${getLongestStreak(state.tasks)} days`;
}

function renderCharts() {
  const dailyLabels = getLastNDates(7).map((date) => getShortDateLabel(date));
  const dailyValues = dailyLabels.map((label) => {
    const date = getDateFromLabel(label);
    return getStatsForDate(state.tasks, date).percentage;
  });

  renderLineChart(elements.dailyChart, dailyLabels, dailyValues, {
    color: '#5b7cff',
    fillColor: 'rgba(91, 124, 255, 0.18)',
    labelFormatter: (value) => `${value}%`,
  });

  const weeklyLabels = getWeekLabels();
  const weeklyValues = weeklyLabels.map(([start, end]) => getRangeCompletion(state.tasks, start, end));
  renderBarChart(elements.weeklyChart, weeklyLabels.map(([start]) => start.slice(5)), weeklyValues, {
    colors: ['#5b7cff', '#7dd3fc', '#2dd4bf', '#f59e0b', '#a78bfa'],
    maxValue: 100,
    formatter: (value) => `${Math.round(value)}%`,
  });

  const monthlyLabels = getLast6MonthLabels();
  const monthlyValues = monthlyLabels.map(([start, end]) => getRangeCompletion(state.tasks, start, end));
  renderBarChart(elements.monthlyChart, monthlyLabels.map(([start]) => monthLabel(start)), monthlyValues, {
    colors: ['#a78bfa', '#60a5fa', '#2dd4bf', '#facc15', '#fb7185', '#5b7cff'],
    maxValue: 100,
    formatter: (value) => `${Math.round(value)}%`,
  });

  const totalCompleted = state.tasks.filter((task) => task.completed).length;
  const totalIncomplete = state.tasks.filter((task) => !task.completed).length;
  renderDonutChart(elements.taskSplitChart, totalCompleted, totalIncomplete);
}

function renderCalendar() {
  const monthDate = new Date(state.calendarYear, state.calendarMonth, 1);
  elements.calendarMonthLabel.textContent = monthDate.toLocaleString('en-US', { month: 'long', year: 'numeric' });

  const firstDay = new Date(state.calendarYear, state.calendarMonth, 1);
  const lastDay = new Date(state.calendarYear, state.calendarMonth + 1, 0);
  const cells = [];

  for (let i = 0; i < firstDay.getDay(); i += 1) cells.push({ day: '', muted: true });
  for (let day = 1; day <= lastDay.getDate(); day += 1) {
    const date = new Date(state.calendarYear, state.calendarMonth, day);
    const dateString = getLocalDateString(date);
    const completion = getStatsForDate(state.tasks, dateString).percentage;
    cells.push({
      day,
      dateString,
      percentage: completion,
      selected: dateString === state.selectedDate,
      statusClass: getCompletionClass(completion),
    });
  }
  while (cells.length % 7 !== 0) cells.push({ day: '', muted: true });

  elements.calendarGrid.innerHTML = cells.map((cell) => {
    if (!cell.day) return '<div class="calendar-day muted"></div>';
    const classes = ['calendar-day', cell.statusClass];
    if (cell.selected) classes.push('selected');
    return `<button class="${classes.join(' ')}" type="button" data-date="${cell.dateString}"><strong>${cell.day}</strong><span>${cell.percentage}%</span></button>`;
  }).join('');

  elements.calendarGrid.querySelectorAll('.calendar-day').forEach((btn) => {
    btn.addEventListener('click', () => selectDate(btn.dataset.date));
  });
}

function openTaskModal(task = null) {
  const settings = getSettings();
  if (task) {
    elements.taskModalTitle.textContent = 'Edit task';
    elements.taskId.value = task.id;
    elements.taskTitle.value = task.title || '';
    elements.taskDescription.value = task.description || '';
    elements.taskDate.value = task.date || state.selectedDate;
    elements.taskPriority.value = task.priority || settings.defaultPriority || 'medium';
    elements.taskCategory.value = task.category || settings.defaultCategory || 'Other';
    elements.taskRecurrence.value = task.recurrence || 'none';
    elements.taskStartTime.value = task.startTime || '';
    elements.taskDueTime.value = task.dueTime || '';
    elements.taskCustomCategory.value = '';
  } else {
    elements.taskModalTitle.textContent = 'Add task';
    elements.taskId.value = '';
    elements.taskTitle.value = '';
    elements.taskDescription.value = '';
    elements.taskDate.value = state.selectedDate;
    elements.taskPriority.value = settings.defaultPriority || 'medium';
    elements.taskCategory.value = settings.defaultCategory || 'Other';
    elements.taskRecurrence.value = 'none';
    elements.taskStartTime.value = '';
    elements.taskDueTime.value = '';
    elements.taskCustomCategory.value = '';
  }

  const showCustom = elements.taskCategory.value === 'custom';
  elements.customCategoryWrap.classList.toggle('hidden', !showCustom);

  elements.taskModal.classList.remove('hidden');
  elements.taskModal.setAttribute('aria-hidden', 'false');
  elements.taskTitle.focus();
}

function closeTaskModal() {
  elements.taskModal.classList.add('hidden');
  elements.taskModal.setAttribute('aria-hidden', 'true');
  elements.taskForm.reset();
  elements.customCategoryWrap.classList.add('hidden');
}

function getTaskPayloadFromForm() {
  const customCategory = elements.taskCustomCategory.value.trim();
  const category = elements.taskCategory.value === 'custom' ? customCategory : elements.taskCategory.value;
  return {
    title: elements.taskTitle.value.trim(),
    description: elements.taskDescription.value.trim(),
    date: elements.taskDate.value,
    priority: elements.taskPriority.value,
    category: category || 'Other',
    startTime: elements.taskStartTime.value,
    dueTime: elements.taskDueTime.value,
    recurrence: elements.taskRecurrence.value,
  };
}

async function handleTaskSubmit(event) {
  event.preventDefault();

  const payload = getTaskPayloadFromForm();
  try {
    validateTaskInput(payload);
  } catch (error) {
    showToast(error.message, 'error');
    return;
  }

  const id = elements.taskId.value;
  try {
    if (id) {
      const existing = state.tasks.find((task) => task.id === id);
      await updateTask(id, {
        ...payload,
        completed: existing?.completed ?? false,
        completedAt: existing?.completedAt ?? null,
        updatedAt: new Date().toISOString(),
      });
      showToast('Task updated successfully', 'success');
    } else {
      await addTask({
        ...payload,
        completed: false,
        completedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      showToast('Task added successfully', 'success');
    }
  } catch (error) {
    showToast(error.message || 'Unable to save task.', 'error');
    return;
  }

  closeTaskModal();
  selectDate(payload.date);
  await refreshTaskData();
}

function selectDate(dateString) {
  state.selectedDate = dateString || getLocalDateString(new Date());
  setDatePickerValue(state.selectedDate);
  renderTaskList();
  renderDashboard();
  updateDateTabState();
  renderCalendar();

  const selectedStats = getStatsForDate(state.tasks, state.selectedDate);
  elements.pageTitle.textContent = `Tasks for ${formatDateLabel(state.selectedDate)}`;
  elements.overallCompletionValue.textContent = `${selectedStats.percentage}%`;
  elements.overallCompletionBar.style.width = `${selectedStats.percentage}%`;
  elements.progressLabelText.textContent = getProgressLabel(selectedStats.percentage);
}

function updateDateTabState() {
  const date = state.selectedDate;
  const today = getLocalDateString(new Date());
  const yesterday = getLocalDateString(addDays(new Date(), -1));
  const tomorrow = getLocalDateString(addDays(new Date(), 1));
  elements.dateTabs.forEach((button) => {
    const type = button.dataset.dateType;
    const expected = type === 'today' ? today : type === 'yesterday' ? yesterday : tomorrow;
    button.classList.toggle('active', date === expected);
  });
}

function setDatePickerValue(date) {
  elements.datePicker.value = date;
}

function setCalendarMonth(date) {
  state.calendarMonth = date.getMonth();
  state.calendarYear = date.getFullYear();
  renderCalendar();
}

function shiftCalendarMonth(offset) {
  const next = new Date(state.calendarYear, state.calendarMonth + offset, 1);
  setCalendarMonth(next);
}

function getLastNDates(days) {
  const dates = [];
  const base = new Date();
  for (let i = days - 1; i >= 0; i -= 1) dates.push(getLocalDateString(addDays(base, -i)));
  return dates;
}

function getWeekLabels() {
  const labels = [];
  const start = new Date();
  start.setDate(start.getDate() - 27);
  for (let i = 0; i < 5; i += 1) {
    const rangeStart = addDays(start, i * 7);
    const rangeEnd = addDays(rangeStart, 6);
    labels.push([getLocalDateString(rangeStart), getLocalDateString(rangeEnd)]);
  }
  return labels;
}

function getLast6MonthLabels() {
  const labels = [];
  const today = new Date();
  for (let i = 5; i >= 0; i -= 1) {
    const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
    labels.push([getLocalDateString(date), getLocalDateString(new Date(date.getFullYear(), date.getMonth() + 1, 0))]);
  }
  return labels;
}

function monthLabel(dateString) {
  const date = new Date(dateString + 'T12:00:00');
  return date.toLocaleDateString('en-US', { month: 'short' });
}

function getRangeCompletion(tasks, startDate, endDate) {
  const matches = tasks.filter((task) => {
    const taskDate = new Date(task.date + 'T12:00:00');
    return taskDate >= new Date(startDate + 'T12:00:00') && taskDate <= new Date(endDate + 'T12:00:00');
  });
  if (!matches.length) return 0;
  const completed = matches.filter((task) => task.completed).length;
  return Math.round((completed / matches.length) * 100);
}

async function exportTasks() {
  const jsonString = await exportAppData();
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'task-export.json';
  anchor.click();
  URL.revokeObjectURL(url);
  showToast('Tasks exported as JSON', 'success');
}

async function handleImportFile(event) {
  const [file] = event.target.files;
  if (!file) return;
  try {
    const text = await file.text();
    const parsed = JSON.parse(text);
    if (!parsed || !Array.isArray(parsed.tasks)) throw new Error('Invalid data file.');
    const replace = window.confirm('Replace existing tasks with this file? Press Cancel to merge.');
    await importAppData(parsed, replace ? 'replace' : 'merge');
    showToast('Tasks imported successfully', 'success');
    elements.importFileInput.value = '';
    await refreshTaskData();
  } catch (error) {
    showToast(error.message || 'Import failed. Please use a valid JSON export.', 'error');
  }
}

async function handleResetAllData() {
  const confirmed = window.confirm('This will permanently remove all tasks. Continue?');
  if (!confirmed) return;
  await clearAllTasks();
  showToast('All tasks were reset', 'warning');
  await refreshTaskData();
}

function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  elements.toastContainer.appendChild(toast);
  window.setTimeout(() => toast.remove(), 2800);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function displayTaskDetails(taskId) {
  const task = state.tasks.find((item) => item.id === taskId);
  if (!task) return;

  const created = new Date(task.createdAt).toLocaleString();
  const updated = new Date(task.updatedAt).toLocaleString();
  const completedAt = task.completedAt ? new Date(task.completedAt).toLocaleString() : 'Not completed';

  elements.taskDetailsContent.innerHTML = `
    <div class="detail-row"><strong>Title:</strong> ${escapeHtml(task.title)}</div>
    <div class="detail-row"><strong>Description:</strong> ${escapeHtml(task.description || 'No description')}</div>
    <div class="detail-row"><strong>Category:</strong> ${escapeHtml(task.category || 'Other')}</div>
    <div class="detail-row"><strong>Priority:</strong> ${escapeHtml(task.priority)}</div>
    <div class="detail-row"><strong>Created:</strong> ${escapeHtml(created)}</div>
    <div class="detail-row"><strong>Last updated:</strong> ${escapeHtml(updated)}</div>
    <div class="detail-row"><strong>Completed:</strong> ${escapeHtml(completedAt)}</div>
    <div class="detail-row"><strong>Due time:</strong> ${task.dueTime ? escapeHtml(formatTime(task.dueTime, getSettings().timeFormat || '24h')) : 'Not set'}</div>
    <div class="detail-row"><strong>Recurrence:</strong> ${escapeHtml(task.recurrence || 'none')}</div>
  `;
  elements.taskDetailsPanel.classList.remove('hidden');
}

function bindKeyboardShortcuts() {
  document.addEventListener('keydown', (event) => {
    const tag = event.target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
      if (event.key === 'Escape') closeTaskModal();
      return;
    }

    const key = event.key.toLowerCase();
    if (event.key === 'Escape') {
      closeTaskModal();
      elements.taskDetailsPanel.classList.add('hidden');
      return;
    }
    if (key === 'n') openTaskModal();
    if (key === 't') selectDate(getLocalDateString(new Date()));
    if (key === 'y') selectDate(getLocalDateString(addDays(new Date(), -1)));
    if (key === 'm') selectDate(getLocalDateString(addDays(new Date(), 1)));
    if (key === '/') {
      event.preventDefault();
      elements.searchInput.focus();
    }
  });
}

function bindEvents() {
  elements.dateTabs.forEach((button) => {
    button.addEventListener('click', () => selectDate(getRelativeDate(button.dataset.dateType)));
  });

  elements.navItems.forEach((item) => {
    item.addEventListener('click', () => {
      const view = item.dataset.view;
      state.activeView = view;
      if (view === 'today' || view === 'yesterday' || view === 'tomorrow') selectDate(getRelativeDate(view));
      if (view === 'calendar') setCalendarMonth(new Date(state.selectedDate));
      elements.navItems.forEach((btn) => btn.classList.toggle('active', btn.dataset.view === view));
    });
  });

  elements.datePicker.addEventListener('change', (event) => {
    if (event.target.value) selectDate(event.target.value);
  });

  elements.searchInput.addEventListener('input', renderTaskList);
  elements.statusFilter.addEventListener('change', renderTaskList);
  elements.priorityFilter.addEventListener('change', renderTaskList);
  elements.categoryFilter.addEventListener('change', renderTaskList);
  elements.sortFilter.addEventListener('change', renderTaskList);

  elements.addTaskBtn.addEventListener('click', () => openTaskModal());
  elements.closeTaskModalBtn.addEventListener('click', closeTaskModal);
  elements.cancelTaskBtn.addEventListener('click', closeTaskModal);
  elements.taskModal.addEventListener('click', (event) => {
    if (event.target.dataset.closeModal === 'true') closeTaskModal();
  });
  elements.taskForm.addEventListener('submit', handleTaskSubmit);
  elements.taskCategory.addEventListener('change', () => {
    const show = elements.taskCategory.value === 'custom';
    elements.customCategoryWrap.classList.toggle('hidden', !show);
    if (show) elements.taskCustomCategory.focus();
  });

  elements.themeToggle.addEventListener('click', toggleTheme);
  elements.exportBtn.addEventListener('click', exportTasks);
  elements.importBtn.addEventListener('click', () => elements.importFileInput.click());
  elements.importFileInput.addEventListener('change', handleImportFile);
  elements.resetDataBtn.addEventListener('click', handleResetAllData);
  elements.prevMonthBtn.addEventListener('click', () => shiftCalendarMonth(-1));
  elements.nextMonthBtn.addEventListener('click', () => shiftCalendarMonth(1));
  elements.mobileNavToggle.addEventListener('click', () => document.querySelector('.sidebar').classList.toggle('sidebar-open'));
  elements.saveSettingsBtn.addEventListener('click', saveSettingsFromUI);
  elements.closeDetailsBtn.addEventListener('click', () => elements.taskDetailsPanel.classList.add('hidden'));

  elements.taskList.addEventListener('click', async (event) => {
    const button = event.target.closest('.task-action-btn');
    const item = event.target.closest('.task-item');
    if (!item) return;
    const taskId = item.dataset.id;

    if (button?.dataset.action === 'view') {
      displayTaskDetails(taskId);
      return;
    }

    if (button?.dataset.action === 'edit') {
      const task = state.tasks.find((entry) => entry.id === taskId);
      if (task) openTaskModal(task);
      return;
    }

    if (button?.dataset.action === 'delete') {
      const task = state.tasks.find((entry) => entry.id === taskId);
      if (!task) return;
      const confirmDelete = getSettings().confirmDelete !== false;
      const accepted = confirmDelete ? window.confirm(`Delete "${task.title}"?`) : true;
      if (!accepted) return;
      await deleteTask(taskId);
      showToast('Task deleted successfully', 'success');
      await refreshTaskData();
    }
  });

  elements.taskList.addEventListener('change', async (event) => {
    const checkbox = event.target.closest('.task-check');
    if (!checkbox) return;
    const item = checkbox.closest('.task-item');
    if (!item) return;
    const taskId = item.dataset.id;
    const task = state.tasks.find((entry) => entry.id === taskId);
    if (!task) return;

    const checked = checkbox.checked;
    await updateTask(taskId, {
      completed: checked,
      completedAt: checked ? new Date().toISOString() : null,
      updatedAt: new Date().toISOString(),
    });
    showToast(checked ? 'Task marked complete' : 'Task marked incomplete', 'success');
    await refreshTaskData();
  });
}

async function init() {
  bindEvents();
  bindKeyboardShortcuts();
  applyTheme();
  syncSettingsUI();
  setDatePickerValue(state.selectedDate);
  setCalendarMonth(new Date(state.selectedDate));
  await refreshTaskData();
  selectDate(state.selectedDate);
}

window.addEventListener('resize', () => {
  renderCharts();
  renderCalendar();
});

export { getTaskStatsForDate };
