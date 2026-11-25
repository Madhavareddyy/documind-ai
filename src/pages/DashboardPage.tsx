import React from 'react';
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Database,
  FileText,
  MessageSquare,
  Sparkles,
  UploadCloud,
} from 'lucide-react';
import { DonutBreakdownChart, SimpleBarChart } from '../components/Charts';
import { computeEvaluationMetrics } from '../engine/evaluator';
import {
  DocumentRecord,
  EvaluationRecord,
  KnowledgeFact,
  NavPage,
  QuestionRecord,
} from '../types';

export function DashboardPage({
  documents,
  facts,
  questions,
  evaluations,
  onNavigate,
  onLoadSampleData,
  loadingSample,
}: {
  documents: DocumentRecord[];
  facts: KnowledgeFact[];
  questions: QuestionRecord[];
  evaluations: EvaluationRecord[];
  onNavigate: (page: NavPage, documentId?: string) => void;
  onLoadSampleData: () => Promise<void>;
  loadingSample: boolean;
}) {
  const directFactsCount = facts.filter((f) => f.factType !== 'inferred').length;
  const inferredFactsCount = facts.filter((f) => f.factType === 'inferred').length;
  const evalMetrics = computeEvaluationMetrics(evaluations);
  const answeredQuestionsCount = questions.filter((q) => q.answered).length;
  const displayAccuracy =
    evaluations.length > 0
      ? `${evalMetrics.accuracy.toFixed(1)}%`
      : questions.length > 0
      ? `${((answeredQuestionsCount / questions.length) * 100).toFixed(1)}%`
      : '—';

  const accuracyContext =
    evaluations.length > 0
      ? `${evalMetrics.correct}/${evalMetrics.total} benchmark checks passed`
      : questions.length > 0
      ? `${answeredQuestionsCount}/${questions.length} queries grounded`
      : 'Run evaluation suite to measure';

  const docChartData = documents.slice(0, 7).map((d) => {
    const docFacts = facts.filter((f) => f.documentId === d.documentId);
    const direct = docFacts.filter((f) => f.factType !== 'inferred').length;
    const inferred = docFacts.filter((f) => f.factType === 'inferred').length;
    return {
      label: d.fileName.replace(/\.[^/.]+$/, ''),
      value: direct,
      secondaryValue: inferred,
    };
  });

  const kbSegments = [
    {
      label: 'Extracted Facts',
      value: facts.filter((f) => f.factType === 'extracted').length,
      color: '#2563EB',
    },
    {
      label: 'Inferred Facts',
      value: inferredFactsCount,
      color: '#D97706',
    },
    {
      label: 'Manual Facts',
      value: facts.filter((f) => f.factType === 'manual').length,
      color: '#16A34A',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">
            Workspace Overview
          </h1>
          <p className="text-sm text-slate-600">
            Symbolic Knowledge Base status, document corpus metrics, and deterministic reasoning activity.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={onLoadSampleData}
            disabled={loadingSample}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-60 whitespace-nowrap"
          >
            <Database className="w-4 h-4 text-blue-600" />
            {loadingSample ? 'Loading Sample Corpus...' : 'Load Sample Academic Corpus'}
          </button>
          <button
            type="button"
            onClick={() => onNavigate('upload')}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
          >
            <UploadCloud className="w-4 h-4" />
            Upload Document
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-2">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Total Documents Uploaded</span>
            <FileText className="w-4 h-4 text-blue-600" />
          </div>
          <p className="font-mono text-2xl font-semibold tabular-nums text-slate-900">
            {documents.length}
          </p>
          <p className="text-xs text-slate-500">
            PDF · DOCX · TXT · CSV corpus
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-2">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Knowledge Base Facts</span>
            <BookOpen className="w-4 h-4 text-blue-600" />
          </div>
          <p className="font-mono text-2xl font-semibold tabular-nums text-slate-900">
            {facts.length}
          </p>
          <p className="text-xs text-slate-500 tabular-nums">
            {directFactsCount} direct · {inferredFactsCount} inferred
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-2">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Total Questions Asked</span>
            <MessageSquare className="w-4 h-4 text-blue-600" />
          </div>
          <p className="font-mono text-2xl font-semibold tabular-nums text-slate-900">
            {questions.length}
          </p>
          <p className="text-xs text-slate-500 tabular-nums">
            {answeredQuestionsCount} answered with grounded facts
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-2">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Answer Accuracy</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="font-mono text-2xl font-semibold tabular-nums text-slate-900">
            {displayAccuracy}
          </p>
          <p className="text-xs text-slate-500 tabular-nums">{accuracyContext}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-base font-semibold text-slate-900">
                Facts Extracted per Document
              </h2>
              <p className="text-xs text-slate-500">
                Comparison of directly extracted triples versus forward-chained inferred facts
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('knowledge-base')}
              className="text-xs font-medium text-blue-600 hover:text-blue-700 whitespace-nowrap"
            >
              Inspect Facts
            </button>
          </div>
          <SimpleBarChart
            data={docChartData}
            primaryLabel="Direct & Manual"
            secondaryLabel="Logically Inferred"
          />
        </div>

        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-base font-semibold text-slate-900">
                Knowledge Provenance Breakdown
              </h2>
              <p className="text-xs text-slate-500">
                Strict separation of direct source facts from inferred derivations
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('reasoning')}
              className="text-xs font-medium text-blue-600 hover:text-blue-700 whitespace-nowrap"
            >
              Open Rules
            </button>
          </div>
          <div className="pt-2">
            <DonutBreakdownChart
              segments={kbSegments}
              centerValue={String(facts.length)}
              centerLabel="Total Triples"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-base font-semibold text-slate-900">
              Recent Documents
            </h2>
            <button
              type="button"
              onClick={() => onNavigate('documents')}
              className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 whitespace-nowrap"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {documents.length === 0 ? (
            <div className="py-8 text-center space-y-3 border border-dashed border-slate-200 rounded-lg">
              <p className="text-sm text-slate-600">No documents uploaded yet.</p>
              <button
                type="button"
                onClick={() => onNavigate('upload')}
                className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
              >
                Upload First Document
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {documents.slice(0, 5).map((docItem) => (
                <div
                  key={docItem.documentId}
                  className="py-3 flex items-center justify-between gap-4"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">
                      {docItem.fileName}
                    </p>
                    <p className="text-xs text-slate-500 tabular-nums">
                      {docItem.fileType.toUpperCase()} · {Math.max(1, Math.round(docItem.fileSize / 1024))} KB ·{' '}
                      {docItem.factCount} facts
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onNavigate('chat', docItem.documentId)}
                    className="px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors whitespace-nowrap shrink-0"
                  >
                    Ask Q&A
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-base font-semibold text-slate-900">
              Recent Question History
            </h2>
            <button
              type="button"
              onClick={() => onNavigate('chat')}
              className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 whitespace-nowrap"
            >
              <span>Open Q&A Chat</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {questions.length === 0 ? (
            <div className="py-8 text-center space-y-3 border border-dashed border-slate-200 rounded-lg">
              <p className="text-sm text-slate-600">
                No questions asked yet. Query your Knowledge Base using symbolic reasoning.
              </p>
              <button
                type="button"
                onClick={() => onNavigate('chat')}
                className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Ask a Question
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {questions.slice(0, 5).map((q) => (
                <div key={q.questionId} className="py-3 space-y-1">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-slate-900 truncate">
                      {q.question}
                    </p>
                    <span
                      className={`text-xs font-medium whitespace-nowrap shrink-0 ${
                        q.answered ? 'text-emerald-700' : 'text-amber-700'
                      }`}
                    >
                      {q.answered ? 'Grounded' : 'Insufficient Info'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 line-clamp-1">{q.answer}</p>
                  <p className="text-[11px] text-slate-400 font-mono">
                    {q.questionType} · {q.strategyUsed} · {q.matchedFactIds.length} direct /{' '}
                    {q.inferredFactIds.length} inferred
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
