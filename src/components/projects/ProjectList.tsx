import React, { useState, useMemo } from 'react';
import { useProjectStore } from '@/lib/stores/project-store';
import type { ProjectCard, ProjectFilters } from '@/types/dashboard';

interface ProjectListProps {
  onEditProject?: (project: ProjectCard) => void;
  onDeleteProject?: (project: ProjectCard) => void;
  className?: string;
}

const ProjectList: React.FC<ProjectListProps> = ({
  onEditProject,
  onDeleteProject,
  className = '',
}) => {
  const {
    projects,
    loading,
    error,
    filters,
    setFilters,
    deleteProject,
    getFilteredProjects,
  } = useProjectStore();

  const [showFilters, setShowFilters] = useState(false);

  const filteredProjects = useMemo(() => {
    return getFilteredProjects();
  }, [projects, filters, getFilteredProjects]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'completed':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'on-hold':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'archived':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'text-red-600 dark:text-red-400';
      case 'medium':
        return 'text-yellow-600 dark:text-yellow-400';
      case 'low':
        return 'text-green-600 dark:text-green-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('de-DE', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const handleDeleteClick = async (project: ProjectCard) => {
    if (window.confirm(`Möchten Sie das Projekt "${project.title}" wirklich löschen?`)) {
      try {
        await deleteProject(project.id);
        onDeleteProject?.(project);
      } catch (error) {
        console.error('Error deleting project:', error);
      }
    }
  };

  const handleFilterChange = (key: keyof ProjectFilters, value: string) => {
    setFilters({
      ...filters,
      [key]: value || undefined,
    });
  };

  if (loading) {
    return (
      <div className={`flex justify-center items-center h-48 ${className}`}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <p className="text-red-500 dark:text-red-400 mb-4">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="text-primary hover:text-primary-light text-sm font-medium"
        >
          Seite neu laden
        </button>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Filters */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
            Projekte ({filteredProjects.length})
          </h3>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="text-sm text-primary hover:text-primary-light flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            Filter
          </button>
        </div>

        {showFilters && (
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 mb-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Status
                </label>
                <select
                  value={filters.status || ''}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value="">Alle</option>
                  <option value="active">Aktiv</option>
                  <option value="completed">Abgeschlossen</option>
                  <option value="on-hold">Pausiert</option>
                  <option value="archived">Archiviert</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Priorität
                </label>
                <select
                  value={filters.priority || ''}
                  onChange={(e) => handleFilterChange('priority', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value="">Alle</option>
                  <option value="high">Hoch</option>
                  <option value="medium">Mittel</option>
                  <option value="low">Niedrig</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Suche
                </label>
                <input
                  type="text"
                  value={filters.search || ''}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  placeholder="Nach Titel oder Beschreibung suchen..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Projects Grid */}
      {filteredProjects.length === 0 ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <p className="text-lg font-medium mb-2">Keine Projekte gefunden</p>
          <p className="text-sm">
            {Object.keys(filters).length > 0
              ? 'Versuchen Sie, die Filter anzupassen.'
              : 'Erstellen Sie Ihr erstes Projekt, um loszulegen.'
            }
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project) => (
            <div
              key={project.id}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow"
            >
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <h4 className="font-semibold text-gray-800 dark:text-white line-clamp-2">
                    {project.title}
                  </h4>
                  <div className="flex gap-2 ml-2">
                    {onEditProject && (
                      <button
                        onClick={() => onEditProject(project)}
                        className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                    )}
                    {onDeleteProject && (
                      <button
                        onClick={() => handleDeleteClick(project)}
                        className="text-gray-400 hover:text-red-600 dark:text-gray-500 dark:hover:text-red-400"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>

                <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-3 mb-4">
                  {project.description}
                </p>

                <div className="space-y-3">
                  {/* Status and Priority */}
                  <div className="flex justify-between items-center">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(project.status)}`}>
                      {project.status === 'active' && 'Aktiv'}
                      {project.status === 'completed' && 'Abgeschlossen'}
                      {project.status === 'on-hold' && 'Pausiert'}
                      {project.status === 'archived' && 'Archiviert'}
                    </span>
                    <span className={`text-xs font-medium ${getPriorityColor(project.priority || 'medium')}`}>
                      {project.priority === 'high' && 'Hoch'}
                      {project.priority === 'medium' && 'Mittel'}
                      {project.priority === 'low' && 'Niedrig'}
                    </span>
                  </div>

                  {/* Progress */}
                  <div>
                    <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                      <span>Fortschritt</span>
                      <span>{project.progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className="h-2 rounded-full bg-gradient-to-r from-primary to-purple-600 transition-all duration-300"
                        style={{ width: `${project.progress}%` }}
                      />
                    </div>
                  </div>

                  {/* Tags */}
                  {project.tags && project.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {project.tags.slice(0, 3).map((tag, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200"
                        >
                          {tag}
                        </span>
                      ))}
                      {project.tags.length > 3 && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          +{project.tags.length - 3}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Due Date */}
                  {project.dueDate && (
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Fällig: {formatDate(project.dueDate)}
                    </div>
                  )}

                  {/* Members */}
                  {project.members && project.members.length > 0 && (
                    <div className="flex items-center justify-between">
                      <div className="flex -space-x-2">
                        {project.members.slice(0, 3).map((member, i) => (
                          <div
                            key={i}
                            className="w-6 h-6 rounded-full bg-gray-600 flex items-center justify-center text-xs text-white border-2 border-white dark:border-gray-800"
                            title={member}
                          >
                            {member.substring(0, 2).toUpperCase()}
                          </div>
                        ))}
                        {project.members.length > 3 && (
                          <div className="w-6 h-6 rounded-full bg-gray-400 flex items-center justify-center text-xs text-white border-2 border-white dark:border-gray-800">
                            +{project.members.length - 3}
                          </div>
                        )}
                      </div>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {formatDate(project.lastUpdated)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProjectList;