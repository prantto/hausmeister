// Seed corpus — verbatim from the design bundle. Used until the backend
// /scrap and /ask endpoints come online.

export const SEED_SCRAPS = [
  { id: "s001", handle: "kartoffel-04",   t: "Fri 18:42", kind: "text",  body: "team next to us has been arguing about whether to use postgres or supabase for 90 minutes. they have written zero code." },
  { id: "s002", handle: "ledig-19",       t: "Fri 18:51", kind: "voice", body: "yo the espresso machine is already broken. it is hour two." },
  { id: "s003", handle: "schimmel-77",    t: "Fri 19:03", kind: "text",  body: "the mentor from the big AI company just told a team to 'wrap GPT-4 in a chrome extension'. groundbreaking." },
  { id: "s004", handle: "feierabend-12",  t: "Fri 19:18", kind: "text",  body: "vegan dinner ran out at 18:45. the people in the line behind it have unionised." },
  { id: "s005", handle: "knoblauch-33",   t: "Fri 19:30", kind: "voice", body: "guy at the badge desk asked me if i was 'someone important'. wrong answer either way." },
  { id: "s006", handle: "umlaut-88",      t: "Fri 20:02", kind: "text",  body: "team COMPOST has been arguing about the system prompt for the persona for an hour. ironic considering the persona is supposed to judge people for arguing." },
  { id: "s007", handle: "bahn-44",        t: "Fri 20:14", kind: "text",  body: "S-Bahn delayed 35 min. arrived to find my teammates have rewritten everything in rust. we are not shipping rust." },
  { id: "s008", handle: "pfand-09",       t: "Fri 20:31", kind: "voice", body: "the energy drinks are sponsored by a company that sells software to health insurance companies. nobody is laughing." },
  { id: "s009", handle: "tuerschloss-21", t: "Fri 20:47", kind: "text",  body: "found a guy asleep under the table at HOUR THREE. legend." },
  { id: "s010", handle: "abfall-66",      t: "Fri 21:09", kind: "text",  body: "my teammate just said 'we should do this properly' which is hackathon for 'we are not finishing'." },
  { id: "s011", handle: "sauerkraut-02",  t: "Fri 21:22", kind: "text",  body: "overheard: 'is this idea defensible' BROTHER YOU ARE BUILDING A TODO APP" },
  { id: "s012", handle: "regenschirm-55", t: "Fri 21:40", kind: "voice", body: "Gemini API just rate-limited me for the third time. I am a single user." },
  { id: "s013", handle: "fenster-71",     t: "Fri 22:04", kind: "text",  body: "the wall is showing scraps in real time and one team is now writing scraps about how the wall is showing scraps about them. recursive." },
  { id: "s014", handle: "kissen-13",      t: "Fri 22:27", kind: "text",  body: "team across the room printed business cards. it is a hackathon. they have business cards." },
  { id: "s015", handle: "matratze-29",    t: "Fri 23:11", kind: "voice", body: "i am told the silent room is 'silent' but a man is doing a sales call in there." },
  { id: "s016", handle: "kaffee-86",      t: "Sat 00:34", kind: "text",  body: "first 'we should pivot' of the night spotted at table 14. cause of death: react native." },
  { id: "s017", handle: "treppen-47",     t: "Sat 01:02", kind: "text",  body: "guy in the hallway is on a call with his girlfriend explaining what RAG is. she is winning." },
  { id: "s018", handle: "lampe-90",       t: "Sat 02:18", kind: "voice", body: "i have been debugging a CORS error for 47 minutes. it was a typo." },
  { id: "s019", handle: "vorhang-03",     t: "Sat 03:40", kind: "text",  body: "the night DJ is playing minimal techno at 4am as if we are not all writing python." },
  { id: "s020", handle: "schluessel-58",  t: "Sat 06:11", kind: "text",  body: "sunrise. three teams have not gone to sleep. one team has been asleep since midnight. the second team will win." },
  { id: "s021", handle: "aufzug-25",      t: "Sat 08:30", kind: "voice", body: "the breakfast croissants are warm and i am crying a little." },
  { id: "s022", handle: "rasen-17",       t: "Sat 09:55", kind: "text",  body: "first demo rehearsal in the corner. the founder is gesturing wildly. there is no product behind him." },
  { id: "s023", handle: "buegeleisen-41", t: "Sat 10:42", kind: "text",  body: "mentor just said 'have you considered an MCP server'. unsolicited. nobody asked." },
  { id: "s024", handle: "geranie-08",     t: "Sat 11:20", kind: "voice", body: "Lovable just generated a landing page that says 'AI-Powered AI for AI'. we are shipping it." },
  { id: "s025", handle: "klingel-62",     t: "Sat 12:01", kind: "text",  body: "lunch is currywurst and the vegan option is currywurst with a sign that says 'vegan'." },
  { id: "s026", handle: "treppe-39",      t: "Sat 12:48", kind: "text",  body: "team B07 has a kanban board with 47 tickets and 0 done. they are 'organising'." },
  { id: "s027", handle: "blume-74",       t: "Sat 13:33", kind: "text",  body: "the sponsor from the cloud company just said 'it scales'. it does not scale. it is a flask app." },
  { id: "s028", handle: "muelltonne-15",  t: "Sat 14:17", kind: "voice", body: "my cofounder just used the word 'moat' and i felt my soul leave my body." },
  { id: "s029", handle: "balkon-93",      t: "Sat 15:02", kind: "text",  body: "T-7 hours. nobody at table 9 is talking. they are either focused or divorced." },
  { id: "s030", handle: "klempner-50",    t: "Sat 15:48", kind: "text",  body: "saw a team eat a pizza box. not the pizza. the box. they are tired." },
];

