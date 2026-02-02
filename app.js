// Head Start Lesson Plan Generator (offline-first PWA)
// Data sources: ./data/tewa_words.json, ./data/tewa_phrases.json, ./data/english_vocab.json

const STORAGE_KEY = "lpgen:plans:v1";
const VOCAB_KEY = "lpgen:vocabHistory:v1";

const CENTERS = [
  "Blocks",
  "Art",
  "Math Center",
  "Dramatic Play",
  "Class Library",
  "Science/Sensory",
  "Manipulative",
  "Writing",
  "Other"
];

const BOOK_BANK = [
  "Brown Bear, Brown Bear, What Do You See?",
  "The Very Hungry Caterpillar",
  "Chicka Chicka Boom Boom",
  "Where the Wild Things Are",
  "The Snowy Day",
  "The Mitten",
  "We Are Water Protectors",
  "The Day You Begin",
  "The Gruffalo",
  "The Little Red Hen",
  "Caps for Sale",
  "Goodnight Moon",
  "Corduroy",
  "A Bad Case of Stripes",
  "The Dot",
  "Mouse Paint",
  "Planting a Rainbow",
  "From Seed to Plant",
  "Bear Snores On",
  "Pete the Cat: I Love My White Shoes",
  "Swimmy",
  "The Rainbow Fish",
  "The Storm Book",
  "Cloudy With a Chance of Meatballs"
];

function $(id){ return document.getElementById(id); }

function nowISO(){ return new Date().toISOString(); }
function uid(){ return (crypto?.randomUUID?.() || ("id_" + Math.random().toString(16).slice(2))); }

function loadPlans(){
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); }
  catch { return []; }
}
function savePlans(plans){ localStorage.setItem(STORAGE_KEY, JSON.stringify(plans)); }

function loadVocabHistory(){
  try {
    return JSON.parse(localStorage.getItem(VOCAB_KEY) || JSON.stringify({
      usedTewaWords: [],
      usedTewaPhrases: [],
      usedEnglishWords: []
    }));
  } catch {
    return { usedTewaWords: [], usedTewaPhrases: [], usedEnglishWords: [] };
  }
}
function saveVocabHistory(hist){ localStorage.setItem(VOCAB_KEY, JSON.stringify(hist)); }

function normalizeTopic(s){
  return (s || "").toLowerCase().trim().replace(/[^a-z0-9\s]/g,"").replace(/\s+/g," ");
}
function isDuplicateTopic(topic, plans, mode){
  const t = normalizeTopic(topic);
  return plans.some(p => normalizeTopic(p.plan.meta.topic) === t && p.plan.mode === mode);
}

