import React, { useState, useEffect, useRef, useCallback } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Dumbbell, Timer as TimerIcon, TrendingUp, Plus, Play, Pause, RotateCcw, X, Trophy, ChevronRight, Minus, Trash2 } from "lucide-react";

const STORAGE_KEY = "gym-data-v4";
let uid = 1;
const nextUid = () => uid++;

const DEFAULT_EXERCISES = [
  { id: "bench", name: "بنش برس", category: "صدر" },
  { id: "incline", name: "بنش مائل", category: "صدر" },
  { id: "squat", name: "سكوات", category: "رجل" },
  { id: "legpress", name: "ليج برس", category: "رجل" },
  { id: "deadlift", name: "ديدلفت", category: "ظهر" },
  { id: "pulldown", name: "سحب أمامي", category: "ظهر" },
  { id: "ohp", name: "أوفرهيد برس", category: "كتف" },
  { id: "lateral", name: "رفرفة جانبية", category: "كتف" },
  { id: "curl", name: "بايسبس كيرل", category: "ذراع" },
  { id: "triceps", name: "ترايسبس", category: "ذراع" },
];

const CATEGORIES = ["صدر", "ظهر", "رجل", "كتف", "ذراع", "أخرى"];
const SET_COLORS = ["#c1272d", "#2e5090", "#d9a91a", "#3f7d4f", "#8a5fc2", "#c26f2e"];

function todayISO() {
  // Local date avoids a UTC day shift around midnight in Egypt.
  const d = new Date();
  const offset = d.getTimezoneOffset();
  return new Date(d.getTime() - offset * 60000).toISOString().slice(0, 10);
}

function estimate1RM(weight, reps) {
  if (!weight || !reps) return 0;
  return Math.round(weight * (1 + reps / 30));
}

function weightColor(w) {
  if (w >= 100) return "#c1272d";
  if (w >= 60) return "#2e5090";
  if (w >= 40) return "#d9a91a";
  if (w >= 20) return "#3f7d4f";
  return "#8a8578";
}

function fmtDate(d) {
  const dt = new Date(d);
  return dt.toLocaleDateString("ar-EG", { day: "numeric", month: "short" });
}

function sessionSummary(session) {
  return session.sets.reduce((a, b) => (b.weight > a.weight ? b : a), session.sets[0]);
}

