"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getQuadrant = exports.isError = exports.isSuccess = exports.inferenceResultSchema = exports.isEmotionLabel = exports.NUM_CLASSES = exports.EMOTIONS = exports.makeArousal = exports.makeValence = exports.makeConfidence = exports.makeSessionId = exports.makeImageId = void 0;
const zod_1 = require("zod");
const makeImageId = (raw) => raw;
exports.makeImageId = makeImageId;
const makeSessionId = () => crypto.randomUUID();
exports.makeSessionId = makeSessionId;
const makeConfidence = (n) => {
    if (n < 0 || n > 1)
        throw new RangeError(`Confidence must be in [0,1], got ${n}`);
    return n;
};
exports.makeConfidence = makeConfidence;
const makeValence = (n) => {
    if (n < -1 || n > 1)
        throw new RangeError(`Valence must be in [-1,1], got ${n}`);
    return n;
};
exports.makeValence = makeValence;
const makeArousal = (n) => {
    if (n < -1 || n > 1)
        throw new RangeError(`Arousal must be in [-1,1], got ${n}`);
    return n;
};
exports.makeArousal = makeArousal;
exports.EMOTIONS = [
    'neutral', 'happiness', 'sadness', 'surprise', 'fear',
    'disgust', 'anger', 'contempt', 'anxiety', 'helplessness', 'disappointment'
];
exports.NUM_CLASSES = exports.EMOTIONS.length;
const isEmotionLabel = (v) => exports.EMOTIONS.includes(v);
exports.isEmotionLabel = isEmotionLabel;
const emotionLabelSchema = zod_1.z.enum(exports.EMOTIONS);
const emotionPredictionSchema = zod_1.z.object({
    label: emotionLabelSchema,
    confidence: zod_1.z.number().min(0).max(1),
    rank: zod_1.z.number().int().min(1).max(exports.NUM_CLASSES)
});
const classificationSuccessSchema = zod_1.z.object({
    status: zod_1.z.literal('success'),
    top_emotion: emotionLabelSchema,
    confidence: zod_1.z.number().min(0).max(1),
    all_predictions: zod_1.z.array(emotionPredictionSchema).length(exports.NUM_CLASSES),
    valence: zod_1.z.number().min(-1).max(1),
    arousal: zod_1.z.number().min(-1).max(1),
    inference_ms: zod_1.z.number().nonnegative(),
    model_version: zod_1.z.string(),
});
const classificationErrorSchema = zod_1.z.object({
    status: zod_1.z.literal('error'),
    code: zod_1.z.enum(['NO_FACE', 'POOR_QUALITY', 'INVALID_FORMAT', 'MODEL_ERROR']),
    message: zod_1.z.string(),
    details: zod_1.z.string().optional()
});
exports.inferenceResultSchema = zod_1.z.discriminatedUnion('status', [
    classificationSuccessSchema,
    classificationErrorSchema,
]);
const isSuccess = (r) => r.status === 'success';
exports.isSuccess = isSuccess;
const isError = (r) => r.status === 'error';
exports.isError = isError;
const getQuadrant = (v, a) => {
    if (v >= 0 && a >= 0)
        return 'high-arousal-positive';
    if (v < 0 && a >= 0)
        return 'high-arousal-negative';
    if (v >= 0 && a < 0)
        return 'low-arousal-positive';
    return 'low-arousal-negative';
};
exports.getQuadrant = getQuadrant;
//# sourceMappingURL=index.js.map