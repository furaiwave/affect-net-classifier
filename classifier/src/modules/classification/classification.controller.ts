import { Controller, Post, UseInterceptors, UploadedFile, Body, ParseFilePipe, FileTypeValidator, MaxFileSizeValidator, HttpCode, HttpStatus } from "@nestjs/common";
import { ApiTags, ApiConsumes, ApiOperation, ApiOkResponse, ApiBadGatewayResponse, ApiServiceUnavailableResponse } from "@nestjs/swagger";
import { makeSessionId } from "src/shared/types";
import type { GatewayResponse } from "src/shared/types";
import { FileInterceptor } from "@nestjs/platform-express";
import { ClassifyService } from "./classification.service";
import { ClassifyImageDto } from "./classifiaction.dto";

@ApiTags('classification')
@Controller('classify')
export class ClassificationController {
    constructor(private readonly classificationService: ClassifyService) {}

    @Post()
    @HttpCode(HttpStatus.OK)
    @UseInterceptors(FileInterceptor('file'))
    @ApiConsumes('multipart/form-data')
    @ApiOperation({ summary: 'Classify affective state from face image '})
    @ApiOkResponse({ description: 'Classification result with all 11 emotions cores '})
    @ApiBadGatewayResponse({ description: 'Invalid image format or missing file '})
    @ApiServiceUnavailableResponse({ description: 'ML service unavailable '})
    async classifyImage(
        @UploadedFile(
            new ParseFilePipe({
                validators: [
                    new FileTypeValidator({ fileType: /image\/(jpeg|png|webp|bmp)/ }),
                    new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 })
                ]
            })
        )

        file: Express.Multer.File,
        @Body() _dto: ClassifyImageDto,
    ): Promise<GatewayResponse>{
        const sessionId = makeSessionId()
        return this.classificationService.classify(file, sessionId)
    }
}