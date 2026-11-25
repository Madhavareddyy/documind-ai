import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import mammoth from 'mammoth';
import Papa from 'papaparse';
import { FileType } from '../types';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export interface ParsedDocumentResult {
  fileName: string;
  fileType: FileType;
  fileSize: number;
  extractedText: string;
  csvRows?: Record<string, string>[];
  csvHeaders?: string[];
  pageCount?: number;
}

const EXTENSION_MAP: Record<string, FileType> = {
  pdf: 'pdf',
  docx: 'docx',
  txt: 'txt',
  csv: 'csv',
};

export function detectSupportedFileType(file: File): FileType | null {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  if (ext in EXTENSION_MAP) {
    return EXTENSION_MAP[ext];
  }
  if (file.type === 'application/pdf') return 'pdf';
  if (
    file.type ===
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    return 'docx';
  }
  if (file.type === 'text/plain') return 'txt';
  if (file.type === 'text/csv' || file.type === 'application/vnd.ms-excel') return 'csv';
  return null;
}

function readTextWithFileReader(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve(typeof reader.result === 'string' ? reader.result : '');
    };
    reader.onerror = () => {
      reject(new Error('Failed to read text file using FileReader.'));
    };
    reader.readAsText(file);
  });
}

async function extractPdfText(file: File): Promise<{ text: string; pageCount: number }> {
  const buffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer) });
  const pdf = await loadingTask.promise;
  const pages: string[] = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();
    const lines: string[] = [];
    let currentLine = '';
    let lastY: number | null = null;

    for (const item of content.items) {
      if (!('str' in item)) continue;
      const textItem = item as { str: string; transform?: number[] };
      const y = textItem.transform ? Math.round(textItem.transform[5]) : null;
      if (lastY !== null && y !== null && Math.abs(y - lastY) > 4) {
        if (currentLine.trim()) lines.push(currentLine.trim());
        currentLine = textItem.str;
      } else {
        currentLine += (currentLine && textItem.str ? ' ' : '') + textItem.str;
      }
      lastY = y;
    }
    if (currentLine.trim()) lines.push(currentLine.trim());
    pages.push(lines.join('\n'));
  }

  return {
    text: pages.join('\n\n').replace(/\s+\n/g, '\n').trim(),
    pageCount: pdf.numPages,
  };
}

async function extractDocxText(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value.replace(/\r\n/g, '\n').trim();
}

function parseCsvText(rawCsv: string): {
  headers: string[];
  rows: Record<string, string>[];
  textSummary: string;
} {
  const parsed = Papa.parse<Record<string, string>>(rawCsv, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });

  const headers = (parsed.meta.fields ?? []).filter((h) => h.length > 0);
  const rows = (parsed.data ?? []).filter((row) =>
    Object.values(row).some((val) => typeof val === 'string' && val.trim().length > 0)
  );

  if (headers.length === 0 || rows.length === 0) {
    return {
      headers,
      rows,
      textSummary: rawCsv.trim(),
    };
  }

  const primaryCol = headers[0];
  const sentences: string[] = [];
  for (const row of rows) {
    const entity = (row[primaryCol] ?? '').trim();
    if (!entity) continue;
    const parts: string[] = [];
    for (let i = 1; i < headers.length; i++) {
      const col = headers[i];
      const val = (row[col] ?? '').trim();
      if (val) {
        parts.push(`${col} is ${val}`);
      }
    }
    if (parts.length > 0) {
      sentences.push(`${entity}: ${parts.join('; ')}.`);
    }
  }

  return {
    headers,
    rows,
    textSummary: sentences.join('\n'),
  };
}

export async function parseUploadedDocument(file: File): Promise<ParsedDocumentResult> {
  const fileType = detectSupportedFileType(file);
  if (!fileType) {
    throw new Error(
      `Unsupported file format for "${file.name}". Please upload a PDF, DOCX, TXT, or CSV file.`
    );
  }

  if (file.size === 0) {
    throw new Error(`The file "${file.name}" is empty.`);
  }

  if (fileType === 'txt') {
    const text = (await readTextWithFileReader(file)).replace(/\r\n/g, '\n').trim();
    if (!text) {
      throw new Error(`No readable text content found in "${file.name}".`);
    }
    return {
      fileName: file.name,
      fileType,
      fileSize: file.size,
      extractedText: text,
    };
  }

  if (fileType === 'csv') {
    const rawCsv = await readTextWithFileReader(file);
    const { headers, rows, textSummary } = parseCsvText(rawCsv);
    if (!textSummary) {
      throw new Error(`No structured rows found in CSV file "${file.name}".`);
    }
    return {
      fileName: file.name,
      fileType,
      fileSize: file.size,
      extractedText: textSummary,
      csvHeaders: headers,
      csvRows: rows,
    };
  }

  if (fileType === 'pdf') {
    const { text, pageCount } = await extractPdfText(file);
    if (!text) {
      throw new Error(
        `No extractable text layer found in "${file.name}". Scanned image-only PDFs are not supported without a text layer.`
      );
    }
    return {
      fileName: file.name,
      fileType,
      fileSize: file.size,
      extractedText: text,
      pageCount,
    };
  }

  const docxText = await extractDocxText(file);
  if (!docxText) {
    throw new Error(`No readable text content found in DOCX file "${file.name}".`);
  }
  return {
    fileName: file.name,
    fileType,
    fileSize: file.size,
    extractedText: docxText,
  };
}
