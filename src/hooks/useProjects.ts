import { useLiveQuery } from 'dexie-react-hooks';
import * as projectRepo from '../db/projectRepository';
import type { Project } from '../types/project';

export function useProjects() {
  const projects = useLiveQuery(
    () => projectRepo.getAllProjects(),
    [],
    [] as Project[],
  );

  return {
    projects,
    createProject: projectRepo.createProject,
    updateProject: projectRepo.updateProject,
    deleteProject: projectRepo.deleteProject,
    checkAndAutoCompleteProject: projectRepo.checkAndAutoCompleteProject,
  };
}
