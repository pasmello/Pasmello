/**
 * Resolve `$.<path>` reference strings in a config object against prior node
 * outputs. The first segment of the path is the source node id (or the
 * special `input` slot for ctx.input). Subsequent segments are property
 * accesses on the resolved value.
 *
 * Example: `{ url: "$.fetchData.body.next_url" }` resolves `nodes.fetchData`
 * then `.body.next_url`.
 */
export function resolveRefs(value: unknown, outputs: Map<string, unknown>): unknown {
    if (typeof value === 'string' && value.startsWith('$.')) {
        return jsonPath(outputs, value.slice(2));
    }
    if (Array.isArray(value)) {
        return value.map((v) => resolveRefs(v, outputs));
    }
    if (value && typeof value === 'object') {
        const out: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
            out[k] = resolveRefs(v, outputs);
        }
        return out;
    }
    return value;
}

function jsonPath(outputs: Map<string, unknown>, path: string): unknown {
    const parts = path.split('.').filter(Boolean);
    if (parts.length === 0) return undefined;
    let cur: unknown = outputs.get(parts[0]);
    for (let i = 1; i < parts.length; i++) {
        if (cur == null) return undefined;
        cur = (cur as Record<string, unknown>)[parts[i]];
    }
    return cur;
}
