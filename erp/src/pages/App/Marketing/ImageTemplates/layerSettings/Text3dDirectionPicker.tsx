import { useRef, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react';
import type { Text3dDirection } from '../../../../../../../shared-utils/catalogImageTemplate';

const text3dDirectionLabels: Record<Text3dDirection, string> = {
  'down-right': 'Inferior direita', down: 'Inferior', 'down-left': 'Inferior esquerda', left: 'Esquerda',
  'up-left': 'Superior esquerda', up: 'Superior', 'up-right': 'Superior direita', right: 'Direita',
};
const TEXT_3D_ORBIT_DIRECTIONS: readonly Text3dDirection[] = ['right', 'down-right', 'down', 'down-left', 'left', 'up-left', 'up', 'up-right'];
export const text3dDirectionAngles: Record<Text3dDirection, number> = {
  'down-right': 45, down: 90, 'down-left': 135, left: 180, 'up-left': 225, up: 270, 'up-right': 315, right: 0,
};

export function Text3dDirectionPicker({ angle, onChange, disabled }: {
  angle: number; onChange: (angle: number) => void; disabled: boolean;
}) {
  const dragging = useRef(false);
  const currentAngle = ((Math.round(angle) % 360) + 360) % 360;
  const directionIndex = Math.round(currentAngle / 45) % TEXT_3D_ORBIT_DIRECTIONS.length;
  const nearestDirection = TEXT_3D_ORBIT_DIRECTIONS[directionIndex] ?? 'right';
  const directionLabel = text3dDirectionLabels[nearestDirection];
  const radians = currentAngle * Math.PI / 180;
  const satellitePosition = {
    left: `${50 + Math.cos(radians) * 38}%`,
    top: `${50 + Math.sin(radians) * 38}%`,
  };

  const chooseFromPointer = (event: ReactPointerEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const dx = event.clientX - (bounds.left + bounds.width / 2);
    const dy = event.clientY - (bounds.top + bounds.height / 2);
    if (Math.hypot(dx, dy) < bounds.width * .08) return;
    const pointerRadians = (Math.atan2(dy, dx) + Math.PI * 2) % (Math.PI * 2);
    onChange(Math.round(pointerRadians * 180 / Math.PI) % 360);
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;
    let nextAngle: number | null = null;
    const step = event.shiftKey ? 15 : 1;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') nextAngle = currentAngle + step;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') nextAngle = currentAngle - step;
    if (event.key === 'Home') nextAngle = 45;
    if (event.key === 'End') nextAngle = 359;
    if (nextAngle === null) return;
    event.preventDefault();
    onChange((nextAngle + 360) % 360);
  };

  return <div className="ct-3d-direction-control">
    <div className="ct-3d-direction-orbit" role="slider" tabIndex={disabled ? -1 : 0}
      aria-label="Direção do efeito 3D" aria-roledescription="seletor circular"
      aria-valuemin={0} aria-valuemax={359} aria-valuenow={currentAngle}
      aria-valuetext={`${currentAngle} graus, ${directionLabel}`} aria-disabled={disabled}
      onKeyDown={handleKeyDown}
      onPointerDown={(event) => {
        if (disabled) return;
        event.preventDefault();
        dragging.current = true;
        event.currentTarget.setPointerCapture(event.pointerId);
        chooseFromPointer(event);
      }}
      onPointerMove={(event) => { if (dragging.current && !disabled) chooseFromPointer(event); }}
      onPointerUp={() => { dragging.current = false; }}
      onPointerCancel={() => { dragging.current = false; }}
      onLostPointerCapture={() => { dragging.current = false; }}>
      <span className="ct-3d-orbit-ring" aria-hidden="true" />
      <span className="ct-3d-orbit-center" aria-hidden="true" />
      <span className="ct-3d-orbit-satellite" style={satellitePosition} aria-hidden="true" />
    </div>
    <span className="ct-3d-direction-value">{currentAngle}° · {directionLabel}</span>
  </div>;
}
