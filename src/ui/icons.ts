/** Icon rendering: the plugin's own shapes plus the copies of the DSH client icon set. */
import { h } from '../runtime';
import { NATIVE_ICONS, PATHS } from './icon-data';

export interface IconProps {
  name?: string;
  size?: number;
  strokeWidth?: number;
}

export function Icon(props: IconProps): unknown {
  const name = props.name || 'folder';
  const native = NATIVE_ICONS[name];
  const size = props.size || 16;
  const strokeWidth = props.strokeWidth || (native ? native.strokeWidth : 1.7);
  const paths = native ? native.paths : PATHS[name] || PATHS.folder;
  const cap = native ? 'butt' : 'round';
  const join = native ? 'miter' : 'round';
  return h(
    'svg',
    {
      width: size,
      height: size,
      viewBox: native ? native.viewBox : '0 0 24 24',
      fill: 'none',
      stroke: 'currentColor',
      strokeWidth: strokeWidth,
      strokeLinecap: cap,
      strokeLinejoin: join,
      'aria-hidden': 'true',
      focusable: 'false'
    },
    paths.map((d, i) => h('path', { key: i, d: d }))
  );
}

export interface RunRingProps {
  size?: number;
  className?: string;
}

/** Spinning ring used everywhere a session is shown as running. */
export function RunRing(props: RunRingProps): unknown {
  const size = props.size || 9;
  return h('span', {
    className: 'pbx-runRing' + (props.className ? ' ' + props.className : ''),
    style: { width: size + 'px', height: size + 'px' },
    'aria-hidden': 'true'
  });
}
