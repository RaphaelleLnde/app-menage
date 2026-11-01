// Icônes au trait, dans le style du livret
const S = ({ children, className = 'ico' }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true">{children}</svg>
);
export const IconCalendar = (p) => <S {...p}><rect x="3.5" y="5" width="17" height="15" rx="2" /><path d="M3.5 10h17M8 3v4M16 3v4" /></S>;
export const IconHistory = (p) => <S {...p}><path d="M3.5 12a8.5 8.5 0 1 0 2.5-6" /><path d="M3.5 4v4h4M12 8v4l3 2" /></S>;
export const IconList = (p) => <S {...p}><path d="M9 6h11M9 12h11M9 18h11" /><path d="M3.5 6l1.3 1.3L7 5M3.5 12l1.3 1.3L7 11M3.5 18l1.3 1.3L7 17" /></S>;
export const IconSettings = (p) => <S {...p}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z" /></S>;
export const IconCamera = (p) => <S {...p}><path d="M4 8h3l1.5-2.5h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z" /><circle cx="12" cy="13" r="3.5" /></S>;
export const IconBroom = (p) => <S {...p}><path d="M15 3l-4.5 8" /><path d="M7 11h7l2 9H5z" /><path d="M8.5 15v5M12 15v5" /></S>;
export const IconCheck = (p) => <S {...p}><path d="M5 12.5l4.5 4.5L19 7.5" /></S>;
export const IconUp = (p) => <S {...p}><path d="M6 15l6-6 6 6" /></S>;
export const IconDown = (p) => <S {...p}><path d="M6 9l6 6 6-6" /></S>;
export const IconTrash = (p) => <S {...p}><path d="M4 7h16M9 7V4h6v3M6.5 7l1 13h9l1-13" /></S>;
export const IconLeft = (p) => <S {...p}><path d="M15 5l-7 7 7 7" /></S>;
export const IconRight = (p) => <S {...p}><path d="M9 5l7 7-7 7" /></S>;
export const IconBed = (p) => <S {...p}><path d="M3 18V7M3 14h18v4M21 14v-2a3 3 0 0 0-3-3h-7v5" /><circle cx="7" cy="11" r="1.8" /></S>;
