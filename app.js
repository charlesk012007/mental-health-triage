// =====================================================
// Mental Health Triage (Educational) + Med Selection Tree
// PHQ-9 + GAD-7 screening + decision-tree + ranked options
// (Single-file, no backend)
// =====================================================
//
// DISCLAIMER: Educational only. Not diagnosis/prescription. Not for emergencies.

// -------------------- PHQ-9 + GAD-7 --------------------
const symptomQuestions = [
  // PHQ-9 (past 2 weeks)
  { id: "phq1", scale: "PHQ9", text: "Little interest or pleasure in doing things" },
  { id: "phq2", scale: "PHQ9", text: "Feeling down, depressed, or hopeless" },
  { id: "phq3", scale: "PHQ9", text: "Trouble falling or staying asleep, or sleeping too much" },
  { id: "phq4", scale: "PHQ9", text: "Feeling tired or having little energy" },
  { id: "phq5", scale: "PHQ9", text: "Poor appetite or overeating" },
  { id: "phq6", scale: "PHQ9", text: "Feeling bad about yourself — or that you are a failure or have let yourself or your family down" },
  { id: "phq7", scale: "PHQ9", text: "Trouble concentrating on things, such as reading or watching television" },
  { id: "phq8", scale: "PHQ9", text: "Moving or speaking so slowly that others could have noticed? Or the opposite — being fidgety or restless" },
  { id: "phq9", scale: "PHQ9", text: "Thoughts that you would be better off dead or of hurting yourself" },

  // GAD-7 (past 2 weeks)
  { id: "gad1", scale: "GAD7", text: "Feeling nervous, anxious, or on edge" },
  { id: "gad2", scale: "GAD7", text: "Not being able to stop or control worrying" },
  { id: "gad3", scale: "GAD7", text: "Worrying too much about different things" },
  { id: "gad4", scale: "GAD7", text: "Trouble relaxing" },
  { id: "gad5", scale: "GAD7", text: "Being so restless that it is hard to sit still" },
  { id: "gad6", scale: "GAD7", text: "Becoming easily annoyed or irritable" },
  { id: "gad7", scale: "GAD7", text: "Feeling afraid as if something awful might happen" },
];

const likertOptions = [
  { label: "Not at all", value: 0 },
  { label: "Several days", value: 1 },
  { label: "More than half the days", value: 2 },
  { label: "Nearly every day", value: 3 },
];

// -------------------- Decision-tree questions --------------------
// NOTE: No separate suicidality question because PHQ-9 item 9 covers it.
const triageQuestions = [
  { id: "mania", type: "yesno", text: "Have you ever had several days of unusually high energy or much less sleep AND were more talkative, impulsive, or had racing thoughts?" },
  { id: "panic", type: "yesno", text: "Do you have panic attacks (sudden surges of intense fear with palpitations, shortness of breath, or feeling out of control)?" },

  {
    id: "sleep",
    type: "choice",
    text: "Which best fits your sleep right now?",
    choices: [
      { label: "Trouble falling asleep", value: "onset" },
      { label: "Waking up a lot / early morning awakenings", value: "maintenance" },
      { label: "Sleeping too much", value: "too_much" },
      { label: "Sleep not a major problem", value: "none" },
    ],
  },

  {
    id: "weightGoal",
    type: "choice",
    text: "Weight priority (choose one):",
    choices: [
      { label: "Avoid weight gain is very important", value: "avoid_gain" },
      { label: "Weight neutral is preferred", value: "neutral" },
      { label: "Weight change is not a major concern", value: "no" },
    ],
  },

  {
    id: "sexSE",
    type: "choice",
    text: "Sexual side effects priority (choose one):",
    choices: [
      { label: "Avoid sexual side effects is very important", value: "avoid" },
      { label: "Some concern", value: "some" },
      { label: "Not a major concern", value: "no" },
    ],
  },

  { id: "lowEnergy", type: "yesno", text: "Is low energy/fatigue one of your top 2 problems?" },
  { id: "poorFocus", type: "yesno", text: "Is poor focus/concentration one of your top 2 problems?" },
  { id: "jittery", type: "yesno", text: "Do you get jittery/anxious easily with caffeine or stimulants?" },

  { id: "chronicPain", type: "yesno", text: "Do you have significant chronic pain (neuropathic pain, fibromyalgia, chronic back/neck pain) you'd like treated too?" },
  { id: "migraine", type: "yesno", text: "Do you have frequent migraines/headaches you'd like to reduce?" },
  { id: "smoking", type: "yesno", text: "Do you use nicotine (smoking/vaping) and want help quitting?" },

  {
    id: "treatmentHistory",
    type: "choice",
    text: "Have you tried antidepressants before?",
    choices: [
      { label: "No / first time", value: "naive" },
      { label: "Yes—worked in the past", value: "worked" },
      { label: "Yes—didn't work or side effects stopped it", value: "failed" },
    ],
  },
];