export const SEED_HAUSREGELN = [
  { n: "1",  rule: "Snoring in the silent room is permitted. Sales calls are not." },
  { n: "2",  rule: "If you say 'moat' you forfeit your dinner ticket. Final." },
  { n: "3",  rule: "Pivots after 02:00 are not pivots. They are surrenders." },
  { n: "4",  rule: "The espresso machine breaks at exactly hour two. Do not investigate." },
  { n: "5",  rule: "Business cards at a hackathon: see §2." },
  { n: "6",  rule: "One (1) demo rehearsal per hour. Anything more is performance art." },
  { n: "7",  rule: "'We should do this properly' is a confession." },
  { n: "8",  rule: "If your README mentions blockchain, the README is the product." },
  { n: "9",  rule: "Mentors who say 'have you considered MCP' must first define MCP. Without notes." },
  { n: "10", rule: "Sleeping under a table is not weakness. Sleeping AT a table is weakness." },
  { n: "11", rule: "Vegan currywurst is currywurst with a sticker. Do not start a fight." },
  { n: "12", rule: "Rust rewrites after Friday 22:00 are forbidden. The committee has spoken." },
  { n: "13", rule: "Kanban tickets are not progress. Closed tickets are progress. Learn the difference." },
  { n: "14", rule: "The S-Bahn is not your fault. Your commit history is." },
  { n: "15", rule: "If you must use the word 'defensible' about a todo app, you must apologise to the room." },
  { n: "16", rule: "Energy drinks may not be consumed in the silent room. The silent room is the silent room." },
  { n: "17", rule: "Landing-page generators that hallucinate the product are still landing pages. Ship it." },
  { n: "18", rule: "If you cry over warm croissants, the room shall pretend not to see." },
  { n: "19", rule: "CORS errors are typos. Always. Forever. Look again." },
  { n: "20", rule: "Submission deadline is Sunday 14:00. The Hausmeister does not negotiate. The Hausmeister leaves at 14:01." },
];

export const SAMPLE_CHAT = [
  { who: "you",  t: "Sat 09:14", body: "what's the vibe at the hackathon right now?" },
  { who: "haus", t: "Sat 09:14", body: "Na ja. Three teams have not slept. Two teams have slept too much. Table 14 has had their first 'we should pivot' which means they are out, only they do not know yet. The croissants are warm. This is the only good news." },
  { who: "you",  t: "Sat 09:15", body: "anything spicy on team COMPOST?" },
  { who: "haus", t: "Sat 09:15", body: "Also bitte. Team COMPOST argued about the persona system prompt for one full hour yesterday. The persona is me. I find this unflattering. I am told they are 'shipping' which I have learned means 'panicking quietly'." },
  { who: "you",  t: "Sat 09:16", body: "give me a hot take on the espresso machine" },
  { who: "haus", t: "Sat 09:16", body: "Das ist typisch. The machine has been broken since 18:51 Friday. The line continues to form. This is not stupidity. This is hope, which is worse." },
];

export const WALL_FEED = [
  { type: "scrap",  handle: "kartoffel-04", body: "team next to us has been arguing about whether to use postgres or supabase for 90 minutes. they have written zero code.", score: 8, t: "18:42" },
  { type: "scrap",  handle: "umlaut-88",    body: "team COMPOST has been arguing about the system prompt for the persona for an hour.", score: 9, t: "20:02" },
  { type: "scrap",  handle: "schimmel-77",  body: "mentor just told a team to 'wrap GPT-4 in a chrome extension'. groundbreaking.", score: 8, t: "19:03" },
  { type: "scrap",  handle: "lampe-90",     body: "i have been debugging a CORS error for 47 minutes. it was a typo.", score: 7, t: "02:18" },
];

export const TAGESBERICHT = {
  date: "SAMSTAG · 10:00",
  intro: "Tagesbericht Nr. 02. The Hausmeister has read 247 scraps in the last twelve hours. The Hausmeister is tired but professional.",
  sections: [
    { h: "Teams of note",  body: "Team COMPOST argued one hour over the persona prompt. Table 14 has pivoted, which means they have stopped. Team B07 maintains 47 open tickets and zero closed tickets — discipline of a kind." },
    { h: "Infrastructure", body: "The espresso machine is broken since 18:51 Friday. The vegan dinner expired at 18:45. The silent room is not silent. The S-Bahn was late, as is tradition." },
    { h: "Mentorship",     body: "One (1) mentor recommended MCP without provocation. Two (2) mentors said 'have you considered the user'. Zero (0) mentors have used the product." },
    { h: "Corpus health",  body: "247 scraps total. 31 removed for safety. 19 removed for being boring. The remainder is your fault." },
    { h: "Forecast",       body: "Sunday 14:00 approaches. The Hausmeister will leave at 14:01. Submit your project, or do not. The Hausmeister has stopped caring at 14:00:01." },
  ],
};

export const VOICE_WAVES = [0.3, 0.6, 0.4, 0.8, 1.0, 0.7, 0.5, 0.9, 0.3, 0.6, 0.8, 0.4, 0.7, 0.5, 0.9, 0.6, 0.3, 0.8, 0.5, 0.7, 0.4, 0.6, 0.9, 0.3];

const HANDLE_LEFT = ["kartoffel", "umlaut", "feierabend", "knoblauch", "schimmel", "lampe", "muelltonne", "kaffee", "bahn", "pfand", "treppe", "rasen", "balkon", "klingel"];
export function generateHandle() {
  const w = HANDLE_LEFT[Math.floor(Math.random() * HANDLE_LEFT.length)];
  const n = String(Math.floor(Math.random() * 99) + 1).padStart(2, "0");
  return `${w}-${n}`;
}
