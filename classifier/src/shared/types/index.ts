import { z } from 'zod'

declare const __brand: unique symbol
type Brand<T, B extends string> = T & { readonly [__brand]: B }

export type ImageId = Brand<string, 'ImageId'>
export type SessionId = Brand<string, 'SessionId'>
export type ConfidenceScore = Brand<number, 'ConfidenceScore'> // [0, 1]
export type InferenceMs = Brand<number, 'InferenceMs'>
export type ValenceScore = Brand<number, 'ValenceScore'>
export type ArousalScore = Brand<number, 'ArousalScore'>

export const makeImageId = (raw: string): ImageId => raw as ImageId
export const makeSessionId = (): SessionId => crypto.randomUUID() as SessionId

export const makeConfidence = (n: number): ConfidenceScore => {
    if(n < 0 || n > 1) throw new RangeError(`Confidence must be in [0,1], got ${n}`)
    return n as ConfidenceScore 
}

export const makeValence = (n: number): ValenceScore => {
    if(n < -1 || n > 1) throw new RangeError(`Valence must be in [-1,1], got ${n}`)
    return n as ValenceScore
}

export const makeArousal = (n: number): ArousalScore => {
    if(n < -1 || n > 1) throw new RangeError(`Arousal must be in [-1,1], got ${n}`)
    return n as ArousalScore
}

export const EMOTIONS = [
    'neutral', 'happiness', 'sadness', 'surprise', 'fear',
    'disgust', 'anger', 'contempt', 'anxiety', 'helplessness', 'disappointment'
] as const

export type EmotionLabel = (typeof EMOTIONS)[number]
export type EmotionIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10

export const NUM_CLASSES = EMOTIONS.length
export const isEmotionLabel = (v: string): v is EmotionLabel => (EMOTIONS as readonly string[]).includes(v)

const emotionLabelSchema = z.enum(EMOTIONS)

const emotionPredictionSchema = z.object({
    label: emotionLabelSchema,
    confidence: z.number().min(0).max(1),
    rank: z.number().int().min(1).max(NUM_CLASSES)
})

const classificationSuccessSchema = z.object({
    status: z.literal('success'),
    top_emotion: emotionLabelSchema,
    confidence: z.number().min(0).max(1),
    all_predictions: z.array(emotionPredictionSchema).length(NUM_CLASSES),
    valence: z.number().min(-1).max(1),
    arousal: z.number().min(-1).max(1),
    inference_ms: z.number().nonnegative(),
    model_version: z.string(),
})

const classificationErrorSchema = z.object({
    status: z.literal('error'),
    code: z.enum(['NO_FACE', 'POOR_QUALITY', 'INVALID_FORMAT', 'MODEL_ERROR']),
    message: z.string(),
    details: z.string().optional()
})

export const inferenceResultSchema = z.discriminatedUnion('status', [
    classificationSuccessSchema,
    classificationErrorSchema,
])

export type EmotionPrediction = z.infer<typeof emotionPredictionSchema>
export type ClassificationSuccess = z.infer<typeof classificationSuccessSchema>
export type ClassificationError = z.infer<typeof classificationErrorSchema>
export type InferenceResult = z.infer<typeof inferenceResultSchema>

export const isSuccess = (r: InferenceResult): r is ClassificationSuccess => r.status === 'success'
export const isError = (r: InferenceResult): r is ClassificationError => r.status === 'error'

export type GatewaySuccessResponse = ClassificationSuccess & {
    readonly imageId: ImageId,
    readonly sessionId: SessionId,
    readonly gatewayMs: number
}

export type GatewayErrorResponse = ClassificationError & {
    readonly imageId: ImageId,
    readonly session: SessionId,
}

export type GatewayResponse = GatewaySuccessResponse | GatewayErrorResponse 

type ExtractRouteParams<Route extends string> = 
    Route extends `${string}:${infer Param}/${infer Rest}`
        ? Param | ExtractRouteParams<`/${Rest}`>
        : Route extends `${string}:${infer Param}`
            ? Param
            : never
    
export type RouteParams<Route extends string> = {
    readonly [K in ExtractRouteParams<Route>]: string
}

export type CircumplexCoordinates = {
    readonly valence: ValenceScore
    readonly arousal: ArousalScore
}

export type QuadrantLabel = 'high-arousal-positive' | 'high-arousal-negative' | 'low-arousal-positive' | 'low-arousal-negative'

export const getQuadrant = (v: ValenceScore, a: ArousalScore): QuadrantLabel => {
    if(v >= 0 && a >= 0) return 'high-arousal-positive'
    if(v < 0 && a >= 0) return 'high-arousal-negative'
    if(v >= 0 && a < 0) return 'low-arousal-positive'
    return 'low-arousal-negative'
}