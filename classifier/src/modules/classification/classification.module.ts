import { Module } from "@nestjs/common";
import { HttpModule } from '@nestjs/axios'
import { ClassificationController } from "./classification.controller";
import { ClassifyService } from "./classification.service";

@Module({
    imports: [
        HttpModule.register({
            timeout: 30_000,
            maxRedirects: 3,
        }),
    ],
    controllers: [ClassificationController],
    providers: [ClassifyService]
})

export class ClassificationModule {}