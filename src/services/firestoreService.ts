import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import {
  clampStr,
  createSafeId,
  db,
  handleFirestoreError,
  OperationType,
  storage,
} from '../firebase';
import {
  ExtractedFactDraft,
  ExtractedRuleDraft,
  extractKnowledgeFromText,
} from '../engine/knowledgeExtractor';
import {
  DEFAULT_RULE_TEMPLATES,
  QuestionAnswerResult,
  runForwardChaining,
} from '../engine/reasoningEngine';
import {
  ConfusionResult,
  DocumentRecord,
  EvaluationRecord,
  FileType,
  InferenceRule,
  KnowledgeFact,
  QuestionRecord,
  RuleType,
  VerificationStatus,
} from '../types';

function toDate(val: unknown): Date | null {
  if (val instanceof Timestamp) return val.toDate();
  if (val && typeof (val as { toDate?: () => Date }).toDate === 'function') {
    return (val as { toDate: () => Date }).toDate();
  }
  return null;
}

export function subscribeToUserWorkspace(
  userId: string,
  callbacks: {
    onDocuments: (docs: DocumentRecord[]) => void;
    onFacts: (facts: KnowledgeFact[]) => void;
    onRules: (rules: InferenceRule[]) => void;
    onQuestions: (questions: QuestionRecord[]) => void;
    onEvaluations: (evals: EvaluationRecord[]) => void;
  }
): () => void {
  const unsubDocs = onSnapshot(
    query(collection(db, 'documents'), where('userId', '==', userId)),
    (snap) => {
      const list: DocumentRecord[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          documentId: data.documentId,
          userId: data.userId,
          fileName: data.fileName,
          fileType: data.fileType,
          fileSize: data.fileSize ?? 0,
          fileURL: data.fileURL ?? '',
          extractedText: data.extractedText ?? '',
          factCount: data.factCount ?? 0,
          uploadDate: toDate(data.uploadDate),
          updatedAt: toDate(data.updatedAt),
        };
      });
      list.sort((a, b) => (b.uploadDate?.getTime() ?? 0) - (a.uploadDate?.getTime() ?? 0));
      callbacks.onDocuments(list);
    },
    (err) => handleFirestoreError(err, OperationType.LIST, 'documents')
  );

  const unsubFacts = onSnapshot(
    query(collection(db, 'knowledgeBase'), where('userId', '==', userId)),
    (snap) => {
      const list: KnowledgeFact[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          factId: data.factId,
          userId: data.userId,
          documentId: data.documentId,
          documentName: data.documentName,
          subject: data.subject,
          predicate: data.predicate,
          object: data.object,
          sourceText: data.sourceText ?? '',
          factType: data.factType,
          verificationStatus: data.verificationStatus,
          confidence: data.confidence ?? 90,
          ruleApplied: data.ruleApplied,
          createdAt: toDate(data.createdAt),
          updatedAt: toDate(data.updatedAt),
        };
      });
      list.sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0));
      callbacks.onFacts(list);
    },
    (err) => handleFirestoreError(err, OperationType.LIST, 'knowledgeBase')
  );

  const unsubRules = onSnapshot(
    query(collection(db, 'rules'), where('userId', '==', userId)),
    (snap) => {
      const list: InferenceRule[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          ruleId: data.ruleId,
          userId: data.userId,
          name: data.name,
          condition: data.condition,
          conclusion: data.conclusion,
          ruleType: data.ruleType,
          antecedentSubject: data.antecedentSubject ?? '',
          antecedentPredicate: data.antecedentPredicate,
          antecedentObject: data.antecedentObject ?? '',
          secondPredicate: data.secondPredicate ?? '',
          consequentPredicate: data.consequentPredicate,
          consequentObject: data.consequentObject ?? '',
          enabled: Boolean(data.enabled),
          createdAt: toDate(data.createdAt),
          updatedAt: toDate(data.updatedAt),
        };
      });
      callbacks.onRules(list);
    },
    (err) => handleFirestoreError(err, OperationType.LIST, 'rules')
  );

  const unsubQuestions = onSnapshot(
    query(collection(db, 'questions'), where('userId', '==', userId)),
    (snap) => {
      const list: QuestionRecord[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          questionId: data.questionId,
          userId: data.userId,
          documentId: data.documentId,
          question: data.question,
          questionType: data.questionType,
          answer: data.answer,
          reasoning: data.reasoning ?? '',
          reasoningSteps: Array.isArray(data.reasoningSteps) ? data.reasoningSteps : [],
          matchedFactIds: Array.isArray(data.matchedFactIds) ? data.matchedFactIds : [],
          inferredFactIds: Array.isArray(data.inferredFactIds) ? data.inferredFactIds : [],
          strategyUsed: data.strategyUsed,
          answered: Boolean(data.answered),
          timestamp: toDate(data.timestamp),
        };
      });
      list.sort((a, b) => (b.timestamp?.getTime() ?? 0) - (a.timestamp?.getTime() ?? 0));
      callbacks.onQuestions(list);
    },
    (err) => handleFirestoreError(err, OperationType.LIST, 'questions')
  );

  const unsubEvals = onSnapshot(
    query(collection(db, 'evaluations'), where('userId', '==', userId)),
    (snap) => {
      const list: EvaluationRecord[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          evaluationId: data.evaluationId,
          userId: data.userId,
          documentId: data.documentId,
          question: data.question,
          expectedAnswer: data.expectedAnswer,
          generatedAnswer: data.generatedAnswer,
          result: data.result,
          status: data.status,
          score: data.score ?? 0,
          strategyUsed: data.strategyUsed ?? 'rule-based',
          timestamp: toDate(data.timestamp),
        };
      });
      list.sort((a, b) => (b.timestamp?.getTime() ?? 0) - (a.timestamp?.getTime() ?? 0));
      callbacks.onEvaluations(list);
    },
    (err) => handleFirestoreError(err, OperationType.LIST, 'evaluations')
  );

  return () => {
    unsubDocs();
    unsubFacts();
    unsubRules();
    unsubQuestions();
    unsubEvals();
  };
}

