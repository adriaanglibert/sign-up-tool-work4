export type Branch = {
  id: string;
  name: string;
};

export type CapacityCell = {
  maxCapacity: number;
  assignedCount: number;
};

export type Organization = {
  id: string;
  name: string;
  cells: Record<string, CapacityCell>;
};

export type Matrix = {
  branches: Branch[];
  organizations: Organization[];
};

export type PublicMatrix = {
  branches: Branch[];
  organizations: Array<Pick<Organization, "id" | "name">>;
};

export type Settings = {
  isOpen: boolean;
};

export type Preference = {
  branchId: string;
};

export type Assignment = {
  organizationId: string;
  branchId: string;
};

export type Submission = {
  id: string;
  submittedAt: string;
  studentName: string;
  preferences: [Preference, Preference, Preference];
  assignedCombination: Assignment | null;
  status: "Toegewezen" | "Wachtlijst";
};
