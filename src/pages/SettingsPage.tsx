import React, { useState } from 'react';
import { CheckCircle2, Database, LogOut, Save, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  clearUserEvaluations,
  clearUserQuestionHistory,
} from '../services/firestoreService';
import {
  DocumentRecord,
  EvaluationRecord,
  InferenceRule,
  KnowledgeFact,
  QuestionRecord,
} from '../types';

export function SettingsPage({
  documents,
  facts,
  rules,
  questions,
  evaluations,
  onLoadSampleData,
  loadingSample,
}: {
  documents: DocumentRecord[];
  facts: KnowledgeFact[];
  rules: InferenceRule[];
  questions: QuestionRecord[];
  evaluations: EvaluationRecord[];
  onLoadSampleData: () => Promise<void>;
  loadingSample: boolean;
}) {
  const { profile, updateUserProfileName, logout } = useAuth();
  const [displayName, setDisplayName] = useState(profile?.name || '');
  const [savedNotice, setSavedNotice] = useState(false);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateUserProfileName(displayName);
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2500);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-sm text-slate-600">
          Manage your researcher profile, Symbolic AI workspace data, and Firebase session.
        </p>
      </div>

      <form
        onSubmit={handleSaveProfile}
        className="bg-white border border-slate-200 rounded-xl p-6 space-y-4"
      >
        <h2 className="font-display text-base font-semibold text-slate-900">
          Account Profile
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-700" htmlFor="settings-name">
              Display Name
            </label>
            <input
              id="settings-name"
              type="text"
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-700" htmlFor="settings-email">
              Email Address
            </label>
            <input
              id="settings-email"
              type="email"
              disabled
              value={profile?.email || ''}
              className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-500"
            />
          </div>
        </div>
        <div className="flex items-center justify-between pt-2">
          {savedNotice ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700">
              <CheckCircle2 className="w-4 h-4" />
              Profile updated in Firestore
            </span>
          ) : (
            <span className="text-xs text-slate-500">
              Role: Researcher · Verified Session
            </span>
          )}
          <button
            type="submit"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 whitespace-nowrap"
          >
            <Save className="w-4 h-4" />
            Save Changes
          </button>
        </div>
      </form>

      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        <h2 className="font-display text-base font-semibold text-slate-900">
          Workspace Data & Symbolic Engine Summary
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 py-2 text-center border-y border-slate-100">
          <div>
            <p className="font-mono text-lg font-semibold tabular-nums text-slate-900">
              {documents.length}
            </p>
            <p className="text-xs text-slate-500">Documents</p>
          </div>
          <div>
            <p className="font-mono text-lg font-semibold tabular-nums text-slate-900">
              {facts.length}
            </p>
            <p className="text-xs text-slate-500">KB Facts</p>
          </div>
          <div>
            <p className="font-mono text-lg font-semibold tabular-nums text-slate-900">
              {rules.length}
            </p>
            <p className="text-xs text-slate-500">IF-THEN Rules</p>
          </div>
          <div>
            <p className="font-mono text-lg font-semibold tabular-nums text-slate-900">
              {questions.length}
            </p>
            <p className="text-xs text-slate-500">Questions</p>
          </div>
          <div>
            <p className="font-mono text-lg font-semibold tabular-nums text-slate-900">
              {evaluations.length}
            </p>
            <p className="text-xs text-slate-500">Evaluations</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button
            type="button"
            disabled={loadingSample}
            onClick={() => void onLoadSampleData()}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 whitespace-nowrap"
          >
            <Database className="w-3.5 h-3.5 text-blue-600" />
            {loadingSample ? 'Loading Sample Data...' : 'Load Sample Academic Corpus'}
          </button>

          <button
            type="button"
            disabled={questions.length === 0}
            onClick={() => void clearUserQuestionHistory(questions)}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 whitespace-nowrap"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear Q&A History
          </button>

          <button
            type="button"
            disabled={evaluations.length === 0}
            onClick={() => void clearUserEvaluations(evaluations)}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 whitespace-nowrap"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear Evaluation Results
          </button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-6 flex items-center justify-between">
        <div>
          <h2 className="font-display text-base font-semibold text-slate-900">Session</h2>
          <p className="text-xs text-slate-500">
            Sign out of DocuMind AI on this browser.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void logout()}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors whitespace-nowrap"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </div>
  );
}
