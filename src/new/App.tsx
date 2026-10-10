import { Fragment, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { useAuth } from "../context/AuthContext";
import { isBackendConfigured } from "../lib/supabase";
import { useLibrary } from "../context/LibraryContext";
import { chordRow, fromInlineSheet, toInlineSheet } from "../lib/chordsheet";
import { semitoneDiff, spell, transposeChord as shiftChord } from "../lib/transpose";
import { nextSunday, recordToInput, useLiveData } from "./live";
import { toast } from "../screens/ui";

type IconName = "home" | "calendar" | "music" | "users" | "settings" | "sun" | "bell" | "chevron" | "clock" | "pin" | "message" | "plus" | "check" | "play" | "note";

const paths: Record<IconName, ReactNode> = {
  home: <><path d="m3 11 9-8 9 8" /><path d="M5 10v10h14V10M9 20v-6h6v6" /></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M16 3v4M8 3v4M3 10h18" /></>,
  music: <><path d="M9 18V5l11-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="17" cy="16" r="3" /></>,
  users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>,
  settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.03 1.56V21h-4v-.09A1.7 1.7 0 0 0 8.94 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.57 15 1.7 1.7 0 0 0 3 14v-4h.09A1.7 1.7 0 0 0 4.6 8.94a1.7 1.7 0 0 0-.34-1.88L4.2 7l2.83-2.83.06.06A1.7 1.7 0 0 0 9 4.57 1.7 1.7 0 0 0 10 3h4v.09a1.7 1.7 0 0 0 1.06 1.51 1.7 1.7 0 0 0 1.88-.34L17 4.2 19.83 7l-.06.06A1.7 1.7 0 0 0 19.43 9 1.7 1.7 0 0 0 21 10v4a1.7 1.7 0 0 0-1.6 1Z" /></>,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.66 6.34l1.41-1.41" /></>,
  bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></>,
  chevron: <path d="m9 18 6-6-6-6" />,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  pin: <><path d="m12 17 5-5-1-5 2-2-9-3-2 2 2 4-5 5Z" /><path d="m8 14-5 7" /></>,
  message: <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z" />,
  plus: <path d="M12 5v14M5 12h14" />,
  check: <path d="m5 12 4 4L19 6" />,
  play: <path d="m9 6 9 6-9 6Z" />,
  note: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><path d="M14 2v6h6M8 13h8M8 17h5" /></>,
};

function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

function Logo({ withName = true }: { withName?: boolean }) {
  return (
    <div className="brand">
      <svg viewBox="0 0 48 48" fill="none" aria-hidden="true">
        <circle cx="30" cy="8" r="5.5" />
        <path d="M31.5 14.2C30 18.5 25.6 20 21.8 18.4C18.3 17 16.5 13.7 17.2 10.2M17.2 10.2v27.5M17.2 24h13.5M30.7 18.4v19.3M17.2 10.2c-5.2 2.4-8.6 7.6-8.6 13.6 0 8.3 6.7 15 15 15 7.4 0 13.5-5.3 14.8-12.3" />
      </svg>
      {withName && <strong>hallowly</strong>}
    </div>
  );
}

const calendarDays = Array.from({ length: 35 }, (_, index) => index + 1);
const demoEvents: Record<number, { title: string; type: string; time: string; location: string; people: number }> = {
  9: { title: "Youth Night", type: "Gathering", time: "6:30 PM", location: "Student Hall", people: 6 },
  16: { title: "Sunday Gathering", type: "Service", time: "9:00 AM", location: "Main Auditorium", people: 8 },
  23: { title: "Worship Night", type: "Special", time: "7:00 PM", location: "Main Auditorium", people: 9 },
  30: { title: "Sunday Gathering", type: "Service", time: "9:00 AM", location: "Main Auditorium", people: 8 },
};

const demoRehearsals: Record<number, { title: string; time: string; description: string; visibility: "Team" | "Only you"; status?: "cancelled" }> = {
  3: { title: "Team rehearsal", time: "7 PM", description: "Full band rehearsal in the main auditorium.", visibility: "Team" },
  5: { title: "Vocal preparation", time: "7 PM", description: "Review harmonies and Sunday vocal cues.", visibility: "Only you" },
  10: { title: "Team rehearsal", time: "7 PM", description: "Run the Sunday set and transitions.", visibility: "Team" },
  12: { title: "Vocal rehearsal", time: "7 PM", description: "Team vocal rehearsal and prayer.", visibility: "Team" },
  17: { title: "Team rehearsal", time: "7 PM", description: "Full set rehearsal.", visibility: "Team" },
  19: { title: "Arrangement review", time: "7 PM", description: "Review new song arrangements.", visibility: "Only you" },
  24: { title: "Team rehearsal", time: "7 PM", description: "Cancelled because the scheduled leader is unavailable.", visibility: "Team", status: "cancelled" },
  26: { title: "Worship meeting", time: "7 PM", description: "Monthly planning and team care meeting.", visibility: "Team" },
  31: { title: "Team rehearsal", time: "7 PM", description: "Prepare the next service set.", visibility: "Team" },
};

const demoSongs = [
  { title: "Firm Foundation", detail: "C · 72 BPM · 4:42", leader: "MJ", notes: "Start with pad and ambient electric. Band enters on verse two." },
  { title: "Build My Life", detail: "D · 70 BPM · 4:05", leader: "SK", notes: "Flow directly from the previous song. Acoustic starts the first verse." },
  { title: "Goodness of God", detail: "G · 63 BPM · 4:56", leader: "AO", notes: "Full band. Hold the final chorus for the prayer transition." },
  { title: "Holy Forever", detail: "Db · 72 BPM · 5:08", leader: "MJ", notes: "Keys intro, eight bars. Watch Jordan for the final tag." },
];

type Song = (typeof demoSongs)[number];
type SetListRecord = {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  color: string;
  status: "Ready" | "Planning" | "Draft";
  songs: Song[];
  note: string;
  comments: string[];
};

const demoAdditional: Song[] = [
  { title: "Gratitude", detail: "B · 78 BPM · 5:34", leader: "MJ", notes: "Build slowly into the bridge." },
  { title: "King of My Heart", detail: "A · 68 BPM · 4:26", leader: "SK", notes: "Acoustic intro, full band on chorus." },
  { title: "What a Beautiful Name", detail: "D · 68 BPM · 5:12", leader: "AO", notes: "Hold after the second bridge." },
];

const initialSetLists: SetListRecord[] = [
  { id: "set-1", title: "Sunday Gathering", date: "MAR 30", time: "9:00 AM", location: "Main Auditorium", color: "#9b59b6", status: "Ready", songs: demoSongs, note: "Keep the transition between Build My Life and Goodness of God open for prayer.", comments: ["Try the final chorus in G."] },
  { id: "set-2", title: "Evening Gathering", date: "APR 06", time: "5:00 PM", location: "Main Auditorium", color: "#1abc9c", status: "Planning", songs: [demoSongs[1], demoAdditional[0], demoSongs[3]], note: "Keep the opening quiet and reflective.", comments: [] },
  { id: "set-3", title: "Palm Sunday", date: "APR 13", time: "9:00 AM", location: "Main Auditorium", color: "#e67e22", status: "Draft", songs: [demoSongs[0], demoAdditional[2]], note: "Leave space for the scripture reading.", comments: ["Confirm the final key with Maya."] },
  { id: "set-4", title: "Youth Worship Night", date: "APR 18", time: "7:00 PM", location: "Student Hall", color: "#4878a8", status: "Planning", songs: [demoAdditional[1], demoSongs[1], demoAdditional[0]], note: "Use the extended bridge if time allows.", comments: [] },
];

function loadStored<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const value = window.localStorage.getItem(key);
    return value ? JSON.parse(value) as T : fallback;
  } catch {
    return fallback;
  }
}