// ---------- Rest Timer ----------
function RestTimer({ defaultDuration, onDurationChange, autoStartToken, ensureAudio, playAlarm }) {
  const PRESETS = [30, 60, 90, 120, 180];
  const [duration, setDurationState] = useState(defaultDuration || 90);
  const [remaining, setRemaining] = useState(defaultDuration || 90);
  const [running, setRunning] = useState(false);
  const [justFinished, setJustFinished] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);
  const [customVal, setCustomVal] = useState("");
  const intervalRef = useRef(null);
  const firstRun = useRef(true);

  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    clearInterval(intervalRef.current);
    setJustFinished(false);
    setDurationState(defaultDuration);
    setRemaining(defaultDuration);
    setRunning(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStartToken]);

  useEffect(() => {
    if (running && remaining > 0) {
      intervalRef.current = setInterval(() => {
        setRemaining((r) => {
          if (r <= 1) {
            clearInterval(intervalRef.current);
            setRunning(false);
            setJustFinished(true);
            playAlarm();
            return 0;
          }
          return r - 1;
        });
      }, 1000);
    }
    return () => clearInterval(intervalRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  const selectDuration = (d) => {
    clearInterval(intervalRef.current);
    setRunning(false);
    setJustFinished(false);
    setDurationState(d);
    setRemaining(d);
    onDurationChange(d);
  };

  const toggle = () => {
    ensureAudio();
    if (remaining === 0) return;
    setJustFinished(false);
    setRunning((r) => !r);
  };

  const reset = () => {
    clearInterval(intervalRef.current);
    setRunning(false);
    setJustFinished(false);
    setRemaining(duration);
  };

  const adjust = (delta) => {
    setRemaining((r) => Math.max(0, r + delta));
    setDurationState((d) => Math.max(5, d + delta));
  };

  const pct = duration > 0 ? remaining / duration : 0;
  const radius = 110;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - pct);
  const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");

  return (
    <div className="flex flex-col items-center gap-8 px-4 pb-8">
      <div
        className="relative flex items-center justify-center"
        style={{ width: 260, height: 260, animation: justFinished ? "pulse-ring 0.6s ease-in-out 3" : "none" }}
      >
        <svg width="260" height="260" className="-rotate-90">
          <circle cx="130" cy="130" r={radius} stroke="#2a2820" strokeWidth="14" fill="none" />
          <circle
            cx="130"
            cy="130"
            r={radius}
            stroke={justFinished ? "#d9a91a" : "#c1272d"}
            strokeWidth="14"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            style={{ transition: "stroke-dashoffset 1s linear" }}
          />
        </svg>
        <div className="absolute flex flex-col items-center">
          <span
            className="tabular-nums"
            style={{ fontFamily: "'Oswald', sans-serif", fontSize: 56, fontWeight: 600, color: "#f3efe2", letterSpacing: 1 }}
          >
            {mm}:{ss}
          </span>
          <span style={{ color: justFinished ? "#d9a91a" : "#9b9686", fontSize: 13, fontWeight: justFinished ? 700 : 400 }}>
            {justFinished ? "خلصت الراحة!" : "راحة بين المجاميع"}
          </span>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap justify-center" dir="ltr">
        {PRESETS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => selectDuration(p)}
            className="px-4 py-2 rounded-full text-sm font-medium transition-colors"
            style={{
              fontFamily: "'Oswald', sans-serif",
              background: duration === p ? "#c1272d" : "#211f18",
              color: duration === p ? "#f3efe2" : "#9b9686",
              border: "1px solid " + (duration === p ? "#c1272d" : "#2a2820"),
            }}
          >
            {p}s
          </button>
        ))}
        <button
          type="button"
          onClick={() => setCustomOpen((v) => !v)}
          className="px-4 py-2 rounded-full text-sm font-medium"
          style={{ background: "#211f18", color: "#9b9686", border: "1px solid #2a2820", fontFamily: "'Oswald', sans-serif" }}
        >
          مخصص
        </button>
      </div>

      {customOpen && (
        <div className="flex gap-2 items-center">
          <input
            type="number"
            value={customVal}
            onChange={(e) => setCustomVal(e.target.value)}
            placeholder="ثانية"
            className="w-24 px-3 py-2 rounded-lg text-center outline-none"
            style={{ background: "#211f18", color: "#f3efe2", border: "1px solid #2a2820" }}
          />
          <button
            type="button"
            onClick={() => {
              const v = parseInt(customVal, 10);
              if (v > 0) {
                selectDuration(v);
                setCustomOpen(false);
                setCustomVal("");
              }
            }}
            className="px-3 py-2 rounded-lg text-sm font-medium"
            style={{ background: "#3f7d4f", color: "#f3efe2" }}
          >
            تحديد
          </button>
        </div>
      )}

      <div className="flex gap-3 items-center">
        <button
          type="button"
          onClick={() => adjust(-15)}
          className="w-11 h-11 rounded-full flex items-center justify-center text-lg font-bold"
          style={{ background: "#211f18", color: "#f3efe2", border: "1px solid #2a2820" }}
        >
          −15
        </button>
        <button
          type="button"
          onClick={toggle}
          className="w-16 h-16 rounded-full flex items-center justify-center"
          style={{ background: "#c1272d", color: "#f3efe2" }}
        >
          {running ? <Pause size={26} fill="#f3efe2" /> : <Play size={26} fill="#f3efe2" style={{ marginRight: -3 }} />}
        </button>
        <button
          type="button"
          onClick={reset}
          className="w-11 h-11 rounded-full flex items-center justify-center"
          style={{ background: "#211f18", color: "#f3efe2", border: "1px solid #2a2820" }}
        >
          <RotateCcw size={18} />
        </button>
        <button
          type="button"
          onClick={() => adjust(15)}
          className="w-11 h-11 rounded-full flex items-center justify-center text-lg font-bold"
          style={{ background: "#211f18", color: "#f3efe2", border: "1px solid #2a2820" }}
        >
          +15
        </button>
      </div>

      <style>{`
        @keyframes pulse-ring {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.04); }
        }
      `}</style>
    </div>
  );
}

// ---------- Stepper (tap the number to type it directly, or nudge with +/-) ----------
function Stepper({ value, onChange, step, min = 0 }) {
  // keep what's on screen as free text while typing — committing every keystroke straight to
  // the numeric value (the old approach) silently ate the "." when typing e.g. "62.5"
  const [text, setText] = useState(String(value));

  useEffect(() => {
    setText(String(value));
  }, [value]);

  const commit = () => {
    const v = parseFloat(text);
    if (!isNaN(v)) onChange(Math.max(min, v));
    else setText(String(value));
  };

  const nudge = (delta) => onChange(Math.max(min, +(value + delta).toFixed(2)));

  return (
    <div className="flex items-center gap-1 min-w-0" dir="ltr">
      <button
        type="button"
        onClick={() => nudge(-step)}
        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background: "#211f18", color: "#f3efe2", border: "1px solid #2a2820" }}
      >
        <Minus size={13} />
      </button>
      <input
        type="text"
        inputMode="decimal"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            commit();
            e.target.blur();
          }
        }}
        onFocus={(e) => e.target.select()}
        className="flex-1 text-center tabular-nums rounded-lg py-1.5 outline-none"
        style={{
          fontFamily: "'Oswald', sans-serif",
          fontSize: 17,
          color: "#f3efe2",
          minWidth: 44,
          background: "#16150f",
          border: "1px solid #2a2820",
        }}
      />
      <button
        type="button"
        onClick={() => nudge(step)}
        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background: "#211f18", color: "#f3efe2", border: "1px solid #2a2820" }}
      >
        <Plus size={13} />
      </button>
    </div>
  );
}

