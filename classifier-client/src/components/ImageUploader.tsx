/**
 * ImageUploader.tsx
 *
 * Discriminated prop union:
 *   - UploadIdleProps   → shows drop zone
 *   - UploadLoadingProps → shows progress bar (shadcn Progress)
 * Both share a base that passes `onFile` callback.
 *
 * No `any`, no non-null assertions.
 */

import React, { useRef, useCallback } from 'react';
import { Upload, ImageIcon, Loader2 } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

// ── Props ─────────────────────────────────────────────────────────────────────

type BaseUploaderProps = {
  onFile: (file: File) => void;
  accept?: readonly string[];
  maxSizeMb?: number;
};

type IdleUploaderProps    = BaseUploaderProps & { phase: 'idle' };
type LoadingUploaderProps = BaseUploaderProps & { phase: 'loading'; progress: number };

// Discriminated on `phase` — compiler enforces correct props per state
export type ImageUploaderProps = IdleUploaderProps | LoadingUploaderProps;

const DEFAULT_ACCEPT: readonly string[] = ['image/jpeg', 'image/png', 'image/webp'];

// ── Component ─────────────────────────────────────────────────────────────────

export function ImageUploader(props: ImageUploaderProps): React.ReactElement {
  const { onFile, accept = DEFAULT_ACCEPT, maxSizeMb = 10 } = props;

  const inputRef      = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = React.useState(false);

  const handleFile = useCallback((file: File): void => {
    if (!accept.includes(file.type)) {
      alert(`Unsupported format. Accepted: ${accept.join(', ')}`);
      return;
    }
    if (file.size > maxSizeMb * 1024 * 1024) {
      alert(`File too large. Max size: ${maxSizeMb}MB`);
      return;
    }
    onFile(file);
  }, [accept, maxSizeMb, onFile]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    // Reset so same file can be re-uploaded
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleDragOver  = (e: React.DragEvent): void => { e.preventDefault(); setDragging(true); };
  const handleDragLeave = (): void => setDragging(false);

  const isLoading = props.phase === 'loading';

  return (
    <Card
      className={cn(
        'border-2 border-dashed transition-colors duration-200 cursor-pointer select-none',
        dragging && !isLoading  ? 'border-primary bg-primary/5'  : 'border-muted-foreground/25',
        isLoading               ? 'cursor-not-allowed opacity-70' : 'hover:border-primary/50',
      )}
      onClick={() => !isLoading && inputRef.current?.click()}
      onDrop={isLoading ? undefined : handleDrop}
      onDragOver={isLoading ? undefined : handleDragOver}
      onDragLeave={handleDragLeave}
      role="button"
      tabIndex={isLoading ? -1 : 0}
      aria-label="Upload face image for emotion classification"
      onKeyDown={e => e.key === 'Enter' && !isLoading && inputRef.current?.click()}
    >
      <CardContent className="flex flex-col items-center justify-center py-12 gap-4">
        <input
          ref={inputRef}
          type="file"
          accept={accept.join(',')}
          onChange={handleInputChange}
          className="hidden"
          aria-hidden="true"
          disabled={isLoading}
        />

        {isLoading ? (
          <>
            <Loader2 className="h-10 w-10 text-primary animate-spin" />
            <p className="text-sm text-muted-foreground">Analysing image…</p>
            {/* props.progress is only available when phase === 'loading' */}
            <div className="w-full max-w-xs">
              <Progress value={props.progress} className="h-2" />
              <p className="text-xs text-muted-foreground text-center mt-1">
                {props.progress}%
              </p>
            </div>
          </>
        ) : (
          <>
            <div className="rounded-full bg-muted p-4">
              {dragging ? (
                <ImageIcon className="h-8 w-8 text-primary" />
              ) : (
                <Upload className="h-8 w-8 text-muted-foreground" />
              )}
            </div>
            <div className="text-center">
              <p className="text-sm font-medium">
                {dragging ? 'Drop to analyse' : 'Drop image or click to upload'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                JPEG, PNG, WebP — up to {maxSizeMb}MB
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}