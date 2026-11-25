import React, { useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Cpu,
  FileText,
  Network,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function AuthPage() {
  const { loginWithGoogle, loginWithEmail, registerWithEmail, authError, clearAuthError } =
    useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (mode === 'login') {
        await loginWithEmail(email, password);
      } else {
        await registerWithEmail(name, email, password);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogle = async () => {
    setSubmitting(true);
    try {
      await loginWithGoogle();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-8 sm:p-10 flex flex-col justify-between space-y-8">
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-lg bg-blue-600 text-white flex items-center justify-center">
                <FileText className="w-5 h-5" />
              </span>
              <span className="font-display text-xl font-bold text-slate-900">
                DocuMind AI
              </span>
            </div>

            <div className="space-y-3">
              <h1 className="font-display text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight text-balance">
                Intelligent Document Question Answering via Symbolic Reasoning
              </h1>
              <p className="text-base text-slate-600 leading-relaxed max-w-2xl">
                Upload PDF, DOCX, TXT, and CSV documents to build a verifiable structured
                Knowledge Base. Answer questions deterministically using IF-THEN rules,
                Forward Chaining, Backward Chaining, and Logical Inference.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200/80 space-y-1.5">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <BookOpen className="w-4 h-4 text-blue-600" />
                  <span>Structured Knowledge Base</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Extracts Subject-Predicate-Object triples and entities directly from uploaded
                  documents.
                </p>
              </div>
              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200/80 space-y-1.5">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <Cpu className="w-4 h-4 text-blue-600" />
                  <span>Deterministic Inference</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Applies Forward & Backward Chaining with full step-by-step trace explainability.
                </p>
              </div>
              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200/80 space-y-1.5">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <Network className="w-4 h-4 text-blue-600" />
                  <span>Interactive Knowledge Graph</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Inspect direct facts and logically inferred relationships visually across documents.
                </p>
              </div>
              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200/80 space-y-1.5">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <CheckCircle2 className="w-4 h-4 text-blue-600" />
                  <span>Zero Hallucinations</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Answers strictly from verified and inferred facts, reporting insufficient data when
                  missing.
                </p>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 text-xs text-slate-500 flex flex-wrap items-center gap-2">
            <span>Knowledge Representation</span>
            <span aria-hidden="true">·</span>
            <span>Rule-Based Reasoning</span>
            <span aria-hidden="true">·</span>
            <span>Forward & Backward Chaining</span>
            <span aria-hidden="true">·</span>
            <span>Precision / Recall / F1 Evaluation</span>
          </div>
        </div>

        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-8 flex flex-col justify-center space-y-6">
          <div className="space-y-1.5">
            <h2 className="font-display text-2xl font-bold text-slate-900">
              {mode === 'login' ? 'Sign in to workspace' : 'Create researcher account'}
            </h2>
            <p className="text-sm text-slate-600">
              Access your cloud-synced documents, Knowledge Base, and evaluation benchmarks.
            </p>
          </div>

          {authError && (
            <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
              <span className="leading-relaxed">{authError}</span>
            </div>
          )}

          <button
            type="button"
            disabled={submitting}
            onClick={handleGoogle}
            className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium transition-colors whitespace-nowrap"
          >
            <span>Continue with Google</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <div className="relative flex items-center py-1">
            <div className="flex-grow border-t border-slate-200" />
            <span className="px-3 text-xs text-slate-400">or use email credentials</span>
            <div className="flex-grow border-t border-slate-200" />
          </div>

          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                clearAuthError();
              }}
              className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                mode === 'login'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('signup');
                clearAuthError();
              }}
              className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                mode === 'signup'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Create Account
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-700" htmlFor="auth-name">
                  Full Name
                </label>
                <input
                  id="auth-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Dr. Ada Lovelace"
                  className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-700" htmlFor="auth-email">
                Email Address
              </label>
              <input
                id="auth-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="researcher@university.edu"
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-700" htmlFor="auth-password">
                Password
              </label>
              <input
                id="auth-password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 px-4 text-sm font-medium text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition-colors disabled:opacity-60 whitespace-nowrap"
            >
              {submitting
                ? 'Authenticating...'
                : mode === 'login'
                ? 'Sign In with Email'
                : 'Register with Email'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