// -------------------- State --------------------
let symptomAnswers = Object.fromEntries(symptomQuestions.map(q => [q.id, null]));
let triageAnswers = Object.fromEntries(triageQuestions.map(q => [q.id, null]));
let submitted = false;

// -------------------- Scoring --------------------
function calcScores() {
  let phq9 = 0, gad7 = 0;
  for (const q of symptomQuestions) {
    const v = symptomAnswers[q.id];
    if (v == null) continue;
    if (q.scale === "PHQ9") phq9 += v;
    if (q.scale === "GAD7") gad7 += v;
  }
  return { phq9, gad7 };
}

function phq9Severity(x) {
  if (x <= 4) return "Minimal";
  if (x <= 9) return "Mild";
  if (x <= 14) return "Moderate";
  if (x <= 19) return "Moderately severe";
  return "Severe";
}

function gad7Severity(x) {
  if (x <= 4) return "Minimal";
  if (x <= 9) return "Mild";
  if (x <= 14) return "Moderate";
  return "Severe";
}

// Simple combined band for routing (not an official scale)
function overallSeverityFrom(phq9, gad7) {
  const total = phq9 + gad7; // 0–48
  if (total <= 9) return "Minimal–mild";
  if (total <= 19) return "Mild–moderate";
  if (total <= 32) return "Moderate";
  return "Moderate–severe";
}

function dominanceLabel(phq9, gad7) {
  if (gad7 > phq9 + 2) return "anxiety";
  if (phq9 > gad7 + 2) return "depression";
  return "mixed";
}

// Suicidality from PHQ-9 item 9
function suicideFlag() {
  const v = symptomAnswers["phq9"];
  return v != null && v >= 1;
}

