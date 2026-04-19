import type { Workflow } from '@pasmello/shared';

export interface ValidationIssue {
    level: 'error' | 'warning';
    message: string;
}

export function validateWorkflow(wf: Workflow): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    const ids = new Set<string>();
    for (const n of wf.nodes) {
        if (ids.has(n.id)) issues.push({ level: 'error', message: `duplicate node id "${n.id}"` });
        ids.add(n.id);
    }
    for (const e of wf.edges) {
        if (!ids.has(e.source)) issues.push({ level: 'error', message: `edge source "${e.source}" missing` });
        if (!ids.has(e.target)) issues.push({ level: 'error', message: `edge target "${e.target}" missing` });
    }
    if (wf.nodes.length > 0 && wf.triggers.length === 0) {
        issues.push({ level: 'warning', message: 'workflow has no triggers — only runnable via the Run button' });
    }
    return issues;
}
