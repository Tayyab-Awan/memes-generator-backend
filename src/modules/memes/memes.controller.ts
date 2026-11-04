import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  ParseFilePipeBuilder,
  ParseUUIDPipe,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiPayloadTooLargeResponse,
  ApiTags,
  ApiTooManyRequestsResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CreateMemeDto } from './dto/create-meme.dto';
import { ListMemesQueryDto } from './dto/list-memes-query.dto';
import {
  MemeResponseDto,
  PaginatedMemesResponseDto,
} from './dto/meme-response.dto';
import {
  ALLOWED_IMAGE_TYPES,
  CREATE_MEME_THROTTLE,
  MAX_UPLOAD_BYTES,
} from './memes.constants';
import { MemesService } from './memes.service';

@ApiTags('memes')
@Controller('memes')
export class MemesController {
  constructor(private readonly memesService: MemesService) {}

  @Post()
  @Throttle({ default: CREATE_MEME_THROTTLE })
  @UseInterceptors(
    FileInterceptor('image', {
      limits: { fileSize: MAX_UPLOAD_BYTES, files: 1, fields: 5 },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['image', 'captions'],
      properties: {
        image: { type: 'string', format: 'binary' },
        captions: {
          type: 'string',
          description: 'JSON array of captions',
          example: JSON.stringify([
            { text: 'One does not simply', position: 'top' },
            { text: 'write a meme generator', position: 'bottom' },
          ]),
        },
      },
    },
  })
  @ApiCreatedResponse({ type: MemeResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid image or captions' })
  @ApiPayloadTooLargeResponse({ description: 'Image exceeds the size limit' })
  @ApiTooManyRequestsResponse()
  create(
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({ fileType: ALLOWED_IMAGE_TYPES })
        .addMaxSizeValidator({ maxSize: MAX_UPLOAD_BYTES })
        .build({ errorHttpStatusCode: HttpStatus.BAD_REQUEST }),
    )
    image: Express.Multer.File,
    @Body() dto: CreateMemeDto,
  ): Promise<MemeResponseDto> {
    return this.memesService.create(image.buffer, dto.captions);
  }

  @Get()
  @ApiOkResponse({ type: PaginatedMemesResponseDto })
  list(@Query() query: ListMemesQueryDto): Promise<PaginatedMemesResponseDto> {
    return this.memesService.list(query);
  }

  @Get(':id')
  @ApiOkResponse({ type: MemeResponseDto })
  @ApiNotFoundResponse()
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<MemeResponseDto> {
    return this.memesService.findOne(id);
  }
}
