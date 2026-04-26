import { Injectable, Logger, HttpException, Inject, HttpStatus } from "@nestjs/common";
import { HttpService } from '@nestjs/axios'
import { firstValueFrom } from "rxjs";
import FormData from "form-data";

import { 
    makeArousal,
    makeConfidence,
    makeImageId,
    makeValence,
    inferenceResultSchema,
    isSuccess,
    type InferenceResult,
    type GatewayResponse,
    type GatewayErrorResponse,
    type GatewaySuccessResponse,
    type SessionId,
} from '../../shared/types'

const ML_SERVICE_URL = process.env.ML_SERVICE_URL ?? 'http://localhost:8000'

@Injectable()
export class ClassifyService {
    private readonly logger = new Logger(ClassifyService.name)

    constructor(private readonly http: HttpService) {}

    async classify(
        file: Express.Multer.File,
        sessionId: SessionId,
    ): Promise<GatewayResponse> {
        const imageId = makeImageId(`img_${Date.now()}_${Math.random().toString(36).slice(2)}`)
        const getawayStart = performance.now()

        const form = new FormData()
        form.append('file', file.buffer, {
            filename: file.originalname,
            contentType: file.mimetype,
        })

        let rawBody: unknown
        try{
            const { data } = await firstValueFrom(
                this.http.post(`${ML_SERVICE_URL}/classify`, form, {
                    headers: form.getHeaders(),
                    timeout: 30_000,
                })
            )
            rawBody = data
        } catch (err) { 
            this.logger.error('ML service unreachable', err)
            throw new HttpException(
                'ML inference service is unavailable',
                HttpStatus.SERVICE_UNAVAILABLE,
            )
        }

        const parsed = inferenceResultSchema.safeParse(rawBody)
        if(!parsed.success){
            this.logger.error('ML service returned invalid shape', parsed.error.format())
            throw new HttpException(
                'ML service response schema mismatch',
                HttpStatus.BAD_GATEWAY,
            )
        }

        const mlResult: InferenceResult = parsed.data
        const gatewayMs = performance.now() - getawayStart

        if(isSuccess(mlResult)){
            const response: GatewaySuccessResponse = {
                ...mlResult,
                confidence: makeConfidence(mlResult.confidence),
                valence: makeValence(mlResult.valence),
                arousal: makeArousal(mlResult.arousal),
                imageId,
                sessionId,
                gatewayMs,
            }

            this.logger.log(
                `[${imageId}] ${mlResult.top_emotion} (${(mlResult.confidence * 100).toFixed(1)}%) ` +
                `in ${mlResult.inference_ms}ms + ${Math.round(gatewayMs)}ms gateway`,
            );
            return response;
        }

        const errorResponse: GatewayErrorResponse = {
            ...mlResult,
            imageId,
            session: sessionId,
        }
        this.logger.warn(`[${imageId}] ML error: ${mlResult.code} — ${mlResult.message}${mlResult.details ? ` | ${mlResult.details}` : ''}`);
        return errorResponse
    }
}