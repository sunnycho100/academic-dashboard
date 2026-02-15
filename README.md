# Academic Dashboard

A modern academic task management system built with Next.js, TypeScript, and shadcn/ui. Designed for students to track lectures, assignments, labs, discussions, and exam preparation with deep work timer integration.

## Features

### Dashboard Overview
- **Statistics Cards**: Quick overview of total tasks, completed tasks, tasks due soon, and overdue items
- **View Modes**:
  - **All Tasks**: Complete view of your academic workload
  - **Overdue**: Focus on tasks requiring immediate attention
  - **Due Soon**: Preview upcoming deadlines

### Deep Work Timer
- **Stopwatch Integration**: Track time spent on each task with play/pause controls
- **Persistent Timers**: Timer state saved across sessions via localStorage
- **Activity Summary**: View completed tasks with Today / All tabs, grouped by day
- **Study Time Analytics**: Live study time footer combining active timers + today's completed sessions from PostgreSQL
- **Time Difference Tracking**: Compare estimated vs actual time (saved / over indicators)

### Task Management
- **Create Tasks**: Add tasks with title, category, type, due date, estimated duration, and notes
- **Edit Tasks**: Modify existing tasks seamlessly
- **Duplicate Tasks**: Quick duplication for similar assignments
- **Delete Tasks**: Remove completed or unwanted items
- **Task Status**: Mark tasks complete with timer integration
- **Drag & Drop**: Manual task reordering (available in manual sort mode)
- **Today's Plan**: Curated focus list with glassmorphism Bento card design

### Categories
- **Custom Categories**: Create categories for your classes (e.g., COMPSCI400, MATH340)
- **Color-Coded**: Unique color assignment for easy visual identification
- **Filter by Category**: View tasks for specific courses
- **Category Search**: Quick navigation through the sidebar

### Task Types
- Lecture
- Discussion
- Lab
- Assignment
- Exam Prep

### Advanced Features
- **Smart Sorting**:
  - Sort by due date
  - Manual ordering via drag & drop
- **Group by Category**: Organize tasks by course
- **Theme Toggle**: Switch between light and dark modes
- **Data Export**: Export data as JSON for backup
- **Data Import**: Restore from previous exports
- **Clear All Data**: Reset dashboard to initial state
- **Local Storage**: All data persists locally in browser

### Smart Indicators
- Color-coded due date badges:
  - **Pastel Red**: Overdue or due today
  - **Default**: Due tomorrow
  - **Secondary**: Due in 2+ days
- Displays exact days until due date or days overdue
- Live timer display with pulsing animation when active

## Getting Started

### Prerequisites
- Node.js 18 or higher
- pnpm (recommended) or npm

### Quick Start

Launch the application using the provided script:

```bash
./start.sh
```

This script will:
- Check for Node.js installation
- Install pnpm if not present
- Install project dependencies
- Start the development server

