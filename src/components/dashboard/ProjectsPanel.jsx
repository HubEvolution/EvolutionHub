import React, { useEffect } from 'react';
import { useProjectStore } from '@/lib/stores/project-store';
import CardReact from '@/components/ui/CardReact.jsx';
// Korrigierte Typdefinition für JSX-Datei
/* @type {import('../../types/dashboard').ProjectCard} */

/**
 * @typedef {Object} ProjectsPanelProps
 * @property {import('../../types/dashboard').ProjectCard[]} [initialProjects]
 * @property {string} [title]
 */

/**
 * @param {ProjectsPanelProps} props
 * @returns {React.ReactElement}
 */
const ProjectsPanel = ({ 
  initialProjects = [],
  title = 'Your Projects'
}) => {
  const { projects, loading, error, fetchProjects, createProject } = useProjectStore();
  
  // Beim ersten Rendern die Projekte abrufen, falls keine initialProjects vorhanden sind
  useEffect(() => {
    if ((!initialProjects || initialProjects.length === 0) && projects.length === 0) {
      fetchProjects();
    } else if (initialProjects && initialProjects.length > 0 && projects.length === 0) {
      // Serverseitig abgerufene Projekte in den Store laden
      useProjectStore.getState().setProjects(initialProjects);
    }
  }, [initialProjects]);

  /**
   * @param {string} status
   * @returns {string}
   */
  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'bg-green-500';
      case 'completed':
        return 'bg-blue-500';
      case 'on-hold':
        return 'bg-yellow-500';
      case 'archived':
        return 'bg-gray-500';
      default:
        return 'bg-gray-400';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('de-DE', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <CardReact title={title} className="">
      <div className="space-y-4">
        {loading ? (
          <div className="flex justify-center items-center h-48">
            <div id="lottie-loader" className="w-24 h-24"></div>
          </div>
        ) : error ? (
          <div className="text-center py-8 text-red-500 dark:text-red-400">
            <p>{error}</p>
            <button 
              onClick={fetchProjects}
              className="mt-2 text-primary hover:text-primary-light text-sm font-medium"
            >
              Retry
            </button>
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <p>Keine Projekte gefunden</p>
            <button 
              onClick={createProject}
              className="mt-2 text-primary hover:text-primary-light text-sm font-medium"
            >
              Erstelle dein erstes Projekt
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {projects.map((project) => (
              <div 
                key={project.id}
                className="p-4 rounded-lg bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors cursor-pointer border border-gray-200 dark:border-white/5"
              >
                <div className="flex justify-between items-start">
                  <h4 className="font-medium text-gray-800 dark:text-white">{project.title}</h4>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white ${getStatusColor(project.status)}`}>
                    {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
                  </span>
                </div>
                
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
                  {project.description}
                </p>
                
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                    <span>Fortschritt</span>
                    <span>{project.progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                    <div 
                      className="h-1.5 rounded-full bg-gradient-to-r from-primary to-purple-600" 
                      style={{ width: `${project.progress}%` }}
                    ></div>
                  </div>
                </div>
                
                <div className="mt-3 flex items-center justify-between">
                  <div className="flex -space-x-2">
                    {project.members.map((member, i) => (
                      <div 
                        key={i}
                        className="w-6 h-6 rounded-full bg-gray-600 flex items-center justify-center text-xs text-white border-2 border-gray-800"
                        title={member}
                      >
                        {member.substring(0, 2).toUpperCase()}
                      </div>
                    ))}
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    Aktualisiert {formatDate(project.lastUpdated)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {!loading && (!error || projects.length > 0) && (
          <div className="pt-2">
            <button 
              onClick={createProject}
              className="w-full py-2 text-sm text-center text-primary hover:text-primary-light transition-colors rounded-lg border border-dashed border-gray-300 dark:border-gray-600 hover:border-primary/50"
            >
              + Neues Projekt hinzufügen
            </button>
          </div>
        )}
      </div>
    </CardReact>
  );
};

export default ProjectsPanel;