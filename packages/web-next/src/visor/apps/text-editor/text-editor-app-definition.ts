/**
 * Text editor app definition.
 *
 * Registers metadata and render module for the focused text tending app.
 */

import type { VisorAppDefinition } from '../app-contract.js';
import { TextEditorApp } from './text-editor-app.js';
import { TextEditorAppIcon } from './text-editor-app-icon.js';

export const textEditorAppDefinition: VisorAppDefinition = {
  id: 'text-editor',
  label: 'Text Editor',
  description: 'Tend one text organism and save as state append or proposal.',
  registryTier: 'extra',
  official: true,
  icon: TextEditorAppIcon,
  component: TextEditorApp,
};
