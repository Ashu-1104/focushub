import Task from '../models/Task.js';
import Activity from '../models/Activity.js';
import { createTaskSchema, taskRangeSchema } from '../validations/schemas.js';

export const createTask = async (req, res, next) => {
  try {
    const { title, description, priority, dueDate, folderId } = createTaskSchema.parse(req.body);

    const task = new Task({
      title,
      description,
      priority,
      status: 'todo',
      dueDate: dueDate ? new Date(dueDate) : null,
      folderId,
      userId: req.user.userId,
    });

    await task.save();

    await Activity.create({
      userId: req.user.userId,
      type: 'created',
      targetModel: 'Task',
      targetId: task._id,
      metadata: { title },
    });

    res.status(201).json({
      message: 'Task created',
      task,
    });
  } catch (error) {
    next(error);
  }
};

export const getTasks = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status, priority, sortBy = 'dueDate' } = req.query;
    const skip = (page - 1) * limit;

    let query = { userId: req.user.userId };

    if (status) {
      query.status = status;
    }

    if (priority) {
      query.priority = priority;
    }

    const tasks = await Task.find(query)
      .sort({ [sortBy]: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Task.countDocuments(query);

    res.json({
      tasks,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getTaskById = async (req, res, next) => {
  try {
    const task = await Task.findOne({
      _id: req.params.id,
      userId: req.user.userId,
    });

    if (!task) {
      return res.status(404).json({ error: 'Task not found', code: 'NOT_FOUND' });
    }

    res.json(task);
  } catch (error) {
    next(error);
  }
};

export const updateTask = async (req, res, next) => {
  try {
    const { title, description, status, priority, dueDate, folderId } = req.body;

    // Only change the fields that were sent, so e.g. moving a task on the
    // calendar does not wipe its status, or changing status its due date.
    const changes = { updatedAt: Date.now() };
    if (title !== undefined) changes.title = title;
    if (description !== undefined) changes.description = description;
    if (priority !== undefined) changes.priority = priority;
    if (folderId !== undefined) changes.folderId = folderId;
    if (dueDate !== undefined) changes.dueDate = dueDate ? new Date(dueDate) : null;
    if (status !== undefined) {
      changes.status = status;
      changes.completedAt = status === 'done' ? Date.now() : null;
    }

    const task = await Task.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.userId },
      { $set: changes },
      { new: true }
    );

    if (!task) {
      return res.status(404).json({ error: 'Task not found', code: 'NOT_FOUND' });
    }

    await Activity.create({
      userId: req.user.userId,
      type: status === 'done' ? 'completed' : 'updated',
      targetModel: 'Task',
      targetId: task._id,
      metadata: { title: task.title },
    });

    res.json({
      message: 'Task updated',
      task,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteTask = async (req, res, next) => {
  try {
    const task = await Task.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.userId,
    });

    if (!task) {
      return res.status(404).json({ error: 'Task not found', code: 'NOT_FOUND' });
    }

    await Activity.create({
      userId: req.user.userId,
      type: 'deleted',
      targetModel: 'Task',
      targetId: task._id,
      metadata: { title: task.title },
    });

    res.json({ message: 'Task deleted' });
  } catch (error) {
    next(error);
  }
};

export const filterTasks = async (req, res, next) => {
  try {
    const { status, priority, dueDate } = req.query;

    let query = { userId: req.user.userId };

    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (dueDate) {
      const date = new Date(dueDate);
      query.dueDate = {
        $gte: date,
        $lt: new Date(date.getTime() + 24 * 60 * 60 * 1000),
      };
    }

    const tasks = await Task.find(query).sort({ dueDate: 1, priority: -1 });

    res.json({ tasks });
  } catch (error) {
    next(error);
  }
};

// Tasks due between two dates, used by the calendar view.
export const getTasksInRange = async (req, res, next) => {
  try {
    const { start, end } = taskRangeSchema.parse(req.query);

    const tasks = await Task.find({
      userId: req.user.userId,
      dueDate: { $gte: new Date(start), $lt: new Date(end) },
    }).sort({ dueDate: 1, priority: -1 });

    res.json({ tasks });
  } catch (error) {
    next(error);
  }
};
