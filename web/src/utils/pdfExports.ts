import type { AttendanceRecord, AttendanceSummary } from '../services/attendanceApi';
import type { TeamAttendanceRow } from '../services/teamAttendanceApi';
import type { AttendanceRange } from './attendanceRanges';

type AttendanceHistoryPdfSummary = Pick<
  AttendanceSummary,
  'daysPresent' | 'daysAbsent' | 'totalHours'
> &
  Partial<Pick<AttendanceSummary, 'daysLate'>>;

type HistoryPdfInput = {
  staffNumber: string;
  range: AttendanceRange;
  rangeLabel: string;
  summary: AttendanceHistoryPdfSummary;
  records: AttendanceRecord[];
};

type SummaryPdfInput = {
  staffNumber: string;
  range: AttendanceRange;
  rangeLabel: string;
  summary: AttendanceSummary;
};

export type TeamAttendanceReportSummary = {
  referenceDate: string;
  totalMembers: number;
  presentMembers: number;
  absentMembers: number;
};

type TeamAttendanceReportPdfInput = {
  range: AttendanceRange;
  rangeLabel: string;
  summary: TeamAttendanceReportSummary;
  rows: TeamAttendanceRow[];
};

function getFileRange(range: AttendanceRange) {
  return `${range.from}-to-${range.to}`;
}

function formatStatus(status: AttendanceRecord['status']) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

type PdfSummaryCell = {
  label: string;
  value: string;
  fillColor: [number, number, number];
  valueColor: [number, number, number];
};

function drawSummaryCells(
  document: import('jspdf').jsPDF,
  cells: readonly PdfSummaryCell[],
  startY: number,
) {
  const startX = 14;
  const gap = 4;
  const cellWidth =
    (document.internal.pageSize.getWidth() - startX * 2 - gap * (cells.length - 1)) /
    cells.length;
  const cellHeight = 20;

  cells.forEach((cell, index) => {
    const x = startX + index * (cellWidth + gap);
    document.setFillColor(...cell.fillColor);
    document.roundedRect(x, startY, cellWidth, cellHeight, 3, 3, 'F');
    document.setFont('helvetica', 'normal');
    document.setFontSize(8);
    document.setTextColor(85, 85, 85);
    document.text(cell.label, x + cellWidth / 2, startY + 7, { align: 'center' });
    document.setFont('helvetica', 'bold');
    document.setFontSize(13);
    document.setTextColor(...cell.valueColor);
    document.text(cell.value, x + cellWidth / 2, startY + 15, { align: 'center' });
  });

  document.setTextColor(28, 28, 28);
  return startY + cellHeight;
}

export async function exportAttendanceHistoryPdf({
  staffNumber,
  range,
  rangeLabel,
  summary,
  records,
}: HistoryPdfInput) {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
  const document = new jsPDF();

  document.setFont('helvetica', 'bold');
  document.setFontSize(18);
  document.text('Attendance History', 14, 18);
  document.setFont('helvetica', 'normal');
  document.setFontSize(10);
  document.text(`Employee Number: ${staffNumber}`, 14, 25);
  document.text(`Date Range: ${rangeLabel}`, 14, 31);

  document.setFont('helvetica', 'bold');
  document.setFontSize(10);
  document.text('Attendance Summary', 14, 39);
  const summaryCells: PdfSummaryCell[] = [
    {
      label: 'Days Present',
      value: String(summary.daysPresent),
      fillColor: [220, 252, 231],
      valueColor: [22, 163, 74],
    },
    {
      label: 'Days Absent',
      value: String(summary.daysAbsent),
      fillColor: [252, 231, 243],
      valueColor: [225, 29, 72],
    },
  ];

  // Employee history tracks late days separately, so that caller supplies this
  // fourth cell. Supervisor Employee Details omits it to mirror its three on-screen cells.
  if (summary.daysLate !== undefined) {
    summaryCells.push({
      label: 'Days Late',
      value: String(summary.daysLate),
      fillColor: [254, 243, 199],
      valueColor: [217, 119, 6],
    });
  }

  summaryCells.push({
    label: 'Working Hours',
    value: summary.totalHours,
    fillColor: [248, 248, 248],
    valueColor: [28, 28, 28],
  });

  const summaryEndY = drawSummaryCells(document, summaryCells, 43);

  autoTable(document, {
    startY: summaryEndY + 7,
    head: [['Date', 'Day', 'In', 'Out', 'Status', 'Hours']],
    body: records.map((record) => [
      record.date,
      record.day,
      record.timeIn ?? '-',
      record.timeOut ?? '-',
      formatStatus(record.status),
      record.hours ?? '-',
    ]),
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2.5 },
    headStyles: { fillColor: [28, 28, 28], textColor: [255, 255, 255] },
  });

  document.save(`attendance-history-${getFileRange(range)}.pdf`);
}

export async function exportAttendanceSummaryPdf({ staffNumber, range, rangeLabel, summary }: SummaryPdfInput) {
  const { jsPDF } = await import('jspdf');
  const document = new jsPDF();

  document.setFont('helvetica', 'bold');
  document.setFontSize(18);
  document.text('Attendance Summary', 14, 18);
  document.setFont('helvetica', 'normal');
  document.setFontSize(10);
  document.text(`Employee Number: ${staffNumber}`, 14, 25);
  document.text(`Date Range: ${rangeLabel}`, 14, 31);

  const rows = [
    ['Days Present', String(summary.daysPresent)],
    ['Days Absent', String(summary.daysAbsent)],
    ['Days Late', String(summary.daysLate)],
    ['Total Working Hours', summary.totalHours],
  ];

  rows.forEach(([label, value], index) => {
    const y = 44 + index * 14;
    document.setFont('helvetica', 'normal');
    document.text(label, 14, y);
    document.setFont('helvetica', 'bold');
    document.text(value, 88, y);
  });

  document.save(`attendance-summary-${getFileRange(range)}.pdf`);
}

export async function exportTeamAttendanceReportPdf({
  range,
  rangeLabel,
  summary,
  rows,
}: TeamAttendanceReportPdfInput) {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);
  const document = new jsPDF();

  document.setFont('helvetica', 'bold');
  document.setFontSize(18);
  document.text('Team Attendance Report', 14, 18);
  document.setFont('helvetica', 'normal');
  document.setFontSize(10);
  document.text(`Date Range: ${rangeLabel}`, 14, 26);
  document.text(`Snapshot Reference Day: ${summary.referenceDate}`, 14, 32);

  document.setFont('helvetica', 'bold');
  document.setFontSize(10);
  document.text('Team Summary', 14, 40);
  const summaryEndY = drawSummaryCells(
    document,
    [
      {
        label: 'Total Members',
        value: String(summary.totalMembers),
        fillColor: [248, 248, 248],
        valueColor: [28, 28, 28],
      },
      {
        label: 'Present',
        value: String(summary.presentMembers),
        fillColor: [220, 252, 231],
        valueColor: [22, 163, 74],
      },
      {
        label: 'Absent',
        value: String(summary.absentMembers),
        fillColor: [252, 231, 243],
        valueColor: [225, 29, 72],
      },
    ],
    44,
  );

  autoTable(document, {
    startY: summaryEndY + 7,
    head: [['Employee', 'Present', 'Absent', 'Hours']],
    body: rows.map((row) => [
      `${row.employeeName} (${row.employeeId})`,
      String(row.presentDays),
      String(row.absentDays),
      row.totalHours,
    ]),
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [28, 28, 28], textColor: [255, 255, 255] },
  });

  document.save(`team-attendance-report-${getFileRange(range)}.pdf`);
}
