import React from 'react';
import {
  BarChart3,
  BookOpen,
  Cpu,
  FileText,
  FolderOpen,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  Network,
  Settings,
  UploadCloud,
  X,
} from 'lucide-react';
import { NavPage, UserProfile } from '../types';

export const NAV_ITEMS: {
  id: NavPage;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'upload', label: 'Document Upload', icon: UploadCloud },
  { id: 'documents', label: 'Documents', icon: FolderOpen },
  { id: 'knowledge-base', label: 'Knowledge Base', icon: BookOpen },
  { id: 'chat', label: 'AI Q&A Chat', icon: MessageSquare },
  { id: 'reasoning', label: 'Reasoning Engine', icon: Cpu },
  { id: 'graph', label: 'Knowledge Graph', icon: Network },
  { id: 'evaluation', label: 'Evaluation', icon: BarChart3 },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export function Sidebar({
  activePage,
  onSelectPage,
  profile,
  onLogout,
  mobileOpen,
  onCloseMobile,
}: {
  activePage: NavPage;
  onSelectPage: (page: NavPage) => void;
  profile: UserProfile | null;
  onLogout: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}) {
  const initials = (profile?.name || 'DR')
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const content = (
    <div className="flex flex-col h-full bg-white border-r border-slate-200 w-64">
      <div className="flex items-center justify-between px-5 h-16 border-b border-slate-200 shrink-0">
        <button
          type="button"
          onClick={() => {
            onSelectPage('dashboard');
            onCloseMobile();
          }}
          className="flex items-center gap-2.5 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded-md"
        >
          <span className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0">
            <FileText className="w-4 h-4" />
          </span>
          <span className="font-display font-bold text-base tracking-tight text-slate-900 whitespace-nowrap">
            DocuMind AI
          </span>
        </button>
        <button
          type="button"
          onClick={onCloseMobile}
          className="lg:hidden p-1.5 text-slate-500 hover:text-slate-900 rounded-md"
          aria-label="Close navigation"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1" aria-label="Main navigation">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activePage === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                onSelectPage(item.id);
                onCloseMobile();
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                isActive
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Icon
                className={`w-4 h-4 shrink-0 ${
                  isActive ? 'text-blue-600' : 'text-slate-400'
                }`}
              />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-200 space-y-3 shrink-0">
        <div className="flex items-center gap-3">
          {profile?.photoURL ? (
            <img
              src={profile.photoURL}
              alt={profile.name}
              referrerPolicy="no-referrer"
              className="w-9 h-9 rounded-full object-cover border border-slate-200 shrink-0"
            />
          ) : (
            <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 font-semibold text-xs flex items-center justify-center shrink-0">
              {initials}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-slate-900 truncate">
              {profile?.name || 'Researcher'}
            </p>
            <p className="text-xs text-slate-500 truncate">{profile?.email}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onLogout}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap"
        >
          <LogOut className="w-3.5 h-3.5" />
          Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden lg:block shrink-0">{content}</aside>
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/40"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <div className="relative z-10 h-full">{content}</div>
        </div>
      )}
    </>
  );
}
