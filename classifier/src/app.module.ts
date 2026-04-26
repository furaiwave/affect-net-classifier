import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ClassificationModule } from './modules/classification/classification.module';

@Module({
  imports: [ClassificationModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
