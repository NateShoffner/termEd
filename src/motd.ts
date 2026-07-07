export interface MotdLine {
  text: string;
  color: 'Cyan' | 'DarkGray' | 'Yellow';
}

const QUOTES = [
  'Your session is compiled and ready. Just like a clean RPG IV build.',
  'System status: all indicators green. Especially the one for believing in you.',
  "Today's forecast: 100% chance of shipping.",
  'The AS/400 has been up since 1988. Be the AS/400.',
  'Uptime is a mindset.',
  'Fortune favors the bold. So does the compiler, usually.',
  'Every great run starts with issue #1. This prompt is yours.',
  'QSYSOPR has no messages for you. It never doubted you for a second.',
  'Zero level checks detected in your future.',
  'The job queue is empty and the day is yours.',
  'CHAIN yourself to greatness. SETLL on success. READE every opportunity.',
  'Somewhere a subfile is loading perfectly. That kind of day.',
  'Signed on and locked in.',
  'You are the PTF this system has been waiting for.',
  'Great sessions are not found, they are compiled.',
  'The prompt is blank. The potential is not.',
  'Write code the 5250 would be proud to display.',
  'Today runs at priority 1.',
  'Message queue clear. Conscience clear. Go.',
  'Somewhere out there, a mainframe believes in you too.',
  'A hero is just a developer who read the error message.',
  'Ship something worth a splash page.',
  'The library list is set. The rest is up to you.',
  'Batch it, interactive it, just make it happen.',
  'Wings not included. Red Bull sold separately.',
  'Fueled by taurine, powered by belief.',
  'One Red Bull in, all indicators on.',
  'Smoke break scheduled. Greatness is not. Greatness is continuous.',
];

const DAY_LINES: Partial<Record<number, string[]>> = {
  0: [
    'Sunday session? Legends rest by shipping slower, not stopping.',
    'Sunday. Even the batch window takes it easy today. Code for joy.',
  ],
  1: [
    'Monday. Fresh batch queue, fresh you.',
    'New week. The spool file of possibility is empty and waiting.',
    'Monday IPL complete. All subsystems of greatness online.',
  ],
  2: [
    'New comic book day is TOMORROW. Prepare the pull list.',
    'Tuesday: the calm before the comics.',
  ],
  3: [
    "IT'S NEW COMIC BOOK DAY. Finish strong, then get to the shop.",
    'Wednesday. You know what that means. NCBD.',
  ],
  4: [
    'Thursday: read your new comics yet? Work first. Or not. I support you either way.',
    'Thursday. The week is compiling. Almost linked.',
  ],
  5: [
    'Friday deploy? I believe in you. I believe in everything about you.',
    'Friday. Ship it or shelve it, either way you crushed this week.',
  ],
  6: [
    'Saturday code hits different. No meetings, all momentum.',
    'Weekend session! This one goes in the longbox of great decisions.',
  ],
};

function pick<T>(pool: T[]): T {
  return pool[Math.floor(Math.random() * pool.length)];
}

export function getMotd(version: string): MotdLine[] {
  const lines: MotdLine[] = [
    { text: `* termEd v${version} - the terminal that believes in you`, color: 'Cyan' },
    { text: `"${pick(QUOTES)}" - Ed`, color: 'DarkGray' },
  ];

  const now = new Date();
  const dayPool = DAY_LINES[now.getDay()];
  if (dayPool) {
    lines.push({ text: pick(dayPool), color: 'Yellow' });
  }

  if (now.getHours() >= 5 && now.getHours() < 12) {
    lines.push({ text: 'GET UP AND GET DOWN!!!', color: 'Yellow' });
  }

  return lines;
}
