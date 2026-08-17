import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Svg({ size = 22, children, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      {children}
    </svg>
  );
}

export function IconLedger(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M8 6h11a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H8" />
      <rect x="3" y="4" width="5" height="16" rx="1.5" />
      <path d="M11 10h6M11 14h4" />
    </Svg>
  );
}

export function IconAssets(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 10.5 12 4l8 6.5V20a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 20z" />
      <path d="M9.5 21.5v-6h5v6" />
    </Svg>
  );
}

export function IconChart(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 19V5" />
      <path d="M4 19h16" />
      <path d="M8 15v-4" />
      <path d="M12 15V8" />
      <path d="M16 15v-7" />
    </Svg>
  );
}

export function IconMe(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="8" r="3.25" />
      <path d="M5.5 19.5a6.5 6.5 0 0 1 13 0" />
    </Svg>
  );
}

export function IconPlus(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 5v14M5 12h14" />
    </Svg>
  );
}

export function IconClose(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M6 6l12 12M18 6 6 18" />
    </Svg>
  );
}

export function IconExport(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 4v10" />
      <path d="M8 8l4-4 4 4" />
      <path d="M5 16v3h14v-3" />
    </Svg>
  );
}

export function IconBackspace(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M8 6h12v12H8l-5-6z" />
      <path d="m11 10 6 6M17 10l-6 6" />
    </Svg>
  );
}

export function IconLaptop(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="4" y="5" width="16" height="11" rx="1.5" />
      <path d="M3 19h18" />
    </Svg>
  );
}

export function IconSofa(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 13v5h16v-5" />
      <path d="M4 15a2.5 2.5 0 0 1 0-5h2v5zM20 15a2.5 2.5 0 0 0 0-5h-2v5z" />
      <path d="M6 10V8a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v2" />
    </Svg>
  );
}

export function IconPlug(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M9 4v5M15 4v5" />
      <path d="M7 9h10v4a5 5 0 0 1-10 0z" />
      <path d="M12 18v3" />
    </Svg>
  );
}

export function IconShirt(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M8 5 12 8l4-3 3 2-2 3v9H7V7L5 4z" />
    </Svg>
  );
}

export function IconBag(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M6 8h12l1 12H5z" />
      <path d="M9 8V6a3 3 0 0 1 6 0v2" />
    </Svg>
  );
}

export function IconSpark(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 3l1.6 5.2L19 10l-5.4 1.8L12 17l-1.6-5.2L5 10l5.4-1.8z" />
    </Svg>
  );
}

export function IconBed(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3 18V9h7a4 4 0 0 1 4 4h7v5" />
      <path d="M3 14h18" />
    </Svg>
  );
}

export function IconBottle(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M10 3h4v3l2 3v11a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V9l2-3z" />
    </Svg>
  );
}

export function IconCup(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M6 8h10v6a4 4 0 0 1-4 4H10a4 4 0 0 1-4-4z" />
      <path d="M16 10h2.5a2.5 2.5 0 0 1 0 5H16" />
    </Svg>
  );
}

export function IconPaw(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="7" cy="9" r="1.6" />
      <circle cx="17" cy="9" r="1.6" />
      <circle cx="9.5" cy="6" r="1.4" />
      <circle cx="14.5" cy="6" r="1.4" />
      <path d="M8 16c1.5-2 6.5-2 8 0 1 1.3-.2 3-2.2 3H10.2C8.2 19 7 17.3 8 16z" />
    </Svg>
  );
}

export function IconClip(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M16 8.5 9.5 15A2.5 2.5 0 1 1 6 11.5l8-8A3.5 3.5 0 0 1 19 8.5l-8 8" />
    </Svg>
  );
}

export function IconBox(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 8 12 4l8 4-8 4z" />
      <path d="M4 8v8l8 4 8-4V8" />
      <path d="M12 12v8" />
    </Svg>
  );
}

export function IconCar(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 14h16l-1.5-5H5.5z" />
      <path d="M6 14v3H4v-2M18 14v3h2v-2" />
      <circle cx="8" cy="17.5" r="1.4" />
      <circle cx="16" cy="17.5" r="1.4" />
    </Svg>
  );
}

export function IconPan(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="10" cy="13" r="5" />
      <path d="M14.5 13H21" />
    </Svg>
  );
}

export const NAV_ICONS = {
  ledger: IconLedger,
  assets: IconAssets,
  chart: IconChart,
  me: IconMe,
} as const;
