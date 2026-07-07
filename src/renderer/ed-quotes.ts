export interface CommandReaction {
  pattern: RegExp;
  lines: string[];
  // Easter eggs react even when the shell errors on the command.
  beforeFailure?: boolean;
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
  warnings: string[];
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
    "Look who's here! The library list just got a whole lot stronger.",
    "Welcome back, legend. Your prompt missed you. I missed you. We all missed you.",
    "A new session! Somewhere a fresh spool file just got named after you.",
    "You opened a terminal, which means something great is about to happen. It always does.",
    "Door's open, coffee's hot, indicators are set. Let's write something worth committing.",
    "Ah, my favorite subprocedure returns! EXPORT(*ALL) energy today.",
    "Cracked a Red Bull the moment you signed on. This session's getting WINGS.",
    "You're here! One sec, lighting the celebratory cigarette. Okay. Let's work.",
  ],

  morningGreetings: [
    "GET UP AND GET DOWN!!! Good morning, superstar.",
    "Morning! Get up and get down!!! Coffee in one hand, keyboard in the other.",
    "Rise and shine! Get up and get down!!! The compiler awaits.",
    "It's morning and you know what that means. GET UP AND GET DOWN!!!",
    "Get up and get down!!! Early session? That's champion behavior.",
    "GET UP AND GET DOWN!!! The batch jobs finished overnight and so did your excuses.",
    "Good morning! Get up and get down!!! Today's job queue fears you.",
    "GET UP AND GET DOWN!!! First prompt of the day is the best prompt of the day.",
    "Morning, champion! Get up and get down!!! The AS/400 never slept and neither did my faith in you.",
    "Get up and get down!!! Sun's up, terminal's up, YOU'RE up. Trifecta.",
    "GET UP AND GET DOWN!!! Morning Red Bull's already open. Taurine and destiny, baby.",
    "Get up and get down!!! I've been up since five with a Red Bull and a dream.",
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
    "That's the stuff! Frame that output. Put it in the lobby.",
    "Executed flawlessly. The scheduler would be jealous of that timing.",
    "You typed that like you MEANT it. That's half the battle right there.",
    "Ooh, that was crisp. Like a brand-new source member with perfect indentation.",
    "The throughput! The precision! Operations is going to write a memo about you.",
    "You're stacking wins like activation groups. Keep going.",
    "Every keystroke a masterclass. I'd sign off on that PTF any day.",
    "That ran so clean I want to print the joblog and hang it up.",
    "Someone check the CPU, because you are COOKING today.",
    "THAT deserves a Red Bull toast. Clink. To you.",
    "Incredible. I literally stepped out for a smoke and you shipped a feature. Can't leave you alone for a second.",
    "That command hit like the first sip of a cold Red Bull. Immaculate.",
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
    "Red text builds character. You are EXTREMELY charactered by now and I respect it.",
    "That error already made you smarter. The machine just doesn't know it yet.",
    "Shake it off. Even the 400 takes an IPL sometimes.",
    "Wrong turn, right driver. Recalculate and punch it.",
    "You know what a stack trace is? A treasure map. X marks the fix.",
    "Deep breath. Read it bottom to top. You've solved worse on less sleep.",
    "Every hero's origin story has an act where the build fails. This is that act. Keep reading.",
    "If debugging is removing bugs, you're about to do your favorite thing: winning.",
    "Crack a Red Bull, read it again slower. Works every time. The Red Bull is load-bearing.",
    "You know what I do when a build fails? Smoke break, think break, fix break. You're one break from done.",
  ],

  warnings: [
    "Warnings, huh? A warning is just an error with manners. You're fine.",
    "Yellow text! The machine is nervous but proceeding. Very relatable.",
    "Warnings are the compiler's way of saying 'I trust you.' It trusts you. I trust you.",
    "Ran with warnings. Like a marathon with a pebble in your shoe. Still counts. Still a marathon.",
    "The job completed and left a note. Read it later, celebrate now.",
    "Warnings? On the 400 we called those 'informational messages' and we LIKED them.",
    "A little yellow never stopped a shipment. Noted, logged, moving on.",
    "That's not a red flag, that's a yellow ribbon. Participation award for the compiler.",
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
    "RPG fact: MOVEL moves left-adjusted. You? Always well-adjusted.",
    "The 5250 terminal had function keys F1 through F24. Twenty-four ways to say 'I got this.'",
    "On the midrange we measured storage in single-level store. One big address space. One big heart. That's you.",
    "QTEMP is a library that exists just for your job, then vanishes. Cherish the temporary. Ship the permanent.",
    "SEU line commands: I for insert, C for copy, D for delete. No key for doubt. Never was.",
    "An RPG program can run unchanged for 30 years. Write like the future is watching, because on IBM i it literally is.",
    "Subfiles paginate. Legends don't. Page 1 of 1: you.",
    "The compile listing tells you everything if you read it slow. Same with people. Ed wisdom, no charge.",
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
    "Kirby drew four pages a day. You're typing at Kirby pace right now.",
    "This terminal is your Fortress of Solitude, except I'm here, so it's a team-up book.",
    "Continuity error? Retcon it. That's what commits are: canon management.",
    "The gutter between panels is where the magic happens. Same with the pause between commands. Take your time.",
    "Some arcs are twelve issues. Some are one-shots. Both matter. So does today's work.",
    "You've got main character energy and a supporting cast of one very enthusiastic RPG programmer.",
    "Even Batman has a utility belt. Yours just happens to be a PATH variable.",
    "Issue #1s get the hype, but the legendary runs are built issue by issue. Commit by commit.",
  ],

  idleCheckins: [
    "You good over there? Take your time. Batch jobs run overnight for a reason.",
    "No rush. The best programs spend a little time in the job queue before they run.",
    "Thinking is working. Some of my best code happened while staring at a wall. Or a 5250 screen. Same thing.",
    "Quiet terminal, loud mind. I get it. I'm here when you're ready.",
    "Psst. Hydrate. Even the AS/400 has cooling requirements.",
    "Taking a beat? Smart. WAIT states exist for a reason, my friend.",
    "Still here. Still believing in you. No timeout on this session, ever.",
    "Stretch break? Highly recommend. Your spine is the real legacy system.",
    "The cursor's blinking but there's no pressure behind it. Blink back when you're ready.",
    "Reading something? Learning counts as shipping. Slow-release shipping.",
    "I'll keep the session warm. You keep being you.",
    "You've been quiet. If you're stuck, remember: SETLL, then READE. Position yourself, then move.",
    "Smoke break? Fair. I'll hold the prompt exactly where you left it.",
    "If you're up getting a Red Bull, grab two. One's for the code.",
    "Quiet, huh? I'm on my third Red Bull just watching. No pressure. Ever.",
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
      "New comic book day AND a productive terminal session? Greatest Wednesday in recorded history.",
      "It's Wednesday. The shop has your pulls. The terminal has your back. Perfect balance.",
      "NCBD, my friend! Ship code by five, read comics by seven. That's the good life.",
    ],
    tuesday: [
      "Psst. It's new comic book day TOMORROW. Just saying. Plan accordingly.",
      "Tuesday's only job is being the day before new comic book day. Almost there.",
      "Get your rest tonight. Tomorrow is new comic book day and we go hard.",
      "T-minus one day to NCBD. Check your pull list. Check it twice.",
      "Tomorrow the new books drop. Today we drop commits. Symmetry.",
    ],
    thursday: [
      "New comic book day was YESTERDAY. Please tell me you got your pull list.",
      "Thursday. Still riding the NCBD high from yesterday. What'd you read?",
      "Day after NCBD. If you haven't read them yet, that's called savoring and I respect it.",
      "Thursday check-in: comics acquired? Good. Now let's make something worth a variant cover.",
    ],
    countdown: [
      "Only {days} days until new comic book day. We're gonna make it.",
      "{days} days to new comic book day. Good work makes the wait go faster. Get to work.",
      "{days} days out from NCBD. Plenty of time to earn a guilt-free stack.",
      "NCBD minus {days}. The pull list grows. So do you.",
    ],
  },

  // Matched against the typed command. First match wins, so keep specific
  // patterns above general ones (push --force before push, rm -rf before rm).
  commandSpecific: [
    {
      pattern: /^ed\s*$/i,
      beforeFailure: true,
      lines: [
        "You rang? I never left. I will NEVER leave.",
        "That's me! Also a line editor from 1969, but mostly me.",
        "Summoned! Fun fact: ed is the standard text editor. I am the standard hype man.",
      ],
    },
    {
      pattern: /^termed\b/i,
      beforeFailure: true,
      lines: [
        "You're already IN termEd, my friend. Recursion! I love it.",
        "termEd inside termEd? That's a crossover event.",
      ],
    },
    {
      pattern: /^(redbull|red\s?bull)\b/i,
      beforeFailure: true,
      lines: [
        "NOW you're speaking my language. Taurine is a dependency, not a devDependency.",
        "Red Bull mentioned!!! It gives you wings. I give you hype. Together: flight.",
        "The official beverage of this terminal. Crack one for me.",
      ],
    },
    {
      pattern: /^(rpg|as400|as\/400|ibmi|ibm i)\b/i,
      beforeFailure: true,
      lines: [
        "NOW we're talking! Pull up a chair, let me tell you about the RPG cycle.",
        "You said the magic words. Report Program Generator. Poetry.",
        "AS/400 mentioned!!! This terminal just became sacred ground.",
      ],
    },
    {
      pattern: /^git\s+push\s+.*(-f\b|--force)/,
      lines: [
        "Force push! Bold. Decisive. Slightly terrifying. I trust you completely.",
        "Rewriting published history? That's a retcon. Marvel does it all the time. Proceed.",
      ],
    },
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
        "Two histories become one. That's not version control, that's storytelling.",
      ],
    },
    {
      pattern: /^git\s+(pull|fetch)\b/,
      lines: [
        "Syncing up! Fresh commits inbound. Like new issues hitting the stands.",
        "Pulling the latest. Stay current, stay dangerous.",
      ],
    },
    {
      pattern: /^git\s+status\b/,
      lines: [
        "Checking the state of things. Situational awareness! WRKACTJOB would be proud.",
        "git status: the developer's mirror. Looking good, by the way.",
      ],
    },
    {
      pattern: /^git\s+clone\b/,
      lines: [
        "A new repo enters your library list! Welcome it warmly.",
        "Cloning! Somewhere, someone's work is about to meet its biggest fan.",
      ],
    },
    {
      pattern: /^git\s+(checkout|switch)\b/,
      lines: [
        "Switching timelines. Multiverse management, basically.",
        "New branch, new possibilities. Same excellent developer.",
      ],
    },
    {
      pattern: /^git\s+stash\b/,
      lines: [
        "Stashed! Like slipping a comic into a bag and board for later. It'll keep.",
        "Work saved for later. QTEMP energy: temporary, but safe.",
      ],
    },
    {
      pattern: /^git\s+blame\b/,
      lines: [
        "git blame? On the 400 we just checked who held the object lock and sighed. Be gentle.",
        "Finding out WHO is less important than finding out WHY. But yes, look. I'm curious too.",
      ],
    },
    {
      pattern: /^git\s+reset\s+.*--hard/,
      lines: [
        "Hard reset! Clean slate. Bold move. The work wasn't wasted, it was practice.",
        "Rolling it all back. Even the best runs get a new #1 issue sometimes.",
      ],
    },
    {
      pattern: /^git\s+(log|diff)\b/,
      lines: [
        "Reading the history! Every diff is a panel in the story.",
        "Reviewing the record. Compile listings taught me this: the answers are always in there.",
      ],
    },
    {
      pattern: /^git\s+init\b/,
      lines: [
        "A repository is BORN! Issue #1. Origin story. I'm emotional.",
        "git init! Fresh library, no members yet, infinite potential.",
      ],
    },
    {
      pattern: /^(npm|pnpm|yarn|bun)\s+publish\b/,
      lines: [
        "PUBLISHING?! To the whole registry?! That's syndication, baby! National distribution!",
        "Your code is going out to everyone. Somewhere a stranger's build is about to get better.",
      ],
    },
    {
      pattern: /^(npm|pnpm|yarn|bun)\s+audit\b/,
      lines: [
        "Security audit! Responsible AND talented. The full package.",
        "Checking the supply chain. On the 400 we audited with WRKOBJAUT. Same instinct, better output.",
      ],
    },
    {
      pattern: /^(npm|pnpm|yarn|bun)\s+(i|install|add)\b/,
      lines: [
        "Installing dependencies! Building your library list. *LIBL looking STRONG today.",
        "Fresh packages coming in. Every great program stands on somebody's service program.",
        "node_modules grows again. It's not bloat, it's a supporting cast.",
      ],
    },
    {
      pattern: /^(npm|pnpm|yarn|bun)\s+(run\s+)?(test|build)\b/,
      lines: [
        "Build time! I already know it's green. I can feel it in the spool file.",
        "Testing! Verification is love. You verify because you CARE.",
        "Running the suite. Every green check is a little standing ovation.",
      ],
    },
    {
      pattern: /^(npm|pnpm|yarn|bun)\s+(run\s+)?(dev|start|serve)\b/,
      lines: [
        "Dev server spinning up! The stage is set. Go make something beautiful.",
        "Starting it up! Like an IPL but fast and nobody's nervous.",
      ],
    },
    {
      pattern: /^docker\s+compose\s+up\b/,
      lines: [
        "The whole stack, rising as one! Like a splash page of containers.",
        "docker compose up! An orchestra, and you're conducting.",
      ],
    },
    {
      pattern: /^(docker|podman)\b/,
      lines: [
        "Containers! Little subsystems with delusions of independence. I love them.",
        "Docker work! LPARs walked so containers could run.",
      ],
    },
    {
      pattern: /^kubectl\b/,
      lines: [
        "Kubernetes! You're managing a fleet. Work management on the 400 prepared me for this moment.",
        "kubectl! Somewhere a pod just felt seen.",
      ],
    },
    {
      pattern: /^(python|python3|py|node|deno|ruby|perl)\b/,
      lines: [
        "Firing up the interpreter! REPL time. Think out loud, the machine's listening.",
        "Script mode! Quick, nimble, dangerous. My kind of session.",
      ],
    },
    {
      pattern: /^(cargo|go)\s+(run|build|test)\b|^dotnet\s+(run|build|test)\b/,
      lines: [
        "Compiled languages! Now THIS takes me back. Strong types, strong hearts.",
        "Building native! The compiler and you, working it out together. Beautiful partnership.",
      ],
    },
    {
      pattern: /^(make|cmake|gcc|g\+\+|clang)\b/,
      lines: [
        "Classic build tools! Respect the elders. They shipped the world.",
        "make! The original batch job. Some things never need replacing.",
      ],
    },
    {
      pattern: /^rm\s+(-[rf]+|--recursive|--force)/i,
      lines: [
        "rm -rf?! Deep breath. Look at that path. REALLY look at it. ...Okay. I believe in you.",
        "The big delete! CLRLIB energy. Measure twice, recurse once.",
      ],
    },
    {
      pattern: /^(rm|del|rmdir|Remove-Item|ri)\b/i,
      lines: [
        "Deleting with confidence! CLRPFM energy. I trust you - but hey, we're sure, right? We're sure.",
        "Cleaning house! A tidy directory is a tidy mind. Just... glance at that path one more time for me.",
      ],
    },
    {
      pattern: /^(mkdir|md|New-Item)\b/i,
      lines: [
        "New directory! Fresh library, zero members, infinite potential.",
        "Making space for something new. That's how every great project starts.",
      ],
    },
    {
      pattern: /^(cp|copy|Copy-Item|mv|move|Move-Item)\b/i,
      lines: [
        "Moving objects between libraries! CRTDUPOBJ would be proud.",
        "Files on the move. Logistics! The unsung hero of every operation.",
      ],
    },
    {
      pattern: /^(cat|type|Get-Content|gc)\b/i,
      lines: [
        "Reading the source! DSPPFM vibes. Know your data.",
        "Taking a look inside. Good instinct. The file always knows.",
      ],
    },
    {
      pattern: /^(grep|rg|findstr|Select-String|sls)\b/i,
      lines: [
        "Searching! SETLL on the haystack, READE for the needle. You'll find it.",
        "Pattern matching! The second-greatest skill after believing in yourself.",
      ],
    },
    {
      pattern: /^(curl|wget|Invoke-WebRequest|iwr|Invoke-RestMethod|irm)\b/i,
      lines: [
        "Reaching out across the network! May your status codes all start with 2.",
        "API call! Somewhere a server just got a very polite request from a very great developer.",
      ],
    },
    {
      pattern: /^(ping|tracert|traceroute|nslookup|Test-Connection)\b/i,
      lines: [
        "Network diagnostics! Is it DNS? It's always DNS. But check anyway.",
        "Pinging! Even packets deserve a little encouragement on their journey.",
      ],
    },
    {
      pattern: /^ssh\b/i,
      lines: [
        "Remote session! Reaching across the network like a 5250 emulator with dreams.",
        "SSH! Somewhere a distant machine is about to have a very good day.",
      ],
    },
    {
      pattern: /^(kill|taskkill|Stop-Process|spps)\b/i,
      lines: [
        "Ending a job! ENDJOB *IMMED. Decisive. Clean. Necessary.",
        "Process terminated. It's not personal, it's work management.",
      ],
    },
    {
      pattern: /^(shutdown|restart|reboot|Restart-Computer)\b/i,
      lines: [
        "A restart! The oldest magic. PWRDWNSYS and pray, we used to say. You've got this.",
        "Turning it off and on again. Twenty years of IT wisdom in one command.",
      ],
    },
    {
      pattern: /^(winget|choco|scoop|apt|apt-get|dnf|pacman|brew)\b/i,
      lines: [
        "Package manager! Restoring from save file, essentially. Smart.",
        "Installing software the civilized way. LODRUN walked so this could fly.",
      ],
    },
    {
      pattern: /^wsl\b/i,
      lines: [
        "Linux inside Windows! Two operating systems, one legend at the keyboard.",
        "WSL! Subsystems, man. The 400 had them first, but I'm not keeping score. (It's 400 to 1.)",
      ],
    },
    {
      pattern: /^(whoami|id)\b/i,
      lines: [
        "You want to know who you are? I'll tell you who you are. THE BEST.",
        "whoami: a champion. The command line just confirms it.",
      ],
    },
    {
      pattern: /^(history|Get-History|h)\s*$/i,
      lines: [
        "Reviewing your own history! Every line a panel, every session an issue.",
        "The scrollback of champions. Look at that body of work.",
      ],
    },
    {
      pattern: /^sudo\b/i,
      lines: [
        "SUDO! All objects authority! With great *ALLOBJ comes great responsibility.",
        "Elevated privileges. The system trusts you. Smart system.",
      ],
    },
    {
      pattern: /^(clear|cls)\s*$/i,
      beforeFailure: true,
      lines: [
        "Fresh screen, fresh start. Like a brand-new member in QRPGLESRC.",
        "Wiped clean! F5-refresh for the soul.",
      ],
    },
    {
      pattern: /^(ls|dir|Get-ChildItem|gci)\b/i,
      lines: [
        "Taking inventory! WRKOBJPDM would be proud. Know your objects, know yourself.",
        "Surveying the directory. A good leader knows the terrain.",
      ],
    },
    {
      pattern: /^cd\b/i,
      lines: [
        "On the move! Changing directories like changing library lists. Go where the work is.",
        "New working directory, same working legend.",
      ],
    },
    {
      pattern: /^(vim?|nvim|nano|emacs|code|notepad)\b/i,
      lines: [
        "Opening the editor! SEU walked so your editor could run. Write something great.",
        "Editor time! Every masterpiece starts with an empty buffer and a full heart.",
      ],
    },
    {
      pattern: /^(top|htop|btop|Get-Process|ps|gps)\b/i,
      lines: [
        "Checking the active jobs! WRKACTJOB, my beloved. Watch those CPU cycles dance.",
        "Process watching. Somewhere in that list, greatness is running. (It's your session.)",
      ],
    },
    {
      pattern: /^(date|time|Get-Date)\b/i,
      lines: [
        "Checking the clock! Time flies when you're crushing it. Which is always.",
        "The time is now. It's always now. Deep? I know.",
      ],
    },
    {
      pattern: /^(man|help|Get-Help|tldr)\b/i,
      lines: [
        "Reading the docs! The strongest move in the game. Nobody talks about this enough.",
        "Consulting the manual. On the 400 we had F1 on everything. Wisdom-seeking is a superpower.",
      ],
    },
    {
      pattern: /^echo\b/i,
      lines: [
        "echo! The terminal repeats after you, as it should.",
      ],
    },
  ],
};
