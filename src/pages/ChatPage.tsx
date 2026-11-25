import React, { useEffect, useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  HelpCircle,
  MessageSquare,
  Send,
  Trash2,
} from 'lucide-react';
import { answerQuestionSymbolically } from '../engine/reasoningEngine';
import {
  clearUserQuestionHistory,
  saveQuestionHistory,
} from '../services/firestoreService';
import {
  DocumentRecord,
  InferenceRule,
  KnowledgeFact,
  QuestionRecord,
} from '../types';

export function ChatPage({
  userId,
  documents,
  facts,
  rules,
  questions,
  initialDocumentId,
}: {
  userId: string;
  documents: DocumentRecord[];
  facts: KnowledgeFact[];
  rules: InferenceRule[];
  questions: QuestionRecord[];
  initialDocumentId?: string | null;
}) {
  const [selectedDocId, setSelectedDocId] = useState<string>(initialDocumentId || 'all');
  const [questionInput, setQuestionInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  const [confirmClear, setConfirmClear] = useState(false);

  useEffect(() => {
    if (initialDocumentId) {
      setSelectedDocId(initialDocumentId);
    }
  }, [initialDocumentId]);

  const scopedFacts =
    selectedDocId === 'all'
      ? facts
      : facts.filter((f) => f.documentId === selectedDocId);

  const primarySubjects = Array.from(new Set(scopedFacts.map((f) => f.subject))).slice(0, 3);
  const suggestedQuestions =
    primarySubjects.length > 0
      ? [
          `What is ${primarySubjects[0]}?`,
          `What are the features of ${primarySubjects[0]}?`,
          `Does ${primarySubjects[0]} have syntax?`,
          'List all the concepts mentioned in the document.',
        ]
      : [
          'What is Java?',
          'What are the features of Java?',
          'Does Java support inheritance?',
          'List all the concepts mentioned in the document.',
        ];

  const handleAsk = async (qText: string) => {
    const trimmed = qText.trim();
    if (!trimmed) return;
    setSubmitting(true);
    setQuestionInput('');
    try {
      const result = answerQuestionSymbolically(trimmed, facts, rules, selectedDocId);
      await saveQuestionHistory(userId, selectedDocId, result);
    } finally {
      setSubmitting(false);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const orderedQuestions = [...questions].reverse();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">
            AI Question Answering Chat
          </h1>
          <p className="text-sm text-slate-600">
            Deterministic symbolic Q&A powered by Knowledge Representation, Rule-Based Reasoning, and Chaining.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <select
            value={selectedDocId}
            onChange={(e) => setSelectedDocId(e.target.value)}
            className="px-3 py-2 text-xs font-medium bg-white border border-slate-300 rounded-lg text-slate-700"
            aria-label="Document scope"
          >
            <option value="all">All Uploaded Documents ({facts.length} facts)</option>
            {documents.map((d) => (
              <option key={d.documentId} value={d.documentId}>
                {d.fileName} ({facts.filter((f) => f.documentId === d.documentId).length} facts)
              </option>
            ))}
          </select>

          {questions.length > 0 &&
            (confirmClear ? (
              <div className="inline-flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    void clearUserQuestionHistory(questions);
                    setConfirmClear(false);
                  }}
                  className="px-3 py-2 text-xs font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 whitespace-nowrap"
                >
                  Confirm Clear
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmClear(false)}
                  className="px-2 py-2 text-xs text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmClear(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 whitespace-nowrap"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Clear Chat
              </button>
            ))}
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl flex flex-col min-h-[540px]">
        <div className="px-5 py-3 border-b border-slate-200 bg-slate-50/70 flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-slate-500">Suggested queries:</span>
          {suggestedQuestions.map((sq) => (
            <button
              key={sq}
              type="button"
              onClick={() => void handleAsk(sq)}
              className="px-2.5 py-1 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
            >
              {sq}
            </button>
          ))}
        </div>

        <div className="flex-1 p-5 space-y-5 overflow-y-auto max-h-[560px]">
          {orderedQuestions.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <MessageSquare className="w-10 h-10 text-slate-300 mx-auto" />
              <h2 className="font-display text-base font-semibold text-slate-900">
                Ask a question about your documents
              </h2>
              <p className="text-sm text-slate-500 max-w-md mx-auto">
                Every answer is derived strictly from extracted and logically inferred facts in your Knowledge Base.
              </p>
            </div>
          ) : (
            orderedQuestions.map((q) => {
              const isExpanded = Boolean(expandedIds[q.questionId]);
              const directEvidence = facts.filter((f) => q.matchedFactIds.includes(f.factId));
              const scopeDoc =
                q.documentId === 'all'
                  ? 'All Documents'
                  : documents.find((d) => d.documentId === q.documentId)?.fileName ?? 'Document';

              return (
                <div key={q.questionId} className="space-y-3 pb-5 border-b border-slate-100 last:border-b-0">
                  <div className="flex justify-end">
                    <div className="max-w-2xl bg-blue-600 text-white rounded-xl px-4 py-2.5 text-sm">
                      {q.question}
                    </div>
                  </div>

                  <div className="max-w-3xl bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span className="font-semibold text-slate-700">DocuMind Reasoning Engine</span>
                      <span aria-hidden="true">·</span>
                      <span className="uppercase font-mono">{q.questionType}</span>
                      <span aria-hidden="true">·</span>
                      <span>{q.strategyUsed}</span>
                      <span aria-hidden="true">·</span>
                      <span>{scopeDoc}</span>
                    </div>

                    <p className="text-sm text-slate-900 whitespace-pre-line leading-relaxed">
                      {q.answer}
                    </p>

                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={() => toggleExpand(q.questionId)}
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-700 hover:text-blue-800"
                      >
                        {isExpanded ? (
                          <ChevronDown className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5" />
                        )}
                        <HelpCircle className="w-3.5 h-3.5" />
                        <span>How was this answer generated?</span>
                      </button>

                      {isExpanded && (
                        <div className="mt-3 p-4 rounded-lg bg-white border border-slate-200 space-y-4">
                          <div className="space-y-1.5">
                            <p className="text-xs font-semibold text-slate-800">
                              Deterministic Execution Trace
                            </p>
                            <div className="space-y-1 font-mono text-xs text-slate-600">
                              {(q.reasoningSteps.length > 0
                                ? q.reasoningSteps
                                : q.reasoning.split('\n')
                              ).map((step, idx) => (
                                <p key={idx}>{step}</p>
                              ))}
                            </div>
                          </div>

                          {directEvidence.length > 0 && (
                            <div className="space-y-1.5">
                              <p className="text-xs font-semibold text-emerald-800">
                                Directly Extracted Facts Used ({directEvidence.length})
                              </p>
                              <ul className="space-y-1 text-xs text-slate-700">
                                {directEvidence.map((f) => (
                                  <li key={f.factId} className="font-mono">
                                    ({f.subject}, {f.predicate}, {f.object}) — <span className="font-sans text-slate-500">{f.documentName}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {q.inferredFactIds.length > 0 && (
                            <div className="space-y-1.5">
                              <p className="text-xs font-semibold text-amber-800">
                                Logically Inferred Facts Used ({q.inferredFactIds.length})
                              </p>
                              <p className="text-xs text-slate-600">
                                Derived via Forward/Backward Chaining rules from base facts (see trace lines above).
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void handleAsk(questionInput);
          }}
          className="p-4 border-t border-slate-200 flex items-center gap-3"
        >
          <input
            type="text"
            value={questionInput}
            onChange={(e) => setQuestionInput(e.target.value)}
            placeholder="Ask a question (e.g., What is Java? Does Java support inheritance?)"
            className="flex-1 px-4 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
          <button
            type="submit"
            disabled={submitting || !questionInput.trim()}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-60 transition-colors whitespace-nowrap shrink-0"
          >
            <Send className="w-4 h-4" />
            <span>{submitting ? 'Reasoning...' : 'Ask'}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
