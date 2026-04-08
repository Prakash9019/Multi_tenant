// src/types/index.ts

export interface User {
  id: string;
  name: string;
  email?: string;
  avatarUrl?: string;
}

export type Role = 'ORG_ADMIN' | 'TENANT_ADMIN' | 'MEMBER';

export interface Task {
  id: string;
  title: string;
  description?: string | null;
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

export interface Membership {
  id: string;
  role: Role;
  tenant: Tenant;
  organization: Organization;
}
