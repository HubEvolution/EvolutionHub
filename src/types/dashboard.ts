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
  action: () => void;
  variant?: 'primary' | 'secondary' | 'success' | 'danger';
}

export interface DashboardData {
  stats: DashboardStats;
  recentActivities: ActivityItem[];
  projects: ProjectCard[];
  quickActions: QuickAction[];
}