export async function ensureDefaultRulesSeeded(
  userId: string,
  existingRules: InferenceRule[]
): Promise<void> {
  if (existingRules.length > 0) return;
  try {
    const batch = writeBatch(db);
    for (const tpl of DEFAULT_RULE_TEMPLATES) {
      const ruleId = createSafeId('rule');
      batch.set(doc(db, 'rules', ruleId), {
        ruleId,
        userId,
        name: clampStr(tpl.name, 150),
        condition: clampStr(tpl.condition, 500),
        conclusion: clampStr(tpl.conclusion, 500),
        ruleType: tpl.ruleType,
        antecedentSubject: clampStr(tpl.antecedentSubject, 150),
        antecedentPredicate: clampStr(tpl.antecedentPredicate, 120),
        antecedentObject: clampStr(tpl.antecedentObject, 200),
        secondPredicate: clampStr(tpl.secondPredicate, 120),
        consequentPredicate: clampStr(tpl.consequentPredicate, 120),
        consequentObject: clampStr(tpl.consequentObject, 200),
        enabled: tpl.enabled,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'rules');
  }
}

async function tryUploadToFirebaseStorage(
  userId: string,
  documentId: string,
  file: File
): Promise<string> {
  try {
    const storageRef = ref(storage, `users/${userId}/documents/${documentId}_${file.name}`);
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Storage upload timed out')), 4500)
    );
    await Promise.race([uploadBytes(storageRef, file), timeoutPromise]);
    const url = await Promise.race([getDownloadURL(storageRef), timeoutPromise]);
    return clampStr(url, 2000);
  } catch {
    return '';
  }
}

async function writeFactsAndDerivedRules(
  userId: string,
  documentId: string,
  documentName: string,
  drafts: ExtractedFactDraft[],
  derivedRules: ExtractedRuleDraft[],
  existingRules: InferenceRule[]
): Promise<number> {
  const newRuleObjects: InferenceRule[] = [];

  // Save universal derived rules extracted from the document
  if (derivedRules.length > 0) {
    try {
      const ruleBatch = writeBatch(db);
      for (const dr of derivedRules) {
        const duplicate = existingRules.some(
          (r) =>
            r.antecedentPredicate === dr.antecedentPredicate &&
            r.antecedentObject.toLowerCase() === dr.antecedentObject.toLowerCase() &&
            r.consequentPredicate === dr.consequentPredicate &&
            r.consequentObject.toLowerCase() === dr.consequentObject.toLowerCase()
        );
        if (duplicate) continue;

        const ruleId = createSafeId('rule');
        const payload = {
          ruleId,
          userId,
          name: clampStr(dr.name, 150),
          condition: clampStr(dr.condition, 500),
          conclusion: clampStr(dr.conclusion, 500),
          ruleType: dr.ruleType,
          antecedentSubject: clampStr(dr.antecedentSubject, 150),
          antecedentPredicate: clampStr(dr.antecedentPredicate, 120),
          antecedentObject: clampStr(dr.antecedentObject, 200),
          secondPredicate: clampStr(dr.secondPredicate, 120),
          consequentPredicate: clampStr(dr.consequentPredicate, 120),
          consequentObject: clampStr(dr.consequentObject, 200),
          enabled: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
        ruleBatch.set(doc(db, 'rules', ruleId), payload);
        newRuleObjects.push({
          ...payload,
          createdAt: null,
          updatedAt: null,
        });
      }
      if (newRuleObjects.length > 0) {
        await ruleBatch.commit();
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'rules');
    }
  }

  // Write direct extracted facts in chunks of 350
  const persistedDirectFacts: KnowledgeFact[] = [];
  const allRulesForChaining = [...existingRules, ...newRuleObjects];

  try {
    for (let i = 0; i < drafts.length; i += 350) {
      const chunk = drafts.slice(i, i + 350);
      const batch = writeBatch(db);
      for (const f of chunk) {
        const factId = createSafeId('fact');
        const payload = {
          factId,
          userId,
          documentId,
          documentName: clampStr(documentName, 255),
          subject: clampStr(f.subject, 200),
          predicate: clampStr(f.predicate, 120),
          object: clampStr(f.object, 300),
          sourceText: clampStr(f.sourceText, 1000),
          factType: 'extracted' as const,
          verificationStatus: 'verified' as const,
          confidence: Math.max(0, Math.min(100, Math.round(f.confidence))),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
        batch.set(doc(db, 'knowledgeBase', factId), payload);
        persistedDirectFacts.push({
          ...payload,
          createdAt: null,
          updatedAt: null,
        });
      }
      await batch.commit();
    }

    // Run Forward Chaining immediately and persist inferred facts clearly marked as 'inferred'
    const fc = runForwardChaining(persistedDirectFacts, allRulesForChaining);
    for (let i = 0; i < fc.inferredFacts.length; i += 350) {
      const chunk = fc.inferredFacts.slice(i, i + 350);
      const batch = writeBatch(db);
      for (const inf of chunk) {
        const factId = createSafeId('inf');
        batch.set(doc(db, 'knowledgeBase', factId), {
          factId,
          userId,
          documentId,
          documentName: clampStr(documentName, 255),
          subject: clampStr(inf.subject, 200),
          predicate: clampStr(inf.predicate, 120),
          object: clampStr(inf.object, 300),
          sourceText: clampStr(inf.sourceText, 1000),
          factType: 'inferred',
          verificationStatus: 'inferred',
          confidence: inf.confidence,
          ruleApplied: clampStr(inf.ruleApplied ?? 'Forward Chaining', 200),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      await batch.commit();
    }

    return persistedDirectFacts.length + fc.inferredFacts.length;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'knowledgeBase');
  }
}

export async function saveExtractedDocument(params: {
  userId: string;
  file?: File;
  fileName: string;
  fileType: FileType;
  fileSize: number;
  extractedText: string;
  csvRows?: Record<string, string>[];
  csvHeaders?: string[];
  existingRules: InferenceRule[];
}): Promise<{ documentId: string; factCount: number }> {
  const documentId = createSafeId('doc');
  const cleanName = clampStr(params.fileName, 255);
  const cleanText = clampStr(params.extractedText, 200000);

  let fileURL = '';
  if (params.file) {
    fileURL = await tryUploadToFirebaseStorage(params.userId, documentId, params.file);
  }

  const docPath = `documents/${documentId}`;
  try {
    await setDoc(doc(db, 'documents', documentId), {
      documentId,
      userId: params.userId,
      fileName: cleanName,
      fileType: params.fileType,
      fileSize: Math.max(0, Math.min(52428800, params.fileSize)),
      fileURL,
      extractedText: cleanText,
      factCount: 0,
      uploadDate: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, docPath);
  }

  const extraction = extractKnowledgeFromText(cleanText, params.csvRows, params.csvHeaders);
  const totalFacts = await writeFactsAndDerivedRules(
    params.userId,
    documentId,
    cleanName,
    extraction.facts,
    extraction.derivedRules,
    params.existingRules
  );

  try {
    await updateDoc(doc(db, 'documents', documentId), {
      factCount: totalFacts,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, docPath);
  }

  return { documentId, factCount: totalFacts };
}

export async function rebuildDocumentKnowledgeBase(params: {
  userId: string;
  document: DocumentRecord;
  existingFacts: KnowledgeFact[];
  existingRules: InferenceRule[];
}): Promise<number> {
  const docFacts = params.existingFacts.filter(
    (f) => f.documentId === params.document.documentId
  );

  try {
    for (let i = 0; i < docFacts.length; i += 350) {
      const batch = writeBatch(db);
      for (const f of docFacts.slice(i, i + 350)) {
        batch.delete(doc(db, 'knowledgeBase', f.factId));
      }
      await batch.commit();
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, 'knowledgeBase');
  }

  const extraction = extractKnowledgeFromText(params.document.extractedText);
  const totalFacts = await writeFactsAndDerivedRules(
    params.userId,
    params.document.documentId,
    params.document.fileName,
    extraction.facts,
    extraction.derivedRules,
    params.existingRules
  );

  const docPath = `documents/${params.document.documentId}`;
  try {
    await updateDoc(doc(db, 'documents', params.document.documentId), {
      factCount: totalFacts,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, docPath);
  }

  return totalFacts;
}

export async function deleteDocumentAndFacts(
  documentId: string,
  allFacts: KnowledgeFact[]
): Promise<void> {
  const related = allFacts.filter((f) => f.documentId === documentId);
  try {
    for (let i = 0; i < related.length; i += 350) {
      const batch = writeBatch(db);
      for (const f of related.slice(i, i + 350)) {
        batch.delete(doc(db, 'knowledgeBase', f.factId));
      }
      await batch.commit();
    }
    await deleteDoc(doc(db, 'documents', documentId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `documents/${documentId}`);
  }
}

export async function addManualFact(params: {
  userId: string;
  documentId: string;
  documentName: string;
  subject: string;
  predicate: string;
  object: string;
  sourceText: string;
}): Promise<void> {
  const factId = createSafeId('fact');
  const path = `knowledgeBase/${factId}`;
  try {
    await setDoc(doc(db, 'knowledgeBase', factId), {
      factId,
      userId: params.userId,
      documentId: params.documentId || 'manual',
      documentName: clampStr(params.documentName || 'Manual Entry', 255),
      subject: clampStr(params.subject, 200),
      predicate: clampStr(params.predicate.toLowerCase().replace(/\s+/g, '_'), 120),
      object: clampStr(params.object, 300),
      sourceText: clampStr(params.sourceText, 1000),
      factType: 'manual',
      verificationStatus: 'verified',
      confidence: 100,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function updateKnowledgeFact(params: {
  factId: string;
  subject: string;
  predicate: string;
  object: string;
  sourceText: string;
  verificationStatus: VerificationStatus;
  confidence: number;
}): Promise<void> {
  const path = `knowledgeBase/${params.factId}`;
  try {
    await updateDoc(doc(db, 'knowledgeBase', params.factId), {
      subject: clampStr(params.subject, 200),
      predicate: clampStr(params.predicate.toLowerCase().replace(/\s+/g, '_'), 120),
      object: clampStr(params.object, 300),
      sourceText: clampStr(params.sourceText, 1000),
      verificationStatus: params.verificationStatus,
      confidence: Math.max(0, Math.min(100, Math.round(params.confidence))),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function deleteKnowledgeFact(factId: string): Promise<void> {
  const path = `knowledgeBase/${factId}`;
  try {
    await deleteDoc(doc(db, 'knowledgeBase', factId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function saveInferenceRule(params: {
  userId: string;
  name: string;
  ruleType: RuleType;
  antecedentSubject: string;
  antecedentPredicate: string;
  antecedentObject: string;
  secondPredicate: string;
  consequentPredicate: string;
  consequentObject: string;
}): Promise<void> {
  const ruleId = createSafeId('rule');
  const antSubj = clampStr(params.antecedentSubject || '?x', 150);
  const antPred = clampStr(params.antecedentPredicate, 120);
  const antObj = clampStr(params.antecedentObject || '?y', 200);
  const secPred = clampStr(params.secondPredicate || '', 120);
  const consPred = clampStr(params.consequentPredicate, 120);
  const consObj = clampStr(params.consequentObject || '?z', 200);

  const condition = secPred
    ? `IF (${antSubj}, ${antPred}, ${antObj}) AND (${antObj}, ${secPred}, ${consObj})`
    : `IF (${antSubj}, ${antPred}, ${antObj})`;
  const conclusion = `THEN (${antSubj}, ${consPred}, ${consObj})`;

  const path = `rules/${ruleId}`;
  try {
    await setDoc(doc(db, 'rules', ruleId), {
      ruleId,
      userId: params.userId,
      name: clampStr(params.name, 150),
      condition: clampStr(condition, 500),
      conclusion: clampStr(conclusion, 500),
      ruleType: params.ruleType,
      antecedentSubject: antSubj,
      antecedentPredicate: antPred,
      antecedentObject: antObj,
      secondPredicate: secPred,
      consequentPredicate: consPred,
      consequentObject: consObj,
      enabled: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function toggleRuleEnabled(ruleId: string, enabled: boolean): Promise<void> {
  const path = `rules/${ruleId}`;
  try {
    await updateDoc(doc(db, 'rules', ruleId), {
      enabled,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function deleteRuleById(ruleId: string): Promise<void> {
  const path = `rules/${ruleId}`;
  try {
    await deleteDoc(doc(db, 'rules', ruleId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function saveQuestionHistory(
  userId: string,
  documentIdScope: string,
  result: QuestionAnswerResult
): Promise<void> {
  const questionId = createSafeId('qa');
  const path = `questions/${questionId}`;
  try {
    await setDoc(doc(db, 'questions', questionId), {
      questionId,
      userId,
      documentId: documentIdScope || 'all',
      question: clampStr(result.question, 1000),
      questionType: result.questionType,
      answer: clampStr(result.answer, 10000),
      reasoning: clampStr(result.reasoning, 15000),
      reasoningSteps: result.reasoningSteps.slice(0, 30).map((s) => clampStr(s, 480)),
      matchedFactIds: result.directFacts.slice(0, 50).map((f) => clampStr(f.factId, 128)),
      inferredFactIds: result.inferredFacts.slice(0, 50).map((f) => clampStr(f.factId, 128)),
      strategyUsed: result.strategyUsed,
      answered: result.answered,
      timestamp: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function clearUserQuestionHistory(questions: QuestionRecord[]): Promise<void> {
  try {
    for (let i = 0; i < questions.length; i += 350) {
      const batch = writeBatch(db);
      for (const q of questions.slice(i, i + 350)) {
        batch.delete(doc(db, 'questions', q.questionId));
      }
      await batch.commit();
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, 'questions');
  }
}

export async function saveEvaluationResult(params: {
  userId: string;
  documentId: string;
  question: string;
  expectedAnswer: string;
  generatedAnswer: string;
  result: ConfusionResult;
  status: 'Pass' | 'Fail';
  score: number;
  strategyUsed: string;
}): Promise<void> {
  const evaluationId = createSafeId('eval');
  const path = `evaluations/${evaluationId}`;
  try {
    await setDoc(doc(db, 'evaluations', evaluationId), {
      evaluationId,
      userId: params.userId,
      documentId: params.documentId || 'all',
      question: clampStr(params.question, 1000),
      expectedAnswer: clampStr(params.expectedAnswer, 2000),
      generatedAnswer: clampStr(params.generatedAnswer, 5000),
      result: params.result,
      status: params.status,
      score: Math.max(0, Math.min(100, Math.round(params.score))),
      strategyUsed: clampStr(params.strategyUsed, 80),
      timestamp: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function clearUserEvaluations(evals: EvaluationRecord[]): Promise<void> {
  try {
    for (let i = 0; i < evals.length; i += 350) {
      const batch = writeBatch(db);
      for (const e of evals.slice(i, i + 350)) {
        batch.delete(doc(db, 'evaluations', e.evaluationId));
      }
      await batch.commit();
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, 'evaluations');
  }
}

export function downloadCsvFile(filename: string, headers: string[], rows: (string | number)[][]): void {
  const escapeCell = (val: string | number) => {
    const str = String(val ?? '');
    if (/[",\n]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const lines = [
    headers.map(escapeCell).join(','),
    ...rows.map((r) => r.map(escapeCell).join(',')),
  ];
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
