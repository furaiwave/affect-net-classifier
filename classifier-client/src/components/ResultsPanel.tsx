/**
 * ResultsPanel.tsx
 *
 * Renders the full 11-class classification result.
 * Uses shadcn: Card, CardHeader, CardContent, CardFooter,
 *              Progress, Badge, Separator, Tooltip, Skeleton.
 *
 * EmotionRowProps is discriminated on `isTop`:
 *   isTop=true  → larger text, accent badge, glow progress
 *   isTop=false → compact row, muted label, standard progress
 *
 * Skeleton variant shown when `loading=true` — same layout, no data.
 */

import React from 'react';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Progress }   from '@/components/ui/progress';
import { Badge }      from '@/components/ui/badge';
import { Separator }  from '@/components/ui/separator';
import { Skeleton }   from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { RefreshCw, Clock, Zap, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

import type {
  GatewaySuccessResponse,
  ClassificationError,
  EmotionPrediction,
  EmotionLabel,
} from '../shared/types';

// ── Emotion metadata ──────────────────────────────────────────────────────────

// Maps emotion to a shadcn-compatible badge variant or colour class
const EMOTION_BADGE_VARIANT: Record<EmotionLabel, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  neutral:        'secondary',
  happiness:      'default',
  sadness:        'outline',
  surprise:       'default',
  fear:           'destructive',
  disgust:        'destructive',
  anger:          'destructive',
  contempt:       'outline',
  anxiety:        'destructive',
  helplessness:   'secondary',
  disappointment: 'secondary',
};

const VALENCE_LABELS: Record<string, string> = {
  'high-arousal-positive': 'Excited / Happy',
  'high-arousal-negative': 'Stressed / Angry',
  'low-arousal-positive':  'Calm / Content',
  'low-arousal-negative':  'Sad / Depressed',
};

// ── EmotionRow ────────────────────────────────────────────────────────────────

type BaseRowProps = { prediction: EmotionPrediction };

type TopRowProps   = BaseRowProps & { isTop: true };
type OtherRowProps = BaseRowProps & { isTop?: false };

// Discriminated union — `isTop` determines available layout props
type EmotionRowProps = TopRowProps | OtherRowProps;

function EmotionRow({ prediction, ...rest }: EmotionRowProps): React.ReactElement {
  const isTop  = 'isTop' in rest && rest.isTop === true;
  const pct    = prediction.confidence * 100;
  const pctStr = pct.toFixed(1);

  return (
    <div className={cn('flex items-center gap-3', isTop ? 'py-2' : 'py-1')}>
      <span
        className={cn(
          'capitalize shrink-0 text-right',
          isTop
            ? 'text-sm font-semibold w-28 text-foreground'
            : 'text-xs text-muted-foreground w-28',
        )}
      >
        {prediction.label}
      </span>

      <div className="flex-1">
        <Progress
          value={pct}
          className={cn('transition-all duration-700', isTop ? 'h-3' : 'h-1.5')}
        />
      </div>

      <span
        className={cn(
          'shrink-0 tabular-nums',
          isTop ? 'text-sm font-semibold w-12 text-right' : 'text-xs text-muted-foreground w-12 text-right',
        )}
      >
        {pctStr}%
      </span>

      {isTop && (
        <Badge variant={EMOTION_BADGE_VARIANT[prediction.label]} className="shrink-0">
          #{prediction.rank}
        </Badge>
      )}
    </div>
  );
}

// ── Skeleton variant ──────────────────────────────────────────────────────────

