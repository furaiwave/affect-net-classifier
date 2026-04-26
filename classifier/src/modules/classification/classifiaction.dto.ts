import { IsString, IsOptional, MaxLength } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class ClassifyImageDto {
    @ApiProperty({
        type: 'string',
        format: 'binary',
        description: 'Face image (JPEG/PNG/WebP, max 10MB)'
    })

    declare file: Express.Multer.File

    @IsOptional()
    @IsString()
    @MaxLength(128)
    @ApiProperty({ required: false, description: 'Optional session identifier' })
    sessionId?: string
}