// -------------------- Medication knowledge (educational heuristics) --------------------
const MEDS = [
  {
    key: "ssri_sertraline_escitalopram",
    name: "SSRI (e.g., sertraline / escitalopram)",
    tags: ["first-line", "anxiety", "panic", "depression"],
    base: 6,
    effects: { anxiety: +3, depression: +2, panic: +3, insomnia_help: 0, energy: 0, focus: 0, pain: 0, migraine: 0, smoking: 0, weight: -1, sexual: -2, jittery_risk: -1 },
    cautions: ["Sexual side effects possible", "May cause GI upset early on", "Activation/anxiety can occur initially"]
  },
  {
    key: "snri_duloxetine",
    name: "SNRI (duloxetine)",
    tags: ["first-line", "anxiety", "depression", "pain"],
    base: 6,
    effects: { anxiety: +2, depression: +2, panic: +2, insomnia_help: 0, energy: +1, focus: 0, pain: +3, migraine: 0, smoking: 0, weight: -1, sexual: -2, jittery_risk: -1 },
    cautions: ["Sexual side effects possible", "Can raise BP in some people", "Tapering needed to stop"]
  },
  {
    key: "snri_venlafaxine",
    name: "SNRI (venlafaxine)",
    tags: ["anxiety", "panic", "depression"],
    base: 5,
    effects: { anxiety: +2, depression: +2, panic: +3, insomnia_help: 0, energy: +1, focus: 0, pain: +1, migraine: +1, smoking: 0, weight: -1, sexual: -2, jittery_risk: -1 },
    cautions: ["Discontinuation symptoms if missed", "Can raise BP at higher doses", "Sexual side effects possible"]
  },
  {
    key: "bupropion",
    name: "Bupropion",
    tags: ["energy", "focus", "sexual-friendly", "smoking"],
    base: 5,
    effects: { anxiety: -1, depression: +3, panic: -1, insomnia_help: -1, energy: +3, focus: +2, pain: 0, migraine: 0, smoking: +3, weight: +2, sexual: +3, jittery_risk: -3 },
    cautions: ["Can worsen anxiety/jitteriness for some", "Can worsen insomnia if taken late", "Not for seizure/eating-disorder risk"]
  },
  {
    key: "mirtazapine",
    name: "Mirtazapine (often sedating, appetite-increasing)",
    tags: ["sleep", "appetite", "depression"],
    base: 4,
    effects: { anxiety: +1, depression: +2, panic: 0, insomnia_help: +3, energy: -1, focus: -1, pain: 0, migraine: 0, smoking: 0, weight: -3, sexual: +1, jittery_risk: +1 },
    cautions: ["Weight gain/appetite increase common", "Daytime sedation possible"]
  },
  {
    key: "trazodone_adjunct",
    name: "Sleep adjunct (e.g., trazodone / CBT-I)",
    tags: ["sleep-adjunct"],
    base: 3,
    effects: { anxiety: 0, depression: 0, panic: 0, insomnia_help: +3, energy: 0, focus: 0, pain: 0, migraine: 0, smoking: 0, weight: 0, sexual: 0, jittery_risk: 0 },
    cautions: ["Often used as add-on for sleep rather than primary antidepressant"]
  },
  {
    key: "buspirone_adjunct",
    name: "Anxiety adjunct (buspirone—GAD add-on option)",
    tags: ["anxiety-adjunct"],
    base: 3,
    effects: { anxiety: +2, depression: 0, panic: 0, insomnia_help: 0, energy: 0, focus: 0, pain: 0, migraine: 0, smoking: 0, weight: +1, sexual: +1, jittery_risk: +1 },
    cautions: ["Often used for generalized anxiety; takes time to work"]
  },
  {
    key: "propranolol_prn",
    name: "Situational anxiety option (propranolol PRN—performance anxiety)",
    tags: ["situational"],
    base: 2,
    effects: { anxiety: +1, depression: 0, panic: +1, insomnia_help: 0, energy: -1, focus: 0, pain: 0, migraine: +2, smoking: 0, weight: 0, sexual: 0, jittery_risk: +2 },
    cautions: ["Not for asthma/bradycardia; for physical symptoms in specific situations"]
  },
];

// -------------------- Ranking engine --------------------
function buildWhy(m, dom, t) {
  const reasons = [];
  if (m.tags.includes("first-line")) reasons.push("common first-line option");
  if (m.tags.includes("anxiety") && (dom === "anxiety" || dom === "mixed")) reasons.push("targets anxiety");
  if (m.tags.includes("panic") && t.panic) reasons.push("used for panic symptoms");
  if (m.tags.includes("pain") && t.chronicPain) reasons.push("can overlap with chronic pain relief");
  if (m.tags.includes("sexual-friendly") && (t.sexSE === "avoid" || t.sexSE === "some")) reasons.push("often discussed when avoiding sexual side effects");
  if (m.tags.includes("smoking") && t.smoking) reasons.push("has smoking-cessation use");
  if (m.tags.includes("sleep") && (t.sleep === "onset" || t.sleep === "maintenance")) reasons.push("sleep-supporting profile");
  if (m.tags.includes("situational") && t.panic) reasons.push("can help physical symptoms in specific situations");
  if (!reasons.length) reasons.push("matches some of your priorities");
  return reasons;
}

