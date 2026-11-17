import { useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import {
  DndContext,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import clsx from 'clsx';
import { ChevronLeft, ChevronRight, Plus, Repeat } from 'lucide-react';
import { Button } from '../../components/ui';
import { tasksService } from '../../services';
import { updateTask as updateTaskAction } from '../../store/slices/tasksSlice';
import {
  WEEKDAYS,
  addDays,
  dateKey,
  dueDateFromKey,
  formatDueTime,
  formatRangeTitle,
  getVisibleDays,
  groupTasksByDay,
  isSameDay,
  shiftAnchor,
} from '../../utils/calendar';

const formatTime24 = (date) => {
  const d = new Date(date);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

const PRIORITY_BORDER = {
  low: 'border-l-slate-400',
  medium: 'border-l-blue-400',
  high: 'border-l-orange-400',
  urgent: 'border-l-red-500',
};

function TaskChip({ task }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task._id,
    data: { task },
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={(e) => e.stopPropagation()}
      style={transform ? { transform: `translate(${transform.x}px, ${transform.y}px)` } : undefined}
      title={`${task.title} (${task.priority})`}
      className={clsx(
        'truncate rounded-md border-l-4 bg-dark-hover px-2 py-1 text-xs text-slate-200 cursor-grab active:cursor-grabbing',
        PRIORITY_BORDER[task.priority],
        task.status === 'done' && 'line-through opacity-50',
        isDragging && 'relative z-50 shadow-lg ring-2 ring-primary-500'
      )}
    >
      {task.recurrence && task.recurrence !== 'none' && <Repeat size={10} className="mr-1 inline" />}
      {!task.allDay && <span className="mr-1 text-slate-400">{formatDueTime(task.dueDate)}</span>}
      {task.title}
    </div>
  );
}

function DayCell({ day, tasks, inMonth, isToday, view, onAddTask }) {
  const key = dateKey(day);
  const { setNodeRef, isOver } = useDroppable({ id: key });
  const limit = view === 'week' ? Infinity : 3;
  const shown = tasks.slice(0, limit);
  const hidden = tasks.length - shown.length;

  return (
    <div
      ref={setNodeRef}
      onClick={() => onAddTask(key)}
      className={clsx(
        'group flex flex-col gap-1 border-b border-r border-dark-border p-2 cursor-pointer transition-colors',
        view === 'week' ? 'min-h-[22rem]' : 'min-h-[7.5rem]',
        inMonth ? 'bg-dark-card' : 'bg-dark-base/60 text-slate-600',
        isOver && 'bg-primary-500/15'
      )}
    >
      <div className="flex items-center justify-between">
        <span
          className={clsx(
            'flex h-7 w-7 items-center justify-center rounded-full text-sm',
            isToday ? 'bg-primary-500 font-semibold text-white' : inMonth ? 'text-slate-300' : ''
          )}
        >
          {day.getDate()}
        </span>
        <Plus size={14} className="text-slate-500 opacity-0 transition-opacity group-hover:opacity-100" />
      </div>
      {shown.map((task) => (
        <TaskChip key={task._id} task={task} />
      ))}
      {hidden > 0 && <span className="text-xs text-slate-400">+{hidden} more</span>}
    </div>
  );
}

export default function TaskCalendar({ onAddTask, refreshKey }) {
  const dispatch = useDispatch();
  const [view, setView] = useState('month');
  const [anchor, setAnchor] = useState(() => new Date());
  const [tasks, setTasks] = useState([]);
  const [error, setError] = useState('');

  const days = useMemo(() => getVisibleDays(anchor, view), [anchor, view]);
  const tasksByDay = useMemo(() => groupTasksByDay(tasks), [tasks]);
  const today = new Date();

  // a small drag distance keeps plain clicks on a chip from starting a drag
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  useEffect(() => {
    const start = days[0].toISOString();
    const end = addDays(days[days.length - 1], 1).toISOString();
    tasksService
      .getRange(start, end)
      .then((response) => setTasks(response.data.tasks))
      .catch(() => setError('Could not load tasks for this period.'));
  }, [days, refreshKey]);

  const handleDragEnd = async ({ active, over }) => {
    const task = active.data.current?.task;
    if (!task || !over || dateKey(task.dueDate) === over.id) return;

    // keep the task's time of day when it has one
    const dueDate = dueDateFromKey(over.id, task.allDay ? undefined : formatTime24(task.dueDate));
    const previous = tasks;
    setTasks((current) => current.map((t) => (t._id === task._id ? { ...t, dueDate } : t)));

    try {
      const response = await tasksService.update(task._id, { dueDate });
      dispatch(updateTaskAction(response.data.task));
    } catch {
      setTasks(previous);
      setError('Could not move the task. Please try again.');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button size="sm" variant="secondary" aria-label="Previous" onClick={() => setAnchor(shiftAnchor(anchor, view, -1))}>
            <ChevronLeft size={16} />
          </Button>
          <Button size="sm" variant="secondary" aria-label="Next" onClick={() => setAnchor(shiftAnchor(anchor, view, 1))}>
            <ChevronRight size={16} />
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setAnchor(new Date())}>
            Today
          </Button>
          <h2 className="ml-2 text-xl font-semibold text-slate-100">{formatRangeTitle(anchor, view)}</h2>
        </div>
        <div className="flex rounded-lg border border-dark-border p-1">
          {['month', 'week'].map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              className={clsx(
                'rounded-md px-3 py-1 text-sm capitalize transition-colors',
                view === v ? 'bg-primary-500 text-white' : 'text-slate-400 hover:text-slate-100'
              )}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-400">
          {error}
        </p>
      )}

      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="overflow-hidden rounded-xl border-l border-t border-dark-border">
          <div className="grid grid-cols-7">
            {WEEKDAYS.map((d) => (
              <div key={d} className="border-b border-r border-dark-border bg-dark-base px-2 py-2 text-xs font-medium uppercase tracking-wider text-slate-400">
                {d}
              </div>
            ))}
            {days.map((day) => (
              <DayCell
                key={dateKey(day)}
                day={day}
                view={view}
                tasks={tasksByDay[dateKey(day)] || []}
                inMonth={view === 'week' || day.getMonth() === anchor.getMonth()}
                isToday={isSameDay(day, today)}
                onAddTask={onAddTask}
              />
            ))}
          </div>
        </div>
      </DndContext>
      <p className="text-xs text-slate-500">Drag a task to another day to reschedule it. Click a day to add a task.</p>
    </div>
  );
}
