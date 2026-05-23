'use client';

import { CheckCircle2, User, TrendingDown, BarChart2, ShieldCheck, Bot } from 'lucide-react';
import clsx from 'clsx';

interface ProcessingStepsProps {
  steps: string[];
}

function formatStepName(raw: string): string {
  // Strip tool_call prefix patterns, replace underscores with spaces, title case
  return raw
    .replace(/^tool_call:\s*/i, '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

type StepCategory = 'member' | 'risk' | 'financial' | 'policy' | 'agent';

function getStepCategory(raw: string): StepCategory {
  const lower = raw.toLowerCase();
  if (lower.includes('member') || lower.includes('profile')) return 'member';
  if (lower.includes('churn') || lower.includes('risk')) return 'risk';
  if (lower.includes('dti') || lower.includes('income') || lower.includes('financial') || lower.includes('account') || lower.includes('balance')) return 'financial';
  if (lower.includes('policy') || lower.includes('compliance') || lower.includes('violation')) return 'policy';
  return 'agent';
}

const CATEGORY_CONFIG: Record<
  StepCategory,
  { label: string; icon: React.ElementType; bg: string; text: string; iconColor: string }
> = {
  member: {
    label: 'Member',
    icon: User,
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    iconColor: 'text-blue-500',
  },
  risk: {
    label: 'Risk',
    icon: TrendingDown,
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    iconColor: 'text-amber-500',
  },
  financial: {
    label: 'Financial',
    icon: BarChart2,
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    iconColor: 'text-emerald-500',
  },
  policy: {
    label: 'Policy',
    icon: ShieldCheck,
    bg: 'bg-purple-50',
    text: 'text-purple-700',
    iconColor: 'text-purple-500',
  },
  agent: {
    label: 'Agent',
    icon: Bot,
    bg: 'bg-slate-50',
    text: 'text-slate-700',
    iconColor: 'text-slate-500',
  },
};

export default function ProcessingSteps({ steps }: ProcessingStepsProps) {
  if (!steps || steps.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
      <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-5">
        Agent Processing Steps
      </h3>

      <ol className="relative space-y-0">
        {steps.map((step, idx) => {
          const category = getStepCategory(step);
          const config = CATEGORY_CONFIG[category];
          const Icon = config.icon;
          const isLast = idx === steps.length - 1;

          return (
            <li key={idx} className="relative flex gap-4">
              {/* Vertical connecting line */}
              {!isLast && (
                <div
                  className="absolute left-4 top-8 bottom-0 w-px bg-slate-200"
                  aria-hidden="true"
                />
              )}

              {/* Numbered circle */}
              <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-navy-900 text-white text-xs font-bold shadow-sm mt-0.5">
                {idx + 1}
              </div>

              {/* Step content */}
              <div className={clsx('flex-1 pb-5', isLast && 'pb-0')}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 leading-snug">
                      {formatStepName(step)}
                    </p>
                    {/* Raw step text if it differs meaningfully */}
                    {step !== formatStepName(step) &&
                      step.length < 80 &&
                      step.includes('_') && (
                        <p className="text-xs text-slate-400 mt-0.5 font-mono">
                          {step}
                        </p>
                      )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {/* Category tag */}
                    <span
                      className={clsx(
                        'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium',
                        config.bg,
                        config.text
                      )}
                    >
                      <Icon className={clsx('h-3 w-3', config.iconColor)} />
                      {config.label}
                    </span>

                    {/* Green checkmark */}
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
