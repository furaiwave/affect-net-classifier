import { z } from 'zod';
declare const __brand: unique symbol;
type Brand<T, B extends string> = T & {
    readonly [__brand]: B;
};
export type ImageId = Brand<string, 'ImageId'>;
export type SessionId = Brand<string, 'SessionId'>;
export type ConfidenceScore = Brand<number, 'ConfidenceScore'>;
export type InferenceMs = Brand<number, 'InferenceMs'>;
export type ValenceScore = Brand<number, 'ValenceScore'>;
export type ArousalScore = Brand<number, 'ArousalScore'>;
export declare const makeImageId: (raw: string) => ImageId;
export declare const makeSessionId: () => SessionId;
export declare const makeConfidence: (n: number) => ConfidenceScore;
export declare const makeValence: (n: number) => ValenceScore;
export declare const makeArousal: (n: number) => ArousalScore;
export declare const EMOTIONS: readonly ["neutral", "happiness", "sadness", "surprise", "fear", "disgust", "anger", "contempt", "anxiety", "helplessness", "disappointment"];
export type EmotionLabel = (typeof EMOTIONS)[number];
export type EmotionIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
export declare const NUM_CLASSES: 11;
export declare const isEmotionLabel: (v: string) => v is EmotionLabel;
declare const emotionPredictionSchema: z.ZodObject<{
    label: z.ZodEnum<{
        neutral: "neutral";
        happiness: "happiness";
        sadness: "sadness";
        surprise: "surprise";
        fear: "fear";
        disgust: "disgust";
        anger: "anger";
        contempt: "contempt";
        anxiety: "anxiety";
        helplessness: "helplessness";
        disappointment: "disappointment";
    }>;
    confidence: z.ZodNumber;
    rank: z.ZodNumber;
}, z.core.$strip>;
declare const classificationSuccessSchema: z.ZodObject<{
    status: z.ZodLiteral<"success">;
    top_emotion: z.ZodEnum<{
        neutral: "neutral";
        happiness: "happiness";
        sadness: "sadness";
        surprise: "surprise";
        fear: "fear";
        disgust: "disgust";
        anger: "anger";
        contempt: "contempt";
        anxiety: "anxiety";
        helplessness: "helplessness";
        disappointment: "disappointment";
    }>;
    confidence: z.ZodNumber;
    all_predictions: z.ZodArray<z.ZodObject<{
        label: z.ZodEnum<{
            neutral: "neutral";
            happiness: "happiness";
            sadness: "sadness";
            surprise: "surprise";
            fear: "fear";
            disgust: "disgust";
            anger: "anger";
            contempt: "contempt";
            anxiety: "anxiety";
            helplessness: "helplessness";
            disappointment: "disappointment";
        }>;
        confidence: z.ZodNumber;
        rank: z.ZodNumber;
    }, z.core.$strip>>;
    valence: z.ZodNumber;
    arousal: z.ZodNumber;
    inference_ms: z.ZodNumber;
    model_version: z.ZodString;
}, z.core.$strip>;
declare const classificationErrorSchema: z.ZodObject<{
    status: z.ZodLiteral<"error">;
    code: z.ZodEnum<{
        NO_FACE: "NO_FACE";
        POOR_QUALITY: "POOR_QUALITY";
        INVALID_FORMAT: "INVALID_FORMAT";
        MODEL_ERROR: "MODEL_ERROR";
    }>;
    message: z.ZodString;
    details: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const inferenceResultSchema: z.ZodDiscriminatedUnion<[z.ZodObject<{
    status: z.ZodLiteral<"success">;
    top_emotion: z.ZodEnum<{
        neutral: "neutral";
        happiness: "happiness";
        sadness: "sadness";
        surprise: "surprise";
        fear: "fear";
        disgust: "disgust";
        anger: "anger";
        contempt: "contempt";
        anxiety: "anxiety";
        helplessness: "helplessness";
        disappointment: "disappointment";
    }>;
    confidence: z.ZodNumber;
    all_predictions: z.ZodArray<z.ZodObject<{
        label: z.ZodEnum<{
            neutral: "neutral";
            happiness: "happiness";
            sadness: "sadness";
            surprise: "surprise";
            fear: "fear";
            disgust: "disgust";
            anger: "anger";
            contempt: "contempt";
            anxiety: "anxiety";
            helplessness: "helplessness";
            disappointment: "disappointment";
        }>;
        confidence: z.ZodNumber;
        rank: z.ZodNumber;
    }, z.core.$strip>>;
    valence: z.ZodNumber;
    arousal: z.ZodNumber;
    inference_ms: z.ZodNumber;
    model_version: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    status: z.ZodLiteral<"error">;
    code: z.ZodEnum<{
        NO_FACE: "NO_FACE";
        POOR_QUALITY: "POOR_QUALITY";
        INVALID_FORMAT: "INVALID_FORMAT";
        MODEL_ERROR: "MODEL_ERROR";
    }>;
    message: z.ZodString;
    details: z.ZodOptional<z.ZodString>;
}, z.core.$strip>], "status">;
export type EmotionPrediction = z.infer<typeof emotionPredictionSchema>;
export type ClassificationSuccess = z.infer<typeof classificationSuccessSchema>;
export type ClassificationError = z.infer<typeof classificationErrorSchema>;
export type InferenceResult = z.infer<typeof inferenceResultSchema>;
export declare const isSuccess: (r: InferenceResult) => r is ClassificationSuccess;
export declare const isError: (r: InferenceResult) => r is ClassificationError;
export type GatewaySuccessResponse = ClassificationSuccess & {
    readonly imageId: ImageId;
    readonly sessionId: SessionId;
    readonly gatewayMs: number;
};
export type GatewayErrorResponse = ClassificationError & {
    readonly imageId: ImageId;
    readonly session: SessionId;
};
export type GatewayResponse = GatewaySuccessResponse | GatewayErrorResponse;
type ExtractRouteParams<Route extends string> = Route extends `${string}:${infer Param}/${infer Rest}` ? Param | ExtractRouteParams<`/${Rest}`> : Route extends `${string}:${infer Param}` ? Param : never;
export type RouteParams<Route extends string> = {
    readonly [K in ExtractRouteParams<Route>]: string;
};
export type CircumplexCoordinates = {
    readonly valence: ValenceScore;
    readonly arousal: ArousalScore;
};
export type QuadrantLabel = 'high-arousal-positive' | 'high-arousal-negative' | 'low-arousal-positive' | 'low-arousal-negative';
export declare const getQuadrant: (v: ValenceScore, a: ArousalScore) => QuadrantLabel;
export {};
