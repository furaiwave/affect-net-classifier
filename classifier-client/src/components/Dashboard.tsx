/**
 * Dashboard.tsx — root page component.
 *
 * Composes:
 *   ImageUploader  ← discriminated on ApiState.phase
 *   ResultsPanel   ← discriminated on variant prop
 *
 * useClassification returns ApiState<GatewaySuccessResponse> — discriminated union.
 * Each branch of the switch gives the compiler full knowledge of available fields.
 * No `as`, no `!`, no `any`.
 */

import React from 'react';
import { Brain } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

import { useClassification } from './hooks';
import { ImageUploader }     from './ImageUploader';
import { ResultsPanel }      from './ResultsPanel';
import type { ClassificationError } from '../shared/types';

export function Dashboard(): React.ReactElement {
  const { state, classify, reset } = useClassification();
  const [imageUrl, setImageUrl] = React.useState<string | null>(null);

  const handleFile = async (file: File): Promise<void> => {
    if (imageUrl) URL.revokeObjectURL(imageUrl);
    setImageUrl(URL.createObjectURL(file));
    await classify(file);
  };

  const handleReset = (): void => {
    if (imageUrl) URL.revokeObjectURL(imageUrl);
    setImageUrl(null);
    reset();
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-10 space-y-8">

        {/* Header */}
        <header className="space-y-1">
          <div className="flex items-center gap-2">
            <Brain className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-semibold tracking-tight">
              Affective State Classifier
            </h1>
          </div>
          <p className="text-sm text-muted-foreground">
            11-class facial emotion recognition · EfficientNet-B4 · AffectNet
          </p>
        </header>

        <Separator />

        {/* Upload zone — shown always in idle/loading, hidden on success/error */}
        {state.phase === 'idle' && (
          <ImageUploader phase="idle" onFile={handleFile} />
        )}
        {state.phase === 'loading' && (
          <ImageUploader phase="loading" progress={state.progress} onFile={handleFile} />
        )}

        {/* Results — discriminated on variant */}
        {state.phase === 'loading' && (
          <ResultsPanel variant="loading" />
        )}

        {state.phase === 'error' && (
          <ResultsPanel
            variant="error"
            error={{
              status:  'error',
              code:    state.code as ClassificationError['code'],
              message: state.message,
            }}
            onRetry={handleReset}
          />
        )}

        {state.phase === 'success' && (
          <ResultsPanel
            variant="success"
            data={state.data}
            imageUrl={imageUrl ?? undefined}
            onReset={handleReset}
          />
        )}

      </div>
    </div>
  );
}