function shuffle(arr){
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--){
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function keywordMatchPool(topic, items, key){
  const t = normalizeTopic(topic);
  if (!t) return [];
  const tokens = t.split(" ").filter(Boolean);
  const matched = items.filter(it => {
    const text = (it[key] || "").toLowerCase();
    return tokens.some(tok => text.includes(tok));
  });
  return matched;
}

function pickNonUsed({pool, usedSet, count, fallbackPool}){
  const fresh = pool.filter(it => !usedSet.has(it));
  const chosen = [];
  for (const item of shuffle(fresh)){
    chosen.push(item);
    if (chosen.length === count) break;
  }
  if (chosen.length < count){
    // fallback: allow repeats but still avoid immediate duplicates if possible
    const fb = (fallbackPool || pool).filter(it => !chosen.includes(it));
    for (const item of shuffle(fb)){
      chosen.push(item);
      if (chosen.length === count) break;
    }
  }
  return chosen.slice(0, count);
}

function weekdayDates(weekOfISO){
  // weekOf is expected Monday; return Mon..Fri ISO strings
  const base = new Date(weekOfISO + "T12:00:00");
  const days = ["Monday","Tuesday","Wednesday","Thursday","Friday"];
  return days.map((name, idx) => {
    const d = new Date(base);
    d.setDate(base.getDate() + idx);
    const iso = d.toISOString().slice(0,10);
    return { dayName: name, date: iso };
  });
}

function autoPickBooks(topic){
  // light keyword-based picks; otherwise random from BOOK_BANK
  const t = normalizeTopic(topic);
  const picks = [];
  const themed = [];
  if (t.includes("rain") || t.includes("cloud") || t.includes("weather") || t.includes("storm")){
    themed.push("The Storm Book","Cloudy With a Chance of Meatballs");
  }
  if (t.includes("seed") || t.includes("plant") || t.includes("garden") || t.includes("corn")){
    themed.push("From Seed to Plant","Planting a Rainbow");
  }
  if (t.includes("color") || t.includes("art") || t.includes("paint")){
    themed.push("Mouse Paint","The Dot");
  }
  if (t.includes("animal") || t.includes("bear") || t.includes("turtle")){
    themed.push("Brown Bear, Brown Bear, What Do You See?","Bear Snores On");
  }
  const pool = shuffle([...new Set([...themed, ...BOOK_BANK])]);
  while (picks.length < 5){
    picks.push(pool[(picks.length) % pool.length]);
  }
  return picks;
}

function makeICanStatements(topic){
  const T = topic?.trim() || "our topic";
  return [
    `I can talk about ${T} using new words.`,
    `I can ask and answer questions about ${T}.`,
    `I can notice details and describe what I see about ${T}.`,
    `I can count, sort, or compare items related to ${T}.`,
    `I can work with friends and show respect during ${T} activities.`
  ];
}

function makeFocus(topic){
  const T = topic?.trim() || "the theme";
  return {
    bigIdea: `${T} helps us learn through stories, hands-on exploration, and community connection.`,
    objectives: [
      `Language & Literacy: Use new words and answer questions about ${T}.`,
      `Math/Thinking: Count, sort, and compare objects connected to ${T}.`,
      `SEL/Approaches: Cooperate, take turns, and stay engaged during ${T} activities.`
    ],
    teachingStrategies: [
      "Model and think-aloud while demonstrating tasks.",
      "Ask open-ended questions and follow children’s ideas.",
      "Use visuals, gestures, and repetition; scaffold for different learners.",
      "Embed movement, songs, and hands-on materials."
    ]
  };
}

function centerTemplate(centerName, topic, vocab){
  const T = topic?.trim() || "the theme";
  const tewaWords = vocab.tewaWords.map(v => `${v.tewa} (${v.english})`).join(", ");
  const engWords = vocab.englishWords.map(v => v.word).join(", ");

  const base = {
    name: centerName,
    objectiveIndicator: "",
    itemsSetup: "",
    teacherSupport: "",
    books: "",
    vocabularyWords: `${engWords}; ${tewaWords}`
  };

  switch(centerName){
    case "Blocks":
      return {
        ...base,
        objectiveIndicator: `Build structures related to ${T}; use spatial words (above, next to) and count blocks.`,
        itemsSetup: `Blocks, people/animal figures, small natural items (rocks, sticks), photos of ${T}.`,
        teacherSupport: `Invite children to plan: “What will you build?” Encourage counting, measuring, and teamwork.`,
        books: `Nonfiction and picture books about ${T}.`
      };
    case "Art":
      return {
        ...base,
        objectiveIndicator: `Create art showing ${T} using shapes, colors, and textures.`,
        itemsSetup: `Paper, crayons/markers, paint, collage materials; optional natural materials connected to ${T}.`,
        teacherSupport: `Name tools and steps. Ask: “Tell me about your picture.” Add labels using new vocab.`,
        books: `Art books or stories connected to ${T}.`
      };
    case "Math Center":
      return {
        ...base,
        objectiveIndicator: `Count, sort, and make patterns with items related to ${T}.`,
        itemsSetup: `Counters, sorting trays, number cards, shape blocks; themed items or pictures for ${T}.`,
        teacherSupport: `Prompt comparisons: more/less, same/different. Encourage pattern talk and number words.`,
        books: `Counting/pattern books tied to ${T}.`
      };
    case "Dramatic Play":
      return {
        ...base,
        objectiveIndicator: `Use pretend play to act out ${T} scenarios; practice conversation and roles.`,
        itemsSetup: `Props/costumes for a ${T} setting (e.g., market, weather station, community helpers).`,
        teacherSupport: `Model respectful language. Add simple scripts and labels; encourage turn-taking.`,
        books: `Stories that match the pretend-play theme.`
      };
    case "Class Library":
      return {
        ...base,
        objectiveIndicator: `Enjoy books about ${T}; retell using pictures and new vocabulary.`,
        itemsSetup: `A basket of books about ${T}, puppets, story props, picture cards.`,
        teacherSupport: `Sit with children and ask open-ended questions; encourage pointing and retelling.`,
        books: `Daily read-aloud and related titles.`
      };
    case "Science/Sensory":
      return {
        ...base,
        objectiveIndicator: `Explore ${T} with senses; observe, predict, and describe changes.`,
        itemsSetup: `Sensory bin or experiment materials related to ${T}; tools (cups, scoops, magnifiers).`,
        teacherSupport: `Use “I wonder…” questions. Encourage children to explain what they notice and why.`,
        books: `Simple nonfiction about how ${T} works.`
      };
    case "Manipulative":
      return {
        ...base,
        objectiveIndicator: `Build fine-motor skills with puzzles, matching, and building related to ${T}.`,
        itemsSetup: `Puzzles, lacing cards, matching games; themed picture cards for ${T}.`,
        teacherSupport: `Offer just-right help; celebrate effort; encourage children to try new ways.`,
        books: `Short picture books or matching cards with ${T} images.`
      };
    case "Writing":
      return {
        ...base,
        objectiveIndicator: `Draw/write about ${T}; practice name writing and labeling pictures.`,
        itemsSetup: `Paper, pencils, name cards, letter stamps; themed word/picture cards.`,
        teacherSupport: `Encourage scribble writing and dictation; help label using English + Tewa words.`,
        books: `Alphabet and picture dictionaries connected to ${T}.`
      };
    default:
      return {
        ...base,
        objectiveIndicator: `Connect ${T} to music, movement, games, or culture-based activities.`,
        itemsSetup: `Open materials: instruments, scarves, cultural items/photos (as appropriate).`,
        teacherSupport: `Invite children to lead; reinforce safety and respectful handling; use new vocabulary.`,
        books: `Songs/stories connected to ${T}.`
      };
  }
}

function makeReadAloud(bookTitle, topic, vocab){
  const T = topic?.trim() || "the theme";
  const tewaWord = vocab.tewaWords[0];
  const tewaPhrase = vocab.tewaPhrases[0];

  // Ensure at least 2 questions include Tewa vocab
  const beforeQuestions = [
    `Look at the cover of "${bookTitle}". What do you think the story will be about?`,
    `Have you seen ${T} before? Can you tell us what you notice? (Use: ${tewaWord.tewa} = ${tewaWord.english})`
  ];
  const duringQuestions = [
    `What is happening right now in the story? What clues do you see in the pictures?`,
    `What do you think will happen next? Why?`
  ];
  const afterQuestions = [
    `How did the character feel? What helped them?`,
    `Can we say "${tewaPhrase.tewa}" (${tewaPhrase.english}) like the character or like we do in class? When would we use it?`
  ];

  return {
    bookTitle,
    author: "",
    vocabToUseInQuestions: [
      `${tewaWord.tewa} (${tewaWord.english})`,
      `${tewaPhrase.tewa} (${tewaPhrase.english})`
    ],
    beforeQuestions,
    duringQuestions,
    afterQuestions,
    extensionActivity: `Draw your favorite part of "${bookTitle}" and label your picture with 1 English word + 1 Tewa word.`
  };
}

async function loadData(){
  const [tewaWords, tewaPhrases, englishVocab] = await Promise.all([
    fetch("./data/tewa_words.json").then(r => r.json()),
    fetch("./data/tewa_phrases.json").then(r => r.json()),
    fetch("./data/english_vocab.json").then(r => r.json())
  ]);
  return { tewaWords, tewaPhrases, englishVocab };
}

function pickVocab(topic, data, history){
  const usedWords = new Set(history.usedTewaWords);
  const usedPhrases = new Set(history.usedTewaPhrases);
  const usedEnglish = new Set(history.usedEnglishWords);

  // Prefer topic-related items when possible
  const tewaWordPool = keywordMatchPool(topic, data.tewaWords, "english");
  const tewaPhrasePool = keywordMatchPool(topic, data.tewaPhrases, "english");

  const pickedWords = pickNonUsed({
    pool: tewaWordPool.length ? tewaWordPool.map(x => JSON.stringify(x)) : data.tewaWords.map(x => JSON.stringify(x)),
    usedSet: usedWords,
    count: 3
  }).map(s => JSON.parse(s));

  const pickedPhrases = pickNonUsed({
    pool: tewaPhrasePool.length ? tewaPhrasePool.map(x => JSON.stringify(x)) : data.tewaPhrases.map(x => JSON.stringify(x)),
    usedSet: usedPhrases,
    count: 2
  }).map(s => JSON.parse(s));

  const englishPool = keywordMatchPool(topic, data.englishVocab, "word");
  const pickedEnglish = pickNonUsed({
    pool: (englishPool.length ? englishPool : data.englishVocab).map(x => JSON.stringify(x)),
    usedSet: usedEnglish,
    count: 5
  }).map(s => JSON.parse(s));

  return {
    tewaWords: pickedWords,
    tewaPhrases: pickedPhrases,
    englishWords: pickedEnglish
  };
}

function updateHistory(history, vocab){
  history.usedTewaWords.push(...vocab.tewaWords.map(v => JSON.stringify(v)));
  history.usedTewaPhrases.push(...vocab.tewaPhrases.map(v => JSON.stringify(v)));
  history.usedEnglishWords.push(...vocab.englishWords.map(v => JSON.stringify(v)));

  // keep sets from growing forever
  history.usedTewaWords = history.usedTewaWords.slice(-2000);
  history.usedTewaPhrases = history.usedTewaPhrases.slice(-2000);
  history.usedEnglishWords = history.usedEnglishWords.slice(-2000);
  return history;
}

function buildDayPlan({dateISO, topic, classroom, ageGroup, data, history, bookTitle}){
  const vocab = pickVocab(topic, data, history);
  const focus = makeFocus(topic);
  const iCanStatements = makeICanStatements(topic);

  const readAloud = makeReadAloud(bookTitle || autoPickBooks(topic)[0], topic, vocab);

  const centers = CENTERS.map(c => centerTemplate(c, topic, vocab));

  const plan = {
    mode: "day",
    meta: {
      date: dateISO,
      topic,
      theme: topic,
      classroom,
      ageGroup
    },
    focus,
    iCanStatements,
    vocabulary: vocab,
    readAloud,
    centers,
    smallGroup: [
      `Small group: Sort and count items related to ${topic}; practice new vocabulary.`,
      `Small group: Fine-motor activity (cut/glue/trace) connected to ${topic}.`
    ],
    largeGroup: [
      `Morning circle: Introduce ${topic} with pictures and a short discussion.`,
      `Music/movement: Song + movement connected to ${topic}.`
    ],
    familyEngagement: [
      `Send home 2–3 vocabulary words (English + Tewa) and a simple “talk prompt” about ${topic}.`
    ],
    assessmentNotes: [
      "Observe: Who used new words? Who engaged in centers? Note participation and any supports needed."
    ]
  };

  // update vocab history
  updateHistory(history, vocab);

  return plan;
}

function buildWeekPlan({weekOfISO, topic, classroom, ageGroup, data, history, booksByDay}){
  const vocab = pickVocab(topic, data, history);
  const weekFocus = makeFocus(topic);
  const weekIcanStatements = makeICanStatements(topic);

  // books: either user-provided or auto-picked
  const autoBooks = autoPickBooks(topic);
  const daysInfo = weekdayDates(weekOfISO);

  const readAlouds = daysInfo.map((d, idx) => {
    const title = (booksByDay?.[idx] || "").trim() || autoBooks[idx];
    return { dayName: d.dayName, ...makeReadAloud(title, topic, vocab) };
  });

  // day progression
  const progression = [
    "Introduce and explore",
    "Practice and describe",
    "Sort, count, and compare",
    "Apply through pretend play and art",
    "Review and celebrate learning"
  ];

  const days = daysInfo.map((d, idx) => {
    const dailyFocus = `${progression[idx]}: ${topic}`;
    const centers = CENTERS.map(c => {
      const base = centerTemplate(c, topic, vocab);
      // slight variation for progression
      if (idx === 2 && c === "Math Center"){
        return { ...base, teacherSupport: base.teacherSupport + " Add a simple graph: “Which item did we see most?”" };
      }
      if (idx === 4 && c === "Art"){
        return { ...base, itemsSetup: base.itemsSetup + " Create a class mural to celebrate the week." };
      }
      return base;
    });

    return {
      dayName: d.dayName,
      date: d.date,
      dailyFocus,
      dailyPlanNotes: `Use today’s read-aloud: "${readAlouds[idx].bookTitle}". Revisit vocabulary throughout centers and transitions.`,
      readAloud: readAlouds[idx],
      centers,
      smallGroup: [
        `Small group: Practice vocabulary with picture cards; children point, name, and explain.`,
        `Small group: “Show me…” game using new English + Tewa words.`
      ],
      largeGroup: [
        "Morning circle: Greeting, calendar, topic talk, and a quick movement break.",
        "Closing circle: Share work and reflect using sentence starters."
      ]
    };
  });

  const plan = {
    mode: "week",
    meta: {
      weekOf: weekOfISO,
      topic,
      theme: topic,
      classroom,
      ageGroup
    },
    weekFocus,
    weekIcanStatements,
    weekVocabulary: vocab,
    readAlouds,
    days,
    familyEngagement: [
      `Family connection: Ask families to share a photo/story connected to ${topic}.`,
      "Send home: 2 Tewa phrases for routines + 3 Tewa words for the week."
    ],
    assessmentNotes: [
      "Track: vocabulary use, engagement, fine-motor growth, and peer cooperation.",
      "Note: any supports needed (visuals, repetition, peer buddy, extra time)."
    ]
  };

  // update vocab history once for the whole week selection
  updateHistory(history, vocab);

  return plan;
}

function planToHTML(plan){
  const isWeek = plan.mode === "week";
  const meta = plan.meta;

  const tewaWords = (isWeek ? plan.weekVocabulary.tewaWords : plan.vocabulary.tewaWords)
    .map(v => `<li><strong>${escapeHTML(v.tewa)}</strong> — ${escapeHTML(v.english)} <span class="muted">${escapeHTML(v.pronunciationNotes || "")}</span></li>`).join("");
  const tewaPhrases = (isWeek ? plan.weekVocabulary.tewaPhrases : plan.vocabulary.tewaPhrases)
    .map(v => `<li><strong>${escapeHTML(v.tewa)}</strong> — ${escapeHTML(v.english)} <span class="pill">${escapeHTML(v.whenToUse || "phrase")}</span></li>`).join("");
  const engWords = (isWeek ? plan.weekVocabulary.englishWords : plan.vocabulary.englishWords)
    .map(v => `<li><strong>${escapeHTML(v.word)}</strong> — ${escapeHTML(v.kidMeaning)} <span class="muted">${escapeHTML(v.useInSentence || "")}</span></li>`).join("");

  const iCans = (isWeek ? plan.weekIcanStatements : plan.iCanStatements)
    .map(s => `<li>${escapeHTML(s)}</li>`).join("");

  const focus = (isWeek ? plan.weekFocus : plan.focus);

  const focusHTML = `
    <h3>Focus</h3>
    <p><span class="pill">${escapeHTML(isWeek ? "Weekly" : "Daily")}</span> ${escapeHTML(focus.bigIdea)}</p>
    <h4>Objectives</h4>
    <ul>${focus.objectives.map(o => `<li>${escapeHTML(o)}</li>`).join("")}</ul>
    <h4>Teaching Strategies</h4>
    <ul>${focus.teachingStrategies.map(s => `<li>${escapeHTML(s)}</li>`).join("")}</ul>
  `;

  const vocabHTML = `
    <h3>Vocabulary (5 Tewa + 5 English)</h3>
    <h4>Tewa Words (3)</h4><ul>${tewaWords}</ul>
    <h4>Tewa Phrases (2)</h4><ul>${tewaPhrases}</ul>
    <h4>English Words (5)</h4><ul>${engWords}</ul>
  `;

  const booksHTML = (isWeek ? plan.readAlouds : [plan.readAloud]).map((b, idx) => `
    <div class="item" style="margin-top:10px">
      <div class="item__top">
        <div>
          <div class="item__title">${escapeHTML(isWeek ? b.dayName + ": " : "")}${escapeHTML(b.bookTitle)}</div>
          <div class="item__meta">${escapeHTML(b.author || "")}</div>
        </div>
      </div>
      <div class="item__meta">Use vocab in questions: ${escapeHTML((b.vocabToUseInQuestions || []).join(" • "))}</div>
      <h4>Before</h4><ul>${b.beforeQuestions.map(q=>`<li>${escapeHTML(q)}</li>`).join("")}</ul>
      <h4>During</h4><ul>${b.duringQuestions.map(q=>`<li>${escapeHTML(q)}</li>`).join("")}</ul>
      <h4>After</h4><ul>${b.afterQuestions.map(q=>`<li>${escapeHTML(q)}</li>`).join("")}</ul>
      <h4>Extension</h4><p>${escapeHTML(b.extensionActivity)}</p>
    </div>
  `).join("");

  const centersTable = (centers) => `
    <table class="table">
      <thead>
        <tr>
          <th style="width:13%">Center</th>
          <th>Objective/Indicator</th>
          <th>Items/Setup</th>
          <th>Teacher Support</th>
          <th>Books</th>
          <th>Vocabulary</th>
        </tr>
      </thead>
      <tbody>
        ${centers.map(c => `
          <tr>
            <td><strong>${escapeHTML(c.name)}</strong></td>
            <td>${escapeHTML(c.objectiveIndicator)}</td>
            <td>${escapeHTML(c.itemsSetup)}</td>
            <td>${escapeHTML(c.teacherSupport)}</td>
            <td>${escapeHTML(c.books)}</td>
            <td>${escapeHTML(c.vocabularyWords)}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;

  const daySections = isWeek ? plan.days.map(d => `
    <h3>${escapeHTML(d.dayName)} — ${escapeHTML(d.date)}</h3>
    <p><strong>Daily focus:</strong> ${escapeHTML(d.dailyFocus)}</p>
    <p class="muted">${escapeHTML(d.dailyPlanNotes)}</p>
    ${centersTable(d.centers)}
    <h4>Small Group</h4><ul>${d.smallGroup.map(x=>`<li>${escapeHTML(x)}</li>`).join("")}</ul>
    <h4>Large Group</h4><ul>${d.largeGroup.map(x=>`<li>${escapeHTML(x)}</li>`).join("")}</ul>
  `).join("") : `
    <h3>Centers</h3>
    ${centersTable(plan.centers)}
    <h4>Small Group</h4><ul>${plan.smallGroup.map(x=>`<li>${escapeHTML(x)}</li>`).join("")}</ul>
    <h4>Large Group</h4><ul>${plan.largeGroup.map(x=>`<li>${escapeHTML(x)}</li>`).join("")}</ul>
  `;

  const family = plan.familyEngagement?.map(x=>`<li>${escapeHTML(x)}</li>`).join("") || "";
  const assess = plan.assessmentNotes?.map(x=>`<li>${escapeHTML(x)}</li>`).join("") || "";

  const header = `
    <div>
      <h3>${escapeHTML(isWeek ? "Weekly Plan" : "Daily Plan")}: ${escapeHTML(meta.topic)}</h3>
      <div class="muted">
        ${isWeek ? `Week of <strong>${escapeHTML(meta.weekOf)}</strong>` : `Date <strong>${escapeHTML(meta.date)}</strong>`}
        • Classroom: <strong>${escapeHTML(meta.classroom || "")}</strong>
        • Age: <strong>${escapeHTML(meta.ageGroup || "")}</strong>
      </div>
    </div>
  `;

  return `
    ${header}
    ${focusHTML}
    <h3>I Can Statements (5)</h3>
    <ul>${iCans}</ul>
    ${vocabHTML}
    <h3>Books / Read Alouds</h3>
    ${booksHTML}
    ${daySections}
    <h3>Family Engagement</h3>
    <ul>${family}</ul>
    <h3>Assessment Notes</h3>
    <ul>${assess}</ul>
  `;
}

function escapeHTML(s){
  return (s ?? "").toString()
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function renderSavedList(plans){
  const q = ($("search").value || "").toLowerCase().trim();
  const list = $("savedList");
  list.innerHTML = "";

  const filtered = plans.filter(p => {
    const t = (p.plan?.meta?.topic || "").toLowerCase();
    const mode = p.plan?.mode || "";
    return !q || t.includes(q) || mode.includes(q);
  });

  if (!filtered.length){
    list.innerHTML = `<div class="muted">No saved plans yet.</div>`;
    return;
  }

  for (const p of filtered){
    const meta = p.plan.meta;
    const isWeek = p.plan.mode === "week";
    const title = `${isWeek ? "Weekly" : "Daily"}: ${meta.topic}`;
    const dateStr = isWeek ? `Week of ${meta.weekOf}` : `Date ${meta.date}`;
    const el = document.createElement("div");
    el.className = "item";
    el.innerHTML = `
      <div class="item__top">
        <div>
          <div class="item__title">${escapeHTML(title)}</div>
          <div class="item__meta">${escapeHTML(dateStr)} • ${escapeHTML(meta.classroom || "")}</div>
        </div>
        <div class="item__meta">${new Date(p.createdAt).toLocaleString()}</div>
      </div>
      <div class="item__actions">
        <button class="btn btn--ghost" data-open="${p.id}">Open</button>
        <button class="btn btn--ghost" data-dup="${p.id}">Duplicate (edit)</button>
        <button class="btn" data-del="${p.id}" style="background:transparent;border-color:rgba(255,59,48,.35);color:#ffd7d4">Delete</button>
      </div>
    `;
    list.appendChild(el);
  }

  list.querySelectorAll("[data-open]").forEach(btn => btn.addEventListener("click", () => openPlan(btn.dataset.open)));
  list.querySelectorAll("[data-del]").forEach(btn => btn.addEventListener("click", () => deletePlan(btn.dataset.del)));
  list.querySelectorAll("[data-dup]").forEach(btn => btn.addEventListener("click", () => duplicatePlanToForm(btn.dataset.dup)));
}

let DATA = null;
let OPEN_PLAN = null;

function openPlan(id){
  const plans = loadPlans();
  const found = plans.find(p => p.id === id);
  if (!found) return;
  OPEN_PLAN = found.plan;
  $("planViewer").classList.remove("muted");
  $("planViewer").innerHTML = planToHTML(found.plan);
}

function deletePlan(id){
  const plans = loadPlans().filter(p => p.id !== id);
  savePlans(plans);
  renderSavedList(plans);
  if (OPEN_PLAN && (OPEN_PLAN._id === id)){
    OPEN_PLAN = null;
    $("planViewer").innerHTML = "Generate or open a saved plan to view it here.";
    $("planViewer").classList.add("muted");
  }
}

function duplicatePlanToForm(id){
  const plans = loadPlans();
  const found = plans.find(p => p.id === id);
  if (!found) return;
  const plan = found.plan;
  $("mode").value = plan.mode;
  $("topic").value = plan.meta.topic;
  $("classroom").value = plan.meta.classroom || "";
  $("ageGroup").value = plan.meta.ageGroup || "Pre-K";
  if (plan.mode === "week"){
    $("weekOf").value = plan.meta.weekOf || "";
    // fill books
    const byDay = (plan.readAlouds || []);
    $("bookMon").value = byDay[0]?.bookTitle || "";
    $("bookTue").value = byDay[1]?.bookTitle || "";
    $("bookWed").value = byDay[2]?.bookTitle || "";
    $("bookThu").value = byDay[3]?.bookTitle || "";
    $("bookFri").value = byDay[4]?.bookTitle || "";
  } else {
    $("date").value = plan.meta.date || "";
  }
  syncModeUI();
  window.scrollTo({top:0, behavior:"smooth"});
}

function syncModeUI(){
  const mode = $("mode").value;
  const isWeek = mode === "week";
  $("weekOfField").style.display = isWeek ? "" : "none";
  $("booksPanel").style.display = isWeek ? "" : "none";
  $("dateField").style.display = isWeek ? "none" : "";
}

function clearForm(){
  $("topic").value = "";
  $("classroom").value = "";
  $("date").value = "";
  $("weekOf").value = "";
  $("bookMon").value = "";
  $("bookTue").value = "";
  $("bookWed").value = "";
  $("bookThu").value = "";
  $("bookFri").value = "";
  $("status").textContent = "";
}

function exportOpenPlan(){
  if (!OPEN_PLAN){
    alert("Open a plan first.");
    return;
  }
  const blob = new Blob([JSON.stringify(OPEN_PLAN, null, 2)], {type:"application/json"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const meta = OPEN_PLAN.meta || {};
  const name = (OPEN_PLAN.mode === "week" ? `week_${meta.weekOf}` : `day_${meta.date}`) + "_" + (meta.topic || "plan").slice(0,30).replace(/\s+/g,"_");
  a.download = `${name}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function resetVocabHistory(){
  if (!confirm("Reset vocab history? This keeps saved plans but allows vocab to repeat in new plans.")) return;
  saveVocabHistory({ usedTewaWords: [], usedTewaPhrases: [], usedEnglishWords: [] });
  alert("Vocab history reset.");
}

async function init(){
  syncModeUI();
  $("mode").addEventListener("change", syncModeUI);
  $("btnClear").addEventListener("click", clearForm);

  // Register service worker (PWA)
  if ("serviceWorker" in navigator){
    try { await navigator.serviceWorker.register("./sw.js"); } catch {}
  }

  DATA = await loadData();

  const plans = loadPlans();
  renderSavedList(plans);

  $("search").addEventListener("input", () => renderSavedList(loadPlans()));

  $("btnGenerate").addEventListener("click", () => {
    const mode = $("mode").value;
    const topic = $("topic").value.trim();
    const classroom = $("classroom").value.trim();
    const ageGroup = $("ageGroup").value;
    if (!topic){
      alert("Please type a topic/theme.");
      return;
    }

    const plans = loadPlans();
    if (isDuplicateTopic(topic, plans, mode)){
      if (!confirm("You already have a saved plan with this exact topic + mode. Generate anyway?")) return;
    }

    const history = loadVocabHistory();

    $("status").textContent = "Generating…";

    let plan;
    if (mode === "week"){
      const weekOf = $("weekOf").value;
      if (!weekOf){
        alert("Pick a Week Of (Monday) date.");
        $("status").textContent = "";
        return;
      }
      const booksByDay = [
        $("bookMon").value, $("bookTue").value, $("bookWed").value, $("bookThu").value, $("bookFri").value
      ];
      plan = buildWeekPlan({weekOfISO: weekOf, topic, classroom, ageGroup, data: DATA, history, booksByDay});
    } else {
      const date = $("date").value;
      if (!date){
        alert("Pick a date.");
        $("status").textContent = "";
        return;
      }
      plan = buildDayPlan({dateISO: date, topic, classroom, ageGroup, data: DATA, history, bookTitle: ""});
    }

    // persist history and plan
    saveVocabHistory(history);

    const item = { id: uid(), createdAt: nowISO(), plan };
    const updated = [item, ...plans];
    savePlans(updated);
    renderSavedList(updated);

    OPEN_PLAN = plan;
    $("planViewer").classList.remove("muted");
    $("planViewer").innerHTML = planToHTML(plan);

    $("status").textContent = "Saved ✔";
  });

  $("btnPrint").addEventListener("click", () => {
    if (!OPEN_PLAN) return alert("Open a plan first.");
    window.print();
  });

  $("btnExport").addEventListener("click", exportOpenPlan);
  $("btnResetVocab").addEventListener("click", resetVocabHistory);
}

init();
