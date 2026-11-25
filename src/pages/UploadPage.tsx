import React, { useRef, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Database,
  FileText,
  Loader2,
  UploadCloud,
} from 'lucide-react';
import { ParsedDocumentResult, parseUploadedDocument } from '../engine/documentParser';
import { SAMPLE_ACADEMIC_DATASETS } from '../engine/evaluator';
import { extractKnowledgeFromText } from '../engine/knowledgeExtractor';
import { saveExtractedDocument } from '../services/firestoreService';
import { InferenceRule, NavPage } from '../types';

export function UploadPage({
  userId,
  rules,
  onNavigate,
}: {
  userId: string;
  rules: InferenceRule[];
  onNavigate: (page: NavPage, documentId?: string) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<{
    documentId: string;
    fileName: string;
    factCount: number;
  } | null>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedDoc, setParsedDoc] = useState<ParsedDocumentResult | null>(null);
  const [previewTriples, setPreviewTriples] = useState<
    ReturnType<typeof extractKnowledgeFromText> | null
  >(null);

  const handleFile = async (file: File) => {
    setErrorMsg(null);
    setSuccessInfo(null);
    setProcessing(true);
    setSelectedFile(file);
    try {
      const parsed = await parseUploadedDocument(file);
      const extracted = extractKnowledgeFromText(
        parsed.extractedText,
        parsed.csvRows,
        parsed.csvHeaders
      );
      setParsedDoc(parsed);
      setPreviewTriples(extracted);
    } catch (err) {
      setParsedDoc(null);
      setPreviewTriples(null);
      setSelectedFile(null);
      setErrorMsg(err instanceof Error ? err.message : 'Failed to parse document.');
    } finally {
      setProcessing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      void handleFile(file);
    }
  };

  const handleConfirmSave = async () => {
    if (!parsedDoc) return;
    setSaving(true);
    setErrorMsg(null);
    try {
      const res = await saveExtractedDocument({
        userId,
        file: selectedFile ?? undefined,
        fileName: parsedDoc.fileName,
        fileType: parsedDoc.fileType,
        fileSize: parsedDoc.fileSize,
        extractedText: parsedDoc.extractedText,
        csvRows: parsedDoc.csvRows,
        csvHeaders: parsedDoc.csvHeaders,
        existingRules: rules,
      });
      setSuccessInfo({
        documentId: res.documentId,
        fileName: parsedDoc.fileName,
        factCount: res.factCount,
      });
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to save document to Firestore.');
    } finally {
      setSaving(false);
    }
  };

  const handleQuickSampleUpload = async (sampleId: string) => {
    const sample = SAMPLE_ACADEMIC_DATASETS.find((s) => s.id === sampleId);
    if (!sample) return;
    setErrorMsg(null);
    setSuccessInfo(null);
    setSaving(true);
    try {
      const extracted = extractKnowledgeFromText(sample.content);
      setParsedDoc({
        fileName: sample.fileName,
        fileType: 'txt',
        fileSize: new Blob([sample.content]).size,
        extractedText: sample.content,
      });
      setPreviewTriples(extracted);
      const res = await saveExtractedDocument({
        userId,
        fileName: sample.fileName,
        fileType: 'txt',
        fileSize: new Blob([sample.content]).size,
        extractedText: sample.content,
        existingRules: rules,
      });
      setSuccessInfo({
        documentId: res.documentId,
        fileName: sample.fileName,
        factCount: res.factCount,
      });
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to save sample document.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">
            Document Upload & Extraction
          </h1>
          <p className="text-sm text-slate-600">
            Upload PDF, DOCX, TXT, or CSV files to extract raw text and construct structured Knowledge Base facts.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {SAMPLE_ACADEMIC_DATASETS.map((s) => (
            <button
              key={s.id}
              type="button"
              disabled={saving}
              onClick={() => void handleQuickSampleUpload(s.id)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-60 whitespace-nowrap"
            >
              <Database className="w-3.5 h-3.5 text-blue-600" />
              Import {s.fileName}
            </button>
          ))}
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm flex items-start gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 text-red-600 mt-0.5" />
          <div>
            <p className="font-medium">Document Processing Error</p>
            <p className="text-xs mt-0.5">{errorMsg}</p>
          </div>
        </div>
      )}

      {successInfo && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600 mt-0.5" />
            <div>
              <p className="text-sm font-semibold">
                Saved &ldquo;{successInfo.fileName}&rdquo; and constructed {successInfo.factCount} Knowledge Base facts
              </p>
              <p className="text-xs text-emerald-700">
                Document stored and indexed in Cloud Firestore with Forward Chaining rules applied.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => onNavigate('knowledge-base')}
              className="px-3 py-1.5 text-xs font-medium text-emerald-800 bg-white border border-emerald-300 rounded-lg hover:bg-emerald-100 whitespace-nowrap"
            >
              View Facts
            </button>
            <button
              type="button"
              onClick={() => onNavigate('chat', successInfo.documentId)}
              className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 whitespace-nowrap"
            >
              Ask Questions
            </button>
          </div>
        </div>
      )}

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={`bg-white border-2 border-dashed rounded-xl p-10 text-center transition-colors ${
          dragging ? 'border-blue-600 bg-blue-50/40' : 'border-slate-300 hover:border-blue-400'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx,.txt,.csv"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFile(file);
            e.target.value = '';
          }}
        />
        <div className="max-w-md mx-auto space-y-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
            {processing ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <UploadCloud className="w-6 h-6" />
            )}
          </div>
          <div className="space-y-1">
            <p className="font-display text-base font-semibold text-slate-900">
              {processing
                ? 'Extracting text and constructing facts...'
                : 'Drag and drop a document here, or browse'}
            </p>
            <p className="text-xs text-slate-500">
              Supported formats: PDF (PDF.js) · DOCX (Mammoth.js) · TXT (FileReader) · CSV (PapaParse)
            </p>
          </div>
          <button
            type="button"
            disabled={processing}
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-60 whitespace-nowrap"
          >
            Browse Files
          </button>
        </div>
      </div>

      {parsedDoc && previewTriples && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <span className="w-9 h-9 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4" />
                </span>
                <div className="min-w-0">
                  <h2 className="font-display text-sm font-semibold text-slate-900 truncate">
                    {parsedDoc.fileName}
                  </h2>
                  <p className="text-xs text-slate-500 tabular-nums">
                    {parsedDoc.fileType.toUpperCase()} · {Math.max(1, Math.round(parsedDoc.fileSize / 1024))} KB ·{' '}
                    {new Date().toLocaleDateString()}
                    {parsedDoc.pageCount ? ` · ${parsedDoc.pageCount} pages` : ''}
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={saving}
                onClick={() => void handleConfirmSave()}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-60 whitespace-nowrap shrink-0"
              >
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {saving ? 'Saving...' : 'Save to Knowledge Base'}
              </button>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span className="font-medium text-slate-700">Extracted Text Preview</span>
                <span className="font-mono tabular-nums">
                  {parsedDoc.extractedText.length.toLocaleString()} chars · {previewTriples.sentenceCount} sentences
                </span>
              </div>
              <pre className="p-4 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700 font-sans whitespace-pre-wrap max-h-96 overflow-y-auto leading-relaxed">
                {parsedDoc.extractedText}
              </pre>
            </div>
          </div>

          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-base font-semibold text-slate-900">
                  Extracted Structured Facts Preview
                </h2>
                <p className="text-xs text-slate-500 tabular-nums">
                  {previewTriples.facts.length} candidate facts · {previewTriples.entities.length} entities ·{' '}
                  {previewTriples.derivedRules.length} universal rules detected
                </p>
              </div>
            </div>

            {previewTriples.derivedRules.length > 0 && (
              <div className="p-3.5 rounded-lg bg-blue-50/60 border border-blue-200 space-y-1.5">
                <p className="text-xs font-semibold text-blue-900">
                  Universal Inference Rules Extracted from Text
                </p>
                {previewTriples.derivedRules.map((dr, i) => (
                  <p key={i} className="text-xs font-mono text-blue-800">
                    {dr.condition} {dr.conclusion}
                  </p>
                ))}
              </div>
            )}

            <div className="overflow-x-auto border border-slate-200 rounded-lg max-h-96 overflow-y-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
                  <tr>
                    <th className="py-2.5 px-3 text-xs font-semibold text-slate-700">Subject</th>
                    <th className="py-2.5 px-3 text-xs font-semibold text-slate-700">Relationship</th>
                    <th className="py-2.5 px-3 text-xs font-semibold text-slate-700">Object</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {previewTriples.facts.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="py-6 text-center text-slate-500">
                        No structured triples matched sentence templates. You can still save the document and add manual facts.
                      </td>
                    </tr>
                  ) : (
                    previewTriples.facts.map((fact, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="py-2 px-3 font-medium text-slate-900">{fact.subject}</td>
                        <td className="py-2 px-3 font-mono text-blue-700">{fact.predicate}</td>
                        <td className="py-2 px-3 text-slate-700">{fact.object}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
