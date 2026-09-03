import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement>

function base(props: IconProps) {
  return {
    viewBox: '0 0 24 24',
    width: 20,
    height: 20,
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
    ...props,
  }
}

export function BriefcaseBusiness(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 12v4" />
      <path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
      <path d="M7 7h10a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2Z" />
      <path d="M5 14v2a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-2" />
    </svg>
  )
}

export function ClipboardCheck(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="8" y="2" width="8" height="4" rx="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <path d="m9 14 2 2 4-4" />
    </svg>
  )
}

export function CalendarClock(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M21 7.5V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h5" />
      <path d="M16 2v4M8 2v4M3 10h13" />
      <circle cx="18" cy="17.5" r="3.5" />
      <path d="M18 15.8v1.7l1.2 1" />
    </svg>
  )
}

export function CalendarRange(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="3" y="4" width="18" height="17" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
      <path d="M7 14.5h2M11 14.5h2M15 14.5h2M7 18h2M11 18h2" />
    </svg>
  )
}

export function BadgeAlert(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 3 4 6.5v4.2c0 4.6 3.4 8.3 8 10.3 4.6-2 8-5.7 8-10.3V6.5Z" />
      <path d="M12 9v3.4" />
      <path d="M12 15.8h.01" />
    </svg>
  )
}

export function MapPin(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 21s-6-5.3-6-10a6 6 0 0 1 12 0c0 4.7-6 10-6 10Z" />
      <circle cx="12" cy="11" r="2.2" />
    </svg>
  )
}

export function CalendarDays(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="3" y="4" width="18" height="17" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
      <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01" />
    </svg>
  )
}

export function Clock3(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  )
}

export function ArrowRight(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  )
}

export function Bookmark(props: IconProps) {
  return (
    <svg {...base(props)} fill={props.fill ?? 'none'}>
      <path d="M6 3.5h12a1 1 0 0 1 1 1V21l-7-4-7 4V4.5a1 1 0 0 1 1-1Z" />
    </svg>
  )
}

export function Check(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  )
}

export function Send(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M22 2 11 13M22 2 15 22l-4-9-9-4Z" />
    </svg>
  )
}

export function AlertTriangle(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M10.3 3.8 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.8a2 2 0 0 0-3.4 0Z" />
      <path d="M12 9v4M12 17h.01" />
    </svg>
  )
}
