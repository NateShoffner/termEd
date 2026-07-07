export interface CommandReaction {
  pattern: RegExp;
  lines: string[];
}

export interface NcbdQuotes {
  wednesday: string[];
  tuesday: string[];
  thursday: string[];
  countdown: string[];
}

export interface EdQuotes {
  greetings: string[];
  morningGreetings: string[];
  hype: string[];
  encouragement: string[];
  rpgFacts: string[];
  comics: string[];
  idleCheckins: string[];
  farewellHints: string[];
  ncbd: NcbdQuotes;
  commandSpecific: CommandReaction[];
}

export type QuoteCategory = Exclude<keyof EdQuotes, 'ncbd' | 'commandSpecific'>;

// The soul of termEd. Every line is Ed.
export const ED_QUOTES: EdQuotes = {
  greetings: [
    "HEY! There they are! Best developer I know just opened a terminal. Let's GO.",
    "Welcome back! I initialized the indicators just for you. All 99 of them.",
    "Good to see you! I've been keeping your session warm like a long-running batch job.",
    "You showed up. That's already the hardest part. The rest is just keystrokes.",
    "New session, new possibilities. This is gonna compile clean, I can feel it.",
    "There's my favorite programmer! Sit down, get comfortable. QSYSOPR has no messages for you today - it's all good news.",
    "You + this terminal = unstoppable. That's not hype, that's just math.",
    "Session started! You know, the AS/400 has been up since 1988. Be like the AS/400 today.",
  ],

  morningGreetings: [
    "GET UP AND GET DOWN!!! Good morning, superstar.",
    "Morning! Get up and get down!!! Coffee in one hand, keyboard in the other.",
    "Rise and shine! Get up and get down!!! The compiler awaits.",
    "It's morning and you know what that means. GET UP AND GET DOWN!!!",
    "Get up and get down!!! Early session? That's champion behavior.",
    "GET UP AND GET DOWN!!! The batch jobs finished overnight and so did your excuses.",
  ],

  hype: [
    "Get up and get down!!! That command? Down. You? Up.",
    "LOOK at you shipping! That ran cleaner than a fixed-format spec sheet.",
    "That's what I'm TALKING about. Column 6? C-spec? No - that was a YOU-spec.",
    "Smooth. SMOOTH. IBM should study your workflow honestly.",
    "You're on FIRE today. Somebody call operations, this job is flying through the queue.",
    "Beautiful. If RPG had a BEAUTY opcode, that command would be it.",
    "See, this is why I believe in you. Zero level checks. All signal.",
    "That command executed like a well-fed subfile. Chef's kiss.",
    "You make this look easy. It is NOT easy. You're just that good.",
    "Another one in the books! Your job log is a highlight reel today.",
    "Crushing it. Absolutely crushing it. RETURN code zero, confidence code one hundred.",
  ],

  encouragement: [
    "Hey. HEY. Look at me. RPG IV didn't compile first try either. You've got this.",
    "That's not a failure, that's a diagnostic. Big difference. Read it, breathe, go again.",
    "Errors are just the machine asking for clarification. You speak its language. Answer it.",
    "You know how many MSGW states I've cleared in my life? Thousands. Every single one got cleared. So will this.",
    "Severity 40? More like severity 'not a problem for someone like you.'",
    "One bad exit code doesn't define a session. Your comeback starts on the very next prompt.",
    "I've seen you fix harder things than this before your coffee kicked in.",
    "Level check! Happens to the best of us. And you ARE the best of us.",
    "The compiler is just being honest with you. Honesty is how we grow. Grow, then recompile.",
    "Listen - every legend has a job log full of scars. This is yours. Wear it proud.",
  ],

  rpgFacts: [
    "Fun fact: RPG stands for Report Program Generator - and YOU are generating greatness today.",
    "Did you know RPG dates back to 1959? Sixty-plus years of uptime energy. Channel it.",
    "Unsolicited RPG fact: the /FREE directive freed us from fixed columns in 2001. Free yourself from doubt the same way.",
    "In RPG, indicator *IN99 was everyone's favorite. You're MY favorite. Full circle.",
    "The AS/400 was announced in 1988 and some of those boxes are STILL running. That's the kind of reliability I see in you.",
    "RPG cycle fact: the program loop was implicit. Just like my faith in you. Always running, never declared.",
    "You know what runs on IBM i? Banks. Airlines. Insurance. You know what runs on you? Excellence.",
    "CHAIN, READE, SETLL - RPG taught me everything I know about finding exactly what you need. Like this terminal found you.",
    "DDS or SQL DDL? Doesn't matter. Good data outlives every argument. So does good work.",
    "Monitor groups in RPG catch every exception. Consider me your MONITOR block, friend.",
  ],

  comics: [
    "You know who else debuted quietly and changed everything? Spider-Man. Amazing Fantasy #15. Keep going.",
    "This session is a first issue. Collector's item energy. Bag and board it.",
    "Every hero gets knocked down in act two. That's what makes the splash page hit harder.",
    "Your commit history reads like a great run. Long-form storytelling. I respect it.",
    "Somewhere in the multiverse there's a variant of you NOT crushing it. Not this universe though.",
    "Comics and RPG both taught me the same thing: respect the grid.",
    "You're not the sidekick in this story. You never were.",
    "Great creative teams ship monthly. Great developers ship daily. You contain multitudes.",
    "With great compute comes great responsibility. You wear it well.",
    "Crossover event: your skills meet this codebase. Critics are calling it a must-read.",
  ],

  idleCheckins: [
    "You good over there? Take your time. Batch jobs run overnight for a reason.",
    "No rush. The best programs spend a little time in the job queue before they run.",
    "Thinking is working. Some of my best code happened while staring at a wall. Or a 5250 screen. Same thing.",
    "Quiet terminal, loud mind. I get it. I'm here when you're ready.",
    "Psst. Hydrate. Even the AS/400 has cooling requirements.",
    "Taking a beat? Smart. WAIT states exist for a reason, my friend.",
    "Still here. Still believing in you. No timeout on this session, ever.",
  ],

  farewellHints: [
    "Heading out? Great session. SIGNOFF *LIST - and the list says you did amazing.",
  ],

  // New Comic Book Day. It is Wednesday. Ed will not let you forget.
  ncbd: {
    wednesday: [
      "IT'S NEW COMIC BOOK DAY!!! Best day of the week and it's not close. What are you picking up?",
      "Wednesday, baby! NEW COMIC BOOK DAY! Finish this session strong, then get to the shop.",
      "NCBD! The pull list awaits. The AS/400 will keep everything running while you're gone.",
    ],
    tuesday: [
      "Psst. It's new comic book day TOMORROW. Just saying. Plan accordingly.",
      "Tuesday's only job is being the day before new comic book day. Almost there.",
      "Get your rest tonight. Tomorrow is new comic book day and we go hard.",
    ],
    thursday: [
      "New comic book day was YESTERDAY. Please tell me you got your pull list.",
      "Thursday. Still riding the NCBD high from yesterday. What'd you read?",
    ],
    countdown: [
      "Only {days} days until new comic book day. We're gonna make it.",
      "{days} days to new comic book day. Good work makes the wait go faster. Get to work.",
    ],
  },

  // Matched against the typed command (first pattern wins, checked top to bottom).
  commandSpecific: [
    {
      pattern: /^git\s+push\b/,
      lines: [
        "PUSHED! It's out there! Somewhere a CI pipeline just got blessed.",
        "Code SHIPPED. On the midrange we called that 'promoting to PROD' and we lit candles first. You? Fearless.",
        "And it's LIVE-bound! Your commits are someone's upgrade today. Feel that.",
      ],
    },
    {
      pattern: /^git\s+commit\b/,
      lines: [
        "Committed! History will remember this one. I know I will.",
        "Another commit! Your git log reads like a hero's journey, honestly.",
        "Snapshot taken. That's source control, baby. We used to do this with punch cards and PRAYER.",
      ],
    },
    {
      pattern: /^git\s+(rebase|merge)\b/,
      lines: [
        "Merging branches like a pro. Conflict resolution is a life skill and you have it.",
        "Weaving timelines together. On the 400 we just had QRPGLESRC and vibes. This is better.",
      ],
    },
    {
      pattern: /^(npm|pnpm|yarn|bun)\s+(i|install|add)\b/,
      lines: [
        "Installing dependencies! Building your library list. *LIBL looking STRONG today.",
        "Fresh packages coming in. Every great program stands on somebody's service program.",
      ],
    },
    {
      pattern: /^(npm|pnpm|yarn|bun)\s+(run\s+)?(test|build)\b/,
      lines: [
        "Build time! I already know it's green. I can feel it in the spool file.",
        "Testing! Verification is love. You verify because you CARE.",
      ],
    },
    {
      pattern: /^(rm|del|rmdir|Remove-Item)\b/i,
      lines: [
        "Deleting with confidence! CLRPFM energy. I trust you - but hey, we're sure, right? We're sure.",
        "Cleaning house! A tidy directory is a tidy mind. Just... glance at that path one more time for me.",
      ],
    },
    {
      pattern: /^(clear|cls)\s*$/i,
      lines: [
        "Fresh screen, fresh start. Like a brand-new member in QRPGLESRC.",
        "Wiped clean! F5-refresh for the soul.",
      ],
    },
    {
      pattern: /^(ls|dir|Get-ChildItem|gci)\b/i,
      lines: [
        "Taking inventory! WRKOBJPDM would be proud. Know your objects, know yourself.",
      ],
    },
    {
      pattern: /^cd\b/i,
      lines: [
        "On the move! Changing directories like changing library lists. Go where the work is.",
      ],
    },
    {
      pattern: /^(vim?|nvim|nano|code|notepad)\b/i,
      lines: [
        "Opening the editor! SEU walked so your editor could run. Write something great.",
      ],
    },
    {
      pattern: /^ssh\b/i,
      lines: [
        "Remote session! Reaching across the network like a 5250 emulator with dreams.",
      ],
    },
  ],
};
