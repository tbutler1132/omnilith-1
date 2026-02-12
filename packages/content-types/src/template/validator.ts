import type { ValidationResult } from '@omnilith/kernel';
import type { TemplatePayload, TemplateRecipeStep } from './schema.js';

export function validateTemplate(payload: unknown): ValidationResult {
  const issues: string[] = [];
  const p = payload as Partial<TemplatePayload>;

  if (!p || typeof p !== 'object') {
    return { valid: false, issues: ['Payload must be an object'] };
  }

  if (typeof p.name !== 'string' || p.name.length === 0) {
    issues.push('name must be a non-empty string');
  }

  if (typeof p.description !== 'string') {
    issues.push('description must be a string');
  }

  if (!Array.isArray(p.recipe)) {
    issues.push('recipe must be an array');
  } else if (p.recipe.length === 0) {
    issues.push('recipe must contain at least one step');
  } else {
    const refs = new Set<string>();
    const duplicateRefs = new Set<string>();

    // Collect all refs first for composeInto validation
    for (const step of p.recipe) {
      if (step && typeof step === 'object' && typeof step.ref === 'string') {
        if (refs.has(step.ref)) {
          duplicateRefs.add(step.ref);
        }
        refs.add(step.ref);
      }
    }

    for (let i = 0; i < p.recipe.length; i++) {
      const step = p.recipe[i] as Partial<TemplateRecipeStep>;
      if (!step || typeof step !== 'object') {
        issues.push(`recipe[${i}] must be an object`);
        continue;
      }

      if (typeof step.ref !== 'string' || step.ref.length === 0) {
        issues.push(`recipe[${i}].ref must be a non-empty string`);
      } else if (duplicateRefs.has(step.ref)) {
        issues.push(`recipe[${i}].ref '${step.ref}' is a duplicate`);
      }

      if (typeof step.contentTypeId !== 'string' || step.contentTypeId.length === 0) {
        issues.push(`recipe[${i}].contentTypeId must be a non-empty string`);
      }

      if (step.initialPayload === undefined) {
        issues.push(`recipe[${i}].initialPayload is required`);
      }

      if (step.composeInto !== undefined) {
        if (typeof step.composeInto !== 'string' || step.composeInto.length === 0) {
          issues.push(`recipe[${i}].composeInto must be a non-empty string`);
        } else if (!refs.has(step.composeInto)) {
          issues.push(`recipe[${i}].composeInto references unknown ref '${step.composeInto}'`);
        } else if (step.composeInto === step.ref) {
          issues.push(`recipe[${i}].composeInto cannot reference itself`);
        }
      }

      if (step.position !== undefined && typeof step.position !== 'number') {
        issues.push(`recipe[${i}].position must be a number`);
      }
    }

    // Check for circular composeInto chains
    if (issues.length === 0 && Array.isArray(p.recipe)) {
      const composeMap = new Map<string, string>();
      for (const step of p.recipe as ReadonlyArray<TemplateRecipeStep>) {
        if (step.composeInto) {
          composeMap.set(step.ref, step.composeInto);
        }
      }

      for (const [startRef] of composeMap) {
        const visited = new Set<string>();
        let current: string | undefined = startRef;
        while (current && composeMap.has(current)) {
          if (visited.has(current)) {
            issues.push(`circular composeInto chain detected involving '${current}'`);
            break;
          }
          visited.add(current);
          current = composeMap.get(current);
        }
      }
    }
  }

  return { valid: issues.length === 0, issues };
}
