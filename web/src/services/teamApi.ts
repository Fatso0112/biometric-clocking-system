import { getPortalDemoSnapshot } from './portalDemoRepository';

export interface TeamMemberRecord {
  staffNumber: string;
  name: string;
  position: string;
}

export interface GetSupervisorTeamRequest {
  supervisorStaffNumber: string;
}

export interface GetSupervisorTeamResponse {
  supervisorStaffNumber: string;
  members: TeamMemberRecord[];
}

export interface GetSupervisorTeamMemberRequest {
  supervisorStaffNumber: string;
  employeeId: string;
}

export interface GetSupervisorTeamMemberResponse {
  supervisorStaffNumber: string;
  member: TeamMemberRecord | null;
}

const MOCK_DELAY_MS = 300;

function wait(duration: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, duration));
}

function toTeamMember(employeeNumber: string): TeamMemberRecord | null {
  const employee = getPortalDemoSnapshot().employees.find(
    (candidate) => candidate.employeeNumber === employeeNumber && candidate.status === 'active',
  );
  return employee
    ? {
        staffNumber: employee.employeeNumber,
        name: `${employee.firstName} ${employee.lastName}`,
        position: employee.jobTitle,
      }
    : null;
}

export async function getSupervisorTeam(
  request: GetSupervisorTeamRequest,
): Promise<GetSupervisorTeamResponse> {
  await wait(MOCK_DELAY_MS);
  const state = getPortalDemoSnapshot();
  const members = state.teamAssignments
    .filter(
      (assignment) =>
        assignment.active &&
        assignment.supervisorEmployeeNumber === request.supervisorStaffNumber,
    )
    .map((assignment) => toTeamMember(assignment.memberEmployeeNumber))
    .filter((member): member is TeamMemberRecord => member !== null);

  return { supervisorStaffNumber: request.supervisorStaffNumber, members };
}

export async function getSupervisorTeamMember(
  request: GetSupervisorTeamMemberRequest,
): Promise<GetSupervisorTeamMemberResponse> {
  await wait(MOCK_DELAY_MS);
  const belongsToSupervisor = getPortalDemoSnapshot().teamAssignments.some(
    (assignment) =>
      assignment.active &&
      assignment.supervisorEmployeeNumber === request.supervisorStaffNumber &&
      assignment.memberEmployeeNumber === request.employeeId,
  );

  return {
    supervisorStaffNumber: request.supervisorStaffNumber,
    member: belongsToSupervisor ? toTeamMember(request.employeeId) : null,
  };
}