function buildRecommendations(scores, t) {
  const { phq9, gad7 } = scores;
  const sev = overallSeverityFrom(phq9, gad7);
  const dom = dominanceLabel(phq9, gad7);

  const safetyFlags = [];
  const cautions = [];
  const mustDiscussFirst = [];
  const nonMed = [];
  const picks = [];

  if (suicideFlag()) {
    safetyFlags.push("Safety: PHQ-9 item 9 indicates self-harm thoughts — seek urgent help now (U.S.: call/text 988, or emergency services).");
  }

  if (t.mania === true) {
    mustDiscussFirst.push("Possible bipolar-spectrum features: clinician evaluation is critical before antidepressants; antidepressant-only can worsen cycling for some people.");
    mustDiscussFirst.push("Discuss mood stabilizer / atypical antipsychotic evaluation if bipolar disorder is suspected.");
    cautions.push("Because bipolar-spectrum symptoms are possible, medication choice must be clinician-led; antidepressant monotherapy may be risky.");
  }

  if (sev === "Minimal–mild") {
    nonMed.push("Mild severity: many people start with CBT/therapy, sleep regularity, exercise, and stress skills; medication is optional and clinician-dependent.");
  } else {
    nonMed.push("Strongly consider psychotherapy (CBT) alongside meds; combined approaches often work best for anxiety/depression.");
  }

  const w = {
    anxiety: (dom === "anxiety" ? 2.2 : dom === "mixed" ? 1.6 : 1.2) * (1 + gad7 / 21),
    depression: (dom === "depression" ? 2.2 : dom === "mixed" ? 1.6 : 1.2) * (1 + phq9 / 27),
    panic: (t.panic ? 1.8 : 1.0),
    sleep: (t.sleep === "onset" || t.sleep === "maintenance") ? 1.8 : (t.sleep === "too_much" ? 1.2 : 1.0),
    energy: (t.lowEnergy ? 1.7 : 1.0),
    focus: (t.poorFocus ? 1.5 : 1.0),
    pain: (t.chronicPain ? 1.8 : 1.0),
    migraine: (t.migraine ? 1.6 : 1.0),
    smoking: (t.smoking ? 1.8 : 1.0),
    weight: (t.weightGoal === "avoid_gain" ? 2.0 : t.weightGoal === "neutral" ? 1.3 : 0.9),
    sexual: (t.sexSE === "avoid" ? 2.0 : t.sexSE === "some" ? 1.3 : 0.9),
    jittery: (t.jittery ? 2.0 : 1.0),
  };

  if (t.panic === true) cautions.push("If panic is frequent/severe, therapy (CBT/exposure) is high-yield; initial SSRI/SNRI activation can occur.");
  if (t.jittery === true) cautions.push("If you get jittery easily, discuss activating meds carefully and monitor anxiety/sleep.");

  if (t.treatmentHistory === "failed") {
    nonMed.push("If multiple meds failed previously, ask about diagnosis accuracy (bipolar, ADHD, PTSD), comorbid medical issues, and targeted augmentation strategies.");
  } else if (t.treatmentHistory === "worked") {
    nonMed.push("If something worked before, clinicians often consider that agent/class again unless side effects or contraindications exist.");
  }

  for (const m of MEDS) {
    let score = m.base;

    score += w.anxiety * (m.effects.anxiety || 0);
    score += w.depression * (m.effects.depression || 0);
    score += w.panic * (m.effects.panic || 0);

    score += w.sleep * (m.effects.insomnia_help || 0);
    score += w.energy * (m.effects.energy || 0);
    score += w.focus * (m.effects.focus || 0);

    score += w.pain * (m.effects.pain || 0);
    score += w.migraine * (m.effects.migraine || 0);
    score += w.smoking * (m.effects.smoking || 0);

    score += w.weight * (m.effects.weight || 0);
    score += w.sexual * (m.effects.sexual || 0);
    score += w.jittery * (m.effects.jittery_risk || 0);

    const extraCautions = [];

    if (m.key === "bupropion" && (dom === "anxiety" || t.panic === true) && t.jittery === true) {
      extraCautions.push("May be too activating if anxiety/panic + jitteriness are prominent.");
      score -= 8;
    }
    if (m.key === "bupropion" && (t.sleep === "onset" || t.sleep === "maintenance")) {
      extraCautions.push("Can worsen insomnia for some (especially if taken later in the day).");
      score -= 4;
    }
    if (m.key === "mirtazapine" && t.weightGoal === "avoid_gain") {
      extraCautions.push("Often increases appetite/weight.");
      score -= 10;
    }

    picks.push({
      key: m.key,
      name: m.name,
      score: Math.round(score * 10) / 10,
      why: buildWhy(m, dom, t),
      cautions: [...(m.cautions || []), ...extraCautions].filter(Boolean),
    });
  }

  picks.sort((a, b) => b.score - a.score);

  const primary = picks
    .filter(p => !p.name.toLowerCase().includes("adjunct") && !p.name.toLowerCase().includes("prn"))
    .slice(0, 4);

  const adjuncts = picks
    .filter(p => p.name.toLowerCase().includes("adjunct") || p.name.toLowerCase().includes("prn"))
    .slice(0, 3);

  return { phq9, gad7, sev, dom, safetyFlags, mustDiscussFirst, cautions, nonMed, primary, adjuncts };
}

