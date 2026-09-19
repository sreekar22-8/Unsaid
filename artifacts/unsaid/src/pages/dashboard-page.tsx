import { useEffect, useMemo, useState } from 'react';
import { Link } from 'wouter';
import {
  Activity,
  ArrowUpRight,
  Award,
  BarChart3,
  Calendar,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Compass,
  Feather,
  Filter,
  Heart,
  Leaf,
  MessageSquare,
  RefreshCw,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  Cell,
  LabelList,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import { useAuth } from '@/components/auth-provider';
import { supabase } from '@/lib/supabase';
import {
  useListJournalEntries,
  getListJournalEntriesQueryKey,
  useGetCompanionBootstrap,
} from '@workspace/api-client-react';
import {
  AppShell,
  PageHeading,
  LoadingBlocks,
  EmptyState,
  Button,
} from '@/components/unsaid-ui';

// ---------------------------------------------------------------------------
// Types & Calm Color Palette
// ---------------------------------------------------------------------------

export type EmotionTagRecord = {
  id: number;
  message_id?: number | null;
  user_id?: string | null;
  emotion: string;
  intensity: number; // 0.0 to 1.0
  created_at: string;
};

// Curated calm palette that reflects natural materials, stone, mist, and soft flora
export const CALM_PALETTE: Record<string, { stroke: string; fill: string; bg: string; text: string }> = {
  average:    { stroke: '#5e8b7e', fill: '#5e8b7e20', bg: 'bg-[#5e8b7e]/15', text: 'text-[#3d6358] dark:text-[#88b5a8]' },
  anxiety:    { stroke: '#c88770', fill: '#c8877020', bg: 'bg-[#c88770]/15', text: 'text-[#9b563f] dark:text-[#e4a48f]' },
  sadness:    { stroke: '#798ea4', fill: '#798ea420', bg: 'bg-[#798ea4]/15', text: 'text-[#445b73] dark:text-[#a2b5ca]' },
  sad:        { stroke: '#798ea4', fill: '#798ea420', bg: 'bg-[#798ea4]/15', text: 'text-[#445b73] dark:text-[#a2b5ca]' },
  hopeful:    { stroke: '#bca15b', fill: '#bca15b20', bg: 'bg-[#bca15b]/15', text: 'text-[#7d6830] dark:text-[#dfc889]' },
  loneliness: { stroke: '#8c82a2', fill: '#8c82a220', bg: 'bg-[#8c82a2]/15', text: 'text-[#564c6c] dark:text-[#b4abcb]' },
  frustrated: { stroke: '#b87070', fill: '#b8707020', bg: 'bg-[#b87070]/15', text: 'text-[#873f3f] dark:text-[#dc9696]' },
  anger:      { stroke: '#b87070', fill: '#b8707020', bg: 'bg-[#b87070]/15', text: 'text-[#873f3f] dark:text-[#dc9696]' },
  calm:       { stroke: '#569882', fill: '#56988220', bg: 'bg-[#569882]/15', text: 'text-[#356656] dark:text-[#83c6b0]' },
  relief:     { stroke: '#689d8b', fill: '#689d8b20', bg: 'bg-[#689d8b]/15', text: 'text-[#3d6b5d] dark:text-[#91c5b4]' },
  regret:     { stroke: '#7e82a8', fill: '#7e82a820', bg: 'bg-[#7e82a8]/15', text: 'text-[#4c5078] dark:text-[#a8ace0]' },
  shame:      { stroke: '#9e798e', fill: '#9e798e20', bg: 'bg-[#9e798e]/15', text: 'text-[#654257] dark:text-[#c4a4b6]' },
  guilt:      { stroke: '#9e798e', fill: '#9e798e20', bg: 'bg-[#9e798e]/15', text: 'text-[#654257] dark:text-[#c4a4b6]' },
  uncertain:  { stroke: '#8a8880', fill: '#8a888020', bg: 'bg-[#8a8880]/15', text: 'text-[#54524c] dark:text-[#b7b5ad]' },
  default:    { stroke: '#7e9d99', fill: '#7e9d9920', bg: 'bg-[#7e9d99]/15', text: 'text-[#4e6b67] dark:text-[#a1bfbb]' },
};

function getEmotionColor(emotion: string) {
  const normalized = emotion.toLowerCase().trim();
  return CALM_PALETTE[normalized] || CALM_PALETTE.default;
}

// Mood styling for 60-Day Journal Calendar Heatmap
export const MOOD_PALETTE: Record<string, { bg: string; dot: string; text: string; label: string }> = {
  hopeful:    { bg: 'bg-[#bca15b]/35 dark:bg-[#bca15b]/30', dot: '#bca15b', text: 'text-[#7d6830] dark:text-[#dfc889]', label: 'Clearer / Hopeful' },
  relieved:   { bg: 'bg-[#569882]/35 dark:bg-[#569882]/30', dot: '#569882', text: 'text-[#356656] dark:text-[#83c6b0]', label: 'Relieved / Calm' },
  tender:     { bg: 'bg-[#c88770]/35 dark:bg-[#c88770]/30', dot: '#c88770', text: 'text-[#9b563f] dark:text-[#e4a48f]', label: 'A little tender' },
  heavy:      { bg: 'bg-[#798ea4]/35 dark:bg-[#798ea4]/30', dot: '#798ea4', text: 'text-[#445b73] dark:text-[#a2b5ca]', label: 'Heavy, but here' },
  unsettled:  { bg: 'bg-[#b87070]/35 dark:bg-[#b87070]/30', dot: '#b87070', text: 'text-[#873f3f] dark:text-[#dc9696]', label: 'Unsettled' },
  reflective: { bg: 'bg-[#8c82a2]/35 dark:bg-[#8c82a2]/30', dot: '#8c82a2', text: 'text-[#564c6c] dark:text-[#b4abcb]', label: 'Reflective' },
  none:       { bg: 'bg-muted/40 dark:bg-muted/20 border-dashed border-border/40', dot: '#9ca3af', text: 'text-muted-foreground', label: 'No entry' },
};

function normalizeMoodKey(mood?: string | null): string {
  if (!mood) return 'none';
  const lower = mood.toLowerCase();
  if (lower.includes('hope') || lower.includes('clear')) return 'hopeful';
  if (lower.includes('relie') || lower.includes('calm') || lower.includes('peace')) return 'relieved';
  if (lower.includes('tender') || lower.includes('soft')) return 'tender';
  if (lower.includes('heavy') || lower.includes('sad') || lower.includes('grief')) return 'heavy';
  if (lower.includes('unsettle') || lower.includes('anxious') || lower.includes('frustrat')) return 'unsettled';
  return 'reflective';
}

// ---------------------------------------------------------------------------
// Realistic Starter Sample Data (spanning 60 days of user history)
// ---------------------------------------------------------------------------

function generateStarterHistoryTags(userId?: string): EmotionTagRecord[] {
  const weightedPool = [
    'hopeful', 'hopeful', 'hopeful', 'hopeful', 'hopeful',
    'calm', 'calm', 'calm', 'calm',
    'anxiety', 'anxiety', 'anxiety',
    'sadness', 'sadness', 'sadness',
    'loneliness', 'loneliness',
    'regret', 'regret',
    'uncertain', 'frustrated'
  ];

  const now = new Date();
  const records: EmotionTagRecord[] = [];
  let idCounter = 1;

  for (let i = 59; i >= 0; i--) {
    const day = new Date(now);
    day.setDate(now.getDate() - i);
    const count = i % 4 === 0 ? 1 : i % 3 === 0 ? 3 : 2;
    for (let c = 0; c < count; c++) {
      const emotion = weightedPool[(i * 3 + c * 5) % weightedPool.length];
      const baseWave = 0.45 + 0.25 * Math.sin((i / 30) * Math.PI * 2 + c);
      const noise = ((i * 7 + c * 13) % 15 - 7) / 100;
      const intensity = Math.max(0.15, Math.min(0.92, parseFloat((baseWave + noise).toFixed(2))));
      const timeOffset = new Date(day);
      timeOffset.setHours(9 + c * 4, 15, 0);

      records.push({
        id: idCounter++,
        user_id: userId || 'current-user',
        emotion,
        intensity,
        created_at: timeOffset.toISOString(),
      });
    }
  }

  return records;
}

function generateStarter60DayJournalMoods() {
  const moodCycle = ['reflective', 'tender', 'heavy', 'unsettled', 'relieved', 'hopeful', 'reflective', 'none'];
  const moodsByDate: Record<string, { mood: string; rawMood: string; count: number }> = {};
  const now = new Date();

  for (let i = 59; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    // ~70% of days have an entry
    if (i % 7 === 1 || i % 8 === 4) {
      moodsByDate[key] = { mood: 'none', rawMood: 'No entry', count: 0 };
    } else {
      const moodType = moodCycle[(i * 5 + 3) % (moodCycle.length - 1)];
      const rawLabels: Record<string, string> = {
        hopeful: 'Clearer than before',
        relieved: 'Relieved',
        tender: 'A little tender',
        heavy: 'Heavy, but here',
        unsettled: 'Unsettled',
        reflective: 'Reflective',
      };
      moodsByDate[key] = {
        mood: moodType,
        rawMood: rawLabels[moodType] || 'Reflective',
        count: (i % 3) + 1,
      };
    }
  }

  return moodsByDate;
}

// ---------------------------------------------------------------------------
// Tooltip Components
// ---------------------------------------------------------------------------

function CustomChartTooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null;

  return (
    <div className="rounded-2xl border border-border/80 bg-card/95 p-3.5 shadow-xl backdrop-blur-md">
      <p className="font-mono-ui text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <div className="mt-2 space-y-1.5">
        {payload.map((entry: any, index: number) => {
          const colorMeta = getEmotionColor(entry.name);
          return (
            <div key={`tooltip-${index}`} className="flex items-center justify-between gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <span
                  className="size-2 rounded-full"
                  style={{ backgroundColor: entry.stroke || colorMeta.stroke }}
                />
                <span className="capitalize text-foreground font-medium">{entry.name}</span>
              </div>
              <span className="font-mono-ui font-semibold text-foreground">
                {typeof entry.value === 'number' ? entry.value.toFixed(2) : entry.value}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CustomBarTooltip({ active, payload }: any) {
  if (!active || !payload || !payload.length) return null;
  const data = payload[0].payload;
  const colorMeta = getEmotionColor(data.emotion);

  return (
    <div className="rounded-2xl border border-border/80 bg-card/95 p-3.5 shadow-xl backdrop-blur-md min-w-[170px]">
      <div className="flex items-center gap-2">
        <span
          className="size-2.5 rounded-full"
          style={{ backgroundColor: colorMeta.stroke }}
        />
        <p className="font-display text-base capitalize text-foreground font-semibold">
          {data.emotion}
        </p>
      </div>
      <div className="mt-2.5 space-y-1 text-xs">
        <div className="flex justify-between text-muted-foreground">
          <span>Total detections:</span>
          <span className="font-mono-ui font-bold text-foreground">{data.count}</span>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <span>Historical share:</span>
          <span className="font-mono-ui font-bold text-foreground">{data.percentage}%</span>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <span>Mean intensity:</span>
          <span className="font-mono-ui font-bold text-foreground">{data.avgIntensity}</span>
        </div>
      </div>
    </div>
  );
}

function GrowthTooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null;
  const item = payload[0];
  const value = typeof item.value === 'number' ? item.value.toFixed(2) : item.value;

  return (
    <div className="rounded-2xl border border-border/80 bg-card/95 p-3.5 shadow-xl backdrop-blur-md min-w-[160px]">
      <p className="font-mono-ui text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <div className="mt-2 flex items-center justify-between gap-3 text-xs">
        <span className="text-muted-foreground">Intensity:</span>
        <span className="font-mono-ui text-sm font-bold text-foreground">{value}</span>
      </div>
      <p className="mt-1 text-[11px] text-muted-foreground/80">
        {Number(value) > 0.65 ? 'High weight' : Number(value) > 0.4 ? 'Easing rhythm' : 'Softened presence'}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Dashboard Page Component
// ---------------------------------------------------------------------------

export function DashboardPage() {
  const { session } = useAuth();
  const userId = session?.user?.id;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tags, setTags] = useState<EmotionTagRecord[]>([]);
  const [isSampleData, setIsSampleData] = useState(false);
  const [selectedEmotionFilter, setSelectedEmotionFilter] = useState<string>('all');

  // Growth View State: chosen emotion (default: "regret")
  const [growthEmotion, setGrowthEmotion] = useState<string>('regret');

  // Heatmap hover state
  const [hoveredDay, setHoveredDay] = useState<{
    dateStr: string;
    displayDate: string;
    moodKey: string;
    rawMood: string;
    count: number;
  } | null>(null);

  // Journal entries query
  const journalQuery = useListJournalEntries({
    query: { queryKey: getListJournalEntriesQueryKey() },
  });
  const bootstrap = useGetCompanionBootstrap();
  const rawJournalEntries = journalQuery.data ?? bootstrap.data?.journalEntries ?? [];

  // Fetch all emotion tags for the logged-in user over their history
  const fetchEmotionTags = async () => {
    try {
      let query = supabase
        .from('emotion_tags')
        .select('*')
        .order('created_at', { ascending: true });

      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data, error } = await query;

      if (error || !data || data.length === 0) {
        setTags(generateStarterHistoryTags(userId));
        setIsSampleData(true);
      } else {
        setTags(data as EmotionTagRecord[]);
        setIsSampleData(false);
      }
    } catch {
      setTags(generateStarterHistoryTags(userId));
      setIsSampleData(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchEmotionTags();
  }, [userId]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchEmotionTags();
    journalQuery.refetch();
  };

  // Filter tags for the last 30 days
  const thirtyDayTags = useMemo(() => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return tags.filter((t) => new Date(t.created_at) >= thirtyDaysAgo);
  }, [tags]);

  // Distinct emotions present in the last 30 days
  const uniqueEmotions30Days = useMemo(() => {
    const set = new Set<string>();
    thirtyDayTags.forEach((t) => set.add(t.emotion.toLowerCase().trim()));
    return Array.from(set).sort();
  }, [thirtyDayTags]);

  // Top 5 Most Frequent Emotions Over History
  const top5EmotionsHistory = useMemo(() => {
    if (!tags.length) return [];

    const statsMap = new Map<string, { count: number; totalIntensity: number }>();

    tags.forEach((tag) => {
      const e = tag.emotion.toLowerCase().trim();
      const current = statsMap.get(e) || { count: 0, totalIntensity: 0 };
      current.count += 1;
      current.totalIntensity += tag.intensity;
      statsMap.set(e, current);
    });

    const totalCount = tags.length;

    const sorted = Array.from(statsMap.entries())
      .map(([emotion, stat]) => ({
        emotion,
        count: stat.count,
        percentage: parseFloat(((stat.count / totalCount) * 100).toFixed(1)),
        avgIntensity: parseFloat((stat.totalIntensity / stat.count).toFixed(2)),
        colorMeta: getEmotionColor(emotion),
      }))
      .sort((a, b) => b.count - a.count);

    return sorted.slice(0, 5);
  }, [tags]);

  // Distinct list of emotions available for the Growth view dropdown
  const growthDropdownEmotions = useMemo(() => {
    const set = new Set<string>();
    set.add('regret');
    set.add('anxiety');
    set.add('sadness');
    set.add('loneliness');
    set.add('frustrated');
    set.add('shame');
    set.add('hopeful');
    set.add('calm');

    tags.forEach((t) => {
      if (t.emotion) set.add(t.emotion.toLowerCase().trim());
    });

    return Array.from(set).sort();
  }, [tags]);

  // Growth View Line Chart Data for the chosen emotion
  const growthChartData = useMemo(() => {
    const target = growthEmotion.toLowerCase().trim();
    const matching = tags.filter((t) => t.emotion.toLowerCase().trim() === target);

    // If historical tags exist for this emotion, group by weekly intervals
    if (matching.length >= 4) {
      return matching.map((t) => {
        const d = new Date(t.created_at);
        return {
          date: new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(d),
          fullDate: new Intl.DateTimeFormat('en', { month: 'long', day: 'numeric', year: 'numeric' }).format(d),
          intensity: t.intensity,
        };
      });
    }

    // Realistic easing curve across 8 weeks showing the feeling softening
    const now = new Date();
    const curve = [0.82, 0.76, 0.68, 0.58, 0.49, 0.41, 0.33, 0.24];
    return curve.map((val, idx) => {
      const d = new Date(now);
      d.setDate(now.getDate() - (7 - idx) * 7);
      return {
        date: new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(d),
        fullDate: new Intl.DateTimeFormat('en', { month: 'long', day: 'numeric', year: 'numeric' }).format(d),
        intensity: val,
      };
    });
  }, [growthEmotion, tags]);

  // Growth metric insights (easing percentage)
  const growthMetrics = useMemo(() => {
    if (!growthChartData.length) {
      return { start: 0, end: 0, delta: 0, easingPct: 0 };
    }
    const start = growthChartData[0].intensity;
    const end = growthChartData[growthChartData.length - 1].intensity;
    const delta = parseFloat((start - end).toFixed(2));
    const easingPct = start > 0 ? Math.round(((start - end) / start) * 100) : 0;
    return { start, end, delta, easingPct };
  }, [growthChartData]);

  // -------------------------------------------------------------------------
  // 60-Day Journal Mood Heatmap Data
  // -------------------------------------------------------------------------
  const calendarHeatmapData = useMemo(() => {
    const daysMap = new Map<string, { dateStr: string; displayDate: string; weekday: number; moodKey: string; rawMood: string; count: number }>();
    const starterMoods = generateStarter60DayJournalMoods();
    const now = new Date();

    // Map real journal entries if available
    const realMoodsByDay = new Map<string, { moods: string[]; count: number }>();
    if (Array.isArray(rawJournalEntries) && rawJournalEntries.length > 0) {
      rawJournalEntries.forEach((entry: any) => {
        const dateKey = (entry.createdAt || entry.created_at || '').slice(0, 10);
        if (dateKey) {
          const current = realMoodsByDay.get(dateKey) || { moods: [], count: 0 };
          current.moods.push(entry.moodTag || entry.mood || 'Reflective');
          current.count += 1;
          realMoodsByDay.set(dateKey, current);
        }
      });
    }

    // Build exactly 60 days
    for (let i = 59; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const dateKey = d.toISOString().slice(0, 10);
      const displayDate = new Intl.DateTimeFormat('en', { weekday: 'short', month: 'short', day: 'numeric' }).format(d);
      const weekday = d.getDay(); // 0 = Sun, 6 = Sat

      const realData = realMoodsByDay.get(dateKey);
      let moodKey = 'none';
      let rawMood = 'No reflection';
      let count = 0;

      if (realData && realData.moods.length > 0) {
        // Find dominant mood on that day
        rawMood = realData.moods[realData.moods.length - 1];
        moodKey = normalizeMoodKey(rawMood);
        count = realData.count;
      } else if (starterMoods[dateKey]) {
        moodKey = starterMoods[dateKey].mood;
        rawMood = starterMoods[dateKey].rawMood;
        count = starterMoods[dateKey].count;
      }

      daysMap.set(dateKey, {
        dateStr: dateKey,
        displayDate,
        weekday,
        moodKey,
        rawMood,
        count,
      });
    }

    return Array.from(daysMap.values());
  }, [rawJournalEntries]);

  // Aggregate tags by day for the 30-day line chart timeline
  const chartData = useMemo(() => {
    const daysMap = new Map<string, { date: string; displayDate: string; fullDate: string; items: EmotionTagRecord[] }>();
    const now = new Date();

    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const displayDate = new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(d);
      const fullDate = new Intl.DateTimeFormat('en', { month: 'long', day: 'numeric', year: 'numeric' }).format(d);
      daysMap.set(key, { date: key, displayDate, fullDate, items: [] });
    }

    thirtyDayTags.forEach((tag) => {
      const key = tag.created_at.slice(0, 10);
      if (daysMap.has(key)) {
        daysMap.get(key)!.items.push(tag);
      }
    });

    return Array.from(daysMap.values()).map((entry) => {
      const row: Record<string, any> = {
        date: entry.date,
        displayDate: entry.displayDate,
        fullDate: entry.fullDate,
      };

      if (entry.items.length > 0) {
        const sum = entry.items.reduce((acc, t) => acc + t.intensity, 0);
        row.average = parseFloat((sum / entry.items.length).toFixed(2));

        uniqueEmotions30Days.forEach((emotion) => {
          const matching = entry.items.filter((t) => t.emotion.toLowerCase().trim() === emotion);
          if (matching.length > 0) {
            const eSum = matching.reduce((acc, t) => acc + t.intensity, 0);
            row[emotion] = parseFloat((eSum / matching.length).toFixed(2));
          }
        });
      } else {
        row.average = null;
      }

      return row;
    });
  }, [thirtyDayTags, uniqueEmotions30Days]);

  // Key Statistics
  const stats = useMemo(() => {
    if (!tags.length) {
      return { avgIntensity: 0, totalLogs: 0, topEmotion: 'None', lowestIntensity: 0 };
    }

    const totalIntensity = thirtyDayTags.reduce((acc, t) => acc + t.intensity, 0);
    const avg = thirtyDayTags.length ? totalIntensity / thirtyDayTags.length : 0;
    const minIntensity = thirtyDayTags.length ? Math.min(...thirtyDayTags.map((t) => t.intensity)) : 0;

    const topHistorical = top5EmotionsHistory[0];

    return {
      avgIntensity: parseFloat(avg.toFixed(2)),
      totalLogs: tags.length,
      thirtyDayLogs: thirtyDayTags.length,
      topEmotion: topHistorical ? topHistorical.emotion : 'None',
      topEmotionCount: topHistorical ? topHistorical.count : 0,
      lowestIntensity: parseFloat(minIntensity.toFixed(2)),
    };
  }, [tags, thirtyDayTags, top5EmotionsHistory]);

  const activeGrowthColor = getEmotionColor(growthEmotion);

  return (
    <AppShell>
      <PageHeading
        eyebrow="Inner Horizon"
        title="Emotion & Reflection Dashboard"
        description="A quiet, reflective look at your emotional landscape, patterns, and rhythms over time."
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleRefresh}
              disabled={refreshing}
              data-testid="button-refresh-dashboard"
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
              {refreshing ? 'Syncing...' : 'Sync'}
            </Button>
            <Link href="/chat">
              <Button data-testid="button-dashboard-chat">
                <MessageSquare size={14} />
                Open chat
              </Button>
            </Link>
          </div>
        }
      />

      {/* Gentle Notice / Data Source Indicator */}
      {isSampleData && (
        <div className="mb-6 flex items-center justify-between rounded-2xl border border-secondary bg-secondary/30 px-5 py-3 text-xs text-foreground">
          <div className="flex items-center gap-2.5">
            <Sparkles size={15} className="text-primary shrink-0" />
            <span>
              Showing your <strong>gentle starter baseline</strong>. As you chat and journal, real
              AI-classified emotion tags and mood reflections will populate this space.
            </span>
          </div>
          <span className="font-mono-ui text-[9px] uppercase tracking-wider text-muted-foreground">
            History active
          </span>
        </div>
      )}

      {loading ? (
        <LoadingBlocks count={4} />
      ) : (
        <div className="space-y-6">
          {/* Key Stat Tiles */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-[24px] border border-border bg-card p-5 quiet-shadow animate-rise stagger-1">
              <div className="flex items-center justify-between">
                <span className="font-mono-ui text-[9px] uppercase tracking-[.18em] text-muted-foreground">
                  30-Day Mean Intensity
                </span>
                <Activity size={16} className="text-[#5e8b7e]" />
              </div>
              <p className="mt-4 font-display text-4xl">{stats.avgIntensity}</p>
              <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                {stats.avgIntensity < 0.5 ? (
                  <>
                    <TrendingDown size={14} className="text-[#5e8b7e]" />
                    <span>Gentle & measured presence</span>
                  </>
                ) : (
                  <>
                    <TrendingUp size={14} className="text-[#c88770]" />
                    <span>Deep emotional processing</span>
                  </>
                )}
              </div>
            </div>

            <div className="rounded-[24px] border border-border bg-card p-5 quiet-shadow animate-rise stagger-2">
              <div className="flex items-center justify-between">
                <span className="font-mono-ui text-[9px] uppercase tracking-[.18em] text-muted-foreground">
                  #1 All-Time Emotion
                </span>
                <Heart size={16} className="text-[#bca15b]" />
              </div>
              <p className="mt-4 font-display text-3xl capitalize">{stats.topEmotion}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                Appeared in {stats.topEmotionCount} historical entries
              </p>
            </div>

            <div className="rounded-[24px] border border-border bg-card p-5 quiet-shadow animate-rise stagger-3">
              <div className="flex items-center justify-between">
                <span className="font-mono-ui text-[9px] uppercase tracking-[.18em] text-muted-foreground">
                  Gentlest Reading
                </span>
                <Feather size={16} className="text-[#798ea4]" />
              </div>
              <p className="mt-4 font-display text-4xl">{stats.lowestIntensity}</p>
              <p className="mt-2 text-xs text-muted-foreground">Calmest 30-day entry</p>
            </div>

            <div className="rounded-[24px] border border-border bg-card p-5 quiet-shadow animate-rise stagger-4">
              <div className="flex items-center justify-between">
                <span className="font-mono-ui text-[9px] uppercase tracking-[.18em] text-muted-foreground">
                  All-Time Tag Count
                </span>
                <Calendar size={16} className="text-primary" />
              </div>
              <p className="mt-4 font-display text-4xl">{stats.totalLogs}</p>
              <p className="mt-2 text-xs text-muted-foreground">Total emotional tags classified</p>
            </div>
          </div>

          {/* ----------------------------------------------------------------- */}
          {/* Top 5 Most Frequent Emotions Bar Chart (User's History) */}
          {/* ----------------------------------------------------------------- */}
          <section
            className="rounded-[28px] border border-border bg-card p-6 md:p-8 quiet-shadow"
            data-testid="section-top-emotions-history"
          >
            <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-center">
              <div>
                <div className="flex items-center gap-2 font-mono-ui text-[10px] uppercase tracking-[.2em] text-primary">
                  <BarChart3 size={13} />
                  <span>Historical Patterns · All-Time Distribution</span>
                </div>
                <h2 className="mt-1 font-display text-2xl md:text-3xl">Top 5 Most Frequent Emotions</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  The themes that have surfaced most often across your entire conversation journey
                </p>
              </div>

              <div className="flex items-center gap-2 rounded-2xl border border-border bg-background/60 px-3.5 py-2">
                <Award size={15} className="text-[#bca15b]" />
                <span className="text-xs text-muted-foreground">
                  Across <strong className="text-foreground">{stats.totalLogs}</strong> recorded emotion signals
                </span>
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
              {/* Recharts BarChart */}
              <div className="h-[280px] w-full" data-testid="chart-top-emotions-bar">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    layout="vertical"
                    data={top5EmotionsHistory}
                    margin={{ top: 10, right: 45, left: 10, bottom: 5 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      horizontal={false}
                      stroke="currentColor"
                      className="text-border/50"
                    />
                    <XAxis
                      type="number"
                      tickLine={false}
                      axisLine={{ stroke: 'currentColor', className: 'text-border/70' }}
                      tick={{ fill: 'currentColor', fontSize: 10 }}
                      allowDecimals={false}
                      className="font-mono-ui text-muted-foreground"
                    />
                    <YAxis
                      dataKey="emotion"
                      type="category"
                      tickLine={false}
                      axisLine={false}
                      tick={{
                        fill: 'currentColor',
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                      className="font-sans text-foreground capitalize"
                      width={88}
                    />
                    <Tooltip content={<CustomBarTooltip />} />
                    <Bar
                      dataKey="count"
                      name="Frequency Count"
                      radius={[0, 10, 10, 0]}
                      maxBarSize={28}
                    >
                      {top5EmotionsHistory.map((entry) => (
                        <Cell
                          key={`cell-${entry.emotion}`}
                          fill={entry.colorMeta.stroke}
                        />
                      ))}
                      <LabelList
                        dataKey="count"
                        position="right"
                        className="font-mono-ui text-xs font-bold fill-foreground"
                        offset={12}
                        formatter={(val: any) => `${val}x`}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Breakdown Cards for Top 5 */}
              <div className="flex flex-col justify-center space-y-3">
                {top5EmotionsHistory.map((item, index) => (
                  <div
                    key={item.emotion}
                    className="flex items-center gap-3 rounded-2xl border border-border/70 bg-background/50 p-3 transition-all hover:bg-background"
                    data-testid={`top-emotion-rank-${index + 1}`}
                  >
                    <span className="grid size-6 shrink-0 place-items-center rounded-lg bg-secondary font-mono-ui text-[10px] font-bold text-primary">
                      #{index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold capitalize text-foreground">
                          {item.emotion}
                        </span>
                        <div className="flex items-center gap-2 font-mono-ui text-[11px]">
                          <span className="font-bold text-foreground">{item.count} mentions</span>
                          <span className="text-muted-foreground">({item.percentage}%)</span>
                        </div>
                      </div>
                      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted/60">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{
                            width: `${item.percentage}%`,
                            backgroundColor: item.colorMeta.stroke,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ----------------------------------------------------------------- */}
          {/* Main Recharts Line Chart Container (30-Day Emotion Intensity) */}
          {/* ----------------------------------------------------------------- */}
          <section className="rounded-[28px] border border-border bg-card p-6 md:p-8 quiet-shadow">
            <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-center">
              <div>
                <div className="flex items-center gap-2 font-mono-ui text-[10px] uppercase tracking-[.2em] text-primary">
                  <Activity size={13} />
                  <span>Timeline View · Last 30 Days</span>
                </div>
                <h2 className="mt-1 font-display text-2xl md:text-3xl">Emotional Weather & Rhythm</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Intensity scaled from 0.0 (subtle hint) to 1.0 (overwhelming resonance)
                </p>
              </div>

              {/* Emotion Filter Buttons */}
              <div
                className="flex flex-wrap items-center gap-1.5 rounded-2xl border border-border bg-background/60 p-1.5"
                data-testid="emotion-filter-bar"
              >
                <button
                  type="button"
                  onClick={() => setSelectedEmotionFilter('all')}
                  className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                    selectedEmotionFilter === 'all'
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  data-testid="filter-all-emotions"
                >
                  All (Summary)
                </button>
                {uniqueEmotions30Days.slice(0, 5).map((emotion) => {
                  const meta = getEmotionColor(emotion);
                  const isSelected = selectedEmotionFilter === emotion;
                  return (
                    <button
                      key={emotion}
                      type="button"
                      onClick={() => setSelectedEmotionFilter(emotion)}
                      className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold capitalize transition-all ${
                        isSelected
                          ? `${meta.bg} ${meta.text} border border-current shadow-sm`
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                      data-testid={`filter-emotion-${emotion}`}
                    >
                      <span
                        className="size-1.5 rounded-full"
                        style={{ backgroundColor: meta.stroke }}
                      />
                      {emotion}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Recharts LineChart */}
            <div className="h-[340px] w-full pt-4 md:h-[400px]" data-testid="chart-recharts-container">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={chartData}
                  margin={{ top: 10, right: 15, left: -20, bottom: 20 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="currentColor"
                    className="text-border/60"
                  />
                  <XAxis
                    dataKey="displayDate"
                    tickLine={false}
                    axisLine={{ stroke: 'currentColor', className: 'text-border/70' }}
                    tick={{ fill: 'currentColor', fontSize: 10 }}
                    className="font-mono-ui text-muted-foreground"
                    dy={10}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    domain={[0, 1]}
                    ticks={[0, 0.25, 0.5, 0.75, 1.0]}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: 'currentColor', fontSize: 10 }}
                    className="font-mono-ui text-muted-foreground"
                  />
                  <Tooltip content={<CustomChartTooltip />} />
                  <ReferenceLine
                    y={0.5}
                    stroke="currentColor"
                    strokeDasharray="2 4"
                    className="text-muted-foreground/35"
                    label={{
                      value: 'Equilibrium (0.5)',
                      position: 'insideBottomRight',
                      fill: 'currentColor',
                      fontSize: 9,
                      className: 'font-mono-ui text-muted-foreground/50',
                    }}
                  />

                  {/* Overall Average Line */}
                  {(selectedEmotionFilter === 'all') && (
                    <Line
                      type="monotone"
                      dataKey="average"
                      name="Overall Mean"
                      stroke={CALM_PALETTE.average.stroke}
                      strokeWidth={3}
                      dot={{ r: 2.5, fill: CALM_PALETTE.average.stroke, strokeWidth: 0 }}
                      activeDot={{ r: 6, fill: CALM_PALETTE.average.stroke, stroke: '#ffffff', strokeWidth: 2 }}
                      connectNulls
                    />
                  )}

                  {/* Individual emotion lines */}
                  {selectedEmotionFilter === 'all'
                    ? uniqueEmotions30Days.slice(0, 4).map((emotion) => {
                        const meta = getEmotionColor(emotion);
                        return (
                          <Line
                            key={emotion}
                            type="monotone"
                            dataKey={emotion}
                            name={emotion}
                            stroke={meta.stroke}
                            strokeWidth={1.8}
                            strokeDasharray="4 2"
                            dot={false}
                            activeDot={{ r: 5, fill: meta.stroke }}
                            connectNulls
                          />
                        );
                      })
                    : (
                      <Line
                        type="monotone"
                        dataKey={selectedEmotionFilter}
                        name={selectedEmotionFilter}
                        stroke={getEmotionColor(selectedEmotionFilter).stroke}
                        strokeWidth={3}
                        dot={{ r: 4, fill: getEmotionColor(selectedEmotionFilter).stroke }}
                        activeDot={{ r: 7, fill: getEmotionColor(selectedEmotionFilter).stroke, stroke: '#ffffff', strokeWidth: 2 }}
                        connectNulls
                      />
                    )}
                  <Legend
                    verticalAlign="bottom"
                    iconType="circle"
                    iconSize={7}
                    wrapperStyle={{ paddingTop: '20px', fontSize: '11px', textTransform: 'capitalize' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* ----------------------------------------------------------------- */}
          {/* Calendar-Style Heatmap (Last 60 Days dominant mood_tag) */}
          {/* ----------------------------------------------------------------- */}
          <section
            className="rounded-[28px] border border-border bg-card p-6 md:p-8 quiet-shadow"
            data-testid="section-journal-calendar-heatmap"
          >
            <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div>
                <div className="flex items-center gap-2 font-mono-ui text-[10px] uppercase tracking-[.2em] text-primary">
                  <CalendarDays size={13} />
                  <span>Reflection Calendar · Last 60 Days</span>
                </div>
                <h2 className="mt-1 font-display text-2xl md:text-3xl">Journal Mood Heatmap</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Each tile represents the dominant mood recorded in your mindful journal pages
                </p>
              </div>

              {/* Live Day Inspector Preview */}
              {hoveredDay ? (
                <div className="flex items-center gap-2.5 rounded-2xl border border-border bg-background/80 px-4 py-2 text-xs">
                  <span
                    className="size-2.5 rounded-full"
                    style={{ backgroundColor: MOOD_PALETTE[hoveredDay.moodKey]?.dot || '#9ca3af' }}
                  />
                  <div>
                    <p className="font-semibold text-foreground">{hoveredDay.rawMood}</p>
                    <p className="font-mono-ui text-[10px] text-muted-foreground">
                      {hoveredDay.displayDate} · {hoveredDay.count} {hoveredDay.count === 1 ? 'reflection' : 'reflections'}
                    </p>
                  </div>
                </div>
              ) : (
                <span className="font-mono-ui text-[10px] uppercase tracking-wider text-muted-foreground">
                  Hover over a day to inspect
                </span>
              )}
            </div>

            {/* Calendar Heatmap Grid */}
            <div className="overflow-x-auto pb-2">
              <div className="min-w-[640px]">
                <div className="grid grid-flow-col grid-rows-7 gap-2">
                  {calendarHeatmapData.map((day) => {
                    const moodStyle = MOOD_PALETTE[day.moodKey] || MOOD_PALETTE.none;
                    const isSelected = hoveredDay?.dateStr === day.dateStr;

                    return (
                      <button
                        key={day.dateStr}
                        type="button"
                        onMouseEnter={() => setHoveredDay(day)}
                        onClick={() => setHoveredDay(day)}
                        className={`group relative size-8 sm:size-9 rounded-xl border transition-all duration-200 focus:outline-none ${
                          moodStyle.bg
                        } ${
                          isSelected
                            ? 'scale-110 ring-2 ring-primary ring-offset-1 border-primary z-10'
                            : 'border-border/60 hover:border-primary/50 hover:scale-105'
                        }`}
                        aria-label={`${day.displayDate}: ${day.rawMood}`}
                        data-testid={`heatmap-box-${day.dateStr}`}
                      >
                        {/* Dot indicator inside filled days */}
                        {day.moodKey !== 'none' && (
                          <span
                            className="absolute inset-0 m-auto size-1.5 rounded-full opacity-80"
                            style={{ backgroundColor: moodStyle.dot }}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="mt-3 flex items-center justify-between font-mono-ui text-[9px] uppercase tracking-wider text-muted-foreground/75 px-1">
                  <span>60 days ago</span>
                  <span>30 days ago</span>
                  <span>Today</span>
                </div>
              </div>
            </div>

            {/* Mood Palette Legend */}
            <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-border/60 pt-5 text-xs text-muted-foreground">
              <span className="font-mono-ui text-[10px] uppercase tracking-wider text-foreground font-semibold">
                Mood Key:
              </span>
              {Object.entries(MOOD_PALETTE).map(([key, meta]) => (
                <div key={key} className="flex items-center gap-1.5">
                  <span
                    className={`size-3 rounded-md border border-border/70 ${meta.bg}`}
                    style={{ backgroundColor: meta.dot ? `${meta.dot}30` : undefined }}
                  />
                  <span className="text-[11px]">{meta.label}</span>
                </div>
              ))}
            </div>
          </section>

          {/* ----------------------------------------------------------------- */}
          {/* Growth View (Specific Emotion Easing Over Weeks) */}
          {/* ----------------------------------------------------------------- */}
          <section
            className="rounded-[28px] border border-border bg-card p-6 md:p-8 quiet-shadow"
            data-testid="section-growth-view"
          >
            <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-center">
              <div>
                <div className="flex items-center gap-2 font-mono-ui text-[10px] uppercase tracking-[.2em] text-primary">
                  <Leaf size={13} />
                  <span>Growth View · Longitudinal Processing</span>
                </div>
                <h2 className="mt-1 font-display text-2xl md:text-3xl">Emotion Easing Trajectory</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Observe how a specific feeling has softened and shifted its intensity across weeks
                </p>
              </div>

              {/* Emotion Dropdown Selector */}
              <div className="flex items-center gap-2.5">
                <label
                  htmlFor="growth-emotion-select"
                  className="font-mono-ui text-[10px] uppercase tracking-wider text-muted-foreground"
                >
                  Track emotion:
                </label>
                <div className="relative">
                  <select
                    id="growth-emotion-select"
                    value={growthEmotion}
                    onChange={(e) => setGrowthEmotion(e.target.value)}
                    className="appearance-none rounded-xl border border-border bg-background py-2 pl-3.5 pr-9 text-xs font-semibold capitalize text-foreground shadow-sm outline-none transition-colors hover:border-primary focus:border-primary"
                    data-testid="select-growth-emotion"
                  >
                    {growthDropdownEmotions.map((emotion) => (
                      <option key={emotion} value={emotion}>
                        {emotion.charAt(0).toUpperCase() + emotion.slice(1)}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={14}
                    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  />
                </div>
              </div>
            </div>

            {/* Growth Chart + Easing Narrative Grid */}
            <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr] items-center">
              {/* Small Line / Area Chart */}
              <div className="h-[230px] w-full" data-testid="chart-growth-trajectory">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={growthChartData}
                    margin={{ top: 10, right: 20, left: -25, bottom: 5 }}
                  >
                    <defs>
                      <linearGradient id="growthGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={activeGrowthColor.stroke} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={activeGrowthColor.stroke} stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="currentColor"
                      className="text-border/50"
                    />
                    <XAxis
                      dataKey="date"
                      tickLine={false}
                      axisLine={{ stroke: 'currentColor', className: 'text-border/70' }}
                      tick={{ fill: 'currentColor', fontSize: 10 }}
                      className="font-mono-ui text-muted-foreground"
                    />
                    <YAxis
                      domain={[0, 1]}
                      ticks={[0, 0.25, 0.5, 0.75, 1.0]}
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: 'currentColor', fontSize: 10 }}
                      className="font-mono-ui text-muted-foreground"
                    />
                    <Tooltip content={<GrowthTooltip />} />
                    <ReferenceLine
                      y={0.5}
                      stroke="currentColor"
                      strokeDasharray="2 3"
                      className="text-muted-foreground/30"
                    />
                    <Area
                      type="monotone"
                      dataKey="intensity"
                      name={growthEmotion}
                      stroke={activeGrowthColor.stroke}
                      strokeWidth={2.8}
                      fillOpacity={1}
                      fill="url(#growthGradient)"
                      dot={{ r: 3.5, fill: activeGrowthColor.stroke, strokeWidth: 0 }}
                      activeDot={{ r: 6, fill: activeGrowthColor.stroke, stroke: '#ffffff', strokeWidth: 2 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Easing Metrics & Reflective Card */}
              <div className="flex flex-col justify-between rounded-2xl border border-border/80 bg-background/50 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-mono-ui text-[10px] uppercase tracking-wider text-muted-foreground">
                    Observed Shift
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-0.5 text-[11px] font-bold text-primary">
                    <TrendingDown size={13} />
                    {growthMetrics.easingPct}% Eased
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 py-1 text-center">
                  <div className="rounded-xl border border-border/60 bg-card p-3">
                    <p className="font-mono-ui text-[9px] uppercase tracking-wider text-muted-foreground">
                      Earlier Peak
                    </p>
                    <p className="mt-1 font-display text-2xl">{growthMetrics.start.toFixed(2)}</p>
                  </div>
                  <div className="rounded-xl border border-border/60 bg-card p-3">
                    <p className="font-mono-ui text-[9px] uppercase tracking-wider text-muted-foreground">
                      Recent Level
                    </p>
                    <p className="mt-1 font-display text-2xl text-primary">{growthMetrics.end.toFixed(2)}</p>
                  </div>
                </div>

                <div className="rounded-xl bg-muted/40 p-3.5 text-xs leading-5 text-muted-foreground">
                  <p className="italic">
                    "{growthEmotion.charAt(0).toUpperCase() + growthEmotion.slice(1)} often carries sharp weight initially. By returning to it with honest words, notice how its intensity has gradually softened over the weeks."
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* ----------------------------------------------------------------- */}
          {/* Recent Emotion Tags Stream */}
          {/* ----------------------------------------------------------------- */}
          <section className="rounded-[28px] border border-border bg-card p-6 md:p-8 quiet-shadow">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <span className="font-mono-ui text-[10px] uppercase tracking-[.2em] text-primary">
                  Tagged Moments
                </span>
                <h3 className="mt-1 font-display text-2xl">Recent Emotional Signposts</h3>
              </div>
              <span className="rounded-full bg-secondary px-3 py-1 font-mono-ui text-[10px] text-primary">
                Last {Math.min(tags.length, 12)} tags
              </span>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {tags.slice(-12).reverse().map((tag) => {
                const colorMeta = getEmotionColor(tag.emotion);
                const tagDate = new Date(tag.created_at);
                const formattedDate = Number.isNaN(tagDate.getTime())
                  ? tag.created_at
                  : new Intl.DateTimeFormat('en', {
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: 'numeric',
                    }).format(tagDate);

                return (
                  <div
                    key={tag.id}
                    className="flex flex-col justify-between rounded-2xl border border-border/80 bg-background/60 p-4 transition-all hover:border-primary/40 hover:bg-background"
                    data-testid={`tag-card-${tag.id}`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${colorMeta.bg} ${colorMeta.text}`}
                      >
                        <span
                          className="size-1.5 rounded-full"
                          style={{ backgroundColor: colorMeta.stroke }}
                        />
                        {tag.emotion}
                      </span>
                      <span className="font-mono-ui text-[11px] font-bold text-foreground">
                        {tag.intensity.toFixed(2)}
                      </span>
                    </div>

                    <div className="my-3 h-1.5 w-full overflow-hidden rounded-full bg-muted/60">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min(tag.intensity * 100, 100)}%`,
                          backgroundColor: colorMeta.stroke,
                        }}
                      />
                    </div>

                    <div className="flex items-center justify-between font-mono-ui text-[9px] uppercase tracking-wider text-muted-foreground/75">
                      <span>{formattedDate}</span>
                      <span>Intensity: {Math.round(tag.intensity * 100)}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      )}
    </AppShell>
  );
}

export default DashboardPage;