// ---------- one set row: number/label on top, weight+reps in a 50/50 grid below.
// this never overflows horizontally no matter how narrow the phone is, since each
// column is a percentage of the sheet width, not a fixed pixel sum. ----------
function SetRowEditor({ idx, weight, reps, onWeightChange, onRepsChange, onRemove, removable }) {
  return (
    <div className="rounded-lg p-2.5 w-full min-w-0" style={{ background: "#211f18", border: "1px solid #2a2820" }}>
      <div className="flex items-center justify-between mb-2 min-w-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <div
            className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: SET_COLORS[idx % SET_COLORS.length], color: "#16150f", fontSize: 10, fontFamily: "'Oswald', sans-serif", fontWeight: 700 }}
          >
            {idx + 1}
          </div>
          <span style={{ color: "#9b9686", fontSize: 11, fontFamily: "'Tajawal', sans-serif" }}>المجموعة {idx + 1}</span>
        </div>
        {removable && (
          <button type="button" onClick={onRemove} className="flex-shrink-0" style={{ color: "#5c584c" }}>
            <X size={14} />
          </button>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2 min-w-0">
        <div className="min-w-0">
          <div className="text-[9px] mb-0.5" style={{ color: "#5c584c" }}>
            كجم
          </div>
          <Stepper value={weight} onChange={onWeightChange} step={2.5} />
        </div>
        <div className="min-w-0">
          <div className="text-[9px] mb-0.5" style={{ color: "#5c584c" }}>
            تكرارات
          </div>
          <Stepper value={reps} onChange={onRepsChange} step={1} min={1} />
        </div>
      </div>
    </div>
  );
}

// ---------- Set Editor Sheet — used both to log a new session and to edit an existing one ----------
function SetEditorSheet({ title, initialSets, onClose, onSave, saveLabel }) {
  const [sets, setSets] = useState(() => initialSets.map((s) => ({ id: nextUid(), weight: s.weight, reps: s.reps })));

  const addSet = () => {
    setSets((s) => {
      const prev = s[s.length - 1] || { weight: 20, reps: 10 };
      return [...s, { id: nextUid(), weight: prev.weight, reps: prev.reps }];
    });
  };
  const removeSet = (id) => setSets((s) => (s.length > 1 ? s.filter((row) => row.id !== id) : s));
  const updateSet = (id, field, val) => setSets((s) => s.map((row) => (row.id === id ? { ...row, [field]: val } : row)));
  const canSave = sets.length > 0 && sets.every((s) => s.weight > 0 && s.reps > 0);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: "rgba(0,0,0,0.6)" }} onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-t-3xl p-4 pb-6 max-h-[85vh] overflow-y-auto overflow-x-hidden box-border"
        style={{ background: "#1c1b15", border: "1px solid #2a2820", borderBottom: "none" }}
      >
        <div className="flex items-center justify-between mb-4 min-w-0">
          <h3 className="truncate" style={{ fontFamily: "'Tajawal', sans-serif", fontWeight: 700, fontSize: 17, color: "#f3efe2" }}>
            {title}
          </h3>
          <button type="button" onClick={onClose} className="flex-shrink-0" style={{ color: "#9b9686" }}>
            <X size={20} />
          </button>
        </div>

        <div className="flex flex-col gap-2 mb-3">
          {sets.map((row, idx) => (
            <SetRowEditor
              key={row.id}
              idx={idx}
              weight={row.weight}
              reps={row.reps}
              onWeightChange={(v) => updateSet(row.id, "weight", v)}
              onRepsChange={(v) => updateSet(row.id, "reps", v)}
              onRemove={() => removeSet(row.id)}
              removable={sets.length > 1}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={addSet}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-lg mb-4"
          style={{ border: "1.5px dashed #3a362c", color: "#9b9686", fontFamily: "'Tajawal', sans-serif", fontSize: 13 }}
        >
          <Plus size={15} />
          مجموعة كمان
        </button>

        <button
          type="button"
          disabled={!canSave}
          onClick={() => {
            if (canSave) {
              onSave(sets.map(({ weight, reps }) => ({ weight, reps })));
              onClose();
            }
          }}
          className="w-full py-3.5 rounded-xl font-bold text-base"
          style={{ background: canSave ? "#c1272d" : "#3a362c", color: "#f3efe2", fontFamily: "'Tajawal', sans-serif" }}
        >
          {saveLabel}
        </button>
      </div>
    </div>
  );
}

// ---------- Confirm Dialog ----------
function ConfirmDialog({ title, message, confirmLabel = "حذف", cancelLabel = "إلغاء", onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-6" style={{ background: "rgba(0,0,0,0.7)" }} onClick={onCancel}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm rounded-2xl p-5" style={{ background: "#1c1b15", border: "1px solid #2a2820" }}>
        <div style={{ color: "#f3efe2", fontWeight: 700, fontSize: 16, marginBottom: 8, fontFamily: "'Tajawal', sans-serif" }}>{title}</div>
        <div style={{ color: "#9b9686", fontSize: 14, marginBottom: 20, lineHeight: 1.7, fontFamily: "'Tajawal', sans-serif" }}>{message}</div>
        <div className="flex gap-2">
          <button type="button" onClick={onCancel} className="flex-1 py-2.5 rounded-xl font-bold text-sm" style={{ background: "#211f18", color: "#9b9686" }}>
            {cancelLabel}
          </button>
          <button type="button" onClick={onConfirm} className="flex-1 py-2.5 rounded-xl font-bold text-sm" style={{ background: "#c1272d", color: "#f3efe2" }}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------- Edit Exercise Sheet (name / category) ----------
function EditExerciseSheet({ exercise, onClose, onSave }) {
  const [name, setName] = useState(exercise.name);
  const [cat, setCat] = useState(exercise.category);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: "rgba(0,0,0,0.6)" }} onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-t-3xl p-4 pb-6 overflow-x-hidden box-border"
        style={{ background: "#1c1b15", border: "1px solid #2a2820", borderBottom: "none" }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 style={{ fontFamily: "'Tajawal', sans-serif", fontWeight: 700, fontSize: 17, color: "#f3efe2" }}>تعديل التمرين</h3>
          <button type="button" onClick={onClose} style={{ color: "#9b9686" }}>
            <X size={20} />
          </button>
        </div>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-3 py-2.5 rounded-lg outline-none mb-3 text-right"
          style={{ background: "#211f18", color: "#f3efe2", border: "1px solid #2a2820", fontFamily: "'Tajawal', sans-serif" }}
        />
        <div className="flex gap-2 flex-wrap mb-5">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCat(c)}
              className="px-3 py-1.5 rounded-full text-xs"
              style={{
                background: cat === c ? "#2e5090" : "#211f18",
                color: cat === c ? "#f3efe2" : "#9b9686",
                border: "1px solid " + (cat === c ? "#2e5090" : "#2a2820"),
              }}
            >
              {c}
            </button>
          ))}
        </div>
        <button
          type="button"
          disabled={!name.trim()}
          onClick={() => {
            if (name.trim()) {
              onSave({ ...exercise, name: name.trim(), category: cat });
              onClose();
            }
          }}
          className="w-full py-3 rounded-xl font-bold text-sm"
          style={{ background: name.trim() ? "#3f7d4f" : "#3a362c", color: "#f3efe2", fontFamily: "'Tajawal', sans-serif" }}
        >
          حفظ التعديل
        </button>
      </div>
    </div>
  );
}

