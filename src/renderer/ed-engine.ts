import type { EdQuotes, QuoteCategory } from './ed-quotes';

export interface EdEngineOptions {
  globalCooldown?: number;
  reactionCooldown?: number;
  idleThreshold?: number;
  intervalMin?: number;
  intervalMax?: number;
  hypeChance?: number;
  outputSettleMs?: number;
  outputMaxWaitMs?: number;
  photos?: string[];
}

type Timer = ReturnType<typeof setTimeout>;

// Ed's brain. Decides when he speaks and what he says.
// All remarks render in the overlay bubble - never into the pty stream.
export class EdEngine {
  private quotes: EdQuotes;

  private globalCooldown: number;
  private reactionCooldown: number;
  private idleThreshold: number;
  private intervalMin: number;
  private intervalMax: number;
  private hypeChance: number;
  private outputSettleMs: number;
  private outputMaxWaitMs: number;

  private lastSpokeAt = 0;
  private lastReactionAt = 0;
  private idleFired = false;
  private recentByCategory = new Map<QuoteCategory, string[]>();

  private bubble: HTMLElement;
  private bubbleText: HTMLElement;
  private backdrop: HTMLElement;
  private avatar: HTMLImageElement;
  private photos: string[];
  private hideTimer: Timer | null = null;

  private lineBuffer = '';
  private pendingCommand: string | null = null;
  private outputWindow = '';
  private settleTimer: Timer | null = null;
  private maxWaitTimer: Timer | null = null;
  private idleTimer: Timer | null = null;

  constructor(quotes: EdQuotes, options: EdEngineOptions = {}) {
    this.quotes = quotes;

    this.globalCooldown = options.globalCooldown ?? 45_000;
    this.reactionCooldown = options.reactionCooldown ?? 12_000;
    this.idleThreshold = options.idleThreshold ?? 180_000;
    this.intervalMin = options.intervalMin ?? 240_000;
    this.intervalMax = options.intervalMax ?? 540_000;
    this.hypeChance = options.hypeChance ?? 0.25;
    this.outputSettleMs = options.outputSettleMs ?? 700;
    this.outputMaxWaitMs = options.outputMaxWaitMs ?? 8_000;

    this.bubble = document.getElementById('ed-bubble')!;
    this.bubbleText = document.getElementById('ed-bubble-text')!;
    this.backdrop = document.getElementById('ed-backdrop')!;
    this.avatar = document.getElementById('ed-avatar') as HTMLImageElement;
    this.bubble.addEventListener('click', () => this.hideBubble());

    this.photos = options.photos ?? [];
    if (this.photos.length) this.setPhoto(this.pickFrom(this.photos));

    this.resetIdleTimer();
    this.scheduleIntervalRemark();

    setTimeout(() => {
      // NCBD leads on Tuesday/Wednesday; mornings usually get the catchphrase.
      const now = new Date();
      const useNcbd = (now.getDay() === 2 || now.getDay() === 3) && Math.random() < 0.5;
      const isMorning = now.getHours() >= 5 && now.getHours() < 12;
      let line: string;
      if (useNcbd) line = this.pickNcbd();
      else if (isMorning && Math.random() < 0.7) line = this.pick('morningGreetings');
      else line = this.pick('greetings');
      this.speak(line, { force: true });
    }, 900);
  }

  pick(category: QuoteCategory): string {
    const pool = this.quotes[category];
    // Avoid repeating the last couple of lines from the same category.
    const recent = this.recentByCategory.get(category) ?? [];
    const candidates = pool.filter((q) => !recent.includes(q));
    const line = this.pickFrom(candidates.length ? candidates : pool);
    this.recentByCategory.set(category, [line, ...recent].slice(0, 3));
    return line;
  }

  pickFrom(pool: string[]): string {
    return pool[Math.floor(Math.random() * pool.length)];
  }

  // New comic book day is Wednesday. Ed tracks it like a release schedule.
  pickNcbd(): string {
    const ncbd = this.quotes.ncbd;
    const day = new Date().getDay();
    if (day === 3) return this.pickFrom(ncbd.wednesday);
    if (day === 2) return this.pickFrom(ncbd.tuesday);
    if (day === 4) return this.pickFrom(ncbd.thursday);
    const days = (3 - day + 7) % 7;
    return this.pickFrom(ncbd.countdown).replace('{days}', String(days));
  }

  setPhoto(photo: string): void {
    this.backdrop.style.backgroundImage = `url("${photo}")`;
    this.avatar.src = photo;
  }

  speak(text: string, { force = false } = {}): boolean {
    const now = Date.now();
    if (!force && now - this.lastSpokeAt < this.globalCooldown) return false;
    this.lastSpokeAt = now;

    // Ed strikes a new pose when he has something to say.
    if (this.photos.length > 1) this.setPhoto(this.pickFrom(this.photos));

    this.bubbleText.textContent = text;
    this.bubble.classList.remove('hidden');
    document.body.classList.add('ed-speaking');

    if (this.hideTimer) clearTimeout(this.hideTimer);
    const duration = Math.min(12_000, 5_000 + text.length * 40);
    this.hideTimer = setTimeout(() => this.hideBubble(), duration);
    return true;
  }

