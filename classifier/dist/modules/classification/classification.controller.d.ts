import type { GatewayResponse } from "../../shared/types";
import { ClassifyService } from "./classification.service";
import { ClassifyImageDto } from "./classifiaction.dto";
export declare class ClassificationController {
    private readonly classificationService;
    constructor(classificationService: ClassifyService);
    classifyImage(file: Express.Multer.File, _dto: ClassifyImageDto): Promise<GatewayResponse>;
}
