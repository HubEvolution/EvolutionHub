export interface DashboardStats {
  totalUsers: number;
  activeSessions: number;
  apiCalls: number;
  storageUsed: string;
}

export interface ActivityItem {
  id: string;
  user: string;
  action: string;
  timestamp: string;
  icon: string;
  color: string;
}

export interface ProjectCard {
  id: string;
  title: string;
  description: string;
  progress: number;
  status: 'active' | 'completed' | 'on-hold' | 'archived';
  members: string[];
  lastUpdated: string;
}

export interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: string;
  action: string;
  variant?: 'primary' | 'secondary' | 'success' | 'danger';
}

export interface Notification {
  id: string;
  message: string;
  type: 'comment' | 'mention' | 'task_completed' | 'system';
  timestamp: string;
  read: boolean;
}

export interface DashboardData {
  stats: DashboardStats;
  recentActivities: ActivityItem[];
  projects: ProjectCard[];
  quickActions: QuickAction[];
  notifications: Notification[];
export interface CreateProjectRequest {
  title: string;
  description: string;
  status?: 'active' | 'completed' | 'on-hold' | 'archived';
  priority?: 'low' | 'medium' | 'high';
  dueDate?: string;
  tags?: string[];
}

export interface UpdateProjectRequest extends Partial<CreateProjectRequest> {
  id: string;
}

export interface ProjectFormData {
  title: string;
  description: string;
  status: 'active' | 'completed' | 'on-hold' | 'archived';
  priority: 'low' | 'medium' | 'high';
  dueDate: string;
  tags: string[];
}

export interface ProjectFilters {
  status?: 'active' | 'completed' | 'on-hold' | 'archived';
  priority?: 'low' | 'medium' | 'high';
  search?: string;
  tags?: string[];
}
}
