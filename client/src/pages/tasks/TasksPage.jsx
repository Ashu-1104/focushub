import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { MainLayout } from '../../components/layout';
import { Card, Button, Input, Badge, Modal } from '../../components/ui';
import { tasksService } from '../../services';
import {
  setTasks,
  addTask,
  updateTask as updateTaskAction,
  deleteTask as deleteTaskAction,
} from '../../store/slices/tasksSlice';
import { Bell, CalendarDays, Check, LayoutGrid, Plus, Repeat, Trash2 } from 'lucide-react';
import clsx from 'clsx';
import TaskCalendar from './TaskCalendar';
import {
  REMINDER_OPTIONS,
  REPEAT_LABELS,
  dueDateFromKey,
  formatDueTime,
} from '../../utils/calendar';

const STATUS_COLORS = {
  todo: 'bg-slate-700',
  doing: 'bg-primary-500/20 text-primary-400',
  done: 'bg-green-500/20 text-green-400',
};

const PRIORITY_COLORS = {
  low: 'text-slate-400',
  medium: 'text-blue-400',
  high: 'text-orange-400',
  urgent: 'text-red-400',
};

export default function TasksPage() {
  const dispatch = useDispatch();
  const { items: tasks } = useSelector((state) => state.tasks);
  const [filter, setFilter] = useState('all');
  const [view, setView] = useState('board');
  const [calendarVersion, setCalendarVersion] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const emptyForm = {
    title: '',
    description: '',
    priority: 'medium',
    dueDate: '',
    dueTime: '',
    recurrence: 'none',
    reminder: '',
  };
  const [formData, setFormData] = useState(emptyForm);

  const openCreateModal = (dueDate = '') => {
    setFormData({ ...emptyForm, dueDate });
    setIsModalOpen(true);
  };

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const response = await tasksService.getAll(1, 100, {
          status: filter === 'all' ? null : filter,
        });
        dispatch(setTasks(response.data.tasks));
      } catch (error) {
        console.error('Failed to fetch tasks:', error);
      }
    };

    fetchTasks();
  }, [dispatch, filter]);

  const handleCreateTask = async (e) => {
    e.preventDefault();
    try {
      const { dueDate, dueTime, reminder, ...rest } = formData;
      const payload = { ...rest, reminderMinutes: reminder === '' ? null : Number(reminder) };
      if (dueDate) {
        payload.dueDate = dueDateFromKey(dueDate, dueTime || undefined);
        payload.allDay = !dueTime;
      }
      const response = await tasksService.create(payload);
      dispatch(addTask(response.data.task));
      setFormData(emptyForm);
      setIsModalOpen(false);
      setCalendarVersion((v) => v + 1);
    } catch (error) {
      console.error('Failed to create task:', error);
    }
  };

  const handleStatusChange = async (task, status) => {
    try {
      const response = await tasksService.update(task._id, { status });
      dispatch(updateTaskAction(response.data.task));
      if (response.data.nextTask) {
        dispatch(addTask(response.data.nextTask));
      }
    } catch (error) {
      console.error('Failed to update task:', error);
    }
  };

  const handleDeleteTask = async (taskId) => {
    try {
      await tasksService.delete(taskId);
      dispatch(deleteTaskAction(taskId));
    } catch (error) {
      console.error('Failed to delete task:', error);
    }
  };

  const groupedTasks = {
    todo: tasks.filter((t) => t.status === 'todo'),
    doing: tasks.filter((t) => t.status === 'doing'),
    done: tasks.filter((t) => t.status === 'done'),
  };

  return (
    <MainLayout>
      <div className="p-8">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <h1 className="text-3xl font-bold text-slate-100">Tasks</h1>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex rounded-lg border border-dark-border p-1" role="tablist" aria-label="Task view">
              {[
                { id: 'board', label: 'Board', Icon: LayoutGrid },
                { id: 'calendar', label: 'Calendar', Icon: CalendarDays },
              ].map(({ id, label, Icon }) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={view === id}
                  onClick={() => setView(id)}
                  className={clsx(
                    'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors',
                    view === id ? 'bg-primary-500 text-white' : 'text-slate-400 hover:text-slate-100'
                  )}
                >
                  <Icon size={15} />
                  {label}
                </button>
              ))}
            </div>
            <Button variant="primary" onClick={() => openCreateModal()}>
              <Plus size={16} />
              New Task
            </Button>
          </div>
        </div>

        {view === 'calendar' ? (
          <TaskCalendar onAddTask={openCreateModal} refreshKey={calendarVersion} />
        ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {['todo', 'doing', 'done'].map((status) => (
            <div key={status}>
              <h2 className="text-lg font-semibold text-slate-100 mb-4 capitalize">{status}</h2>
              <div className="space-y-3">
                {groupedTasks[status].map((task) => (
                  <Card key={task._id} className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-medium text-slate-100 flex-1">{task.title}</h3>
                      <Badge variant="default" className="text-xs">
                        {task.priority}
                      </Badge>
                    </div>
                    {task.description && (
                      <p className="text-sm text-slate-400 mb-3 line-clamp-2">{task.description}</p>
                    )}
                    {task.dueDate && (
                      <p className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                        <span>
                          Due: {new Date(task.dueDate).toLocaleDateString()}
                          {!task.allDay && `, ${formatDueTime(task.dueDate)}`}
                        </span>
                        {task.recurrence && task.recurrence !== 'none' && (
                          <span className="flex items-center gap-1 text-primary-400">
                            <Repeat size={12} /> {REPEAT_LABELS[task.recurrence]}
                          </span>
                        )}
                        {task.reminderMinutes != null && (
                          <span className="flex items-center gap-1" title="Reminder set">
                            <Bell size={12} />
                          </span>
                        )}
                      </p>
                    )}
                    <div className="mt-4 flex items-center justify-between gap-2">
                      <div className="flex gap-2">
                        {status !== 'todo' && (
                          <Button size="sm" variant="secondary" onClick={() => handleStatusChange(task, 'todo')}>
                            To Do
                          </Button>
                        )}
                        {status !== 'doing' && (
                          <Button size="sm" variant="secondary" onClick={() => handleStatusChange(task, 'doing')}>
                            Doing
                          </Button>
                        )}
                        {status !== 'done' && (
                          <Button size="sm" variant="secondary" onClick={() => handleStatusChange(task, 'done')}>
                            <Check size={14} />
                            Done
                          </Button>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteTask(task._id)}
                        className="p-1 hover:bg-dark-hover rounded transition-colors text-red-400 hover:text-red-500"
                        aria-label={`Delete ${task.title}`}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
        )}

        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="Create Task"
          size="md"
        >
          <form onSubmit={handleCreateTask} className="space-y-4">
            <Input
              label="Title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Task title"
              required
            />

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Task description"
                className="w-full px-4 py-2 bg-dark-card border border-dark-border rounded-lg text-slate-100 focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Priority</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="w-full px-4 py-2 bg-dark-card border border-dark-border rounded-lg text-slate-100 focus:ring-2 focus:ring-primary-500"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Due date"
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
              />
              <Input
                label="Time (optional)"
                type="time"
                value={formData.dueTime}
                disabled={!formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueTime: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Repeat</label>
                <select
                  value={formData.recurrence}
                  onChange={(e) => setFormData({ ...formData, recurrence: e.target.value })}
                  className="w-full px-4 py-2 bg-dark-card border border-dark-border rounded-lg text-slate-100 focus:ring-2 focus:ring-primary-500"
                >
                  <option value="none">Does not repeat</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Reminder</label>
                <select
                  value={formData.reminder}
                  disabled={!formData.dueDate}
                  onChange={(e) => {
                    setFormData({ ...formData, reminder: e.target.value });
                    if (e.target.value !== '' && 'Notification' in window && Notification.permission === 'default') {
                      Notification.requestPermission();
                    }
                  }}
                  className="w-full px-4 py-2 bg-dark-card border border-dark-border rounded-lg text-slate-100 focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
                >
                  {REMINDER_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" type="submit">
                Create Task
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </MainLayout>
  );
}
