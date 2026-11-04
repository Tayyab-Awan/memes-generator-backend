import { Module } from '@nestjs/common';
import { StorageModule } from '../../shared/storage/storage.module';
import { MemesController } from './memes.controller';
import { MemesService } from './memes.service';
import { MemeRendererService } from './rendering/meme-renderer.service';

@Module({
  imports: [StorageModule],
  controllers: [MemesController],
  providers: [MemesService, MemeRendererService],
})
export class MemesModule {}
