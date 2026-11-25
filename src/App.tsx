import React, { useEffect, useRef, useState } from 'react';
import { Loader2, Menu, MessageSquare, UploadCloud } from 'lucide-react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { NAV_ITEMS, Sidebar } from './components/Sidebar';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SAMPLE_ACADEMIC_DATASETS } from './engine/evaluator';
import { AuthPage } from './pages/AuthPage';
import { ChatPage } from './pages/ChatPage';
import { DashboardPage } from './pages/DashboardPage';
import { DocumentsPage } from './pages/DocumentsPage';
import { EvaluationPage } from './pages/EvaluationPage';
import { KnowledgeBasePage } from './pages/KnowledgeBasePage';
import { KnowledgeGraphPage } from './pages/KnowledgeGraphPage';
import { ReasoningEnginePage } from './pages/ReasoningEnginePage';
import { SettingsPage } from './pages/SettingsPage';
import { UploadPage } from './pages/UploadPage';
import {
  ensureDefaultRulesSeeded,
  saveExtractedDocument,
  subscribeToUserWorkspace,
} from './services/firestoreService';
import {
  DocumentRecord,
  EvaluationRecord,
  InferenceRule,
  KnowledgeFact,
  NavPage,
  QuestionRecord,
} from './types';

function WorkspaceApp() {
  const { user, profile, loading, logout } = useAuth();
  const [activePage, setActivePage] = useState<NavPage>('dashboard');
  const [chatInitialDocId, setChatInitialDocId] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [facts, setFacts] = useState<KnowledgeFact[]>([]);
  const [rules, setRules] = useState<InferenceRule[]>([]);
  const [questions, setQuestions] = useState<QuestionRecord[]>([]);
  const [evaluations, setEvaluations] = useState<EvaluationRecord[]>([]);
  const [rulesInitialized, setRulesInitialized] = useState(false);
  const [loadingSample, setLoadingSample] = useState(false);
  const seededRef = useRef(false);

  useEffect(() => {
    if (!user) {
      setDocuments([]);
      setFacts([]);
      setRules([]);
      setQuestions([]);
      setEvaluations([]);
      setRulesInitialized(false);
      seededRef.current = false;
      return;
    }

    const unsubscribe = subscribeToUserWorkspace(user.uid, {
      onDocuments: setDocuments,
      onFacts: setFacts,
      onRules: (loadedRules) => {
        setRules(loadedRules);
        setRulesInitialized(true);
      },
      onQuestions: setQuestions,
      onEvaluations: setEvaluations,
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (user && rulesInitialized && rules.length === 0 && !seededRef.current) {
      seededRef.current = true;
      void ensureDefaultRulesSeeded(user.uid, rules);
    }
  }, [user, rulesInitialized, rules]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-600 text-sm">
          <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
          <span>Initializing DocuMind AI Workspace...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  const handleNavigate = (page: NavPage, documentId?: string) => {
    if (documentId) {
      setChatInitialDocId(documentId);
    }
    setActivePage(page);
  };

  const handleLoadSampleData = async () => {
    if (!user) return;
    setLoadingSample(true);
    try {
      for (const sample of SAMPLE_ACADEMIC_DATASETS) {
        const exists = documents.some((d) => d.fileName === sample.fileName);
        if (exists) continue;
        await saveExtractedDocument({
          userId: user.uid,
          fileName: sample.fileName,
          fileType: 'txt',
          fileSize: new Blob([sample.content]).size,
          extractedText: sample.content,
          existingRules: rules,
        });
      }
    } finally {
      setLoadingSample(false);
    }
  };

  const currentNav = NAV_ITEMS.find((n) => n.id === activePage);

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar
        activePage={activePage}
        onSelectPage={(p) => handleNavigate(p)}
        profile={profile}
        onLogout={() => void logout()}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between gap-4 sticky top-0 z-30">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-sm min-w-0">
              <span className="text-slate-400 hidden sm:inline whitespace-nowrap">
                DocuMind AI
              </span>
              <span className="text-slate-300 hidden sm:inline" aria-hidden="true">
                /
              </span>
              <span className="font-display font-semibold text-slate-900 truncate">
                {currentNav?.label ?? 'Dashboard'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {activePage !== 'chat' && (
              <button
                type="button"
                onClick={() => handleNavigate('chat')}
                className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap"
              >
                <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
                Ask Q&A
              </button>
            )}
            {activePage !== 'upload' && (
              <button
                type="button"
                onClick={() => handleNavigate('upload')}
                className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
              >
                <UploadCloud className="w-3.5 h-3.5" />
                Upload
              </button>
            )}
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1440px] w-full mx-auto">
          {activePage === 'dashboard' && (
            <DashboardPage
              documents={documents}
              facts={facts}
              questions={questions}
              evaluations={evaluations}
              onNavigate={handleNavigate}
              onLoadSampleData={handleLoadSampleData}
              loadingSample={loadingSample}
            />
          )}
          {activePage === 'upload' && (
            <UploadPage
              userId={user.uid}
              rules={rules}
              onNavigate={handleNavigate}
            />
          )}
          {activePage === 'documents' && (
            <DocumentsPage
              userId={user.uid}
              documents={documents}
              facts={facts}
              rules={rules}
              onNavigate={handleNavigate}
            />
          )}
          {activePage === 'knowledge-base' && (
            <KnowledgeBasePage
              userId={user.uid}
              documents={documents}
              facts={facts}
            />
          )}
          {activePage === 'chat' && (
            <ChatPage
              userId={user.uid}
              documents={documents}
              facts={facts}
              rules={rules}
              questions={questions}
              initialDocumentId={chatInitialDocId}
            />
          )}
          {activePage === 'reasoning' && (
            <ReasoningEnginePage
              userId={user.uid}
              documents={documents}
              facts={facts}
              rules={rules}
            />
          )}
          {activePage === 'graph' && (
            <KnowledgeGraphPage
              documents={documents}
              facts={facts}
              rules={rules}
            />
          )}
          {activePage === 'evaluation' && (
            <EvaluationPage
              userId={user.uid}
              documents={documents}
              facts={facts}
              rules={rules}
              evaluations={evaluations}
            />
          )}
          {activePage === 'settings' && (
            <SettingsPage
              documents={documents}
              facts={facts}
              rules={rules}
              questions={questions}
              evaluations={evaluations}
              onLoadSampleData={handleLoadSampleData}
              loadingSample={loadingSample}
            />
          )}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <WorkspaceApp />
      </AuthProvider>
    </ErrorBoundary>
  );
}
