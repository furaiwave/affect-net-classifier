import { HttpService } from '@nestjs/axios';
import { type GatewayResponse, type SessionId } from '../../shared/types';
export declare class ClassifyService {
    private readonly http;
    private readonly logger;
    constructor(http: HttpService);
    classify(file: Express.Multer.File, sessionId: SessionId): Promise<GatewayResponse>;
}