// ---------- Exercise Options Action Sheet ----------
function ExerciseActionSheet({ exercise, hasSessions, onClose, onEdit, onEditSession, onDeleteLastSet, onDeleteExercise }) {
  const items = [
    { label: "تعديل التمرين", action: onEdit, color: "#f3efe2" },
    { label: "تعديل الجلسة", action: onEditSession, color: "#f3efe2", disabled: !hasSessions },
    { label: "حذف مجموعة", action: onDeleteLastSet, color: "#d9a91a", disabled: !hasSessions },
    { label: "حذف التمرين", action: onDeleteExercise, color: "#c1272d" },
  ];
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: "rgba(0,0,0,0.6)" }} onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-t-3xl p-3 pb-6 overflow-x-hidden box-border"
        style={{ background: "#1c1b15", border: "1px solid #2a2820", borderBottom: "none" }}
      >
        <div className="w-10 h-1 rounded-full mx-auto mb-3" style={{ background: "#2a2820" }} />
        <div className="truncate text-center mb-2" style={{ color: "#f3efe2", fontWeight: 700, fontFamily: "'Tajawal', sans-serif" }}>
          {exercise.name}
        </div>
        {items.map((it, i) => (
          <button
            key={i}
            type="button"
            disabled={it.disabled}
            onClick={() => {
              if (!it.disabled) {
                it.action();
                onClose();
              }
            }}
            className="w-full text-right px-4 py-3.5 rounded-xl mb-1.5"
            style={{ background: "#211f18", color: it.disabled ? "#3a362c" : it.color, fontFamily: "'Tajawal', sans-serif", fontSize: 14 }}
          >
            {it.label}
          </button>
        ))}
        <button
          type="button"
          onClick={onClose}
          className="w-full text-center px-4 py-3 rounded-xl mt-1"
          style={{ background: "transparent", color: "#5c584c", fontFamily: "'Tajawal', sans-serif" }}
        >
          إلغاء
        </button>
      </div>
    </div>
  );
}

