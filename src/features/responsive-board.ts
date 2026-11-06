/** Right-pane board host: swaps between the compact and the full board on the pane's width. */
import { DEFAULT_SETTINGS } from '../constants';
import type { UseHook } from '../host';
import { fallbackHook } from '../core/schedule';
import { h, useEffect, useRef, useState } from '../runtime';
import type { Settings } from '../types';
import { ProjectBoard, type ProjectBoardProps } from './board';

export interface ResponsiveBoardProps extends ProjectBoardProps {
  useSettings?: UseHook<Settings>;
  wideThreshold?: number;
}

export function ResponsiveBoard(props: ResponsiveBoardProps): unknown {
  const useSettings = typeof props.useSettings === 'function' ? props.useSettings : fallbackHook<Settings>();
  const config = useSettings((snapshot) => snapshot) || DEFAULT_SETTINGS;
  const threshold = Math.min(1000, Math.max(320, Number(props.wideThreshold) || Number(config.board.wideThreshold) || 520));
  const boxRef = useRef<HTMLElement | null>(null);
  const [wide, setWide] = useState(false);
  useEffect(() => {
    const element = boxRef.current;
    if (!element) return undefined;
    const update = (): void => {
      setWide(element.clientWidth >= threshold);
    };
    update();
    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(update);
      observer.observe(element);
      return () => observer.disconnect();
    }
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [threshold]);
  if (config.board.enabled === false) {
    return h('div', { className: 'pbx-responsive' }, h('div', { className: 'pbx-disabled' }, props.t('settings.boardDisabled')));
  }
  return h('div', { ref: boxRef, className: 'pbx-responsive' }, h(ProjectBoard, Object.assign({}, props, { compact: !wide })));
}
