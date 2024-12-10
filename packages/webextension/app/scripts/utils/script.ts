/**
 * Create unique key of Script
 * @param script
 */
export const keyOfScript = (script: { name: string; namespace: string }): string => {
    return `${script.namespace}@${script.name}`;
};
