import { create } from "zustand";
import * as tasksRepo from "../db/repositories/tasks";
import type { NewTaskInput, Priority, Task } from "../db/repositories/tasks";
import { cancelTaskReminder, scheduleTaskReminder } from "../notifications/scheduler";

interface TasksState {
  tasks: Task[];
  loaded: boolean;
  load: () => Promise<void>;
  addTask: (input: NewTaskInput) => Promise<void>;
  addTasks: (inputs: NewTaskInput[]) => Promise<void>;
  toggleTask: (id: string) => Promise<void>;
  updateTask: (id: string, patch: Partial<NewTaskInput>) => Promise<void>;
  removeTask: (id: string) => Promise<void>;
  clearCompleted: () => Promise<void>;
}

export const useTasksStore = create<TasksState>((set, get) => ({
  tasks: [],
  loaded: false,
  load: async () => {
    const tasks = await tasksRepo.listTasks();
    set({ tasks, loaded: true });
  },
  addTask: async (input) => {
    const task = await tasksRepo.createTask(input);
    if (task.dueDate) await scheduleTaskReminder(task);
    set({ tasks: [task, ...get().tasks] });
  },
  addTasks: async (inputs) => {
    const created = await tasksRepo.createTasks(inputs);
    for (const task of created) {
      if (task.dueDate) await scheduleTaskReminder(task);
    }
    set({ tasks: [...created, ...get().tasks] });
  },
  toggleTask: async (id) => {
    const task = get().tasks.find(item => item.id === id);
    if (!task) return;
    const completed = !task.completed;
    await tasksRepo.toggleTask(id, completed);
    if (completed) await cancelTaskReminder(id);
    else if (task.dueDate) await scheduleTaskReminder({ ...task, completed });
    set({ tasks: get().tasks.map(item => (item.id === id ? { ...item, completed } : item)) });
  },
  updateTask: async (id, patch) => {
    await tasksRepo.updateTask(id, patch);
    const task = get().tasks.find(item => item.id === id);
    if (task) {
      await cancelTaskReminder(id);
      const updated = { ...task, ...patch } as Task;
      if (updated.dueDate && !updated.completed) await scheduleTaskReminder(updated);
      set({ tasks: get().tasks.map(item => (item.id === id ? updated : item)) });
    }
  },
  removeTask: async (id) => {
    await tasksRepo.deleteTask(id);
    await cancelTaskReminder(id);
    set({ tasks: get().tasks.filter(item => item.id !== id) });
  },
  clearCompleted: async () => {
    await tasksRepo.clearCompletedTasks();
    set({ tasks: get().tasks.filter(item => !item.completed) });
  }
}));

export type { Priority, Task };
