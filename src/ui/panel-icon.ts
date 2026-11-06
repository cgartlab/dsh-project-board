/** The board icon shown in the native right-sidebar tab strip. */
import { h } from '../runtime';
import { Icon } from './icons';

export interface PanelIconProps {
  size?: number;
}

export function PanelIcon(props: PanelIconProps): unknown {
  return h(Icon, { name: 'board', size: props && props.size ? props.size : 16 });
}