// -------------------- UI helpers --------------------
function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "className") node.className = v;
    else if (k === "innerHTML") node.innerHTML = v;
    else if (k.startsWith("on") && typeof v === "function") node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, v);
  }
  for (const c of children) node.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
  return node;
}

function allAnswered(obj) {
  return Object.values(obj).every(v => v !== null);
}

// -------------------- Render --------------------
function render() {
  const app = document.getElementById("app");
  app.innerHTML = "";

  if (!submitted) {
    app.appendChild(el("div", { className: "card" }, [
      el("div", { className: "question" }, ["Step 1: PHQ-9 + GAD-7 (past 2 weeks)"]),
      el("div", {}, ["Answer all screening questions, then the decision-tree questions to get an educational ranked list of options to discuss."])
    ]));

    symptomQuestions.forEach((q, i) => {
      const card = el("div", { className: "card" });
      card.appendChild(el("div", { className: "question" }, [
        `${i + 1}. ${q.text} `,
        el("span", { innerHTML: `<span style="opacity:.6">(${q.scale})</span>` })
      ]));

      likertOptions.forEach(opt => {
        const label = el("label", { className: "option" });
        const input = el("input", { type: "radio", name: q.id });
        input.checked = symptomAnswers[q.id] === opt.value;
        input.onchange = () => { symptomAnswers[q.id] = opt.value; render(); };
        label.appendChild(input);
        label.appendChild(document.createTextNode(opt.label));
        card.appendChild(label);
      });

      app.appendChild(card);
    });

    app.appendChild(el("div", { className: "card" }, [
      el("div", { className: "question" }, ["Step 2: Medication decision-tree questions"]),
      el("div", {}, ["Educational only — not a prescription. Bipolar screening included; PHQ-9 item 9 used for safety flagging."])
    ]));

    triageQuestions.forEach((q, i) => {
      const card = el("div", { className: "card" });
      card.appendChild(el("div", { className: "question" }, [`${i + 1}. ${q.text}`]));

      if (q.type === "yesno") {
        ["Yes", "No"].forEach((lbl, idx) => {
          const val = (idx === 0);
          const label = el("label", { className: "option" });
          const input = el("input", { type: "radio", name: q.id });
          input.checked = triageAnswers[q.id] === val;
          input.onchange = () => { triageAnswers[q.id] = val; render(); };
          label.appendChild(input);
          label.appendChild(document.createTextNode(lbl));
          card.appendChild(label);
        });
      } else {
        q.choices.forEach(ch => {
          const label = el("label", { className: "option" });
          const input = el("input", { type: "radio", name: q.id });
          input.checked = triageAnswers[q.id] === ch.value;
          input.onchange = () => { triageAnswers[q.id] = ch.value; render(); };
          label.appendChild(input);
          label.appendChild(document.createTextNode(ch.label));
          card.appendChild(label);
        });
      }
      app.appendChild(card);
    });

    const ready = allAnswered(symptomAnswers) && allAnswered(triageAnswers);

    app.appendChild(el("button", {
      className: ready ? "primary" : "primary disabled",
      disabled: !ready,
      onclick: () => { submitted = true; render(); }
    }, ["See Results"]));

  } else {
    const scores = calcScores();
    const res = buildRecommendations(scores, triageAnswers);

    const title =
      res.dom === "anxiety" ? "Anxiety-dominant pattern (GAD-7 higher)" :
      res.dom === "depression" ? "Depression-dominant pattern (PHQ-9 higher)" :
      "Mixed anxiety + depression pattern";

    const card = el("div", { className: "card" });
    card.appendChild(el("h2", {}, [title]));
    card.appendChild(el("p", { innerHTML: `<b>PHQ-9:</b> ${res.phq9} (${phq9Severity(res.phq9)})` }));
    card.appendChild(el("p", { innerHTML: `<b>GAD-7:</b> ${res.gad7} (${gad7Severity(res.gad7)})` }));
    card.appendChild(el("p", { innerHTML: `<b>Overall:</b> ${res.sev}` }));

    if (res.safetyFlags.length) {
      card.appendChild(el("hr"));
      card.appendChild(el("p", { innerHTML: `<b>Urgent safety note:</b>` }));
      const ul = el("ul");
      res.safetyFlags.forEach(x => ul.appendChild(el("li", {}, [x])));
      card.appendChild(ul);
    }

    if (res.mustDiscussFirst.length) {
      card.appendChild(el("hr"));
      card.appendChild(el("p", { innerHTML: `<b>Discuss first (important):</b>` }));
      const ul = el("ul");
      res.mustDiscussFirst.forEach(x => ul.appendChild(el("li", {}, [x])));
      card.appendChild(ul);
    }

    if (res.cautions.length) {
      card.appendChild(el("hr"));
      card.appendChild(el("p", { innerHTML: `<b>Cautions:</b>` }));
      const ul = el("ul");
      res.cautions.forEach(x => ul.appendChild(el("li", {}, [x])));
      card.appendChild(ul);
    }

    card.appendChild(el("hr"));
    card.appendChild(el("p", { innerHTML: `<b>Top medication options to discuss (ranked, educational):</b>` }));
    const ol = el("ol");
    res.primary.forEach(p => {
      const li = el("li");
      li.appendChild(el("div", { innerHTML: `<b>${p.name}</b> <span style="opacity:0.7">(match score: ${p.score})</span>` }));
      li.appendChild(el("div", { innerHTML: `<span style="opacity:0.85">Why:</span> ${p.why.join(", ")}` }));
      if (p.cautions.length) {
        li.appendChild(el("div", { innerHTML: `<span style="opacity:0.85">Watch-outs:</span>` }));
        const ul = el("ul");
        p.cautions.slice(0, 3).forEach(c => ul.appendChild(el("li", {}, [c])));
        li.appendChild(ul);
      }
      ol.appendChild(li);
    });
    card.appendChild(ol);

    card.appendChild(el("p", { innerHTML: `<b>Add-on / situational options to discuss:</b>` }));
    const ulAdj = el("ul");
    res.adjuncts.forEach(p => {
      const li = el("li");
      li.appendChild(el("div", { innerHTML: `<b>${p.name}</b> <span style="opacity:0.7">(match score: ${p.score})</span>` }));
      li.appendChild(el("div", { innerHTML: `<span style="opacity:0.85">Why:</span> ${p.why.join(", ")}` }));
      if (p.cautions.length) {
        const ul = el("ul");
        p.cautions.slice(0, 2).forEach(c => ul.appendChild(el("li", {}, [c])));
        li.appendChild(ul);
      }
      ulAdj.appendChild(li);
    });
    card.appendChild(ulAdj);

    card.appendChild(el("hr"));
    card.appendChild(el("p", { innerHTML: `<b>Next steps to consider:</b>` }));
    const ulNM = el("ul");
    res.nonMed.forEach(x => ulNM.appendChild(el("li", {}, [x])));
    card.appendChild(ulNM);

    card.appendChild(el("hr"));
    card.appendChild(el("p", {}, [
      "Disclaimer: Educational only. Not a diagnosis or prescription. Medication choice depends on medical history, other meds, contraindications, and clinician judgment."
    ]));

    app.appendChild(card);

    app.appendChild(el("button", {
      className: "secondary",
      onclick: () => {
        symptomAnswers = Object.fromEntries(symptomQuestions.map(q => [q.id, null]));
        triageAnswers = Object.fromEntries(triageQuestions.map(q => [q.id, null]));
        submitted = false;
        render();
      }
    }, ["Start Over"]));
  }
}

render();