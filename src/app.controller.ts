import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { AppService } from './app.service';
import { FilesInterceptor } from '@nestjs/platform-express';
import {
  cpSync,
  createReadStream,
  createWriteStream,
  existsSync,
  mkdirSync,
  readdirSync,
  rmSync,
  statSync,
  rm,
} from 'fs';

const chunkDirPrefix = 'uploads/chunk_';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Post('upload')
  @UseInterceptors(
    FilesInterceptor('files', 20, {
      dest: 'uploads',
    }),
  )
  uploadFiles(
    @UploadedFiles() files: Array<Express.Multer.File>,
    @Body() body,
  ) {
    console.log('body', body);
    console.log('files', files);

    const fileName = body.name.match(/(.+)\-\d+$/)[1];

    const chunkDir = `${chunkDirPrefix}${fileName}`;

    if (!existsSync(chunkDir)) {
      mkdirSync(chunkDir);
    }

    cpSync(files[0].path, `${chunkDir}/${body.name}`);

    rmSync(files[0].path);

    if (Number(body.totalNums) === Number(body.index) + 1) {
      this.merge(fileName);
    }
  }

  @Get('merge')
  merge(@Query('name') name: string) {
    const chunkDir = `${chunkDirPrefix}${name}`;

    const chunks = readdirSync(chunkDir);

    let startPos = 0;
    let cnt = 0;
    chunks.map((file) => {
      const filePath = chunkDir + '/' + file;

      const stream = createReadStream(filePath);

      stream
        .pipe(
          createWriteStream('uploads/' + name, {
            start: startPos,
          }),
        )
        .on('finish', () => {
          cnt++;
          if (cnt === chunks.length) {
            rm(
              chunkDir,
              {
                recursive: true,
              },
              () => void 0,
            );
          }
        });

      startPos += statSync(filePath).size;
    });
  }
}
