// src/pages/ghostroutevpn/howToUseIcons.jsx
// Small line-style device icons, matching the stroke conventions used across
// the app's other icon components (16px, currentColor, 1.8 stroke).

export function AndroidIcon(props) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M6 18v-6a6 6 0 0 1 12 0v6" />
      <path d="M6 18a2 2 0 0 0 2 2h1v-2M18 18a2 2 0 0 1-2 2h-1v-2" />
      <path d="M4 10v4M20 10v4" />
      <path d="M8.5 6 7 4M15.5 6 17 4" />
      <path d="M9 12h.01M15 12h.01" />
    </svg>
  );
}

export function AppleIcon(props) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M16.5 12.3c0-2 1.6-3 1.7-3.1a3.9 3.9 0 0 0-3.1-1.7c-1.3-.1-2.6.8-3.2.8-.7 0-1.8-.8-2.9-.8a4.2 4.2 0 0 0-3.5 2.2c-1.5 2.6-.4 6.5 1.1 8.6.7 1 1.6 2.2 2.8 2.1 1.1 0 1.5-.7 2.9-.7s1.7.7 2.9.7c1.2 0 2-1 2.7-2.1a9.3 9.3 0 0 0 1.2-2.5 3.6 3.6 0 0 1-2.6-3.5Z" />
      <path d="M13.5 5.6c.5-.7.9-1.6.8-2.6-.8.1-1.8.6-2.4 1.3-.5.6-1 1.5-.8 2.4.9.1 1.8-.4 2.4-1.1Z" />
    </svg>
  );
}

export function WindowsIcon(props) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M3 5.5 10.5 4.4v7H3ZM11.5 4.3 21 3v8.4h-9.5ZM3 12.5h7.5v7L3 18.4ZM11.5 12.5H21V21l-9.5-1.3Z" />
    </svg>
  );
}

export function LinuxIcon(props) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 3a3 3 0 0 1 3 3v3.5c1.2.7 2 2 2 3.5 0 .6-.1 1.1-.4 1.6l1.1 2a1 1 0 0 1-.9 1.4h-1.3l.3 1.2a1 1 0 0 1-1 1.3H9.2a1 1 0 0 1-1-1.3l.3-1.2H7.2a1 1 0 0 1-.9-1.4l1.1-2A3.5 3.5 0 0 1 7 13c0-1.5.8-2.8 2-3.5V6a3 3 0 0 1 3-3Z" />
      <path d="M10 11h.01M14 11h.01" />
    </svg>
  );
}

export function ExternalLinkIcon(props) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M14 4h6v6" />
      <path d="M20 4 10 14" />
      <path d="M18 13v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h5" />
    </svg>
  );
}

export function DownloadIcon(props) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 3v12" />
      <path d="M7 10l5 5 5-5" />
      <path d="M4 19h16" />
    </svg>
  );
}
