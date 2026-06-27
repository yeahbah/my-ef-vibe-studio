import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

export function IconSun(props: IconProps) {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" {...props}>
      <circle cx="8" cy="8" r="3.25" fill="none" stroke="currentColor" strokeWidth="1.25" />
      <path
        d="M8 1.25v1.5M8 13.25v1.5M1.25 8h1.5M13.25 8h1.5M3.05 3.05l1.06 1.06M11.89 11.89l1.06 1.06M3.05 12.95l1.06-1.06M11.89 4.11l1.06-1.06"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function IconMoon(props: IconProps) {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" {...props}>
      <path
        d="M11.8 2.2a5.75 5.75 0 1 0 2 7.55A5.25 5.25 0 0 1 11.8 2.2Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconSettings(props: IconProps) {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" {...props}>
      <path
        d="M8 5.25a2.75 2.75 0 1 0 0 5.5 2.75 2.75 0 0 0 0-5.5Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.25"
      />
      <path
        d="M6.5 1.75h3l.5 1.4a4 4 0 0 1 1.2.7l1.45-.5 1.5 2.6-1.15.9c.05.25.08.5.08.75s-.03.5-.08.75l1.15.9-1.5 2.6-1.45-.5a4 4 0 0 1-1.2.7l-.5 1.4h-3l-.5-1.4a4 4 0 0 1-1.2-.7l-1.45.5-1.5-2.6 1.15-.9A3.2 3.2 0 0 1 3 8c0-.25.03-.5.08-.75l-1.15-.9 1.5-2.6 1.45.5a4 4 0 0 1 1.2-.7l.5-1.4Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconAbout(props: IconProps) {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" {...props}>
      <circle cx="8" cy="8" r="5.75" fill="none" stroke="currentColor" strokeWidth="1.25" />
      <path
        d="M8 7.1V11M8 5.1h.01"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function IconHelp(props: IconProps) {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" {...props}>
      <path
        d="M6.1 6.25A1.9 1.9 0 0 1 8 4.75c1.05 0 1.9.75 1.9 1.7 0 1.45-1.9 1.55-1.9 3.05M8 11.75h.01"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
      />
      <circle cx="8" cy="8" r="5.75" fill="none" stroke="currentColor" strokeWidth="1.25" />
    </svg>
  );
}

export function IconCharts(props: IconProps) {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" {...props}>
      <path
        d="M2.5 13.25V6.5M6.5 13.25V3.75M10.5 13.25V8.25M14.5 13.25V5.25"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function IconPlay(props: IconProps) {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" {...props}>
      <path d="M5.5 3.5 12.5 8 5.5 12.5V3.5Z" fill="currentColor" />
    </svg>
  );
}

export function IconRunAbove(props: IconProps) {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" {...props}>
      <path
        d="M8 2.5 5.75 4.75h1.5V6h1.5V4.75h1.5L8 2.5Z"
        fill="currentColor"
      />
      <path d="M5.5 8.25 10.5 8.25 8 11.75 5.5 8.25Z" fill="currentColor" />
    </svg>
  );
}

export function IconRunBelow(props: IconProps) {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" {...props}>
      <path d="M5.5 4.25 10.5 4.25 8 7.75 5.5 4.25Z" fill="currentColor" />
      <path
        d="M8 13.5 10.25 11.25H8.75V10H7.25v1.25H5.75L8 13.5Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function IconStop(props: IconProps) {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" {...props}>
      <rect x="4.25" y="4.25" width="7.5" height="7.5" rx="1" fill="currentColor" />
    </svg>
  );
}

export function IconBenchmark(props: IconProps) {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" {...props}>
      <circle cx="8" cy="8.75" r="5.25" fill="none" stroke="currentColor" strokeWidth="1.25" />
      <path
        d="M8 4.75V8.75l2.5 1.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6.25 1.75h3.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function IconHistory(props: IconProps) {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" {...props}>
      <path
        d="M8 3.25a4.75 4.75 0 1 1 0 9.5 4.75 4.75 0 0 1 0-9.5Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.25"
      />
      <path
        d="M8 5.5V8l2 1.25M5.75 2.75 3.5 4.25l2.25 1.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconSnippets(props: IconProps) {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" {...props}>
      <path
        d="M5.25 4.75 3.5 8l1.75 3.25M10.75 4.75 12.5 8l-1.75 3.25M8.75 3.25 7.25 12.75"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconScripts(props: IconProps) {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" {...props}>
      <path
        d="M4.5 2.75h5.25L12.5 5.5v7.75a.75.75 0 0 1-.75.75H4.5a.75.75 0 0 1-.75-.75V3.5a.75.75 0 0 1 .75-.75Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinejoin="round"
      />
      <path
        d="M9.75 2.75V5.5H12.5M5.5 8h5M5.5 10.25h3.25"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconScan(props: IconProps) {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" {...props}>
      <circle cx="7" cy="7" r="4.25" fill="none" stroke="currentColor" strokeWidth="1.25" />
      <path
        d="M10.25 10.25 13.75 13.75"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinecap="round"
      />
      <path
        d="M4.5 7h5M7 4.5v5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function IconStar(props: IconProps) {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" {...props}>
      <path
        d="M8 2.5 9.55 6.1l3.9.35-2.95 2.55.9 3.8L8 10.95l-3.4 2.05.9-3.8-2.95-2.55 3.9-.35L8 2.5Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.15"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconSidebar(props: IconProps) {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" {...props}>
      <rect
        x="2.25"
        y="3.25"
        width="4.5"
        height="9.5"
        rx="1"
        fill="currentColor"
        opacity="0.85"
      />
      <rect
        x="8.25"
        y="3.25"
        width="5.5"
        height="9.5"
        rx="1"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.25"
      />
    </svg>
  );
}

export function IconNew(props: IconProps) {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" {...props}>
      <path
        d="M9 1.75H4.75A1 1 0 0 0 3.75 2.75v10.5a1 1 0 0 0 1 1h6.5a1 1 0 0 0 1-1V5.5L9 1.75Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.15"
        strokeLinejoin="round"
      />
      <path
        d="M9 1.75v3.75h3.75M6.5 8.25v3.5M8.25 6.5h-3.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.15"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function IconOpen(props: IconProps) {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" {...props}>
      <path
        d="M2.25 5.75V12a1 1 0 0 0 1 1h9.5a1 1 0 0 0 1-1V5.75"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.15"
        strokeLinejoin="round"
      />
      <path
        d="M2.25 5.75 4.5 3.25h4.25L9.75 5.75"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.15"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconSave(props: IconProps) {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" {...props}>
      <path
        d="M3.25 2.75h7.1l2.4 2.4V13a1 1 0 0 1-1 1H4.25a1 1 0 0 1-1-1V3.75a1 1 0 0 1 1-1Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.15"
        strokeLinejoin="round"
      />
      <path
        d="M6.25 2.75V6h3.5V2.75M5.25 10.25h5.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.15"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function IconPlus(props: IconProps) {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" {...props}>
      <path
        d="M8 3.25v9.5M3.25 8h9.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinecap="round"
      />
    </svg>
  );
}