// ---------- Exercises Tab ----------
function ExercisesTab({ exercises, sessions, onLog, onAddExercise, favorites, onToggleFavorite, onUpdateExercise, onDeleteExercise, onUpdateSessionSets, onDeleteSession }) {
  const [openExercise, setOpenExercise] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCat, setNewCat] = useState(CATEGORIES[0]);
  const [query, setQuery] = useState("");
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [menuFor, setMenuFor] = useState(null);
  const [editExercise, setEditExercise] = useState(null);
  const [editSessionFor, setEditSessionFor] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const grouped = CATEGORIES.map((cat) => ({
    cat,
    items: exercises.filter((e) => e.category === cat && e.name.toLowerCase().includes(query.trim().toLowerCase()) && (!onlyFavorites || favorites.includes(e.id))),
  })).filter((g) => g.items.length > 0);

  const sessionsFor = (exId) => sessions.filter((s) => s.exerciseId === exId).sort((a, b) => (a.date < b.date ? 1 : -1));
  const lastFor = (exId) => sessionsFor(exId)[0];
  const bestFor = (exId) => {
    const all = sessionsFor(exId);
    if (all.length === 0) return null;
    return all.reduce((best, s) => {
      const top = sessionSummary(s);
      return top.weight > best.weight ? top : best;
    }, sessionSummary(all[0]));
  };

  return (
    <div className="px-4 pb-8">
      <div className="flex gap-2 mb-4">
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="ابحث عن تمرين..." className="flex-1 px-4 py-3 rounded-2xl outline-none text-right" style={{ background: "#211f18", color: "#f3efe2", border: "1px solid #2a2820", fontFamily: "'Tajawal', sans-serif" }} />
        <button type="button" onClick={() => setOnlyFavorites((v) => !v)} className="px-4 rounded-2xl text-lg" style={{ background: onlyFavorites ? "#d9a91a" : "#211f18", color: onlyFavorites ? "#16150f" : "#9b9686", border: "1px solid #2a2820" }}>★</button>
      </div>
      {grouped.map((g) => (
        <div key={g.cat} className="mb-6">
          <h4 className="text-xs font-bold mb-2 px-1" style={{ color: "#c1272d", letterSpacing: 1 }}>
            {g.cat.toUpperCase()}
          </h4>
          <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid #2a2820" }}>
            {g.items.map((ex, i) => {
              const last = lastFor(ex.id);
              const lastTop = last ? sessionSummary(last) : null;
              const best = bestFor(ex.id);
              return (
                <div
                  key={ex.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setOpenExercise(ex)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") setOpenExercise(ex);
                  }}
                  className="w-full flex items-center justify-between px-4 py-3.5 text-right cursor-pointer"
                  style={{ background: "#1c1b15", borderTop: i > 0 ? "1px solid #2a2820" : "none" }}
                >
                  <ChevronRight size={18} style={{ color: "#4a463c", transform: "rotate(180deg)" }} />
                  <button type="button" onClick={(e) => { e.stopPropagation(); setMenuFor(ex); }} className="ml-1 px-1 flex-shrink-0" style={{ color: "#5c584c", fontSize: 18, lineHeight: 1 }}>⋮</button>
                  <button type="button" onClick={(e) => { e.stopPropagation(); onToggleFavorite(ex.id); }} className="ml-1 text-lg flex-shrink-0" style={{ color: favorites.includes(ex.id) ? "#d9a91a" : "#4a463c" }}>{favorites.includes(ex.id) ? "★" : "☆"}</button>
                  <div className="flex-1 mr-3 text-right min-w-0">
                    <div style={{ color: "#f3efe2", fontFamily: "'Tajawal', sans-serif", fontWeight: 500, fontSize: 15 }}>{ex.name}</div>
                    {last ? (
                      <div className="flex items-center gap-1.5 mt-1 justify-end flex-wrap" dir="ltr">
                        {last.sets.map((s, si) => (
                          <span
                            key={si}
                            className="flex items-center gap-1"
                            style={{ color: "#9b9686", fontSize: 12, fontFamily: "'Oswald', sans-serif" }}
                          >
                            {s.weight}×{s.reps}
                            {si < last.sets.length - 1 && <span style={{ color: "#3a362c" }}>·</span>}
                          </span>
                        ))}
                        <span className="w-2 h-2 rounded-full" style={{ background: weightColor(lastTop.weight) }} />
                      </div>
                    ) : (
                      <div style={{ color: "#5c584c", fontSize: 12, marginTop: 4 }}>لسه مفيش تسجيل</div>
                    )}
                  </div>
                  {best && (
                    <div className="flex items-center gap-1" style={{ color: "#d9a91a" }}>
                      <Trophy size={13} />
                      <span style={{ fontFamily: "'Oswald', sans-serif", fontSize: 13 }}>{best.weight}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {!addOpen ? (
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl mt-2"
          style={{ border: "1.5px dashed #3a362c", color: "#9b9686", fontFamily: "'Tajawal', sans-serif" }}
        >
          <Plus size={18} />
          إضافة تمرين
        </button>
      ) : (
        <div className="rounded-2xl p-4 mt-2" style={{ background: "#1c1b15", border: "1px solid #2a2820" }}>
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="اسم التمرين"
            className="w-full px-3 py-2.5 rounded-lg outline-none mb-3 text-right"
            style={{ background: "#211f18", color: "#f3efe2", border: "1px solid #2a2820", fontFamily: "'Tajawal', sans-serif" }}
          />
          <div className="flex gap-2 flex-wrap mb-3">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setNewCat(c)}
                className="px-3 py-1.5 rounded-full text-xs"
                style={{
                  background: newCat === c ? "#2e5090" : "#211f18",
                  color: newCat === c ? "#f3efe2" : "#9b9686",
                  border: "1px solid " + (newCat === c ? "#2e5090" : "#2a2820"),
                }}
              >
                {c}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                if (newName.trim()) {
                  onAddExercise({ id: Date.now().toString(), name: newName.trim(), category: newCat });
                  setNewName("");
                  setAddOpen(false);
                }
              }}
              className="flex-1 py-2.5 rounded-lg font-bold text-sm"
              style={{ background: "#3f7d4f", color: "#f3efe2" }}
            >
              إضافة
            </button>
            <button
              type="button"
              onClick={() => setAddOpen(false)}
              className="flex-1 py-2.5 rounded-lg font-bold text-sm"
              style={{ background: "#211f18", color: "#9b9686" }}
            >
              إلغاء
            </button>
          </div>
        </div>
      )}

      {openExercise && (
        <SetEditorSheet
          title={openExercise.name}
          initialSets={[lastFor(openExercise.id) ? sessionSummary(lastFor(openExercise.id)) : { weight: 20, reps: 10 }]}
          onClose={() => setOpenExercise(null)}
          onSave={(sets) => onLog(openExercise.id, sets)}
          saveLabel="حفظ الجلسة وابدأ الراحة"
        />
      )}

      {menuFor && (
        <ExerciseActionSheet
          exercise={menuFor}
          hasSessions={!!lastFor(menuFor.id)}
          onClose={() => setMenuFor(null)}
          onEdit={() => setEditExercise(menuFor)}
          onEditSession={() => setEditSessionFor(menuFor)}
          onDeleteLastSet={() => {
            const last = lastFor(menuFor.id);
            if (!last) return;
            if (last.sets.length <= 1) onDeleteSession(last.id);
            else onUpdateSessionSets(last.id, last.sets.slice(0, -1));
          }}
          onDeleteExercise={() => setConfirmDelete(menuFor)}
        />
      )}

      {editExercise && <EditExerciseSheet exercise={editExercise} onClose={() => setEditExercise(null)} onSave={onUpdateExercise} />}

      {editSessionFor &&
        (() => {
          const last = lastFor(editSessionFor.id);
          return last ? (
            <SetEditorSheet
              title={`تعديل جلسة ${editSessionFor.name}`}
              initialSets={last.sets}
              onClose={() => setEditSessionFor(null)}
              onSave={(sets) => onUpdateSessionSets(last.id, sets)}
              saveLabel="حفظ التعديل"
            />
          ) : null;
        })()}

      {confirmDelete && (
        <ConfirmDialog
          title="حذف التمرين"
          message={`هل أنت متأكد أنك تريد حذف "${confirmDelete.name}"؟ هيتحذف معاه كل سجل التمرين ده كمان.`}
          onCancel={() => setConfirmDelete(null)}
          onConfirm={() => {
            onDeleteExercise(confirmDelete.id);
            setConfirmDelete(null);
          }}
        />
      )}
    </div>
  );
}

// ---------- Progress Tab ----------
// ---------- a single date-based line chart, reused for weight and reps so the two never share a scale ----------
function ProgressLineChart({ data, dataKey, color, unit, title }) {
  return (
    <div className="mb-4">
      <div style={{ color: "#9b9686", fontSize: 12, marginBottom: 6, fontFamily: "'Tajawal', sans-serif" }}>{title}</div>
      <div style={{ width: "100%", height: 160 }} dir="ltr">
        <ResponsiveContainer>
          <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid stroke="#2a2820" vertical={false} />
            <XAxis dataKey="label" stroke="#5c584c" fontSize={10} tickLine={false} axisLine={false} />
            <YAxis stroke="#5c584c" fontSize={10} tickLine={false} axisLine={false} width={28} domain={["dataMin - 2", "dataMax + 2"]} />
            <Tooltip
              contentStyle={{ background: "#211f18", border: "1px solid #2a2820", borderRadius: 8, fontFamily: "'Oswald', sans-serif" }}
              labelStyle={{ color: "#9b9686" }}
              itemStyle={{ color: "#f3efe2" }}
              formatter={(v) => [`${v}${unit}`, title]}
            />
            <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2.5} dot={{ r: 4, fill: color, strokeWidth: 0 }} activeDot={{ r: 6 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function ProgressTab({ exercises, sessions, onDelete }) {
  const idsWithData = new Set(sessions.map((s) => s.exerciseId));
  const withData = exercises.filter((e) => idsWithData.has(e.id));
  const grouped = CATEGORIES.map((cat) => ({
    cat,
    items: withData.filter((e) => e.category === cat),
  })).filter((g) => g.items.length > 0);

  const [selected, setSelected] = useState(withData[0]?.id || "");
  const [confirmId, setConfirmId] = useState(null);

  useEffect(() => {
    if ((!selected || !withData.some((e) => e.id === selected)) && withData.length > 0) setSelected(withData[0].id);
  }, [withData, selected]);

  if (withData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-6 text-center gap-3">
        <TrendingUp size={36} style={{ color: "#3a362c" }} />
        <p style={{ color: "#9b9686", fontFamily: "'Tajawal', sans-serif" }}>سجّل أول جلسة تمرين عشان يبدأ يظهر تقدمك هنا</p>
      </div>
    );
  }

  const exSessions = sessions.filter((s) => s.exerciseId === selected).sort((a, b) => (a.date > b.date ? 1 : a.date < b.date ? -1 : 0));

  // one point per logged session — weight and reps tracked as two independent metrics,
  // each the best value reached that session, since they use different scales
  const chartData = exSessions.map((s) => {
    const maxWeight = Math.max(...s.sets.map((x) => x.weight));
    const maxReps = Math.max(...s.sets.map((x) => x.reps));
    return { date: s.date, label: fmtDate(s.date), weight: maxWeight, reps: maxReps };
  });

  const bestWeightPoint = chartData.reduce((a, b) => (b.weight > a.weight ? b : a));
  const bestRepsPoint = chartData.reduce((a, b) => (b.reps > a.reps ? b : a));
  const weightDelta = chartData[chartData.length - 1].weight - chartData[0].weight;
  const exName = exercises.find((e) => e.id === selected)?.name;

  return (
    <div className="px-4 pb-8">
      {grouped.map((g) => (
        <div key={g.cat} className="mb-3">
          <div className="text-[11px] font-bold mb-1.5 px-1" style={{ color: "#5c584c", letterSpacing: 1 }}>
            {g.cat.toUpperCase()}
          </div>
          <div className="flex gap-2 flex-wrap">
            {g.items.map((ex) => (
              <button
                key={ex.id}
                type="button"
                onClick={() => setSelected(ex.id)}
                className="px-3.5 py-1.5 rounded-full text-sm"
                style={{
                  background: selected === ex.id ? "#c1272d" : "#1c1b15",
                  color: selected === ex.id ? "#f3efe2" : "#9b9686",
                  border: "1px solid " + (selected === ex.id ? "#c1272d" : "#2a2820"),
                  fontFamily: "'Tajawal', sans-serif",
                }}
              >
                {ex.name}
              </button>
            ))}
          </div>
        </div>
      ))}

      <div className="rounded-2xl p-4 mt-3 mb-4" style={{ background: "#1c1b15", border: "1px solid #2a2820" }}>
        <div className="flex justify-between items-start mb-4 flex-wrap gap-2">
          <div className="min-w-0">
            <div style={{ color: "#f3efe2", fontFamily: "'Tajawal', sans-serif", fontWeight: 700, fontSize: 16 }}>{exName}</div>
            <div className="flex items-center gap-1.5 mt-1" style={{ color: "#d9a91a" }}>
              <Trophy size={13} />
              <span style={{ fontFamily: "'Oswald', sans-serif", fontSize: 13 }}>
                أقصى وزن: {bestWeightPoint.weight}kg × {bestWeightPoint.reps} • 1RM ≈ {estimate1RM(bestWeightPoint.weight, bestWeightPoint.reps)}kg
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-1" style={{ color: "#2e5090" }}>
              <TrendingUp size={13} />
              <span style={{ fontFamily: "'Oswald', sans-serif", fontSize: 13 }}>أفضل تكرار: {bestRepsPoint.reps}× ({bestRepsPoint.weight}kg)</span>
            </div>
          </div>
          {weightDelta !== 0 && (
            <div
              className="px-3 py-1.5 rounded-full text-sm font-bold tabular-nums flex-shrink-0"
              style={{
                background: weightDelta > 0 ? "rgba(63,125,79,0.15)" : "rgba(193,39,45,0.15)",
                color: weightDelta > 0 ? "#3f7d4f" : "#c1272d",
                fontFamily: "'Oswald', sans-serif",
              }}
            >
              {weightDelta > 0 ? "+" : ""}
              {weightDelta}kg
            </div>
          )}
        </div>

        <ProgressLineChart data={chartData} dataKey="weight" color="#c1272d" unit=" kg" title="تطور الوزن" />
        <ProgressLineChart data={chartData} dataKey="reps" color="#2e5090" unit="" title="تطور التكرارات" />
      </div>

      <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid #2a2820" }}>
        {exSessions
          .slice()
          .reverse()
          .slice(0, 8)
          .map((s, i) => (
            <div
              key={s.id}
              className="flex items-center justify-between px-4 py-3"
              style={{ background: "#1c1b15", borderTop: i > 0 ? "1px solid #2a2820" : "none" }}
            >
              <div className="flex items-center gap-2 flex-shrink-0">
                <span style={{ color: "#9b9686", fontSize: 13 }}>{fmtDate(s.date)}</span>
                {confirmId === s.id ? (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        onDelete(s.id);
                        setConfirmId(null);
                      }}
                      className="px-2 py-1 rounded-md text-[11px] font-bold"
                      style={{ background: "#c1272d", color: "#f3efe2" }}
                    >
                      تأكيد الحذف
                    </button>
                    <button type="button" onClick={() => setConfirmId(null)} className="text-[11px]" style={{ color: "#5c584c" }}>
                      إلغاء
                    </button>
                  </div>
                ) : (
                  <button type="button" onClick={() => setConfirmId(s.id)} style={{ color: "#4a463c" }}>
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
              <div className="flex items-center gap-1.5 flex-wrap justify-end" dir="ltr">
                {s.sets.map((set, si) => (
                  <span key={si} className="flex items-center gap-1.5">
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ background: SET_COLORS[si % SET_COLORS.length] }}
                    />
                    <span style={{ color: "#f3efe2", fontFamily: "'Oswald', sans-serif", fontSize: 13 }}>
                      {set.weight}×{set.reps}
                    </span>
                    {si < s.sets.length - 1 && <span style={{ color: "#3a362c" }}>·</span>}
                  </span>
                ))}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}

// ---------- Main App ----------
export default function GymTracker() {
  const [exercises, setExercises] = useState(DEFAULT_EXERCISES);
  const [sessions, setSessions] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [lastTimerDuration, setLastTimerDuration] = useState(90);
  const [autoStartToken, setAutoStartToken] = useState(0);
  const [tab, setTab] = useState("exercises");
  const [loaded, setLoaded] = useState(false);
  const audioCtxRef = useRef(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.exercises) setExercises(parsed.exercises);
        if (parsed.sessions) setSessions(parsed.sessions);
        if (parsed.lastTimerDuration) setLastTimerDuration(parsed.lastTimerDuration);
        if (parsed.favorites) setFavorites(parsed.favorites);
      }
    } catch (e) {
      // no data yet, keep defaults
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ exercises, sessions, lastTimerDuration, favorites }));
    } catch (e) {
      // ignore save errors
    }
  }, [exercises, sessions, lastTimerDuration, favorites, loaded]);

  const ensureAudio = useCallback(() => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (audioCtxRef.current.state === "suspended") audioCtxRef.current.resume();
    } catch (e) {
      // audio unavailable, ignore
    }
    return audioCtxRef.current;
  }, []);

  const playAlarm = useCallback(() => {
    const ctx = ensureAudio();
    if (!ctx) return;
    try {
      if (navigator.vibrate) navigator.vibrate([250, 120, 250, 120, 250, 120, 250, 120, 400]);
    } catch (e) {}
    const beepTimes = [0, 0.4, 0.8, 1.2, 1.6, 2.0, 2.4, 2.8];
    beepTimes.forEach((delay, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "square";
      osc.frequency.value = i % 2 === 0 ? 1046 : 784;
      gain.gain.setValueAtTime(0, ctx.currentTime + delay);
      gain.gain.linearRampToValueAtTime(0.4, ctx.currentTime + delay + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + 0.32);
    });
  }, [ensureAudio]);

  const handleLog = (exerciseId, sets) => {
    ensureAudio();
    setSessions((prev) => [...prev, { id: Date.now().toString(), exerciseId, date: todayISO(), sets }]);
    setAutoStartToken((t) => t + 1);
    setTab("timer");
  };

  const handleDeleteSession = (id) => setSessions((prev) => prev.filter((s) => s.id !== id));
  const handleAddExercise = (ex) => setExercises((prev) => [...prev, ex]);
  const toggleFavorite = (id) => setFavorites((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  const handleUpdateExercise = (updated) => setExercises((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
  const handleDeleteExercise = (id) => {
    setExercises((prev) => prev.filter((e) => e.id !== id));
    setSessions((prev) => prev.filter((s) => s.exerciseId !== id));
  };
  const handleUpdateSessionSets = (sessionId, sets) => setSessions((prev) => prev.map((s) => (s.id === sessionId ? { ...s, sets } : s)));

  const TABS = [
    { id: "exercises", label: "تمارين", icon: Dumbbell },
    { id: "progress", label: "تقدم", icon: TrendingUp },
    { id: "timer", label: "تايمر", icon: TimerIcon },
  ];

  return (
    <div dir="rtl" style={{ background: "#16150f", minHeight: "100vh", fontFamily: "'Tajawal', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;900&family=Oswald:wght@500;600;700&display=swap');
        * { box-sizing: border-box; }
        input::-webkit-outer-spin-button, input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
      `}</style>

      <div className="sticky top-0 z-10 px-5 pt-6 pb-4" style={{ background: "#16150f", borderBottom: "1px solid #211f18" }}>
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-8 rounded-sm" style={{ background: "#c1272d" }} />
          <h1 style={{ color: "#f3efe2", fontWeight: 900, fontSize: 22, letterSpacing: -0.5 }}>الحديد</h1>
        </div>
        <p style={{ color: "#5c584c", fontSize: 12.5, marginTop: 2, marginRight: 14 }}>تتبّع أوزانك، وخد راحتك بين المجاميع</p>
      </div>

      <div className="pt-5" style={{ minHeight: "60vh" }}>
        {tab === "exercises" && (
          <ExercisesTab
            exercises={exercises}
            sessions={sessions}
            onLog={handleLog}
            onAddExercise={handleAddExercise}
            favorites={favorites}
            onToggleFavorite={toggleFavorite}
            onUpdateExercise={handleUpdateExercise}
            onDeleteExercise={handleDeleteExercise}
            onUpdateSessionSets={handleUpdateSessionSets}
            onDeleteSession={handleDeleteSession}
          />
        )}
        {tab === "progress" && <ProgressTab exercises={exercises} sessions={sessions} onDelete={handleDeleteSession} />}
        {tab === "timer" && (
          <RestTimer
            defaultDuration={lastTimerDuration}
            onDurationChange={setLastTimerDuration}
            autoStartToken={autoStartToken}
            ensureAudio={ensureAudio}
            playAlarm={playAlarm}
          />
        )}
      </div>

      <div className="sticky bottom-0 flex" style={{ background: "#1c1b15", borderTop: "1px solid #2a2820" }}>
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className="flex-1 flex flex-col items-center gap-1 py-3"
              style={{ color: active ? "#c1272d" : "#5c584c" }}
            >
              <Icon size={20} strokeWidth={active ? 2.4 : 2} />
              <span style={{ fontSize: 11, fontWeight: active ? 700 : 500 }}>{t.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
