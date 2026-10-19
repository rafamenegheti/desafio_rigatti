import type { SVGProps } from 'react';

const base: SVGProps<SVGSVGElement> = {
  width: 20,
  height: 20,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
};
const Svg = (props: SVGProps<SVGSVGElement> & { d: string }) => {
  const { d, ...rest } = props;
  return (
    <svg {...base} {...rest}>
      <path d={d} />
    </svg>
  );
};

export const IconBox = (p: SVGProps<SVGSVGElement>) => <Svg {...p} d="M21 8l-9-5-9 5v8l9 5 9-5V8zM3.3 7.5L12 12.5l8.7-5M12 22V12.5" />;
export const IconChat = (p: SVGProps<SVGSVGElement>) => <Svg {...p} d="M21 12a8 8 0 01-11.6 7.1L4 20l1-4.6A8 8 0 1121 12z" />;
export const IconUsers = (p: SVGProps<SVGSVGElement>) => <Svg {...p} d="M16 20v-1.5a3.5 3.5 0 00-3.5-3.5h-5A3.5 3.5 0 004 18.5V20M10 12a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM20 20v-1.5a3.5 3.5 0 00-2.5-3.35M15.5 5.2a3.5 3.5 0 010 6.6" />;
export const IconPlus = (p: SVGProps<SVGSVGElement>) => <Svg {...p} d="M12 5v14M5 12h14" />;
export const IconEdit = (p: SVGProps<SVGSVGElement>) => <Svg {...p} d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />;
export const IconTrash = (p: SVGProps<SVGSVGElement>) => <Svg {...p} d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6" />;
export const IconSearch = (p: SVGProps<SVGSVGElement>) => <Svg {...p} d="M11 19a8 8 0 100-16 8 8 0 000 16zM21 21l-4.3-4.3" />;
export const IconSend = (p: SVGProps<SVGSVGElement>) => <Svg {...p} d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />;
export const IconStop = (p: SVGProps<SVGSVGElement>) => <Svg {...p} d="M6 6h12v12H6z" />;
export const IconLogout = (p: SVGProps<SVGSVGElement>) => <Svg {...p} d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />;
export const IconSun = (p: SVGProps<SVGSVGElement>) => <Svg {...p} d="M12 17a5 5 0 100-10 5 5 0 000 10zM12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4" />;
export const IconMoon = (p: SVGProps<SVGSVGElement>) => <Svg {...p} d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z" />;
export const IconSpark = (p: SVGProps<SVGSVGElement>) => <Svg {...p} d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3zM19 16l.7 1.8L21.5 18.5l-1.8.7L19 21l-.7-1.8-1.8-.7 1.8-.7L19 16z" />;
export const IconImage = (p: SVGProps<SVGSVGElement>) => <Svg {...p} d="M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2zM8.5 10a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM21 15l-5-5L5 21" />;
export const IconDatabase = (p: SVGProps<SVGSVGElement>) => <Svg {...p} d="M12 8c4.4 0 8-1.3 8-3s-3.6-3-8-3-8 1.3-8 3 3.6 3 8 3zM4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3" />;
