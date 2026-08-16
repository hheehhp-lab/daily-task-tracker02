# Daily Task Tracker

A complete daily productivity tracker built with plain HTML, CSS, and JavaScript using IndexedDB for browser-based persistence.

## Features

- Dashboard with totals, remaining tasks, completion percentage, and progress bars
- Add, edit, delete, and complete tasks
- Date navigation for today, yesterday, tomorrow, and custom dates
- Search, status filter, priority filter, and sorting
- Productivity charts for daily, weekly, monthly, and completed vs incomplete tasks
- Calendar heat-map style productivity view
- Dark mode toggle
- JSON export and JSON import
- Reset all data confirmation
- Toast notifications and empty-state messaging
- Responsive design for desktop, tablet, and mobile

## Project structure

```text
daily-task-tracker/
├── index.html
├── style.css
├── app.js
├── database.js
├── charts.js
└── README.md
```

## How to run

1. Open the project folder in any browser.
2. Start a local web server from the project folder. For example:

```bash
cd daily-task-tracker
python -m http.server 8000
```

3. Open this URL in your browser:

```text
http://localhost:8000/
```

> The app works directly from the file system too, but a local web server is recommended because IndexedDB behaves more reliably in a browser context served over HTTP.

## How the database works

The task data is stored in IndexedDB under the database name `daily-task-tracker-db` and object store `tasks`.

Each task object includes:

- `id`
- `title`
- `description`
- `date`
- `priority`
- `completed`
- `createdAt`
- `updatedAt`

All task operations go through the functions in `database.js`, which open the database, save records, read records, update records, and delete records. Data remains available even after a browser refresh or restart because IndexedDB persists in the browser storage.

## How to add, edit, and delete tasks

### Add task

- Click the `+ Add Task` button.
- Fill in the title, optional description, date, and priority.
- Click `Save task`.

### Edit task

- On the task item, click `Edit`.
- Update the values in the modal and save.

### Delete task

- Click `Delete` on the task.
- Confirm the alert before removal.

### Mark complete

- Check the checkbox next to a task.
- Completion status updates instantly and refreshes percentages, charts, and the calendar.

## How the graphs calculate productivity

The app calculates completion with this formula:

```text
Completion % = (Completed Tasks / Total Tasks) × 100
```

The labels are based on the configured thresholds:

- 0–24%: Low progress
- 25–49%: Moderate progress
- 50–74%: Good progress
- 75–99%: Very good progress
- 100%: Complete

The charts use the current tasks in IndexedDB and compute percentages by date range:

- Daily chart: last 7 days
- Weekly chart: recent weekly ranges of the current month
- Monthly chart: previous 6 months
- Completed vs incomplete chart: all saved tasks

## How to customize the design

You can adjust the look and feel in `style.css`:

- Colors are defined at the top of the file as CSS variables.
- Layout and spacing are controlled with grid and flexbox rules.
- Dark mode is toggled by the `body.dark` class.
- Buttons, cards, modals, and the calendar are styled separately for easier customization.

If you want to change the app branding or colors, update the variables under `:root` and `body.dark` in `style.css`.

## Notes

- The app is intentionally framework-free and runs fully in the browser.
- No server-side backend is required.
- Data is stored locally in the user’s browser.