Then navigate to [http://localhost:3000](http://localhost:3000) in your browser.

### Manual Installation

1. Navigate to the project directory:
```bash
cd academic-dashboard
```

2. Install dependencies:
```bash
pnpm install
# or
npm install
```

3. Start the development server:
```bash
pnpm dev
# or
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000)

### Build for Production

```bash
pnpm build
pnpm start
```

## Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) with App Router and Turbopack
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **UI Components**: [shadcn/ui](https://ui.shadcn.com/) with Radix UI
- **Icons**: [Lucide React](https://lucide.dev/)
- **Drag & Drop**: [@dnd-kit](https://dndkit.com/)
- **Animations**: [Framer Motion](https://www.framer.com/motion/)
- **Theme**: [next-themes](https://github.com/pacocoursey/next-themes)
- **Date Utilities**: [date-fns](https://date-fns.org/)
- **Database**: [PostgreSQL 16](https://www.postgresql.org/) via Docker
- **ORM**: [Prisma 7](https://www.prisma.io/) with `@prisma/adapter-pg`

## Project Structure

```
academic-dashboard/
├── app/
│   ├── api/
│   │   └── completed-tasks/
│   │       └── route.ts    # GET/POST API for completed task archive
│   ├── layout.tsx          # Root layout with theme provider
│   ├── page.tsx            # Main dashboard with state management
│   └── globals.css         # Global styles and theme variables
├── components/
│   ├── activity-summary-dialog.tsx  # Today/All tabs with day grouping
│   ├── add-category-dialog.tsx
│   ├── add-task-sheet.tsx
│   ├── edit-task-sheet.tsx
│   ├── category-sidebar.tsx
│   ├── today-panel.tsx     # Deep work timer + study time footer
│   ├── task-list.tsx
│   ├── task-row.tsx
│   ├── stats.tsx
│   ├── theme-toggle.tsx
│   ├── theme-provider.tsx
│   ├── clear-data-dialog.tsx
│   ├── import-data-dialog.tsx
│   └── ui/                 # shadcn/ui components
├── hooks/
│   ├── use-task-timer.ts   # Stopwatch timer hook
│   └── use-toast.ts
├── lib/
│   ├── prisma.ts           # Singleton PrismaClient with pg adapter
│   ├── types.ts            # TypeScript type definitions
│   ├── store.ts            # Local storage management
│   └── utils.ts            # Utility functions
├── prisma/
│   ├── schema.prisma       # CompletedTask model definition
│   └── migrations/         # Database migration history
├── docker-compose.yml      # PostgreSQL 16 container
└── package.json
```

## Usage Guide

### Getting Started
1. **Create Categories**: Set up categories for all your classes
2. **Add Tasks**: Input assignments, lectures, and labs as they're assigned
3. **Today's Plan**: Add priority tasks to your daily focus list using the chevron button
4. **Start Timer**: Click play on tasks in Today's Plan to track deep work time
5. **Complete Tasks**: Click the check button to mark complete and save time spent

### Daily Workflow
1. Review the **Due Soon** tab to preview upcoming work
2. Check **Overdue** tab for items requiring immediate attention
3. Add high-priority tasks to **Today's Plan**
4. Use the **deep work timer** to track focused study sessions
5. Review **Activity Summary** to monitor productivity

### Best Practices
- Switch to manual sort and drag tasks to prioritize effectively
- Export data regularly using the export feature for backup
- Enable "Group by category" when focusing on specific courses
- Use estimated duration to plan study sessions
- Review Activity Summary weekly to track study patterns

## Keyboard & Mouse Interactions

- **Drag & Drop**: Click and hold the grip icon to reorder tasks
- **Quick Actions**: Hover over tasks to reveal edit, duplicate, and delete options
- **Timer Controls**: Play, pause, and complete buttons in Today's Plan
- **Theme Toggle**: Click the sun/moon icon in the header
- **Chevron Navigation**: Add/remove tasks from Today's Plan

## Data Storage

The application uses a hybrid storage architecture:

### localStorage (Active Data)
- **Tasks & Categories**: Stored under `class-catchup-data`
- **Today's Plan**: Stored under `class-catchup-today`
- **Timer States**: Stored under `class-catchup-timers`

### PostgreSQL (Completed Task Archive)
- Completed tasks are persisted to PostgreSQL when marked done
- Stores actual time spent, estimated duration, and time difference
- Powers the Activity Summary with Today / All views
- Feeds the Study Time footer with today's total deep work

### Database Setup

Requires Docker for the PostgreSQL container:

```bash
# Start the database
docker compose up -d

# Run migrations (first time only)
npx prisma migrate deploy

# Generate Prisma client
npx prisma generate
```

Connection is configured via `.env` with `DATABASE_URL`.

### Benefits
- Active tasks stay fast via localStorage with no network latency
- Completed task history persists across browser clears
- Time analytics are reliable and queryable
- Privacy preserved — database runs locally via Docker

## Customization

### Adding New Task Types

Edit [lib/types.ts](lib/types.ts):
```typescript
export type TaskType = 'Lecture' | 'Discussion' | 'Lab' | 'Assignment' | 'Exam Prep' | 'YourType'
```

### Modifying Theme Colors

Edit [app/globals.css](app/globals.css) to customize CSS variables for light and dark themes.

### Adjusting Initial Data

Edit [lib/store.ts](lib/store.ts) to modify sample data structure.

## License

MIT

## Acknowledgments

- UI components from [shadcn/ui](https://ui.shadcn.com/)
- Icons by [Lucide](https://lucide.dev/)
- Drag and drop by [@dnd-kit](https://dndkit.com/)
- Animations by [Framer Motion](https://www.framer.com/motion/)

