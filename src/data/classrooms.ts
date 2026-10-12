export type Classroom = {
  id: string;
  name: string;
  teacher: string;
  subject: string;
  description: string;
  schedule: string;
  students: number;
  assignments: number;
  newAssignments: number;
  progress: number;
  accent: string;
  cover: string;
  code: string;
};

export const defaultClassrooms: Classroom[] = [];
