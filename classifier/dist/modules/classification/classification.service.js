"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var ClassifyService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClassifyService = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = require("@nestjs/axios");
const rxjs_1 = require("rxjs");
const form_data_1 = __importDefault(require("form-data"));
const types_1 = require("../../shared/types");
const ML_SERVICE_URL = process.env.ML_SERVICE_URL ?? 'http://localhost:8000';
let ClassifyService = ClassifyService_1 = class ClassifyService {
    http;
    logger = new common_1.Logger(ClassifyService_1.name);
    constructor(http) {
        this.http = http;
    }
    async classify(file, sessionId) {
        const imageId = (0, types_1.makeImageId)(`img_${Date.now()}_${Math.random().toString(36).slice(2)}`);
        const getawayStart = performance.now();
        const form = new form_data_1.default();
        form.append('file', file.buffer, {
            filename: file.originalname,
            contentType: file.mimetype,
        });
        let rawBody;
        try {
            const { data } = await (0, rxjs_1.firstValueFrom)(this.http.post(`${ML_SERVICE_URL}/classify`, form, {
                headers: form.getHeaders(),
                timeout: 30_000,
            }));
            rawBody = data;
        }
        catch (err) {
            this.logger.error('ML service unreachable', err);
            throw new common_1.HttpException('ML inference service is unavailable', common_1.HttpStatus.SERVICE_UNAVAILABLE);
        }
        const parsed = types_1.inferenceResultSchema.safeParse(rawBody);
        if (!parsed.success) {
            this.logger.error('ML service returned invalid shape', parsed.error.format());
            throw new common_1.HttpException('ML service response schema mismatch', common_1.HttpStatus.BAD_GATEWAY);
        }
        const mlResult = parsed.data;
        const gatewayMs = performance.now() - getawayStart;
        if ((0, types_1.isSuccess)(mlResult)) {
            const response = {
                ...mlResult,
                confidence: (0, types_1.makeConfidence)(mlResult.confidence),
                valence: (0, types_1.makeValence)(mlResult.valence),
                arousal: (0, types_1.makeArousal)(mlResult.arousal),
                imageId,
                sessionId,
                gatewayMs,
            };
            this.logger.log(`[${imageId}] ${mlResult.top_emotion} (${(mlResult.confidence * 100).toFixed(1)}%) ` +
                `in ${mlResult.inference_ms}ms + ${Math.round(gatewayMs)}ms gateway`);
            return response;
        }
        const errorResponse = {
            ...mlResult,
            imageId,
            session: sessionId,
        };
        this.logger.warn(`[${imageId}] ML error: ${mlResult.code} — ${mlResult.message}${mlResult.details ? ` | ${mlResult.details}` : ''}`);
        return errorResponse;
    }
};
exports.ClassifyService = ClassifyService;
exports.ClassifyService = ClassifyService = ClassifyService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [axios_1.HttpService])
], ClassifyService);
//# sourceMappingURL=classification.service.js.map