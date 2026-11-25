import React, { useState } from 'react';
import {
  BarChart3,
  Download,
  Loader2,
  Play,
  Plus,
  Trash2,
} from 'lucide-react';
import { DonutBreakdownChart, SimpleBarChart } from '../components/Charts';
import {
  computeEvaluationMetrics,
  evaluateSingleTestCase,
  SAMPLE_ACADEMIC_DATASETS,
} from '../engine/evaluator';
import {
  clearUserEvaluations,
  downloadCsvFile,
  saveEvaluationResult,
} from '../services/firestoreService';
import {
  DocumentRecord,
  EvaluationRecord,
  InferenceRule,
  KnowledgeFact,
} from '../types';

export function EvaluationPage({
  userId,
  documents,
  facts,
  rules,
  evaluations,
}: {
  userId: string;
  documents: DocumentRecord[];
  facts: KnowledgeFact[];
  rules: InferenceRule[];
  evaluations: EvaluationRecord[];
}) {
  const [selectedDocId, setSelectedDocId] = useState('all');
  const [customQuestion, setCustomQuestion] = useState('');
  const [customExpected, setCustomExpected] = useState('');
  const [running, setRunning] = useState(false);

  const metrics = computeEvaluationMetrics(evaluations);

  const handleRunPredefinedSuite = async () => {
    setRunning(true);
    try {
      const suite = SAMPLE_ACADEMIC_DATASETS.flatMap((d) => d.testCases);
      for (const tc of suite) {
        const res = evaluateSingleTestCase(
          tc.question,
          tc.expectedAnswer,
          facts,
          rules,
          selectedDocId
        );
        await saveEvaluationResult({
          userId,
          documentId: selectedDocId,
          question: tc.question,
          expectedAnswer: tc.expectedAnswer,
          generatedAnswer: res.generatedAnswer,
          result: res.result,
          status: res.status,
          score: res.score,
          strategyUsed: res.strategyUsed,
        });
      }
    } finally {
      setRunning(false);
    }
  };

  const handleRunCustomTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customQuestion.trim() || !customExpected.trim()) return;
    setRunning(true);
    try {
      const res = evaluateSingleTestCase(
        customQuestion,
        customExpected,
        facts,
        rules,
        selectedDocId
      );
      await saveEvaluationResult({
        userId,
        documentId: selectedDocId,
        question: customQuestion,
        expectedAnswer: customExpected,
        generatedAnswer: res.generatedAnswer,
        result: res.result,
        status: res.status,
        score: res.score,
        strategyUsed: res.strategyUsed,
      });
      setCustomQuestion('');
      setCustomExpected('');
    } finally {
      setRunning(false);
    }
  };

  const handleExportReport = () => {
    downloadCsvFile(
      'documind-evaluation-report.csv',
      [
        'Evaluation ID',
        'Question',
        'Expected Answer',
        'System Answer',
        'Confusion Result',
        'Evaluation Status',
        'Match Score (%)',
        'Reasoning Strategy',
      ],
      evaluations.map((e) => [
        e.evaluationId,
        e.question,
        e.expectedAnswer,
        e.generatedAnswer,
        e.result,
        e.status,
        e.score,
        e.strategyUsed,
      ])
    );
  };

  const metricBars = [
    { label: 'Accuracy', value: Number(metrics.accuracy.toFixed(1)), color: '#2563EB' },
    { label: 'Precision', value: Number((metrics.precision * 100).toFixed(1)), color: '#16A34A' },
    { label: 'Recall', value: Number((metrics.recall * 100).toFixed(1)), color: '#0284C7' },
    { label: 'F1 Score', value: Number((metrics.f1Score * 100).toFixed(1)), color: '#4F46E5' },
  ];

  const confusionSegments = [
    { label: 'True Positive (TP)', value: metrics.tp, color: '#16A34A' },
    { label: 'True Negative (TN)', value: metrics.tn, color: '#2563EB' },
    { label: 'False Positive (FP)', value: metrics.fp, color: '#DC2626' },
    { label: 'False Negative (FN)', value: metrics.fn, color: '#D97706' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">
            Evaluation & Performance Benchmarks
          </h1>
          <p className="text-sm text-slate-600">
            Test deterministic QA against ground-truth expectations using Accuracy, Precision, Recall, and F1 Score.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <select
            value={selectedDocId}
            onChange={(e) => setSelectedDocId(e.target.value)}
            className="px-3 py-2 text-xs font-medium bg-white border border-slate-300 rounded-lg text-slate-700"
          >
            <option value="all">All Documents</option>
            {documents.map((d) => (
              <option key={d.documentId} value={d.documentId}>
                {d.fileName}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={handleExportReport}
            disabled={evaluations.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" />
            Export Report
          </button>

          {evaluations.length > 0 && (
            <button
              type="button"
              onClick={() => void clearUserEvaluations(evaluations)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-red-700 bg-white border border-slate-300 rounded-lg hover:bg-red-50 whitespace-nowrap"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear Results
            </button>
          )}

          <button
            type="button"
            disabled={running}
            onClick={() => void handleRunPredefinedSuite()}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-60 whitespace-nowrap"
          >
            {running ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Play className="w-3.5 h-3.5" />
            )}
            Run Benchmark Suite (10 Tests)
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-1.5">
          <p className="text-xs font-medium text-slate-500">Total Test Questions</p>
          <p className="font-mono text-2xl font-semibold tabular-nums text-slate-900">
            {metrics.total}
          </p>
          <p className="text-xs text-slate-500 tabular-nums">
            {metrics.correct} correct · {metrics.incorrect} incorrect
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-1.5">
          <p className="text-xs font-medium text-slate-500">Accuracy Percentage</p>
          <p className="font-mono text-2xl font-semibold tabular-nums text-blue-700">
            {metrics.accuracy.toFixed(1)}%
          </p>
          <p className="text-xs text-slate-500 font-mono">
            (TP + TN) / Total × 100
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-1.5">
          <p className="text-xs font-medium text-slate-500">Precision & Recall</p>
          <p className="font-mono text-2xl font-semibold tabular-nums text-slate-900">
            {metrics.precision.toFixed(2)} / {metrics.recall.toFixed(2)}
          </p>
          <p className="text-xs text-slate-500 font-mono">
            TP/(TP+FP) · TP/(TP+FN)
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-1.5">
          <p className="text-xs font-medium text-slate-500">F1 Score</p>
          <p className="font-mono text-2xl font-semibold tabular-nums text-emerald-700">
            {metrics.f1Score.toFixed(3)}
          </p>
          <p className="text-xs text-slate-500 font-mono">
            2 × (P × R) / (P + R)
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-6 bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <h2 className="font-display text-base font-semibold text-slate-900">
            Evaluation Metrics Comparison (%)
          </h2>
          <SimpleBarChart data={metricBars} primaryLabel="Score (%)" height={200} />
        </div>

        <div className="lg:col-span-6 bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <h2 className="font-display text-base font-semibold text-slate-900">
            Confusion Matrix Outcomes
          </h2>
          <DonutBreakdownChart
            segments={confusionSegments}
            centerValue={`${metrics.accuracy.toFixed(0)}%`}
            centerLabel="Accuracy"
          />
        </div>
      </div>

      <form
        onSubmit={handleRunCustomTest}
        className="bg-white border border-slate-200 rounded-xl p-5 space-y-4"
      >
        <h2 className="font-display text-sm font-semibold text-slate-900">
          Add & Evaluate Custom Test Case
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <input
            type="text"
            required
            value={customQuestion}
            onChange={(e) => setCustomQuestion(e.target.value)}
            placeholder="Test question (e.g. Does Java have syntax?)"
            className="md:col-span-5 px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
          />
          <input
            type="text"
            required
            value={customExpected}
            onChange={(e) => setCustomExpected(e.target.value)}
            placeholder="Expected keywords or 'insufficient information'"
            className="md:col-span-5 px-3.5 py-2 text-sm border border-slate-300 rounded-lg"
          />
          <button
            type="submit"
            disabled={running}
            className="md:col-span-2 inline-flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-60 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            Evaluate
          </button>
        </div>
      </form>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="py-3 px-4 text-xs font-semibold text-slate-700">Question</th>
                <th className="py-3 px-4 text-xs font-semibold text-slate-700">Expected Answer</th>
                <th className="py-3 px-4 text-xs font-semibold text-slate-700">System Answer</th>
                <th className="py-3 px-4 text-xs font-semibold text-slate-700">Result</th>
                <th className="py-3 px-4 text-xs font-semibold text-slate-700">Evaluation Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {evaluations.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500">
                    <BarChart3 className="w-7 h-7 mx-auto mb-2 text-slate-300" />
                    No evaluation results recorded yet. Click &ldquo;Run Benchmark Suite&rdquo; above.
                  </td>
                </tr>
              ) : (
                evaluations.map((ev) => (
                  <tr key={ev.evaluationId} className="hover:bg-slate-50/80">
                    <td className="py-3 px-4 font-medium text-slate-900 max-w-[220px]">
                      {ev.question}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-600 max-w-[180px]">
                      {ev.expectedAnswer}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-700 max-w-[260px]">
                      {ev.generatedAnswer}
                    </td>
                    <td className="py-3 px-4 font-mono text-xs font-semibold text-slate-800 whitespace-nowrap">
                      {ev.result} · {ev.score}%
                    </td>
                    <td className="py-3 px-4 text-xs font-semibold whitespace-nowrap">
                      <span
                        className={
                          ev.status === 'Pass' ? 'text-emerald-700' : 'text-red-700'
                        }
                      >
                        {ev.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
