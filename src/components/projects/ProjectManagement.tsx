import React, { useState, useEffect } from 'react';
import { useProjectStore } from '@/lib/stores/project-store';
import ProjectModal from './ProjectModal';
import ProjectList from './ProjectList';
import type { ProjectCard, CreateProjectRequest, UpdateProjectRequest } from '@/types/dashboard';

interface ProjectManagementProps {
  className?: string;
}

const ProjectManagement: React.FC<ProjectManagementProps> = ({ className = '' }) => {
  const { fetchProjects, createProject, updateProject } = useProjectStore();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingProject, setEditingProject] = useState<ProjectCard | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Load projects on component mount
  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const handleCreateProject = async (data: CreateProjectRequest) => {
    setIsCreating(true);
    try {
      await createProject(data);
      setShowCreateModal(false);
    } catch (error) {
      console.error('Error creating project:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdateProject = async (data: UpdateProjectRequest) => {
    setIsUpdating(true);
    try {
      await updateProject(data);
      setEditingProject(null);
    } catch (error) {
      console.error('Error updating project:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleEditProject = (project: ProjectCard) => {
    setEditingProject(project);
  };

  const handleDeleteProject = (project: ProjectCard) => {
    // Project will be removed from store automatically
    console.log('Project deleted:', project.title);
  };

  return (
    <div className={className}>
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
            Projektmanagement
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mt-1">
            Verwalten Sie Ihre Projekte und verfolgen Sie den Fortschritt
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-colors"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Neues Projekt
        </button>
      </div>

      {/* Project List */}
      <ProjectList
        onEditProject={handleEditProject}
        onDeleteProject={handleDeleteProject}
      />

      {/* Create Project Modal */}
      <ProjectModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSave={handleCreateProject}
        loading={isCreating}
      />

      {/* Edit Project Modal */}
      <ProjectModal
        isOpen={!!editingProject}
        onClose={() => setEditingProject(null)}
        project={editingProject}
        onSave={handleUpdateProject}
        loading={isUpdating}
      />
    </div>
  );
};

export default ProjectManagement;