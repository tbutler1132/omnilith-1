/**
 * VisorCompose — inline threshold form for introducing new organisms.
 *
 * After threshold, focuses the new organism in the Here section.
 */

import { ThresholdForm } from '../organisms/ThresholdForm.js';
import { usePlatform } from '../platform/index.js';

export function VisorCompose() {
  const { focusOrganism, setVisorSection } = usePlatform();

  function handleCreated(organismId: string) {
    focusOrganism(organismId);
    setVisorSection('here');
  }

  return (
    <div className="visor-compose">
      <ThresholdForm inline onCreated={handleCreated} onClose={() => {}} />
    </div>
  );
}
