import { ConfusionResult, InferenceRule, KnowledgeFact } from '../types';
import {
  answerQuestionSymbolically,
  INSUFFICIENT_INFO_MESSAGE,
} from './reasoningEngine';

export interface BenchmarkTestCase {
  id: string;
  question: string;
  expectedAnswer: string;
  documentHint?: string;
}

export interface EvaluationMetricsSummary {
  total: number;
  correct: number;
  incorrect: number;
  tp: number;
  fp: number;
  fn: number;
  tn: number;
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
}

export interface SampleDatasetSpec {
  id: string;
  fileName: string;
  content: string;
  testCases: Omit<BenchmarkTestCase, 'id'>[];
}

export const SAMPLE_ACADEMIC_DATASETS: SampleDatasetSpec[] = [
  {
    id: 'sample_java_kb',
    fileName: 'Java_Programming_Fundamentals.txt',
    content: [
      'All programming languages have syntax.',
      'Java is an object-oriented programming language.',
      'Java was created by James Gosling in 1995.',
      'Java supports inheritance, polymorphism, and encapsulation.',
      'Java runs on the Java Virtual Machine.',
      'Java is used for enterprise applications, Android development, and backend systems.',
    ].join('\n'),
    testCases: [
      {
        question: 'What is Java?',
        expectedAnswer: 'object-oriented programming language',
      },
      {
        question: 'What are the features of Java?',
        expectedAnswer: 'inheritance polymorphism encapsulation',
      },
      {
        question: 'Does Java support inheritance?',
        expectedAnswer: 'Yes',
      },
      {
        question: 'Who created Java?',
        expectedAnswer: 'James Gosling',
      },
      {
        question: 'Does Java have syntax?',
        expectedAnswer: 'Yes syntax',
      },
      {
        question: 'What is the relationship between Java and polymorphism?',
        expectedAnswer: 'Java supports polymorphism',
      },
      {
        question: 'What is the stock price of Java Corp?',
        expectedAnswer: INSUFFICIENT_INFO_MESSAGE,
      },
    ],
  },
  {
    id: 'sample_ai_kb',
    fileName: 'Symbolic_AI_Systems.txt',
    content: [
      'Expert systems are symbolic AI programs.',
      'All symbolic AI programs use deterministic rules.',
      'Forward chaining is a data-driven inference method.',
      'Backward chaining is a goal-driven inference method.',
      'Knowledge bases store facts, entities, and relationships.',
      'Rule-based reasoning produces explainable decisions.',
    ].join('\n'),
    testCases: [
      {
        question: 'Do expert systems use deterministic rules?',
        expectedAnswer: 'Yes deterministic rules',
      },
      {
        question: 'What does rule-based reasoning produce?',
        expectedAnswer: 'explainable decisions',
      },
      {
        question: 'Where is the headquarters of Symbolic AI Inc located?',
        expectedAnswer: INSUFFICIENT_INFO_MESSAGE,
      },
    ],
  },
];

function extractSignificantTokens(text: string): string[] {
  const stop = new Set([
    'a', 'an', 'the', 'is', 'are', 'was', 'were', 'to', 'of', 'in', 'for', 'and',
    'or', 'on', 'with', 'by', 'based', 'knowledge', 'base', 'does', 'document',
    'states', 'that', 'via', 'rule', 'inferred', 'logical',
  ]);
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 2 && !stop.has(w));
}

export function evaluateSingleTestCase(
  question: string,
  expectedAnswer: string,
  facts: KnowledgeFact[],
  rules: InferenceRule[],
  documentIdScope: string
): {
  generatedAnswer: string;
  result: ConfusionResult;
  status: 'Pass' | 'Fail';
  score: number;
  strategyUsed: string;
} {
  const qa = answerQuestionSymbolically(question, facts, rules, documentIdScope);
  const expectsInsufficient =
    expectedAnswer.toLowerCase().includes('does not contain sufficient information') ||
    expectedAnswer.toLowerCase().includes('insufficient');

  if (expectsInsufficient) {
    if (!qa.answered) {
      return {
        generatedAnswer: qa.answer,
        result: 'TN',
        status: 'Pass',
        score: 100,
        strategyUsed: qa.strategyUsed,
      };
    }
    return {
      generatedAnswer: qa.answer,
      result: 'FP',
      status: 'Fail',
      score: 0,
      strategyUsed: qa.strategyUsed,
    };
  }

  if (!qa.answered) {
    return {
      generatedAnswer: qa.answer,
      result: 'FN',
      status: 'Fail',
      score: 0,
      strategyUsed: qa.strategyUsed,
    };
  }

  const expectedTokens = extractSignificantTokens(expectedAnswer);
  const generatedLower = qa.answer.toLowerCase();
  if (expectedTokens.length === 0) {
    return {
      generatedAnswer: qa.answer,
      result: 'TP',
      status: 'Pass',
      score: 100,
      strategyUsed: qa.strategyUsed,
    };
  }

  let matchedCount = 0;
  for (const tok of expectedTokens) {
    if (generatedLower.includes(tok)) {
      matchedCount++;
    }
  }
  const overlapRatio = matchedCount / expectedTokens.length;
  const score = Math.round(overlapRatio * 100);

  if (overlapRatio >= 0.5) {
    return {
      generatedAnswer: qa.answer,
      result: 'TP',
      status: 'Pass',
      score,
      strategyUsed: qa.strategyUsed,
    };
  }

  return {
    generatedAnswer: qa.answer,
    result: 'FP',
    status: 'Fail',
    score,
    strategyUsed: qa.strategyUsed,
  };
}

export function computeEvaluationMetrics(
  records: { result: ConfusionResult; status: 'Pass' | 'Fail' }[]
): EvaluationMetricsSummary {
  const total = records.length;
  const tp = records.filter((r) => r.result === 'TP').length;
  const fp = records.filter((r) => r.result === 'FP').length;
  const fn = records.filter((r) => r.result === 'FN').length;
  const tn = records.filter((r) => r.result === 'TN').length;
  const correct = tp + tn;
  const incorrect = fp + fn;

  const accuracy = total > 0 ? (correct / total) * 100 : 0;
  const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
  const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
  const f1Score =
    precision + recall > 0 ? (2 * (precision * recall)) / (precision + recall) : 0;

  return {
    total,
    correct,
    incorrect,
    tp,
    fp,
    fn,
    tn,
    accuracy,
    precision,
    recall,
    f1Score,
  };
}