  hideBubble(): void {
    this.bubble.classList.add('hidden');
    document.body.classList.remove('ed-speaking');
    if (this.hideTimer) clearTimeout(this.hideTimer);
  }

  onKeystroke(data: string): void {
    this.resetIdleTimer();

    for (const ch of data) {
      if (ch === '\r') {
        const command = this.lineBuffer.trim();
        this.lineBuffer = '';
        if (command) this.onCommandEntered(command);
      } else if (ch === '\x7f' || ch === '\b') {
        this.lineBuffer = this.lineBuffer.slice(0, -1);
      } else if (ch === '\x03' || ch === '\x1b') {
        // Ctrl-C or the start of an escape sequence (arrows etc.) -
        // history recall makes the buffer unreliable, so drop it.
        this.lineBuffer = '';
      } else if (ch >= ' ' && this.lineBuffer.length < 500) {
        // Cap the tracked line so giant pastes can't balloon the buffer;
        // Ed only needs the front of the command to react anyway.
        this.lineBuffer += ch;
      }
    }
  }

  // React once the command's output has settled (a short pause after the
  // last chunk), rather than on a fixed timer - shells can be slow to even
  // echo the command, especially PowerShell right after startup.
  onOutput(data: string): void {
    if (!this.pendingCommand) return;
    this.outputWindow += data;
    if (this.outputWindow.length > 8000) {
      this.outputWindow = this.outputWindow.slice(-8000);
    }
    if (this.settleTimer) clearTimeout(this.settleTimer);
    this.settleTimer = setTimeout(() => this.reactToCommand(), this.outputSettleMs);
  }

  private onCommandEntered(command: string): void {
    this.pendingCommand = command;
    this.outputWindow = '';
    if (this.settleTimer) clearTimeout(this.settleTimer);
    if (this.maxWaitTimer) clearTimeout(this.maxWaitTimer);
    // Long-running command still producing output? React anyway at the cap.
    this.maxWaitTimer = setTimeout(() => this.reactToCommand(), this.outputMaxWaitMs);
  }

  private reactToCommand(): void {
    if (this.settleTimer) clearTimeout(this.settleTimer);
    if (this.maxWaitTimer) clearTimeout(this.maxWaitTimer);
    const command = this.pendingCommand;
    const output = this.outputWindow;
    this.pendingCommand = null;
    this.outputWindow = '';
    if (!command) return;

    const now = Date.now();
    if (now - this.lastReactionAt < this.reactionCooldown) return;

    const specific = this.quotes.commandSpecific.find((entry) =>
      entry.pattern.test(command)
    );

    // Easter eggs land even when the shell rejects the command
    // (typing "ed" errors in most shells, but Ed still answers).
    if (specific?.beforeFailure) {
      this.lastReactionAt = now;
      this.speak(this.pickFrom(specific.lines), { force: true });
      return;
    }

    const looksLikeFailure =
      /\b(error|exception|failed|failure|fatal|denied|not recognized|command not found|cannot find|no such file)\b/i.test(
        output
      );

    if (looksLikeFailure) {
      this.lastReactionAt = now;
      this.speak(this.pick('encouragement'), { force: true });
      return;
    }

    if (specific) {
      this.lastReactionAt = now;
      this.speak(this.pickFrom(specific.lines), { force: true });
      return;
    }

    if (/\bwarn(ing)?s?\b/i.test(output)) {
      this.lastReactionAt = now;
      this.speak(this.pick('warnings'), { force: true });
      return;
    }

    if (Math.random() < this.hypeChance) {
      if (this.speak(this.pick('hype'))) this.lastReactionAt = now;
    }
  }

  private scheduleIntervalRemark(): void {
    const delay =
      this.intervalMin + Math.random() * (this.intervalMax - this.intervalMin);
    setTimeout(() => {
      // NCBD dominates the rotation on Wednesdays, cameos the rest of the week.
      const ncbdChance = new Date().getDay() === 3 ? 0.45 : 0.15;
      const roll = Math.random();
      let line: string;
      if (roll < ncbdChance) line = this.pickNcbd();
      else if (roll < 0.5) line = this.pick('rpgFacts');
      else if (roll < 0.75) line = this.pick('comics');
      else line = this.pick('hype');
      this.speak(line);
      this.scheduleIntervalRemark();
    }, delay);
  }

  private resetIdleTimer(): void {
    this.idleFired = false;
    if (this.idleTimer) clearTimeout(this.idleTimer);
    this.idleTimer = setTimeout(() => {
      if (!this.idleFired) {
        this.idleFired = true;
        this.speak(this.pick('idleCheckins'));
      }
    }, this.idleThreshold);
  }
}