function ResultsSkeleton(): React.ReactElement {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-24 mt-1" />
      </CardHeader>
      <CardContent className="space-y-3">
        <Skeleton className="h-10 w-full" />
        <Separator />
        {Array.from({ length: 10 }, (_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-2 flex-1" />
            <Skeleton className="h-3 w-10" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// ── Error variant ─────────────────────────────────────────────────────────────

function ResultsError({
  error,
  onRetry,
}: {
  error: ClassificationError;
  onRetry: () => void;
}): React.ReactElement {
  return (
    <Card className="border-destructive/50">
      <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
        <AlertCircle className="h-10 w-10 text-destructive" />
        <div>
          <p className="font-semibold text-destructive">Classification failed</p>
          <p className="text-sm text-muted-foreground mt-1">{error.message}</p>
          {error.details && (
            <p className="text-xs text-muted-foreground/70 mt-1">{error.details}</p>
          )}
          <Badge variant="outline" className="mt-2 font-mono text-xs">
            {error.code}
          </Badge>
        </div>
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RefreshCw className="h-3.5 w-3.5 mr-2" />
          Try again
        </Button>
      </CardContent>
    </Card>
  );
}

// ── Main ResultsPanel ─────────────────────────────────────────────────────────

type ResultsPanelProps =
  | { variant: 'loading' }
  | { variant: 'error';   error: ClassificationError; onRetry: () => void }
  | { variant: 'success'; data: GatewaySuccessResponse; onReset: () => void; imageUrl?: string };

export function ResultsPanel(props: ResultsPanelProps): React.ReactElement {
  if (props.variant === 'loading') return <ResultsSkeleton />;
  if (props.variant === 'error')   return <ResultsError error={props.error} onRetry={props.onRetry} />;

  // Narrowed to success — full data available
  const { data, onReset, imageUrl } = props;

  const topPrediction   = data.all_predictions[0];
  const otherPredictions = data.all_predictions.slice(1);

  // Quadrant label from valence/arousal
  const quadrant =
    data.valence >= 0 && data.arousal >= 0 ? 'high-arousal-positive'
    : data.valence <  0 && data.arousal >= 0 ? 'high-arousal-negative'
    : data.valence >= 0 && data.arousal <  0 ? 'low-arousal-positive'
    : 'low-arousal-negative';

  return (
    <TooltipProvider>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            {imageUrl && (
              <img
                src={imageUrl}
                alt="Uploaded face"
                className="h-20 w-20 rounded-lg object-cover shrink-0 border border-border"
              />
            )}
            <div className="flex-1 min-w-0">
              <CardTitle className="capitalize text-xl">
                {data.top_emotion}
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-0.5">
                {VALENCE_LABELS[quadrant]}
              </p>
            </div>
            <Badge
              variant={EMOTION_BADGE_VARIANT[data.top_emotion]}
              className="text-sm px-3 py-1 shrink-0"
            >
              {(data.confidence * 100).toFixed(1)}%
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-1">
          {/* Top emotion row */}
          <EmotionRow prediction={topPrediction} isTop={true} />

          <Separator className="my-2" />

          {/* Remaining 10 emotions */}
          {otherPredictions.map(pred => (
            <EmotionRow key={pred.label} prediction={pred} />
          ))}

          <Separator className="my-3" />

          {/* Valence / Arousal dimensional display */}
          <div className="grid grid-cols-2 gap-4 pt-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="space-y-1 cursor-help">
                  <p className="text-xs text-muted-foreground">Valence</p>
                  <div className="flex items-center gap-2">
                    <Progress
                      value={(data.valence + 1) * 50}   // remap [-1,1] → [0,100]
                      className="h-2 flex-1"
                    />
                    <span className="text-xs font-mono tabular-nums w-12 text-right">
                      {data.valence >= 0 ? '+' : ''}{data.valence.toFixed(2)}
                    </span>
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Pleasantness: –1 (negative) → +1 (positive)</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <div className="space-y-1 cursor-help">
                  <p className="text-xs text-muted-foreground">Arousal</p>
                  <div className="flex items-center gap-2">
                    <Progress
                      value={(data.arousal + 1) * 50}   // remap [-1,1] → [0,100]
                      className="h-2 flex-1"
                    />
                    <span className="text-xs font-mono tabular-nums w-12 text-right">
                      {data.arousal >= 0 ? '+' : ''}{data.arousal.toFixed(2)}
                    </span>
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Activation: –1 (calm) → +1 (excited)</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </CardContent>

        <CardFooter className="flex items-center justify-between pt-3 border-t">
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Zap className="h-3 w-3" />
              ML: {data.inference_ms}ms
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Total: {data.gatewayMs}ms
            </span>
            <span className="font-mono">{data.model_version}</span>
          </div>

          <Button variant="ghost" size="sm" onClick={onReset}>
            <RefreshCw className="h-3.5 w-3.5 mr-2" />
            New image
          </Button>
        </CardFooter>
      </Card>
    </TooltipProvider>
  );
}