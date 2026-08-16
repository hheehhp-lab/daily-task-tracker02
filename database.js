const DB_NAME = 'daily-task-tracker-db';
const STORE_NAME = 'tasks';
const DB_VERSION = 2;

let dbPromise = null;

function generateId() {
  if (window.crypto && window.crypto.randomUUID) {
    return window.crypto.randomUUID();
  }
  return `task-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getLocalDateString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isValidPriority(priority) {
  return ['low', 'medium', 'high'].includes(priority);
}

function normalizeCategory(value) {
  const category = String(value || 'Other').trim();
  return category || 'Other';
}

function normalizeRecurrence(value) {
  return ['none', 'daily', 'weekly', 'monthly'].includes(value) ? value : 'none';
}

export function openDatabase() {
  if (dbPromise) {
    return dbPromise;
  }

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const database = event.target.result;

      if (!database.objectStoreNames.contains(STORE_NAME)) {
        const store = database.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('date', 'date', { unique: false });
        store.createIndex('priority', 'priority', { unique: false });
        store.createIndex('completed', 'completed', { unique: false });
        store.createIndex('category', 'category', { unique: false });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      } else {
        const store = event.target.transaction.objectStore(STORE_NAME);
        if (!store.indexNames.contains('category')) {
          store.createIndex('category', 'category', { unique: false });
        }
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Database could not be opened.'));
  });

  return dbPromise;
}

export function serializeTask(task = {}) {
  const stamp = new Date().toISOString();
  return {
    id: task.id || generateId(),
    title: String(task.title || '').trim(),
    description: String(task.description || '').trim(),
    date: task.date || getLocalDateString(new Date()),
    priority: isValidPriority(task.priority) ? task.priority : 'medium',
    category: normalizeCategory(task.category),
    startTime: task.startTime || '',
    dueTime: task.dueTime || '',
    completed: Boolean(task.completed),
    recurrence: normalizeRecurrence(task.recurrence),
    completedAt: task.completedAt || null,
    createdAt: task.createdAt || stamp,
    updatedAt: task.updatedAt || stamp,
  };
}

export async function addTask(task) {
  const db = await openDatabase();
  const normalizedTask = serializeTask(task);

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(normalizedTask);

    request.onsuccess = () => resolve(normalizedTask);
    request.onerror = () => reject(request.error || new Error('Unable to add task.'));
  });
}

export async function updateTask(taskId, updates) {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const getRequest = store.get(taskId);

    getRequest.onsuccess = () => {
      const existingTask = getRequest.result;
      if (!existingTask) {
        reject(new Error('Task not found.'));
        return;
      }

      const nextTask = {
        ...existingTask,
        ...serializeTask({ ...existingTask, ...updates }),
        updatedAt: new Date().toISOString(),
      };

      const saveRequest = store.put(nextTask);
      saveRequest.onsuccess = () => resolve(nextTask);
      saveRequest.onerror = () => reject(saveRequest.error || new Error('Unable to update task.'));
    };

    getRequest.onerror = () => reject(getRequest.error || new Error('Unable to load task.'));
  });
}

export async function deleteTask(taskId) {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(taskId);

    request.onsuccess = () => resolve(true);
    request.onerror = () => reject(request.error || new Error('Unable to delete task.'));
  });
}

export async function getAllTasks() {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => resolve((request.result || []).sort((a, b) => {
      const dateDiff = new Date(b.date) - new Date(a.date);
      if (dateDiff !== 0) return dateDiff;
      return new Date(b.createdAt) - new Date(a.createdAt);
    }));

    request.onerror = () => reject(request.error || new Error('Unable to read task data.'));
  });
}

export async function getTasksByDate(date) {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index('date');
    const request = index.getAll(date);

    request.onsuccess = () => {
      const tasks = request.result || [];
      tasks.sort((a, b) => {
        if (a.completed !== b.completed) return Number(a.completed) - Number(b.completed);
        return new Date(b.createdAt) - new Date(a.createdAt);
      });
      resolve(tasks);
    };

    request.onerror = () => reject(request.error || new Error('Unable to read tasks by date.'));
  });
}

export async function getTaskStatsForDate(date) {
  const tasks = await getTasksByDate(date);
  const total = tasks.length;
  const completed = tasks.filter((task) => task.completed).length;
  const incomplete = total - completed;
  const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);

  return { date, total, completed, incomplete, percentage };
}

export async function getTaskStatsForDateRange(startDate, endDate) {
  const tasks = await getAllTasks();
  const start = new Date(startDate);
  const end = new Date(endDate);

  const list = tasks.filter((task) => {
    const current = new Date(task.date);
    return current >= start && current <= end;
  });

  const total = list.length;
  const completed = list.filter((task) => task.completed).length;
  const incomplete = total - completed;
  const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);

  return { total, completed, incomplete, percentage };
}

export async function clearAllTasks() {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.clear();

    request.onsuccess = () => resolve(true);
    request.onerror = () => reject(request.error || new Error('Unable to clear tasks.'));
  });
}

export async function importTasksFromJSON(payload, mode = 'merge') {
  const data = payload && payload.tasks ? payload.tasks : Array.isArray(payload) ? payload : JSON.parse(payload);
  const prepared = (data || []).map((task) => serializeTask(task));

  if (mode === 'replace') {
    await clearAllTasks();
  }

  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    prepared.forEach((task) => store.put(task));

    transaction.oncomplete = () => resolve(prepared.length);
    transaction.onerror = () => reject(transaction.error || new Error('Unable to import tasks.'));
  });
}

export async function exportTasksAsJSON() {
  const tasks = await getAllTasks();
  return JSON.stringify(tasks, null, 2);
}

export async function exportAppData() {
  const tasks = await getAllTasks();
  const settings = JSON.parse(localStorage.getItem('task-tracker-settings') || '{}');

  return JSON.stringify(
    {
      version: 2,
      exportedAt: new Date().toISOString(),
      tasks,
      settings,
    },
    null,
    2,
  );
}

export async function importAppData(payload, mode = 'merge') {
  const parsed = typeof payload === 'string' ? JSON.parse(payload) : payload;
  if (!parsed || !Array.isArray(parsed.tasks)) {
    throw new Error('Invalid data file. Expected a task export with a tasks array.');
  }

  if (mode === 'replace') {
    await clearAllTasks();
  }

  const db = await openDatabase();
  const tasks = parsed.tasks.map((task) => serializeTask(task));

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    tasks.forEach((task) => store.put(task));

    transaction.oncomplete = () => resolve(tasks.length);
    transaction.onerror = () => reject(transaction.error || new Error('Unable to import application data.'));
  });
}

export function validateTaskInput(task) {
  if (!task || !String(task.title || '').trim()) {
    throw new Error('Task name cannot be empty.');
  }

  if (!task.date) {
    throw new Error('Task date is required.');
  }

  if (task.priority && !isValidPriority(task.priority)) {
    throw new Error('Invalid task priority.');
  }

  if (task.recurrence && !['none', 'daily', 'weekly', 'monthly'].includes(task.recurrence)) {
    throw new Error('Invalid recurrence setting.');
  }

  if (task.startTime && !/^([01]\d|2[0-3]):[0-5]\d$/.test(task.startTime)) {
    throw new Error('Start time must use HH:MM format.');
  }

  if (task.dueTime && !/^([01]\d|2[0-3]):[0-5]\d$/.test(task.dueTime)) {
    throw new Error('Due time must use HH:MM format.');
  }
}