const chromatic = ["C", "Db", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];
function transposeChord(chord: string, steps: number) {
  const match = chord.match(/^([A-G](?:b|#)?)(.*)$/);
  if (!match) return chord;
  const index = chromatic.indexOf(match[1]);
  return index < 0 ? chord : `${chromatic[((index + steps) % 12 + 12) % 12]}${match[2]}`;
}

const nav: { label: string; icon: IconName }[] = [
  { label: "Home", icon: "home" },
  { label: "Services", icon: "calendar" },
  { label: "Set Lists", icon: "note" },
  { label: "Songs", icon: "music" },
  { label: "Team", icon: "users" },
  { label: "Messages", icon: "message" },
  { label: "Settings", icon: "settings" },
];

const demoTeam = [
  { name: "Maya Johnson", role: "Worship leader", initials: "MJ", status: "Confirmed", color: "violet" },
  { name: "Sarah Kim", role: "Vocals · Acoustic", initials: "SK", status: "Confirmed", color: "auburn" },
  { name: "Alex Owens", role: "Electric guitar", initials: "AO", status: "Awaiting", color: "teal" },
  { name: "Noah Williams", role: "Drums", initials: "NW", status: "Confirmed", color: "blue" },
  { name: "Leah Carter", role: "Bass", initials: "LC", status: "Away", color: "gold" },
  { name: "Jordan Davis", role: "Keys · Team lead", initials: "JD", status: "Confirmed", color: "violet" },
];

function useLive() {
  const live = useLiveData();
  return live ?? { songs: demoSongs, team: demoTeam, additionalSongs: demoAdditional, setLists: initialSetLists, events: demoEvents, rehearsals: demoRehearsals, librarySongs: null as string[][] | null };
}

/** A real chart from the database, shown in the design's own markup, in the key being displayed. */
function ChartBody({ title, keyName, mode = "chords" }: { title?: string | null; keyName: string; mode?: string }) {
  const lib = useLibrary();
  const song = title ? lib.songs.find((x) => x.title === title) : undefined;
  useEffect(() => { if (song) lib.ensureChart(song.id); }, [song?.id]);
  if (!song) return <section><span>CHART</span><p>No chart available.</p></section>;
  if (song.loaded === false) return <section><span>CHART</span><p>Loading chart…</p></section>;
  if (!song.sections.length) return <section><span>CHART</span><p>No chart yet. A lead can add one with Edit chords.</p></section>;
  const steps = semitoneDiff(song.originalKey, keyName), flat = spell(song.originalKey, steps).flat;
  return <>{song.sections.map((sec) => <section key={sec.id}><span>{(sec.label ?? sec.kind).toUpperCase()}</span>{sec.lines.map((l) => <Fragment key={l.id}>{mode !== "lyrics" && l.chords.length > 0 && <code style={{ whiteSpace: "pre" }}>{chordRow(l, (c) => shiftChord(c, steps, flat))}</code>}{l.lyric && <p>{l.lyric}</p>}</Fragment>)}</section>)}</>;
}

/** Buttons the design draws that have no data behind them yet say so instead of doing nothing. */
const soon = (e: { currentTarget: HTMLElement }) => toast(`${(e.currentTarget.textContent ?? "").trim().replace(/\s+/g, " ").slice(0, 36) || "This"} isn't connected to the database yet.`);

function PageGuide({ step, title, copy }: { step: string; title: string; copy: string }) {
  const storageKey = `hallowly-guide-${step.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  const [visible, setVisible] = useState(() => typeof window === "undefined" || window.localStorage.getItem(storageKey) !== "dismissed");
  if (!visible) return null;
  return <div className="page-guide" role="status"><span>{step}</span><div><strong>{title}</strong><p>{copy}</p></div><button aria-label="Dismiss this tip" onClick={() => { window.localStorage.setItem(storageKey, "dismissed"); setVisible(false); }}>×</button></div>;
}

function CreatorScreen({ type, onClose, onCreate, setListOptions = [] }: { type: "service" | "set" | "song"; onClose: () => void; onCreate?: (name: string, color: string, kind?: "service" | "event") => void; setListOptions?: SetListRecord[] }) {
  const titles = { service: "New schedule item", set: "New set list", song: "Add a song" };
  const [name, setName] = useState("");
  const [color, setColor] = useState("#9b59b6");
  const [attachedSets, setAttachedSets] = useState<string[]>([]);
  const [scheduleMode, setScheduleMode] = useState<"service" | "event">("service");
  const [visibility, setVisibility] = useState<"Team" | "Only you">("Team");
  const complete = () => {
    onCreate?.(name.trim() || titles[type], color, scheduleMode);
    onClose();
  };
  return <div className="creator-screen">
    <header><button onClick={onClose}><Icon name="chevron" size={16} /> Back</button><div><p className="eyebrow">Calvario Sur</p><h2>{titles[type]}</h2></div><button className="accent-action" onClick={complete}>{type === "song" ? "Save song" : "Create"}</button></header>
    <div className="creator-layout">
      <main>
        {type === "service" && <>
          <section className="creator-section"><span>01</span><div><h3>What are you adding?</h3><p>Services include set lists. Events are simple calendar items.</p><div className="schedule-type-options"><button className={scheduleMode === "service" ? "selected" : ""} onClick={() => setScheduleMode("service")}><Icon name="music" /><span><strong>Service</strong><small>Set lists, team, and service flow</small></span><i>{scheduleMode === "service" ? "✓" : ""}</i></button><button className={scheduleMode === "event" ? "selected" : ""} onClick={() => setScheduleMode("event")}><Icon name="calendar" /><span><strong>Event</strong><small>Rehearsal, meeting, reminder, or personal task</small></span><i>{scheduleMode === "event" ? "✓" : ""}</i></button></div></div></section>
          <section className="creator-section"><span>02</span><div><h3>{scheduleMode === "service" ? "Service details" : "Event details"}</h3><p>{scheduleMode === "service" ? "When and where your team will serve." : "Add a useful label and enough context for the calendar."}</p><div className="form-grid"><label>{scheduleMode === "service" ? "Service name" : "Event title"}<input value={name} onChange={(event) => setName(event.target.value)} placeholder={scheduleMode === "service" ? "Sunday Gathering" : "Team rehearsal"} /></label>{scheduleMode === "service" && <label>Service type<select><option>Sunday service</option><option>Worship night</option><option>Youth service</option><option>Special service</option></select></label>}<label>Date<input type="date" /></label><label>Start time<input type="time" /></label><label className="wide">Location<input placeholder="Main Auditorium" /></label>{scheduleMode === "event" && <label className="wide">Description<textarea placeholder="Add details, preparation notes, or a reminder…" /></label>}</div>{scheduleMode === "event" && <div className="event-visibility"><p className="field-label">Who can see this?</p><div><button className={visibility === "Only you" ? "selected" : ""} onClick={() => setVisibility("Only you")}><Icon name="users" size={15} /><span><strong>Only you</strong><small>Private calendar item</small></span></button><button className={visibility === "Team" ? "selected" : ""} onClick={() => setVisibility("Team")}><Icon name="users" size={15} /><span><strong>Share with team</strong><small>Visible to Calvario Sur members</small></span></button></div></div>}</div></section>
          {scheduleMode === "service" && <section className="creator-section"><span>03</span><div><h3>Choose upcoming set lists</h3><p>Attach one or more plans—for example a main set, offering, and response set.</p><div className="attach-set-list"><button className={!attachedSets.length ? "selected" : ""} onClick={() => setAttachedSets([])}><span className="song-art"><Icon name="plus" /></span><span><strong>Start without a set list</strong><small>Add plans after creating the service</small></span></button>{setListOptions.map((set) => { const selected = attachedSets.includes(set.id); return <button className={selected ? "selected" : ""} onClick={() => setAttachedSets(selected ? attachedSets.filter((id) => id !== set.id) : [...attachedSets, set.id])} key={set.id}><i style={{ background: set.color }} /><span><strong>{set.title}</strong><small>{set.date} · {set.time} · {set.songs.length} songs · {set.status}</small><small className="set-preview-songs">{set.songs.slice(0,3).map((song) => song.title).join(" · ") || "Empty set list"}</small></span><em>{selected ? "✓" : ""}</em></button>; })}</div>{attachedSets.length > 0 && <div className="attached-summary"><Icon name="check" size={14} /> {attachedSets.length} set {attachedSets.length === 1 ? "list" : "lists"} · {setListOptions.filter((set) => attachedSets.includes(set.id)).reduce((total,set) => total + set.songs.length,0)} songs attached</div>}</div></section>}
        </>}
        {type === "set" && <>
          <section className="creator-section"><span>01</span><div><h3>Set list details</h3><p>Name the plan and optionally connect it to a service.</p><div className="form-grid"><label>Set list name<input value={name} onChange={(event) => setName(event.target.value)} placeholder="Sunday Morning · April 6" /></label><label>Related service<select><option>Evening Gathering · Apr 6</option><option>Palm Sunday · Apr 13</option><option>Not attached yet</option></select></label></div><p className="field-label">Card color</p><div className="set-color-options">{["#9b59b6","#1abc9c","#e67e22","#a0815e","#4878a8","#b54d70"].map((optionColor) => <button className={color === optionColor ? "selected" : ""} onClick={() => setColor(optionColor)} style={{ background: optionColor }} key={optionColor} aria-label={`Choose ${optionColor}`} />)}</div></div></section>
          <section className="creator-section"><span>02</span><div><h3>Choose songs</h3><p>Browse by genre or use suggestions from your church history.</p><div className="genre-tabs">{["Suggested","Worship","Praise","Hymns","Contemporary"].map((genre,index) => <button onClick={soon} className={index === 0 ? "active" : ""} key={genre}>{genre}</button>)}</div><div className="creator-song-grid">{[["Goodness of God","Worship","G","violet"],["Build My Life","Worship","D","blue"],["Gratitude","Contemporary","B","amber"],["Holy Forever","Praise","Db","teal"]].map((song) => <button onClick={soon} className={`creator-song ${song[3]}`} key={song[0]}><span className="song-art"><Icon name="music" /></span><span><strong>{song[0]}</strong><small>{song[1]} · Key {song[2]}</small></span><Icon name="plus" /></button>)}</div></div></section>
        </>}
        {type === "song" && <>
          <section className="creator-section"><span>01</span><div><h3>Song identity</h3><p>General information available to everyone.</p><div className="form-grid"><label>Song title<input value={name} onChange={(event) => setName(event.target.value)} placeholder="Enter song title" /></label><label>Artist / writer<input placeholder="Artist or writer" /></label><label>Language<select><option>English</option><option>Spanish</option><option>Bilingual</option></select></label><label>Genre<select><option>Worship</option><option>Praise</option><option>Contemporary</option><option>Hymn</option></select></label></div></div></section>
          <section className="creator-section"><span>02</span><div><h3>Musical details</h3><p>Add enough information for singers and musicians to prepare.</p><div className="form-grid three"><label>Original key<select>{chromatic.map((key) => <option key={key}>{key}</option>)}</select></label><label>Tempo<input placeholder="72 BPM" /></label><label>Time<select><option>4/4</option><option>3/4</option><option>6/8</option></select></label></div><label className="creator-chords">Lyrics and chords<textarea placeholder="[Verse 1]&#10;[G] Write chords directly before the lyric…" /></label></div></section>
        </>}
      </main>
      <aside><div className="creator-help card"><Icon name={type === "service" ? "calendar" : type === "set" ? "note" : "music"} /><p className="eyebrow">Before you create</p><h3>{type === "song" ? "Shared with everyone" : "Private to Calvario Sur"}</h3><p>{type === "song" ? "Songs enter the shared catalog. Your church versions and usage stay private." : "Only approved members of your church can see this information."}</p></div></aside>
    </div>
  </div>;
}

function DetailScreen({ type, title, onClose }: { type: "service" | "event" | "member"; title: string; onClose: () => void }) {
  const { songs, team, additionalSongs, setLists: liveSets } = useLive();
  const [serviceSet, setServiceSet] = useState("Main Set");
  if (type === "member") return <div className="detail-screen"><header><button onClick={onClose}><Icon name="chevron" /> Back</button><p className="eyebrow">Team profile</p><span /></header><main><section className="member-hero card"><div className="avatar violet">{title.split(" ").map((part) => part[0]).join("")}</div><div><h1>{title}</h1><p>Vocalist · Worship Leader</p><span>Confirmed for Sunday Gathering</span></div><button onClick={soon}><Icon name="message" /> Message</button></section><div className="member-detail-grid"><article className="card"><p className="eyebrow">Upcoming schedule</p>{[["MAR 30","Sunday Gathering","Lead vocal"],["APR 13","Palm Sunday","Backup vocal"],["APR 27","Sunday Gathering","Worship leader"]].map((item) => <div className="profile-schedule" key={item[0]}><span>{item[0]}</span><div><strong>{item[1]}</strong><small>{item[2]}</small></div><Icon name="chevron" size={14} /></div>)}</article><article className="card"><p className="eyebrow">Songs they lead</p>{["Goodness of God","Holy Forever","Gratitude"].map((song,index) => <button onClick={soon} className="profile-song" key={song}><span className="song-art"><Icon name="music" /></span><span><strong>{song}</strong><small>{index + 3} times led</small></span><Icon name="chevron" size={14} /></button>)}</article></div></main></div>;
  if (type === "event") return <div className="detail-screen"><header><button onClick={onClose}><Icon name="chevron" /> Back</button><p className="eyebrow">Calvario Sur · Team event</p><button onClick={soon} className="accent-action">Edit event</button></header><main><section className="event-detail-hero card"><span className="settings-symbol"><Icon name="calendar" /></span><div><p className="eyebrow">Shared with team</p><h1>{title}</h1><p><Icon name="clock" size={14} /> April 20 · 9:00 AM · Main Auditorium</p></div></section><article className="event-description card"><p className="eyebrow">Details</p><h3>Team calendar item</h3><p>Use this space for rehearsal details, preparation notes, or reminders. All approved members of Calvario Sur can see this event.</p><div><span><Icon name="users" size={14} /> Team visibility</span><button onClick={soon}>Notify team</button></div></article></main></div>;
  const rec = isBackendConfigured ? liveSets.find((x) => x.title === title) : undefined;
  const tabOf = (section = "") => (/offering/i.test(section) ? "Offering" : /response/i.test(section) ? "Response" : "Main Set");
  const inTab = (set: string) => (rec?.songs ?? []).filter((x) => tabOf((x as { section?: string }).section) === set);
  const detailSongs = isBackendConfigured ? inTab(serviceSet) : serviceSet === "Main Set" ? songs : serviceSet === "Offering" ? [additionalSongs[0], songs[2]] : [songs[3]];
  return <div className="detail-screen"><header><button onClick={onClose}><Icon name="chevron" /> Back</button><p className="eyebrow">Calvario Sur · Service</p><button onClick={soon} className="accent-action">Edit service</button></header><main><section className="service-detail-hero card"><div className="date-block"><strong>{rec ? rec.date.split(" ")[1] : "30"}</strong><small>{rec ? rec.date.split(" ")[0] : "MAR"}</small></div><div><p className="eyebrow">Next service</p><h1>{title}</h1><p><Icon name="clock" size={14} /> Sunday · 9:00 AM · Main Auditorium</p></div><span className="ready-badge">Ready</span></section><div className="service-detail-grid"><article className="card"><div className="section-heading"><div><p className="eyebrow">Service flow</p><h3>{isBackendConfigured ? `${rec?.songs.length ?? 0} songs in this service` : `3 set lists · ${songs.length + 3} songs`}</h3></div><button onClick={soon} className="accent-action"><Icon name="play" /> Rehearse</button></div><div className="service-set-tabs">{["Main Set","Offering","Response"].map((set,index) => <button className={serviceSet === set ? "active" : ""} onClick={() => setServiceSet(set)} key={set}><span style={{ background: ["#9b59b6","#1abc9c","#e67e22"][index] }} />{set}<small>{isBackendConfigured ? inTab(set).length : [4,2,1][index]}</small></button>)}</div>{detailSongs.map((song,index) => <button onClick={soon} className="detail-song" key={song.title}><span>{String(index+1).padStart(2,"0")}</span><span className="song-art"><Icon name="music" /></span><span><strong>{song.title}</strong><small>{song.detail}</small></span><em>{song.leader}</em></button>)}</article><aside><article className="card"><p className="eyebrow">Serving team</p>{team.slice(0,5).map((person) => <div className="detail-person" key={person.name}><span className={`avatar ${person.color}`}>{person.initials}</span><span><strong>{person.name}</strong><small>{person.role}</small></span><i /></div>)}</article><article className="card service-note"><p className="eyebrow">Service note</p><p>Band at 7:15, vocals at 7:30. Full run starts promptly at 7:45.</p></article></aside></div></main></div>;
}

function WorkspacePage({ page, onExit, onNavigate, contextSong, accent, onAccentChange, darkMode, onDarkModeChange }: { page: string; onExit?: () => void; onNavigate?: (page: string, song?: string) => void; contextSong?: string | null; accent: string; onAccentChange: (color: string) => void; darkMode: boolean; onDarkModeChange: (dark: boolean) => void }) {
  const { songs, team, additionalSongs } = useLive();
  const [serviceTab, setServiceTab] = useState("Upcoming");
  const [songStyle, setSongStyle] = useState("All");
  const [songKey, setSongKey] = useState("All keys");
  const [songOrder, setSongOrder] = useState("All");
  const [songSearch, setSongSearch] = useState("");
  const [selectedSong, setSelectedSong] = useState<string | null>(null);
  const [songView, setSongView] = useState<"chords" | "lyrics">("chords");
  const [chordEditorOpen, setChordEditorOpen] = useState(false);
  const [transpose, setTranspose] = useState(0);
  const [rehearseOpen, setRehearseOpen] = useState(false);
  const [rehearsalSong, setRehearsalSong] = useState(0);
  const [pendingRequests, setPendingRequests] = useState(["Elena Cruz", "David Young"]);
  const [creator, setCreator] = useState<"service" | "set" | "song" | null>(null);
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [selectedMember, setSelectedMember] = useState<string | null>(null);
  const [settingsTab, setSettingsTab] = useState("Profile");
  const [chatInput, setChatInput] = useState("");
  const [sentMessages, setSentMessages] = useState<string[]>([]);
  const live = useLive();
  const [setLists, setSetLists] = useState<SetListRecord[]>(() => isBackendConfigured ? live.setLists : loadStored("hallowly-set-lists", initialSetLists));
  const lib = useLibrary();
  const auth = useAuth();
  const isLead = auth.isLead;
  const liveSong = isBackendConfigured && selectedSong ? lib.songs.find((x) => x.title === selectedSong) : undefined;
  const chartKey = liveSong?.originalKey ?? "G";
  const [draft, setDraft] = useState({ title: "", artist: "", style: "Worship", key: "G", bpm: "", sheet: "" });
  useEffect(() => { if (liveSong) lib.ensureChart(liveSong.id); }, [selectedSong]);
  useEffect(() => { // fill the editor from the real song each time it opens
    if (!liveSong || !chordEditorOpen || liveSong.loaded === false) return;
    setDraft({ title: liveSong.title, artist: liveSong.artist ?? "", style: liveSong.style ?? "Worship", key: liveSong.originalKey, bpm: liveSong.bpm ? String(liveSong.bpm) : "", sheet: toInlineSheet(liveSong.sections) });
  }, [chordEditorOpen, selectedSong, liveSong?.loaded]);
  const saveSong = async () => {
    if (!liveSong) return toast("Open a song first.", "error");
    const why = await auth.ensureLead();
    if (why) return toast(why, "error");
    const title = draft.title.trim() || liveSong.title;
    toast("Saving…");
    const err = await lib.updateSong(liveSong.id, { title, artist: draft.artist, style: draft.style, originalKey: draft.key, bpm: draft.bpm ? Number(draft.bpm) : undefined, body: "", sections: fromInlineSheet(draft.sheet) });
    if (err) return toast(err, "error");
    toast("Chart saved", "ok");
    setChordEditorOpen(false); setSelectedSong(title);
  };
  const saved = useRef<Record<string, string>>({});
  useEffect(() => { // database -> screen, without overwriting edits that haven't been saved yet
    if (!isBackendConfigured) return;
    setSetLists((cur) => live.setLists.map((ls) => {
      const loc = cur.find((c) => c.id === ls.id);
      if (loc && JSON.stringify(loc) !== saved.current[ls.id]) return loc;
      saved.current[ls.id] = JSON.stringify(ls);
      return ls;
    }));
  }, [live.setLists]);
  useEffect(() => { // screen -> database, a moment after the last change
    if (!isBackendConfigured) return;
    const t = setTimeout(() => setLists.forEach((rec) => {
      const json = JSON.stringify(rec);
      if (saved.current[rec.id] === undefined || saved.current[rec.id] === json || !lib.getSetlistById(rec.id)) return;
      saved.current[rec.id] = json;
      lib.replaceSetlist(rec.id, recordToInput(rec, lib.songs)).then((err) => toast(err ?? "Set list saved", err ? "error" : "ok"));
    }), 700);
    return () => clearTimeout(t);
  }, [setLists]);
  const [activeSetId, setActiveSetId] = useState<string | null>(null);
  const [songPickerOpen, setSongPickerOpen] = useState(false);
  const [commentDraft, setCommentDraft] = useState("");
  const [noteEditorOpen, setNoteEditorOpen] = useState(false);
  const [createdServices, setCreatedServices] = useState<Array<{ name: string; kind: "service" | "event" }>>(() => loadStored("hallowly-created-schedule", []));
  const [setTemplates, setSetTemplates] = useState<Array<{ name: string; color: string; songs: Song[] }>>(() => loadStored("hallowly-set-templates", [
    { name: "Sunday Standard", color: "#9b59b6", songs: songs.slice(0, 3) },
    { name: "Acoustic Evening", color: "#a0815e", songs: [songs[1], additionalSongs[0]].filter(Boolean) },
    { name: "Youth Gathering", color: "#1abc9c", songs: [additionalSongs[1], songs[1], additionalSongs[0]].filter(Boolean) },
  ]));
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [selectedEventItem, setSelectedEventItem] = useState<string | null>(null);
  const activeSet = setLists.find((set) => set.id === activeSetId) ?? null;

  useEffect(() => {
    window.localStorage.setItem("hallowly-set-lists", JSON.stringify(setLists));
  }, [setLists]);

  useEffect(() => {
    window.localStorage.setItem("hallowly-set-templates", JSON.stringify(setTemplates));
  }, [setTemplates]);

  useEffect(() => {
    window.localStorage.setItem("hallowly-created-schedule", JSON.stringify(createdServices));
  }, [createdServices]);

  const updateActiveSet = (update: (set: SetListRecord) => SetListRecord) => {
    if (!activeSetId) return;
    setSetLists((current) => current.map((set) => set.id === activeSetId ? update(set) : set));
  };

  useEffect(() => {
    const closeWorkspaceOverlay = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (chordEditorOpen) setChordEditorOpen(false);
      else if (selectedSong) setSelectedSong(null);
      else if (songPickerOpen) setSongPickerOpen(false);
      else if (templateDialogOpen) setTemplateDialogOpen(false);
      else if (rehearseOpen) setRehearseOpen(false);
      else if (selectedService) setSelectedService(null);
      else if (selectedEventItem) setSelectedEventItem(null);
      else if (selectedMember) setSelectedMember(null);
      else if (creator) setCreator(null);
    };
    window.addEventListener("keydown", closeWorkspaceOverlay);
    return () => window.removeEventListener("keydown", closeWorkspaceOverlay);
  }, [chordEditorOpen, creator, rehearseOpen, selectedEventItem, selectedMember, selectedService, selectedSong, songPickerOpen, templateDialogOpen]);

  useEffect(() => {
    const shouldLock = Boolean(creator || selectedSong || songPickerOpen || templateDialogOpen || rehearseOpen || selectedService || selectedEventItem || selectedMember || page === "Messages");
    if (!shouldLock) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [creator, page, rehearseOpen, selectedEventItem, selectedMember, selectedService, selectedSong, songPickerOpen, templateDialogOpen]);
  const [setKeys, setSetKeys] = useState<Record<string, string>>({ "Firm Foundation": "C", "Build My Life": "D", "Goodness of God": "G", "Holy Forever": "Db" });
  const [savedVersion, setSavedVersion] = useState(false);
  const [settingsState, setSettingsState] = useState({ reminders: true, dark: true, compact: false });

  if (page === "Services") {
    return (
      <div className="workspace-page">
        {selectedMember && <DetailScreen type="member" title={selectedMember} onClose={() => setSelectedMember(null)} />}
        {creator && <CreatorScreen type={creator} setListOptions={setLists} onClose={() => setCreator(null)} onCreate={(name, _color, kind = "service") => { if (creator === "service") setCreatedServices((current) => [...current, { name, kind }]); }} />}
        {selectedService && <DetailScreen type="service" title={selectedService} onClose={() => setSelectedService(null)} />}
        {selectedEventItem && <DetailScreen type="event" title={selectedEventItem} onClose={() => setSelectedEventItem(null)} />}
        <PageGuide step="CALVARIO SUR · SERVICES" title={contextSong ? `Services using “${contextSong}”` : "Plan the gathering from one place"} copy={contextSong ? "Showing your church services where this song was included." : "Only members of your church can view these services, set lists, and team assignments."} />
        <div className="page-toolbar"><div className="segmented">{["Upcoming", "Past", "Drafts"].map((tab) => <button key={tab} className={serviceTab === tab ? "active" : ""} onClick={() => setServiceTab(tab)}>{tab}</button>)}</div><button className="accent-action" onClick={() => setCreator("service")}><Icon name="plus" size={15} /> New item</button></div>
        <div className="service-page-grid">
          {[
            ["30", "MAR", "Sunday Gathering", "9:00 AM", "Ready", "4 songs · 8 people"],
            ["06", "APR", "Evening Gathering", "5:00 PM", "Needs attention", "3 songs · 5 people"],
            ["13", "APR", "Palm Sunday", "9:00 AM", "Draft", "2 songs · 3 people"],
            ...createdServices.map((item) => ["20", "APR", item.name, "9:00 AM", item.kind === "event" ? "Event" : "Draft", item.kind === "event" ? "Team calendar item" : "0 songs · 0 people"]),
          ].map((service, index) => (
            <article className={`service-list-card card ${index === 0 ? "featured" : ""}`} key={service[2]}>
              <span className="date-block"><strong>{service[0]}</strong><small>{service[1]}</small></span>
              <div className="service-list-copy"><span>{index === 0 ? "NEXT SERVICE" : "MAIN AUDITORIUM"}</span><h3>{service[2]}</h3><p><Icon name="clock" size={13} /> {service[3]} · {service[5]}</p></div>
              <span className={`plan-status status-${service[4].toLowerCase().replace(/ /g, "-")}`}>{service[4]}</span><button className="round-arrow" onClick={() => service[4] === "Event" ? setSelectedEventItem(service[2]) : setSelectedService(service[2])}><Icon name="chevron" /></button>
            </article>
          ))}
        </div>
        <div className="content-section">
          <div className="content-section-title"><div><p className="eyebrow">Set list templates</p><h2>Start with a familiar flow</h2></div><button onClick={soon}>View all</button></div>
          <div className="template-grid">
            {["Sunday Standard", "Acoustic Evening", "Youth Gathering"].map((name, index) => <article className="template-card card" key={name}><span>0{index + 1}</span><Icon name="music" /><h3>{name}</h3><p>{index + 3} songs · Last used {index + 1} weeks ago</p><button onClick={() => setCreatedServices((current) => [...current, { name: `${name} Service`, kind: "service" }])}>Use template <Icon name="chevron" size={13} /></button></article>)}
          </div>
        </div>
      </div>
    );
  }

  if (page === "Set Lists") {
    const setSongs = activeSet?.songs ?? [];
    const availableSongs = [...songs, ...additionalSongs].filter((song) => !setSongs.some((current) => current.title === song.title));
    const selectedSetSong = setSongs.find((song) => song.title === selectedSong);
    const selectedSetKey = selectedSong && selectedSetSong ? (setKeys[selectedSong] ?? selectedSetSong.detail.split(" · ")[0]) : "G";
    const addSong = (song: Song) => updateActiveSet((set) => ({ ...set, songs: [...set.songs, song] }));
    return (
      <div className="workspace-page">
        {creator && <CreatorScreen type={creator} onClose={() => setCreator(null)} onCreate={(name, color) => {
          if (creator === "set") {
            if (isBackendConfigured) {
              setActiveSetId(lib.addSetlist({ serviceTitle: name, serviceDate: nextSunday(), eventType: "Sunday AM", entries: [], crew: [] }));
            } else {
              const created: SetListRecord = { id: `set-${Date.now()}`, title: name, date: "UPCOMING", time: "9:00 AM", location: "Main Auditorium", color, status: "Draft", songs: [], note: "", comments: [] };
              setSetLists((current) => [...current, created]);
              setActiveSetId(created.id);
            }
          } else if (creator === "song" && activeSet) {
            const customSong: Song = { title: name, detail: "C · 72 BPM · 0:00", leader: "—", notes: "Newly added song." };
            addSong(customSong);
          }
        }} />}
        <PageGuide step="SET LISTS" title={contextSong ? `Set lists containing “${contextSong}”` : "Build a clear path through the service"} copy={contextSong ? "Filtered to set lists from your church that used this song." : "Open an active set, reuse a trusted template, or begin a new arrangement from your song library."} />
        <div className="page-toolbar"><div className="segmented">{["Active", "Templates", "Archive"].map((tab) => <button key={tab} className={serviceTab === tab || (tab === "Active" && serviceTab === "Upcoming") ? "active" : ""} onClick={() => setServiceTab(tab)}>{tab}</button>)}</div><button className="accent-action" onClick={() => setCreator("set")}><Icon name="plus" size={15} /> New set list</button></div>
        {!activeSet && serviceTab !== "Templates" && serviceTab !== "Archive" && <div className="set-list-collection">
          {setLists.filter((set) => !contextSong || set.songs.some((song) => song.title === contextSong)).map((set) => <button className="set-collection-card card" style={{ "--set-color": set.color } as CSSProperties} onClick={() => setActiveSetId(set.id)} key={set.id}><span className="set-date">{set.date}</span><div><span>{set.status}</span><h3>{set.title}</h3><p><Icon name="clock" size={13} /> {set.time} · {set.location}</p></div><div className="set-song-dots">{set.songs.slice(0,4).map((song) => <i key={song.title} />)}<small>{set.songs.length} songs</small></div><Icon name="chevron" /></button>)}
        </div>}
        {!activeSet && serviceTab === "Archive" && <div className="empty-state card"><span><Icon name="note" /></span><h2>No archived set lists</h2><p>Set lists you archive will stay available here for reference and reuse.</p></div>}
        {!activeSet && serviceTab === "Templates" && <div className="template-grid set-template-grid">{setTemplates.map((template, index) => <article className="template-card card" key={template.name}><span>{String(index + 1).padStart(2,"0")}</span><Icon name="music" /><h3>{template.name}</h3><p>{template.songs.length} songs · Ready to customize</p><button onClick={() => { const created: SetListRecord = { id: `set-${Date.now()}`, title: `${template.name} Copy`, date: "UPCOMING", time: "9:00 AM", location: "Main Auditorium", color: template.color, status: "Draft", songs: template.songs, note: "", comments: [] }; setSetLists((current) => [...current,created]); setActiveSetId(created.id); }}>Use template <Icon name="chevron" size={13} /></button></article>)}</div>}
        {activeSet && <><button className="back-to-sets" onClick={() => setActiveSetId(null)}><Icon name="chevron" size={14} /> All set lists</button><div className="sets-layout">
          <section className="active-set card">
            <div className="active-set-head"><div><p className="eyebrow">{activeSet.date} · {activeSet.status}</p><h2>{activeSet.title}</h2><span>{activeSet.time} · {activeSet.location}</span></div><div className="set-head-actions"><span className="ready-badge">{activeSet.status}</span><button className="template-action" onClick={() => { setTemplateName(`${activeSet.title} Template`); setTemplateDialogOpen(true); }}><Icon name="note" size={13} /> Save template</button><button className="accent-action" disabled={!setSongs.length} onClick={() => { setRehearsalSong(0); setTranspose(0); setRehearseOpen(true); }}><Icon name="play" size={14} /> Rehearse</button></div></div>
            <div className="set-flow">
              {setSongs.map((song, index) => <div className="set-song-row" key={song.title}><span>{String(index + 1).padStart(2, "0")}</span><span className="song-art"><Icon name="music" size={15} /></span><button className="set-song-name" onClick={() => setSelectedSong(song.title)}><strong>{song.title}</strong><small>{song.detail.split(" · ").slice(1).join(" · ")}</small></button><label><small>SET KEY</small><select value={setKeys[song.title] ?? song.detail.split(" · ")[0]} onChange={(event) => { setSetKeys({ ...setKeys, [song.title]: event.target.value }); setSavedVersion(false); }}>{["C","Db","D","Eb","E","F","F#","G","Ab","A","Bb","B"].map((key) => <option key={key}>{key}</option>)}</select></label><em>{song.leader}</em><button className="remove-set-song" aria-label={`Remove ${song.title}`} onClick={() => updateActiveSet((set) => ({ ...set, songs: set.songs.filter((item) => item.title !== song.title) }))}>×</button></div>)}
              <button className="add-to-set" onClick={() => setSongPickerOpen(true)}><Icon name="plus" size={15} /> Add song or service item</button>
            </div>
          </section>
          <aside className="set-summary">
            <article className="card"><p className="eyebrow">Set overview</p><div><strong>{setSongs.length * 5}:00</strong><span>Total music</span></div><div><strong>{setSongs.length}</strong><span>Songs</span></div><div><strong>{new Set(setSongs.map((song) => setKeys[song.title] ?? song.detail.split(" · ")[0])).size}</strong><span>Keys used</span></div></article>
            <article className="card set-note"><Icon name="note" size={16} /><strong>Set notes · {activeSet.comments.length} comments</strong>{noteEditorOpen ? <textarea value={activeSet.note} onChange={(event) => updateActiveSet((set) => ({ ...set, note: event.target.value }))} /> : <p>{activeSet.note || "No notes yet."}</p>}{activeSet.comments.map((comment) => <div className="mini-comment" key={comment}><span className="avatar auburn">SK</span><span>{comment}</span></div>)}<button onClick={() => setNoteEditorOpen((value) => !value)}>{noteEditorOpen ? "Done editing" : "Edit note"}</button><div className="comment-compose"><input value={commentDraft} onChange={(event) => setCommentDraft(event.target.value)} placeholder="Add a comment" /><button onClick={() => { if (!commentDraft.trim()) return; updateActiveSet((set) => ({ ...set, comments: [...set.comments, commentDraft.trim()] })); setCommentDraft(""); }}><Icon name="plus" size={13} /></button></div></article>
          </aside>
        </div>
        <section className="suggestions-section">
          <div className="content-section-title"><div><p className="eyebrow">Suggested next songs</p><h2>Fits this set</h2><small>Based on key flow, worship style, and songs your church has paired before.</small></div></div>
          <div className="suggestion-grid">{additionalSongs.slice(0, 6).map((song, index) => <article className="suggestion card" key={song.title}><span className="song-art"><Icon name="music" size={15} /></span><div><strong>{song.title}</strong><small>{["Similar worship flow","Played together before","Smooth chord transition"][index]}</small></div><em>{song.detail.split(" · ")[0]}</em><button disabled={setSongs.some((item) => item.title === song.title)} onClick={() => addSong(song)}><Icon name="plus" size={14} /></button></article>)}</div>
        </section>
        </>}
        {songPickerOpen && activeSet && <div className="song-picker-backdrop" onClick={() => setSongPickerOpen(false)}><section className="song-picker card" onClick={(event) => event.stopPropagation()}><div><div><p className="eyebrow">Song library</p><h2>Add to {activeSet.title}</h2></div><button onClick={() => setSongPickerOpen(false)}>Close</button></div><label className="search-field"><Icon name="music" /><input placeholder="Search the shared library…" /></label><div>{availableSongs.map((song) => <button key={song.title} onClick={() => { addSong(song); setSongPickerOpen(false); }}><span className="song-art"><Icon name="music" /></span><span><strong>{song.title}</strong><small>{song.detail}</small></span><Icon name="plus" /></button>)}</div><button className="missing-song" onClick={() => { setSongPickerOpen(false); setCreator("song"); }}><Icon name="plus" /><span><strong>Song not in the library?</strong><small>Add it to the database, then include it in this set.</small></span></button></section></div>}
        {templateDialogOpen && activeSet && <div className="song-picker-backdrop" onClick={() => setTemplateDialogOpen(false)}><section className="template-dialog card" onClick={(event) => event.stopPropagation()}><span className="settings-symbol"><Icon name="note" /></span><p className="eyebrow">Reusable set list</p><h2>Save as template</h2><p>This saves the song order and current keys without the service date or team assignments.</p><label>Template name<input autoFocus value={templateName} onChange={(event) => setTemplateName(event.target.value)} /></label><div><button onClick={() => setTemplateDialogOpen(false)}>Cancel</button><button className="accent-action" onClick={() => { if (!templateName.trim()) return; setSetTemplates((current) => [...current, { name: templateName.trim(), color: activeSet.color, songs: activeSet.songs }]); setTemplateDialogOpen(false); }}>Save template</button></div></section></div>}
        {selectedSong && selectedSetSong && activeSet && <div className="song-editor-backdrop" onClick={() => setSelectedSong(null)}><section className="set-song-viewer card" onClick={(event) => event.stopPropagation()}><header><button onClick={() => setSelectedSong(null)}><Icon name="chevron" size={15} /> Back</button><div><p className="eyebrow">{activeSet.title} · Set arrangement</p><h2>{selectedSetSong.title}</h2><span>{selectedSetSong.detail}</span></div><label>Set key<select value={selectedSetKey} onChange={(event) => setSetKeys({ ...setKeys, [selectedSong]: event.target.value })}>{chromatic.map((key) => <option key={key}>{key}</option>)}</select></label></header><div className="set-song-viewer-body"><main><ChartBody title={selectedSong} keyName={selectedSetKey} /></main><aside><div><p className="eyebrow">Arrangement notes</p><p>{selectedSetSong.notes}</p></div><div><p className="eyebrow">Set note</p><p>{activeSet.note || "No set note added."}</p></div><div className="viewer-comment"><span className="avatar auburn">SK</span><p>Try the final chorus with vocals only.</p></div><button onClick={() => setSavedVersion(true)}><Icon name="note" size={14} /> {savedVersion ? "Arrangement saved" : "Edit arrangement"}</button></aside></div></section></div>}
        {rehearseOpen && activeSet && setSongs[rehearsalSong] && <div className="rehearsal-backdrop"><section className="rehearsal-player">
          <header><button onClick={() => setRehearseOpen(false)}><Icon name="chevron" size={17} /></button><div><strong>{setSongs[rehearsalSong]?.title}</strong><span>{activeSet.title} · {rehearsalSong + 1} of {setSongs.length}</span></div><em>{transposeChord(setKeys[setSongs[rehearsalSong]?.title] ?? setSongs[rehearsalSong].detail.split(" · ")[0], transpose)}</em></header>
          <div className="rehearsal-scroll"><ChartBody title={setSongs[rehearsalSong]?.title} keyName={transposeChord(setKeys[setSongs[rehearsalSong]?.title] ?? setSongs[rehearsalSong].detail.split(" · ")[0], transpose)} /></div>
          <footer><div className="rehearsal-modes"><button onClick={soon}>Lyrics</button><button onClick={soon} className="active">Combined</button><button onClick={soon}>Chords</button></div><div className="rehearsal-tools"><div><button onClick={() => setTranspose((value) => value - 1)}>−</button><span><small>KEY</small>{transposeChord(setKeys[setSongs[rehearsalSong]?.title] ?? setSongs[rehearsalSong].detail.split(" · ")[0], transpose)}</span><button onClick={() => setTranspose((value) => value + 1)}>+</button></div><div><button onClick={soon}>−</button><span><small>CAPO</small>0</span><button onClick={soon}>+</button></div><button onClick={soon} className="play-song"><Icon name="play" size={17} /></button></div><div className="song-skip"><button disabled={rehearsalSong === 0} onClick={() => { setRehearsalSong(rehearsalSong - 1); setTranspose(0); }}>← Previous</button><button disabled={rehearsalSong === setSongs.length - 1} onClick={() => { setRehearsalSong(rehearsalSong + 1); setTranspose(0); }}>Next →</button></div></footer>
        </section></div>}
      </div>
    );
  }

  if (page === "Songs") {
    const demoLibrary = [
      ["A Dios sea la gloria", "Cristal Lewis", "G", "Contemporary", "12"],
      ["A Él la gloria", "Miel San Marcos", "B", "Contemporary", "8"],
      ["A ti atribuimos la gloria", "Elim", "A", "Contemporary", "15"],
      ["Abre Mis Ojos Oh Cristo", "Danilo Montero", "E", "Contemporary", "6"],
      ["Agnus Dei", "Marcos Barrientos", "A", "Worship", "11"],
      ["Al campo enemigo yo fui", "Tradicional", "C", "Praise", "4"],
      ["Al Estar Aquí", "Jesús Adrián Romero", "E", "Worship", "18"],
      ["Al Que Me Ciñe", "Marcos Witt", "F", "Praise", "9"],
      ["Gratitude", "Brandon Lake", "B", "Worship", "7"],
    ];
    const librarySongs = live.librarySongs ?? demoLibrary;
    const visibleSongs = librarySongs.filter((song) => {
      const query = songSearch.trim().toLowerCase();
      const matchesSearch = !query || song.slice(0, 4).some((value) => value.toLowerCase().includes(query));
      return matchesSearch && (songStyle === "All" || song[3] === songStyle) && (songKey === "All keys" || song[2] === songKey);
    });
    return (
      <div className="workspace-page">
        {creator && <CreatorScreen type={creator} onClose={() => setCreator(null)} />}
        <PageGuide step={`SHARED SONG LIBRARY · ${librarySongs.length} SONGS`} title="Songs belong to everyone" copy="Browse the shared catalog. Your church history and arrangements remain private to your team." />
        <div className="song-page-action"><button className="accent-action" onClick={() => setCreator("song")}><Icon name="plus" size={15} /> Add song</button></div>
        <div className="song-filter-bar card">
          <label className="search-field"><Icon name="music" size={16} /><input value={songSearch} onChange={(event) => setSongSearch(event.target.value)} placeholder="Search by title, artist, or key…" /></label>
          <select value={songStyle} onChange={(event) => setSongStyle(event.target.value)}><option>All</option><option>Contemporary</option><option>Worship</option><option>Praise</option></select>
          <select value={songKey} onChange={(event) => setSongKey(event.target.value)}><option>All keys</option>{["A","B","C","E","F","G"].map((key) => <option key={key}>{key}</option>)}</select>
          <div className="filter-tabs">{["All","Most used","Recently added"].map((filter) => <button key={filter} className={songOrder === filter ? "active" : ""} onClick={() => setSongOrder(filter)}>{filter}</button>)}</div>
        </div>
        <div className="song-catalog-layout">
          <section>
            <div className="catalog-heading"><span>{visibleSongs.length} songs shown</span><select><option>A — Z</option><option>Most used</option><option>Recently added</option></select></div>
            <div className="song-card-grid">
              {visibleSongs.map((song) => <article className="catalog-song card" key={song[0]}><div className="catalog-song-top"><div><h3>{song[0]}</h3><p>{song[1]}</p></div><span>{song[2]}</span></div><em>{song[3]}</em><div className="song-stats"><span><strong>{song[4]}</strong>YOUR CHURCH USES</span>{!isBackendConfigured && <span><strong>{Number(song[4]) * 2}</strong>GLOBAL USES</span>}</div><div className="catalog-actions"><button onClick={() => { setTranspose(0); setSelectedSong(song[0]); }}>Chords</button><button onClick={() => { setTranspose(0); setSelectedSong(song[0]); }}>View <Icon name="chevron" size={12} /></button></div></article>)}
            </div>
          </section>
          <aside className="catalog-aside">
            <article className="card filter-summary"><p className="eyebrow">Styles</p>{Object.entries(librarySongs.reduce<Record<string, number>>((m, x) => ((m[x[3]] = (m[x[3]] ?? 0) + 1), m), {})).sort((x, y) => y[1] - x[1]).slice(0, 4).map(([name, n]) => <button key={name} onClick={() => setSongStyle(name)}><span>{name}</span><i><b style={{ width: `${Math.round((n / Math.max(librarySongs.length, 1)) * 100)}%` }} /></i><em>{n}</em></button>)}</article>
            <article className="card common-keys"><p className="eyebrow">Common keys</p><div>{Object.entries(librarySongs.reduce<Record<string, number>>((m, x) => ((m[x[2]] = (m[x[2]] ?? 0) + 1), m), {})).sort((x, y) => y[1] - x[1]).slice(0, 10).map((x) => x[0]).map((key) => <button key={key} onClick={() => setSongKey(key.replace("m",""))}>{key}</button>)}</div></article>
            <article className="card recent-sets"><p className="eyebrow">Recent set lists</p>{setLists.slice(-3).reverse().map((set) => <button onClick={soon} key={set.id}><span>{set.title}<small>{set.date} · {set.songs.length} SONGS</small></span><Icon name="chevron" size={14} /></button>)}{setLists.length === 0 && <small>No set lists yet</small>}</article>
          </aside>
        </div>
        {selectedSong && <div className="song-editor-backdrop" onClick={() => setSelectedSong(null)}>
          <section className="song-sheet general-song-sheet card" onClick={(event) => event.stopPropagation()}>
            <header className="song-sheet-head">
              <div><p className="eyebrow">Shared song</p><h2>{selectedSong}</h2><p>{liveSong?.artist}</p><div><span>{liveSong?.style ?? "—"}</span><span>Original key {chartKey}</span>{liveSong?.bpm ? <span>{liveSong.bpm} BPM</span> : null}</div></div>
              <button onClick={() => setSelectedSong(null)}>Close</button>
            </header>
            <div className="song-sheet-toolbar">
              <div className="segmented"><button className={songView === "chords" ? "active" : ""} onClick={() => setSongView("chords")}>Lyrics + chords</button><button className={songView === "lyrics" ? "active" : ""} onClick={() => setSongView("lyrics")}>Lyrics only</button></div>
              {(!isBackendConfigured || isLead) && <button className="edit-chords-button" onClick={() => setChordEditorOpen((value) => !value)}><Icon name="note" size={14} /> {chordEditorOpen ? "Close editor" : "Edit chords"}</button>}
            </div>
            {chordEditorOpen ? <div className="fullscreen-chord-editor">
              <header className="chord-editor-top">
                <button className="editor-back" onClick={() => setChordEditorOpen(false)}><Icon name="chevron" size={16} /> Back to song</button>
                <div><p className="eyebrow">Chord sheet workspace</p><strong>{selectedSong}</strong><span>Editing the shared chart</span></div>
                <div><button onClick={saveSong}>Save draft</button><button className="accent-action" onClick={saveSong}>Publish changes</button></div>
              </header>
              <div className="chord-editor-layout">
                <main className="chord-editor-main">
                  <section className="editor-section">
                    <div className="editor-section-title"><span>01</span><div><strong>Song identity</strong><small>General information shown in the shared library</small></div></div>
                    <div className="identity-fields"><label>Song title<input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} /></label><label>Artist / writer<input value={draft.artist} onChange={(e) => setDraft({ ...draft, artist: e.target.value })} /></label><label>Genre<select value={draft.style} onChange={(e) => setDraft({ ...draft, style: e.target.value })}>{[...new Set(["Worship", "Praise", "Contemporary", "Hymn", draft.style])].map((g) => <option key={g}>{g}</option>)}</select></label></div>
                  </section>
                  <section className="editor-section">
                    <div className="editor-section-title"><span>02</span><div><strong>Musical details</strong><small>Set the source key before writing the chart</small></div></div>
                    <div className="editor-musical-row"><label>Original key<select value={draft.key} onChange={(e) => setDraft({ ...draft, key: e.target.value })}>{[...new Set([...chromatic, draft.key])].map((k) => <option key={k}>{k}</option>)}</select></label><label>Tempo<input value={draft.bpm} onChange={(e) => setDraft({ ...draft, bpm: e.target.value.replace(/\D/g, "") })} /></label></div>
                  </section>
                  <section className="editor-section chord-writing">
                    <div className="editor-section-title"><span>03</span><div><strong>Chord sheet</strong><small>Place chords in brackets directly before the lyric where they change</small></div></div>
                    <div className="insert-sections"><span>INSERT SECTION</span>{["Verse","Pre-Chorus","Chorus","Bridge","Outro"].map((section) => <button key={section} onClick={() => setDraft((d) => ({ ...d, sheet: `${d.sheet}\n\n[${section}]\n` }))}>+ {section}</button>)}</div>
                    <label><textarea spellCheck={false} value={draft.sheet} onChange={(e) => setDraft({ ...draft, sheet: e.target.value })} /></label>
                  </section>
                </main>
                <aside className="chord-editor-aside">
                  <article className="editor-preview card"><p className="eyebrow">Live preview</p><h3>{draft.title}</h3><span>{draft.artist} · Key {draft.key}</span><div>{fromInlineSheet(draft.sheet).slice(0, 2).flatMap((sec) => sec.lines.slice(0, 3).map((l) => <Fragment key={l.id}>{l.chords.length > 0 && <code style={{ whiteSpace: "pre" }}>{chordRow(l)}</code>}{l.lyric && <p>{l.lyric}</p>}</Fragment>))}</div></article>
                  
                  
                  <button onClick={soon} className="pdf-hold" disabled><Icon name="note" size={15} /><span><strong>Upload chord PDF</strong><small>On hold · coming in a future update</small></span></button>
                </aside>
              </div>
            </div> : <div className={`lyrics-sheet ${songView === "lyrics" ? "lyrics-only" : ""}`}>
              <ChartBody title={selectedSong} keyName={shiftChord(chartKey, transpose)} mode={songView} /></div>}
            <footer className="song-usage">
              <div><p className="eyebrow">Previously played by your church</p><span>Select one to open the matching set list or service.</span></div>
              {setLists.filter((set) => set.songs.some((x) => x.title === selectedSong)).slice(0, 3).map((set) => <button key={set.id} onClick={() => onNavigate?.("Set Lists", selectedSong)}><strong>{set.title}</strong><span>{set.date}</span><Icon name="chevron" size={13} /></button>)}{!setLists.some((set) => set.songs.some((x) => x.title === selectedSong)) && <span>Not in any set list yet.</span>}</footer>
          </section>
        </div>}
      </div>
    );
  }

  if (page === "Team") {
    return (
      <div className="workspace-page">
        <PageGuide step="CALVARIO SUR · TEAM" title="See who’s leading next" copy="Start with upcoming worship leaders, then use the calendar for the complete serving and rehearsal schedule." />
        <section className="cancellation-alert"><span><Icon name="bell" size={15} /></span><div><strong>Monday rehearsal cancelled by Maya</strong><p>March 24 · 7:00 PM — the team has been notified. Choose a replacement leader if rehearsal is rescheduled.</p></div><button onClick={soon}>Find coverage</button></section>
        {pendingRequests.length > 0 && <section className="access-requests card"><div><p className="eyebrow">Access requests</p><strong>{pendingRequests.length} people want to join your church team</strong></div>{pendingRequests.map((name) => <div key={name}><span className="avatar teal">{name.split(" ").map((part) => part[0]).join("")}</span><span><strong>{name}</strong><small>Requested vocalist access</small></span><button onClick={() => setPendingRequests(pendingRequests.filter((person) => person !== name))}>Decline</button><button className="approve" onClick={() => setPendingRequests(pendingRequests.filter((person) => person !== name))}>Approve</button></div>)}</section>}
        <div className="leader-lineup">
          {[["MAR 30","Sunday Gathering","MJ","Maya Johnson","Confirmed"],["APR 06","Evening Gathering","JD","Jordan Davis","Confirmed"],["APR 13","Palm Sunday","SK","Sarah Kim","Planning"]].map((leader,index) => <article className={`leader-card card ${index === 0 ? "next" : ""}`} key={leader[0]}><span>{leader[0]}</span><div className="avatar violet">{leader[2]}</div><div><small>{index === 0 ? "LEADING NEXT" : leader[1]}</small><strong>{leader[3]}</strong><em>{leader[4]}</em></div><Icon name="chevron" size={15} /></article>)}
        </div>
        <section className="whos-next card">
          <div className="whos-next-title"><div><p className="eyebrow">Next team · Sunday, March 30</p><h2>Maya is leading Sunday Gathering</h2><span>Call time 7:15 AM · Main Auditorium</span></div><button onClick={soon} className="accent-action">Send reminder</button></div>
          <div className="role-strip">
            {[["Leader","MJ","Maya"],["Keys","JD","Jordan"],["Vocals","SK","Sarah"],["Guitar","AO","Alex"],["Drums","NW","Noah"]].map((role) => <button onClick={soon} key={role[0]}><span className="avatar violet">{role[1]}</span><span><small>{role[0]}</small><strong>{role[2]}</strong></span><i /></button>)}
          </div>
        </section>
        <div className="rota-layout">
          <section className="rota-calendar card">
            <div className="rota-head"><div><p className="eyebrow">Monthly rota</p><h2>March 2025</h2></div><div className="month-nav"><button onClick={soon}><Icon name="chevron" size={14} /></button><button onClick={soon}><Icon name="chevron" size={14} /></button></div></div>
            <div className="rota-weekdays">{["SUN","MON","TUE","WED","THU","FRI","SAT"].map((day) => <span key={day}>{day}</span>)}</div>
            <div className="rota-grid">{Array.from({ length: 35 }, (_, index) => {
              const day = index - 1;
              const event = day > 0 && ({ 2: "Serve", 3: "Rehearsal · 7 PM", 5: "Rehearsal · 7 PM", 9: "Serve", 10: "Rehearsal · 7 PM", 12: "Rehearsal · 7 PM", 16: "Serve", 17: "Rehearsal · 7 PM", 19: "Rehearsal · 7 PM", 23: "Serve", 24: "Cancelled", 26: "Rehearsal · 7 PM", 30: "Serve", 31: "Rehearsal · 7 PM" } as Record<number,string>)[day];
              return <button onClick={soon} key={index} className={`${event ? "has-rota-event" : ""} ${event === "Serve" ? "serve" : ""} ${event === "Cancelled" ? "cancelled" : ""}`}><span>{day > 0 && day <= 31 ? day : ""}</span>{event && <small>{event}</small>}{event === "Serve" && <em>MJ · JD · SK · AO</em>}{event === "Cancelled" && <em>Leader unavailable</em>}</button>;
            })}</div>
          </section>
          <aside className="upcoming-rota">
            <article className="card"><p className="eyebrow">Next assignments</p>{[["MAR 30","Sunday Gathering","5 confirmed"],["APR 06","Evening Gathering","2 awaiting"],["APR 13","Palm Sunday","Draft"]].map((item) => <button onClick={soon} key={item[0]}><span>{item[0]}</span><div><strong>{item[1]}</strong><small>{item[2]}</small></div><Icon name="chevron" size={14} /></button>)}</article>
            <article className="card availability-card"><p className="eyebrow">Coverage</p><strong>82%</strong><span>April roles filled</span><i><b /></i><button onClick={soon}>Review open roles</button></article>
          </aside>
        </div>
        <div className="content-section team-section"><div className="content-section-title"><div><p className="eyebrow">Directory</p><h2>Team members</h2></div><button onClick={soon} className="accent-action"><Icon name="plus" size={15} /> Invite member</button></div><div className="team-grid">{team.map((person) => <button className="member-card card" key={person.name} onClick={() => setSelectedMember(person.name)}><span className={`avatar ${person.color}`}>{person.initials}</span><span><strong>{person.name}</strong><small>{person.role}</small></span><em className={person.status.toLowerCase().replace(" ", "-")}>{person.status}</em><Icon name="chevron" size={15} /></button>)}</div></div>
      </div>
    );
  }

  if (page === "Messages") {
    return (
      <div className="message-focus-screen">
        <div className="message-focus-top"><button className="message-back" onClick={onExit}><Icon name="chevron" size={17} /><span>Back</span></button><Logo /><span>Calvario Sur · Church messages</span></div>
        <div className="messages-layout">
          <aside className="conversation-list"><div><h2>Messages</h2><button onClick={soon}><Icon name="plus" size={15} /></button></div><p className="scope-note">You can only message people and channels in Calvario Sur.</p><label><Icon name="message" size={14} /><input placeholder="Search your church" /></label>{[["Sunday Worship Team","SK","Sarah: Charts are updated","2"],["Production Team","MJ","Stage plot is ready",""],["Alex Owens","AO","That key works for me",""],["Vocal Team","LC","See you at 7:30","1"]].map((chat,index) => <button onClick={soon} className={index === 0 ? "active" : ""} key={chat[0]}><span className="avatar violet">{chat[1]}</span><span><strong>{chat[0]}</strong><small>{chat[2]}</small></span>{chat[3] && <em>{chat[3]}</em>}</button>)}</aside>
          <section className="chat-panel"><header><div><strong>Sunday Worship Team</strong><span>8 members · 5 online</span></div><button onClick={soon}><Icon name="users" size={16} /></button></header><div className="chat-date">TODAY</div><div className="chat-message"><span className="avatar auburn">SK</span><div><strong>Sarah Kim <time>9:40 AM</time></strong><p>I updated the vocal parts for Holy Forever and added the new chart to the service.</p></div></div><div className="chat-message own"><span className="avatar violet">JD</span><div><strong>You <time>9:42 AM</time></strong><p>Perfect, thank you. Everyone please review it before Thursday’s rehearsal.</p></div></div>{sentMessages.map((message,index) => <div className="chat-message own" key={`${message}-${index}`}><span className="avatar violet">JD</span><div><strong>You <time>NOW</time></strong><p>{message}</p></div></div>)}<div className="chat-compose"><button onClick={soon}><Icon name="plus" size={17} /></button><input value={chatInput} onChange={(event) => setChatInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && chatInput.trim()) { setSentMessages([...sentMessages, chatInput.trim()]); setChatInput(""); } }} placeholder="Message the team…" /><button onClick={() => { if (chatInput.trim()) { setSentMessages([...sentMessages, chatInput.trim()]); setChatInput(""); } }}><Icon name="chevron" size={17} /></button></div></section>
        </div>
      </div>
    );
  }

  return (
    <div className="workspace-page">
      <PageGuide step="SETTINGS" title="Shape Hallowly around your team" copy="Manage your personal experience, service defaults, and notification preferences." />
      <div className="settings-layout">
        <nav className="settings-nav card">{["Profile","Appearance","Notifications","Service defaults","Workspace"].map((tab) => <button key={tab} className={settingsTab === tab ? "active" : ""} onClick={() => setSettingsTab(tab)}>{tab}</button>)}</nav>
        <section className="settings-panel card">
          {settingsTab === "Profile" && <><div className="settings-heading"><div className="avatar violet">JD</div><div><h2>Jordan Davis</h2><p>jordan@example.com · Worship Lead</p></div></div><div className="settings-fields"><label>Display name<input defaultValue="Jordan Davis" /></label><label>Email address<input defaultValue="jordan@example.com" type="email" /></label><label>Primary role<select defaultValue="Worship Lead"><option>Worship Lead</option><option>Vocalist</option><option>Musician</option><option>Production</option></select></label><button onClick={soon} className="accent-action">Save profile</button></div></>}
          {settingsTab === "Appearance" && <><div className="settings-heading"><div className="settings-symbol"><Icon name="sun" /></div><div><h2>Appearance</h2><p>Choose a calm workspace that feels like yours.</p></div></div><div className="theme-choice"><button className={!darkMode ? "selected" : ""} onClick={() => onDarkModeChange(false)}><Icon name="sun" /><span><strong>Light</strong><small>Vapor white and alabaster</small></span></button><button className={darkMode ? "selected" : ""} onClick={() => onDarkModeChange(true)}><Icon name="settings" /><span><strong>Dark sanctuary</strong><small>Low-glare Nero surfaces</small></span></button></div><div className="setting-row"><div><strong>Compact song rows</strong><p>Show more songs at once in set lists.</p></div><button className={`toggle ${settingsState.compact ? "on" : ""}`} onClick={() => setSettingsState({ ...settingsState, compact: !settingsState.compact })}><i /></button></div><div className="accent-setting"><strong>Personal Hallow accent</strong><p>Used for active states and gentle focus lighting across your account.</p><div>{["#a95bc5", "#e67e22", "#a0815e", "#1abc9c"].map((color) => <button className={accent === color ? "selected" : ""} onClick={() => onAccentChange(color)} style={{ background: color }} key={color} aria-label={`Use ${color}`} />)}<label className="custom-color"><input type="color" value={accent} onChange={(event) => onAccentChange(event.target.value)} /><span>Custom</span></label></div></div></>}
          {settingsTab === "Notifications" && <><div className="settings-heading"><div className="settings-symbol"><Icon name="bell" /></div><div><h2>Notifications</h2><p>Choose what deserves your attention.</p></div></div>{["Service reminders","Team assignment changes","New team messages","Access requests"].map((label,index) => <div className="setting-row" key={label}><div><strong>{label}</strong><p>{index === 0 ? "Before rehearsal and call time." : "Receive a notification when this changes."}</p></div><button onClick={soon} className={`toggle ${index < 3 ? "on" : ""}`}><i /></button></div>)}</>}
          {settingsTab === "Service defaults" && <><div className="settings-heading"><div className="settings-symbol"><Icon name="calendar" /></div><div><h2>Service defaults</h2><p>Pre-fill the details you use most often.</p></div></div><div className="settings-fields"><label>Default location<input defaultValue="Main Auditorium" /></label><label>Default start time<input type="time" defaultValue="09:00" /></label><label>Default call time<input type="time" defaultValue="07:15" /></label><button onClick={soon} className="accent-action">Save defaults</button></div></>}
          {settingsTab === "Workspace" && <><div className="settings-heading"><div className="settings-symbol"><Icon name="home" /></div><div><h2>Calvario Sur</h2><p>18 members · Succotz, Belize</p></div></div><div className="setting-row"><div><strong>Invite code</strong><p>Share CS-4821 with trusted team members.</p></div><button onClick={soon} className="settings-small-button">Copy</button></div><div className="setting-row"><div><strong>Member approval</strong><p>Require approval for access requests.</p></div><button onClick={soon} className="toggle on"><i /></button></div><div className="workspace-danger"><strong>Leave workspace</strong><p>You will lose access to private services, sets, and messages.</p><button onClick={soon}>Leave Calvario Sur</button></div></>}
        </section>
      </div>
    </div>
  );
}

function PublicFlow({ view, setView }: { view: "landing" | "login" | "org"; setView: (view: "app" | "landing" | "login" | "org") => void }) {
  const auth = useAuth();
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!isBackendConfigured) return setView("org");
    if (!email.trim() || !pw) return setMsg("Enter your email and password.");
    setBusy(true);
    const err = await auth.signInWithPassword(email.trim(), pw);
    setBusy(false);
    if (err) setMsg(err); else setView("app");
  };
  const [selectedOrg, setSelectedOrg] = useState("Calvario Sur");
  const [joinMode, setJoinMode] = useState<"invite" | "request">("invite");

  if (view === "landing") return <div className="public-page landing-page"><nav><Logo /><div><button onClick={() => setView("login")}>Sign in</button><button className="accent-action" onClick={() => setView("login")}>Join your team</button></div></nav><main><p className="eyebrow">Ease the worry of those serving</p><h1>Every song. Every set.<br /><em>One sacred place.</em></h1><p>Plan services, prepare your team, and keep every song ready—without the noise.</p><div><button className="accent-action" onClick={() => setView("login")}>Get started</button><button onClick={() => setView("app")}>Browse songs</button></div></main><footer><span>Shared song library</span><span>Church-private planning</span><span>Built for every role</span></footer></div>;

  if (view === "login") return <div className="auth-page"><section><Logo /><div><p className="eyebrow">Welcome to Hallowly</p><h1>Prepare with clarity.<br /><em>Serve with peace.</em></h1><p>Your songs, set lists, and team—all ready for Sunday.</p></div></section><main><button className="back-link" onClick={() => setView("landing")}>← Back</button><div className="auth-card"><p className="eyebrow">Team access</p><h2>Welcome back.</h2><p>Sign in to enter your church workspace.</p><label>Email address<input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" /></label><label>Password<input type="password" value={pw} onChange={(e) => setPw(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") submit(); }} placeholder="••••••••" autoComplete="current-password" /></label>{msg && <p role="alert" style={{ color: "#e07a7a", fontSize: 12 }}>{msg}</p>}<button className="accent-action" disabled={busy} onClick={submit}>{busy ? "Signing in…" : "Sign in"}</button><span>New here? <button onClick={() => setView("org")}>Join a church team</button></span></div></main></div>;

  return <div className="org-page"><section><Logo /><div><p className="eyebrow">Your organizations</p><h1>Select your church.</h1><p>Services, teams, messages, and set lists stay separate for every church you serve.</p></div><button onClick={() => setView("landing")}>Sign out</button></section><main><div className="org-list"><p className="eyebrow">Choose a workspace</p>{[["Calvario Sur","Succotz, Belize · 18 members"],["Grace Community","Belize City · 12 members"]].map((org) => <button className={selectedOrg === org[0] ? "selected" : ""} onClick={() => setSelectedOrg(org[0])} key={org[0]}><span>{org[0].split(" ").map((word) => word[0]).join("")}</span><div><strong>{org[0]}</strong><small>{org[1]}</small></div><i>{selectedOrg === org[0] ? "✓" : ""}</i></button>)}<button className="enter-org accent-action" onClick={() => setView("app")}>Enter {selectedOrg}</button></div><div className="join-church card"><p className="eyebrow">Join another church</p><div className="segmented"><button className={joinMode === "invite" ? "active" : ""} onClick={() => setJoinMode("invite")}>Invite link/code</button><button className={joinMode === "request" ? "active" : ""} onClick={() => setJoinMode("request")}>Request access</button></div>{joinMode === "invite" ? <><h3>Have an invitation?</h3><p>Invite links and codes grant immediate access to the role selected by your worship leader.</p><input placeholder="Paste link or 6-character code" /><button onClick={soon}>Verify invitation</button></> : <><h3>Find your church</h3><p>Your request will appear on the worship leader’s Team page for approval.</p><input placeholder="Search church name or city" /><button onClick={soon}>Send access request</button></>}</div></main></div>;
}

export default function App() {
  const { songs, events, rehearsals } = useLive();
  const [selectedDay, setSelectedDay] = useState(30);
  const [setOpen, setSetOpen] = useState(true);
  const [expandedSong, setExpandedSong] = useState<number | null>(null);
  const [activeNav, setActiveNav] = useState("Home");
  const [contextSong, setContextSong] = useState<string | null>(null);
  const auth = useAuth();
  const [guest, setGuest] = useState(false);
  const [publicView, setPublicView] = useState<"app" | "landing" | "login" | "org">("app");
  const gate = isBackendConfigured && !auth.signedIn && !guest && publicView === "app" ? "landing" : publicView;
  const first = auth.user?.name.split(" ")[0] ?? "friend";
  const myInitials = (auth.user?.name ?? "Guest").split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  const hour = new Date().getHours();
  const [accent, setAccent] = useState(() => {
    if (typeof window === "undefined") return "#a95bc5";
    return window.localStorage.getItem("hallowly-accent") || "#a95bc5";
  });
  const [darkMode, setDarkMode] = useState(() => typeof window === "undefined" || window.localStorage.getItem("hallowly-theme") !== "light");
  const [moreOpen, setMoreOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<number | null>(null);
  const selectedEvent = events[selectedDay];

  useEffect(() => {
    window.localStorage.setItem("hallowly-accent", accent);
  }, [accent]);

  useEffect(() => {
    window.localStorage.setItem("hallowly-theme", darkMode ? "dark" : "light");
    document.documentElement.style.colorScheme = darkMode ? "dark" : "light";
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", darkMode ? "#111111" : "#FDFDFD");
  }, [darkMode]);

  useEffect(() => {
    const closeOverlays = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setNotificationsOpen(false);
      setMoreOpen(false);
      setProfileOpen(false);
    };
    window.addEventListener("keydown", closeOverlays);
    return () => window.removeEventListener("keydown", closeOverlays);
  }, []);

  if (gate !== "app") return <PublicFlow view={gate} setView={(v) => { if (v === "app" && !auth.signedIn) setGuest(true); setPublicView(v); }} />;

  return (
    <div className={`app-shell ${darkMode ? "dark" : "light"}`} style={{ "--accent": accent } as CSSProperties}>
      <aside className="side-nav">
        <Logo />
        <button className="church-switcher" onClick={() => setPublicView("org")}><span>CS</span><div><small>YOUR CHURCH</small><strong>Calvario Sur</strong></div><Icon name="chevron" size={13} /></button>
        <nav>
          {nav.map((item) => (
            <button key={item.label} className={activeNav === item.label ? "active" : ""} onClick={() => { setActiveNav(item.label); setContextSong(null); }}>
              <Icon name={item.icon} /><span>{item.label}</span>
            </button>
          ))}
        </nav>
        <button className="side-profile" onClick={() => setProfileOpen(true)}><span>{myInitials}</span><div><strong>{auth.user?.name ?? "Guest"}</strong><small>{auth.isLead ? "Worship lead" : auth.user ? "Team member" : "Visitor"}</small></div></button>
      </aside>

      <main className={activeNav === "Messages" ? "has-focus-screen" : ""}>
        {activeNav !== "Messages" && <header>
          <div className="mobile-mark"><Logo withName={false} /></div>
          <div className="welcome"><p>{activeNav === "Home" ? "SUNDAY, MARCH 30" : "HALLOWLY WORKSPACE"}</p><h1>{activeNav === "Home" ? `Good ${hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening"}, ${first}.` : activeNav}</h1></div>
          <button className="notification" aria-label="Notifications" onClick={() => setNotificationsOpen((value) => !value)}><Icon name="bell" /><i /></button>
        </header>}
        {notificationsOpen && <aside className="notification-popover card"><div><p className="eyebrow">Notifications</p><button onClick={() => setNotificationsOpen(false)}>Close</button></div><button onClick={() => { setActiveNav("Team"); setNotificationsOpen(false); }}><span className="notification-mark amber"><Icon name="users" /></span><span><strong>Leader cancellation</strong><small>Maya cancelled Monday rehearsal. Coverage is needed.</small></span></button><button onClick={() => { setActiveNav("Team"); setNotificationsOpen(false); }}><span className="notification-mark amber"><Icon name="users" /></span><span><strong>2 access requests</strong><small>Elena and David want to join your team.</small></span></button><button onClick={() => { setActiveNav("Services"); setNotificationsOpen(false); }}><span className="notification-mark aqua"><Icon name="calendar" /></span><span><strong>Service reminder</strong><small>Sunday call time is 7:15 AM.</small></span></button><button onClick={() => { setActiveNav("Messages"); setNotificationsOpen(false); }}><span className="notification-mark violet"><Icon name="message" /></span><span><strong>Sarah sent a message</strong><small>Charts for Holy Forever were updated.</small></span></button></aside>}

        {activeNav === "Home" ? <>
        <PageGuide step="THIS MONTH" title="Start with a date" copy="Dates with a glowing marker have an event. Select one to open its service plan and expand individual songs." />
        <div className="dashboard-grid home-grid">
          <section className="primary-column">
            <div className="column-label"><span>01</span><div><strong>Schedule & service plan</strong><small>Choose a date, then review the set below.</small></div></div>
            <article className="calendar-card card">
              <div className="section-heading">
                <div><p className="eyebrow">Your schedule</p><h2>March 2025</h2></div>
                <div className="month-nav"><button onClick={soon} aria-label="Previous month"><Icon name="chevron" size={15} /></button><button onClick={soon} aria-label="Next month"><Icon name="chevron" size={15} /></button></div>
              </div>
              <div className="weekdays">{["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"].map((day) => <span key={day}>{day}</span>)}</div>
              <div className="calendar-grid">
                {calendarDays.map((day) => {
                  const date = day <= 2 ? day + 24 : day - 2;
                  const muted = day <= 2 || day > 33;
                  const event = !muted && events[date];
                  const rehearsal = !muted && rehearsals[date];
                  return (
                    <button key={day} className={`${event ? "has-event" : ""} ${rehearsal ? "has-rehearsal" : ""} ${rehearsal && rehearsal.status === "cancelled" ? "cancelled" : ""} ${selectedCalendarDate === date && !muted ? "selected" : ""} ${muted ? "muted" : ""}`} onClick={() => { if (!event && !rehearsal) return; setSelectedCalendarDate(selectedCalendarDate === date ? null : date); if (event) { setSelectedDay(date); setSetOpen(true); } else setSetOpen(false); }}>
                      <span>{date}</span>{(event || rehearsal) && <i />}{event ? <small>{event.type}</small> : rehearsal && <small>{rehearsal.status === "cancelled" ? "Cancelled" : `Rehearsal · ${rehearsal.time}`}</small>}
                    </button>
                  );
                })}
              </div>
              <div className="calendar-legend"><span><i /> Service</span><span><i /> Rehearsal</span><span><i /> Cancelled</span><small>Mon & Wed · 7 PM</small></div>
              {selectedCalendarDate && (events[selectedCalendarDate] || rehearsals[selectedCalendarDate]) && <div className="calendar-event-detail">
                <span className={`event-detail-icon ${rehearsals[selectedCalendarDate]?.status === "cancelled" ? "cancelled" : ""}`}><Icon name={events[selectedCalendarDate] ? "music" : "calendar"} size={17} /></span>
                <div><small>{events[selectedCalendarDate] ? "SERVICE" : rehearsals[selectedCalendarDate].visibility.toUpperCase()}</small><strong>{events[selectedCalendarDate]?.title ?? rehearsals[selectedCalendarDate].title}</strong><p>{events[selectedCalendarDate] ? `${events[selectedCalendarDate].time} · ${events[selectedCalendarDate].location} · ${events[selectedCalendarDate].people} people` : `${rehearsals[selectedCalendarDate].time} · ${rehearsals[selectedCalendarDate].description}`}</p></div>
                <button onClick={() => setSelectedCalendarDate(null)}>Close</button>
              </div>}
            </article>

            {selectedEvent && setOpen && (
              <article className={`service-viewer card ${setOpen ? "open" : ""}`}>
                <button className="service-summary" onClick={() => setSetOpen((value) => !value)}>
                  <span className="date-block"><strong>{selectedDay}</strong><small>MAR</small></span>
                  <span className="service-copy"><small>{selectedEvent.location}</small><strong>{selectedEvent.title}</strong><em><Icon name="clock" size={13} /> {selectedEvent.time} · {songs.length} songs · {selectedEvent.people} people</em></span>
                  <span className="expand-icon"><Icon name="chevron" /></span>
                </button>
                {setOpen && (
                  <div className="set-content">
                    <div className="set-heading"><div><p className="eyebrow">Service set</p><h3>{songs.length} songs · 18 min</h3></div><button onClick={() => setActiveNav("Set Lists")}><Icon name="play" size={15} /> Rehearse</button></div>
                    <div className="song-list">
                      {songs.map((song, index) => (
                        <div className={`song ${expandedSong === index ? "expanded" : ""}`} key={song.title}>
                          <button onClick={() => setExpandedSong(expandedSong === index ? null : index)}>
                            <span className="track">{String(index + 1).padStart(2, "0")}</span>
                            <span className="song-art"><Icon name="music" size={16} /></span>
                            <span className="song-info"><strong>{song.title}</strong><small>{song.detail}</small></span>
                            <span className="leader">{song.leader}</span>
                            <span className="song-arrow"><Icon name="chevron" size={15} /></span>
                          </button>
                          {expandedSong === index && <div className="song-details"><p><Icon name="note" size={14} /> {song.notes}</p><div><button onClick={soon}>Lyrics & chords</button><button onClick={soon}>Listen</button></div></div>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </article>
            )}
          </section>

          <aside className="secondary-column">
            <div className="column-label"><span>02</span><div><strong>Team activity</strong><small>Notes and conversations in one place.</small></div></div>
            <article className="billboard card">
              <div className="section-heading"><div><p className="eyebrow">Team billboard</p><h3>Notes for everyone</h3></div><button onClick={soon} className="add-button" aria-label="Add a note"><Icon name="plus" size={16} /></button></div>
              <div className="note featured"><Icon name="pin" size={15} /><div><strong>Sunday arrival times</strong><p>Band at 7:15, vocals at 7:30. Full run starts promptly at 7:45.</p><span>Jordan · 2 days ago</span></div></div>
              <div className="note"><Icon name="note" size={15} /><div><strong>New charts uploaded</strong><p>Updated charts for Holy Forever are now in the library.</p><span>Sarah · Yesterday</span></div></div>
              <button className="view-all" onClick={() => setActiveNav("Team")}>View team activity <Icon name="chevron" size={14} /></button>
            </article>

            <article className="messages card">
              <div className="section-heading"><div><p className="eyebrow">Team messages</p><h3>Recent conversations</h3></div><span className="unread">3 new</span></div>
              <button onClick={soon} className="message-row"><span className="avatar auburn">SK</span><span><strong>Sunday Worship Team</strong><small>Sarah: I updated the vocal parts…</small></span><time>9:42</time><i /></button>
              <button onClick={soon} className="message-row"><span className="avatar teal">AO</span><span><strong>Alex O.</strong><small>That key works much better for me.</small></span><time>YEST</time></button>
              <button onClick={soon} className="message-row"><span className="avatar violet">MJ</span><span><strong>Production Team</strong><small>Stage plot is ready to review.</small></span><time>MON</time></button>
              <button className="view-all" onClick={() => setActiveNav("Messages")}>Open messages <Icon name="chevron" size={14} /></button>
            </article>

            <article className="verse">
              <Icon name="music" size={16} />
              <p>“Serve one another humbly in love.”</p>
              <span>GALATIANS 5:13</span>
            </article>
          </aside>
        </div>
        </> : <WorkspacePage page={activeNav} accent={accent} onAccentChange={setAccent} darkMode={darkMode} onDarkModeChange={setDarkMode} contextSong={contextSong} onExit={() => setActiveNav("Home")} onNavigate={(page, song) => { setContextSong(song ?? null); setActiveNav(page); }} />}
      </main>

      <nav className="mobile-nav">
        {nav.slice(0, 4).map((item) => (
          <button key={item.label} className={activeNav === item.label ? "active" : ""} onClick={() => { setActiveNav(item.label); setContextSong(null); }}>
            <Icon name={item.icon} size={19} /><span>{item.label}</span>
          </button>
        ))}
        <button className={["Team","Messages","Settings"].includes(activeNav) ? "active" : ""} onClick={() => setMoreOpen(true)}><Icon name="users" size={19} /><span>More</span></button>
      </nav>
      {moreOpen && <div className="more-backdrop" onClick={() => setMoreOpen(false)}><section className="more-sheet" onClick={(event) => event.stopPropagation()}><div><span /><h3>More</h3><button onClick={() => setMoreOpen(false)}>Close</button></div>{nav.slice(4).map((item) => <button key={item.label} onClick={() => { setActiveNav(item.label); setMoreOpen(false); }}><Icon name={item.icon} /><span><strong>{item.label}</strong><small>{item.label === "Team" ? "Schedule and members" : item.label === "Messages" ? "Your church conversations" : "Appearance and preferences"}</small></span><Icon name="chevron" /></button>)}<button onClick={() => { setMoreOpen(false); setProfileOpen(true); }}><span className="avatar violet">JD</span><span><strong>Your profile</strong><small>Account, church, and sign out</small></span><Icon name="chevron" /></button></section></div>}
      {profileOpen && <div className="profile-backdrop" onClick={() => setProfileOpen(false)}><section className="profile-card card" onClick={(event) => event.stopPropagation()}><button className="profile-close" onClick={() => setProfileOpen(false)}>Close</button><div className="avatar violet">JD</div><h2>Jordan Davis</h2><p>jordan@example.com</p><span>Worship Lead · Calvario Sur</span><div><button onClick={soon}><Icon name="users" /> View profile</button><button onClick={() => { setProfileOpen(false); setPublicView("org"); }}><Icon name="home" /> Switch church</button><button onClick={() => { setProfileOpen(false); setPublicView("login"); }}><Icon name="chevron" /> Sign out</button></div></section></div>}
    </div>
  );
}
