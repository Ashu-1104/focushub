import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import tasksReducer from '../../store/slices/tasksSlice';
import { tasksService } from '../../services';
import { dueDateFromKey } from '../../utils/calendar';
import TaskCalendar from './TaskCalendar';

vi.mock('../../services', () => ({
  tasksService: { getRange: vi.fn(), update: vi.fn() },
}));

const renderCalendar = (props = {}) =>
  render(
    <Provider store={configureStore({ reducer: { tasks: tasksReducer } })}>
      <TaskCalendar onAddTask={vi.fn()} refreshKey={0} {...props} />
    </Provider>
  );

describe('TaskCalendar', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 10, 17, 10));
    tasksService.getRange.mockResolvedValue({
      data: {
        tasks: [
          { _id: '1', title: 'Review PR', priority: 'urgent', status: 'todo', allDay: true, dueDate: dueDateFromKey('2026-11-18') },
          { _id: '2', title: 'Ship release', priority: 'high', status: 'done', allDay: true, dueDate: dueDateFromKey('2026-11-20') },
        ],
      },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('loads the visible month and places tasks on their days', async () => {
    renderCalendar();
    expect(screen.getByText('November 2026')).toBeInTheDocument();
    expect(await screen.findByText('Review PR')).toBeInTheDocument();
    expect(screen.getByText('Ship release')).toHaveClass('line-through');

    const [start, end] = tasksService.getRange.mock.calls[0];
    expect(new Date(start).getDate()).toBe(26); // Monday Oct 26
    expect(new Date(end).getDate()).toBe(7); // day after Sunday Dec 6
  });

  it('switches to the week view', async () => {
    renderCalendar();
    await screen.findByText('Review PR');
    fireEvent.click(screen.getByRole('button', { name: 'week' }));
    expect(screen.getByText(/Nov 16 – Nov 22, 2026/)).toBeInTheDocument();
  });

  it('opens the create form for a clicked day', async () => {
    const onAddTask = vi.fn();
    renderCalendar({ onAddTask });
    await screen.findByText('Review PR');
    fireEvent.click(screen.getByText('25'));
    expect(onAddTask).toHaveBeenCalledWith('2026-11-25');
  });
});
