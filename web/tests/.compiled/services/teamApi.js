"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSupervisorTeam = getSupervisorTeam;
exports.getSupervisorTeamMember = getSupervisorTeamMember;
const portalDemoRepository_1 = require("./portalDemoRepository");
const MOCK_DELAY_MS = 300;
function wait(duration) {
    return new Promise((resolve) => window.setTimeout(resolve, duration));
}
function toTeamMember(employeeNumber) {
    const employee = (0, portalDemoRepository_1.getPortalDemoSnapshot)().employees.find((candidate) => candidate.employeeNumber === employeeNumber && candidate.status === 'active');
    return employee
        ? {
            staffNumber: employee.employeeNumber,
            name: `${employee.firstName} ${employee.lastName}`,
            position: employee.jobTitle,
        }
        : null;
}
async function getSupervisorTeam(request) {
    await wait(MOCK_DELAY_MS);
    const state = (0, portalDemoRepository_1.getPortalDemoSnapshot)();
    const members = state.teamAssignments
        .filter((assignment) => assignment.active &&
        assignment.supervisorEmployeeNumber === request.supervisorStaffNumber)
        .map((assignment) => toTeamMember(assignment.memberEmployeeNumber))
        .filter((member) => member !== null);
    return { supervisorStaffNumber: request.supervisorStaffNumber, members };
}
async function getSupervisorTeamMember(request) {
    await wait(MOCK_DELAY_MS);
    const belongsToSupervisor = (0, portalDemoRepository_1.getPortalDemoSnapshot)().teamAssignments.some((assignment) => assignment.active &&
        assignment.supervisorEmployeeNumber === request.supervisorStaffNumber &&
        assignment.memberEmployeeNumber === request.employeeId);
    return {
        supervisorStaffNumber: request.supervisorStaffNumber,
        member: belongsToSupervisor ? toTeamMember(request.employeeId) : null,
    };
}
