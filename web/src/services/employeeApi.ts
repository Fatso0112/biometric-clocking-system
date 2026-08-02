export interface EmployeeProfile {
  name: string;
  staffNumber: string;
  department: string;
  position: string;
  email: string;
  phone: string;
  avatarUrl: string | null;
}

export type EmployeeDirectoryProfile = Omit<EmployeeProfile, 'avatarUrl'>;

function wait(duration: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, duration));
}

const MOCK_DIRECTORY_PROFILES: Record<string, EmployeeDirectoryProfile> = {
  '10001': {
    name: 'Employee',
    staffNumber: '10001',
    department: 'Sales',
    position: 'Sales Assistant',
    email: 'employee@email.com',
    phone: '082 123 4567',
  },
  '20001': {
    name: 'Sarah Johnson',
    staffNumber: '20001',
    department: 'Operations',
    position: 'Operations Supervisor',
    email: 'sarah.johnson@email.com',
    phone: '082 555 0101',
  },
};

export async function getEmployeeProfile(staffNumber: string): Promise<EmployeeDirectoryProfile> {
  // MOCK IMPLEMENTATION — replace this lookup with a backend request keyed on staffNumber.
  await wait(250);

  const knownProfile = MOCK_DIRECTORY_PROFILES[staffNumber];
  if (knownProfile) return { ...knownProfile };

  return {
    name: 'Employee',
    staffNumber,
    department: 'Sales',
    position: 'Sales Assistant',
    email: 'employee@email.com',
    phone: '082 123 4567',
  };
}
