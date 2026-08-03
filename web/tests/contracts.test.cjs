const assert = require('node:assert/strict');
const { test } = require('node:test');
const {
  adaptEmployeeBoundary,
  deriveFullName,
} = require('./.compiled/services/canonicalDomainAdapters.js');

test('DTO Mapping v1 emits employeeNumber and derives fullName without persisting staffNumber', () => {
  const employee = adaptEmployeeBoundary({
    staffNumber: ' E10001 ',
    firstName: 'Ada',
    lastName: 'Lovelace',
    departmentId: 'department-1',
    isActive: true,
  });

  assert.equal(employee.employeeNumber, 'E10001');
  assert.equal('staffNumber' in employee, false);
  assert.equal(deriveFullName(employee.firstName, employee.lastName), 'Ada Lovelace');
  assert.equal(employee.status, 'active');
});
