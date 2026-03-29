// src/types/index.ts

export interface User {
  id: string;
  name: string;
  avatarUrl?: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  position: number;
  columnId: string;
  version: number;
  assignees?: User[];
}

export interface Column {
  id: string;
  name: string;
  position: number;
  tasks: Task[];
}

export interface Board {
  id: string;
  name: string;
  columns: Column[];
}

export interface Tenant {
  id: string;
  name: string;
}

export interface Organization {
  id: string;
  name: string;
}