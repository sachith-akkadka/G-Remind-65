
import type { Timestamp } from 'firebase/firestore';

export interface Task {
  id: string;
  title: string;
  description?: string | null;
  status: 'pending' | 'today' | 'completed' | 'missed' | 'tomorrow';
  dueDate: string  ; // Storing as ISO string
  completedAt?: string; // Storing as ISO string
  category: string;
  store?: string; // This will store the lat,lon string
  storeName?: string; // This will store the readable name of the location
  subtasks?: Subtask[];
  recurring?: 'daily' | 'weekly' | 'none';
  userId: string;
  priority?: 'low' | 'medium' | 'high';
}

export interface FirestoreTask {
  title: string;
  description?: string | null | undefined;
  status: 'pending' | 'today' | 'completed' | 'missed' | 'tomorrow';
  dueDate: Timestamp | string;
  completedAt?: Timestamp | string;
  category: string;
  store?: string | null;
  storeName?: string;
  subtasks?: Subtask[];
  recurring?: 'daily' | 'weekly' | 'none';
  userId: string;
  priority?: 'low' | 'medium' | 'high';
}


export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

export interface Category {
  id: string;
  name: string;
}

export interface User {
  name: string;
}
