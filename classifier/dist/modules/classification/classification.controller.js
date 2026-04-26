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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClassificationController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const types_1 = require("../../shared/types");
const platform_express_1 = require("@nestjs/platform-express");
const classification_service_1 = require("./classification.service");
const classifiaction_dto_1 = require("./classifiaction.dto");
let ClassificationController = class ClassificationController {
    classificationService;
    constructor(classificationService) {
        this.classificationService = classificationService;
    }
    async classifyImage(file, _dto) {
        const sessionId = (0, types_1.makeSessionId)();
        return this.classificationService.classify(file, sessionId);
    }
};
exports.ClassificationController = ClassificationController;
__decorate([
    (0, common_1.Post)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file')),
    (0, swagger_1.ApiConsumes)('multipart/form-data'),
    (0, swagger_1.ApiOperation)({ summary: 'Classify affective state from face image ' }),
    (0, swagger_1.ApiOkResponse)({ description: 'Classification result with all 11 emotions cores ' }),
    (0, swagger_1.ApiBadGatewayResponse)({ description: 'Invalid image format or missing file ' }),
    (0, swagger_1.ApiServiceUnavailableResponse)({ description: 'ML service unavailable ' }),
    __param(0, (0, common_1.UploadedFile)(new common_1.ParseFilePipe({
        validators: [
            new common_1.FileTypeValidator({ fileType: /image\/(jpeg|png|webp|bmp)/ }),
            new common_1.MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 })
        ]
    }))),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, classifiaction_dto_1.ClassifyImageDto]),
    __metadata("design:returntype", Promise)
], ClassificationController.prototype, "classifyImage", null);
exports.ClassificationController = ClassificationController = __decorate([
    (0, swagger_1.ApiTags)('classification'),
    (0, common_1.Controller)('classify'),
    __metadata("design:paramtypes", [classification_service_1.ClassifyService])
], ClassificationController);
//# sourceMappingURL=classification.controller.js.map