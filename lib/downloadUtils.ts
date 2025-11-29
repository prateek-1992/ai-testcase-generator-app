import { TestCase } from "@/types/TestCase";
import * as XLSX from "xlsx";

/**
 * Downloads test cases as JSON file
 */
export function downloadAsJSON(testCases: TestCase[], filename: string = "test-cases") {
  const dataStr = JSON.stringify(testCases, null, 2);
  const dataBlob = new Blob([dataStr], { type: "application/json" });
  const url = URL.createObjectURL(dataBlob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Converts test cases to CSV format
 */
function testCasesToCSV(testCases: TestCase[]): string {
  // CSV Header
  const headers = [
    "Test ID",
    "Title",
    "Description",
    "Preconditions",
    "Steps",
    "Expected Result",
    "Priority",
    "Type",
  ];

  // Convert test cases to CSV rows
  const rows = testCases.map((tc) => {
    // Join steps array with semicolon for CSV
    const steps = Array.isArray(tc.steps) ? tc.steps.join("; ") : "";
    
    // Escape commas and quotes in CSV values
    const escapeCSV = (value: string) => {
      if (value.includes(",") || value.includes('"') || value.includes("\n")) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    };

    return [
      escapeCSV(tc.testId || ""),
      escapeCSV(tc.title || ""),
      escapeCSV(tc.description || ""),
      escapeCSV(tc.preconditions || ""),
      escapeCSV(steps),
      escapeCSV(tc.expectedResult || ""),
      escapeCSV(tc.priority || ""),
      escapeCSV(tc.type || ""),
    ].join(",");
  });

  return [headers.join(","), ...rows].join("\n");
}

/**
 * Downloads test cases as CSV file
 */
export function downloadAsCSV(testCases: TestCase[], filename: string = "test-cases") {
  const csvContent = testCasesToCSV(testCases);
  const dataBlob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(dataBlob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Downloads test cases as Excel file (.xlsx)
 */
export function downloadAsExcel(testCases: TestCase[], filename: string = "test-cases") {
  // Prepare data for Excel
  const excelData = testCases.map((tc) => {
    const steps = Array.isArray(tc.steps) ? tc.steps.join("\n") : "";
    
    return {
      "Test ID": tc.testId || "",
      "Title": tc.title || "",
      "Description": tc.description || "",
      "Preconditions": tc.preconditions || "",
      "Steps": steps,
      "Expected Result": tc.expectedResult || "",
      "Priority": tc.priority || "",
      "Type": tc.type || "",
    };
  });

  // Create workbook and worksheet
  const worksheet = XLSX.utils.json_to_sheet(excelData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Test Cases");

  // Set column widths for better readability
  const colWidths = [
    { wch: 12 }, // Test ID
    { wch: 30 }, // Title
    { wch: 40 }, // Description
    { wch: 30 }, // Preconditions
    { wch: 50 }, // Steps
    { wch: 40 }, // Expected Result
    { wch: 10 }, // Priority
    { wch: 12 }, // Type
  ];
  worksheet["!cols"] = colWidths;

  // Generate Excel file and download
  XLSX.writeFile(workbook, `${filename}.xlsx`);
}

