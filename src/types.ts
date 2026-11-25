export type FileType = 'pdf' | 'docx' | 'txt' | 'csv';

export type FactType = 'extracted' | 'inferred' | 'manual';

export type VerificationStatus = 'verified' | 'unverified' | 'inferred';

export type RuleType =
  | 'if-then'
  | 'taxonomy'
  | 'transitivity'
  | 'property-inheritance'
  | 'equivalence';

export type QuestionType =
  | 'what'
  | 'who'
  | 'when'
  | 'where'
  | 'why'
  | 'how'
  | 'yes-no'
  | 'list'
  | 'relationship'
  | 'unknown';

export type ReasoningStrategy =
  | 'rule-based'
  | 'forward-chaining'
  | 'backward-chaining'
  | 'exact-keyword'
  | 'logical-inference'
  | 'insufficient-evidence';

export type ConfusionResult = 'TP' | 'FP' | 'FN' | 'TN';

export type NavPage =
  | 'dashboard'
  | 'upload'
  | 'documents'
  | 'knowledge-base'
  | 'chat'
  | 'reasoning'
  | 'graph'
  | 'evaluation'
  | 'settings';

export interface UserProfile {
  userId: string;
  name: string;
  email: string;
  photoURL?: string;
  role: 'researcher';
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface DocumentRecord {
  documentId: string;
  userId: string;
  fileName: string;
  fileType: FileType;
  fileSize: number;
  fileURL: string;
  extractedText: string;
  factCount: number;
  uploadDate: Date | null;
  updatedAt: Date | null;
}

export interface KnowledgeFact {
  factId: string;
  userId: string;
  documentId: string;
  documentName: string;
  subject: string;
  predicate: string;
  object: string;
  sourceText: string;
  factType: FactType;
  verificationStatus: VerificationStatus;
  confidence: number;
  ruleApplied?: string;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export interface InferenceRule {
  ruleId: string;
  userId: string;
  name: string;
  condition: string;
  conclusion: string;
  ruleType: RuleType;
  antecedentSubject: string;
  antecedentPredicate: string;
  antecedentObject: string;
  secondPredicate: string;
  consequentPredicate: string;
  consequentObject: string;
  enabled: boolean;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export interface QuestionRecord {
  questionId: string;
  userId: string;
  documentId: string;
  question: string;
  questionType: QuestionType;
  answer: string;
  reasoning: string;
  reasoningSteps: string[];
  matchedFactIds: string[];
  inferredFactIds: string[];
  strategyUsed: ReasoningStrategy;
  answered: boolean;
  timestamp: Date | null;
}

export interface EvaluationRecord {
  evaluationId: string;
  userId: string;
  documentId: string;
  question: string;
  expectedAnswer: string;
  generatedAnswer: string;
  result: ConfusionResult;
  status: 'Pass' | 'Fail';
  score: number;
  strategyUsed: string;
  timestamp: Date | null;
}
