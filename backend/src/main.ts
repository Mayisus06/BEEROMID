import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: '*',
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  const port = Number(process.env.PORT ?? '3001');
  const host = process.env.HOST ?? '0.0.0.0';

  try {
    await app.listen(port, host);
    logger.log(`Backend escuchando en http://${host}:${port}`);
  } catch (error) {
    if ((error as { code?: string }).code === 'EADDRINUSE') {
      logger.error(`El puerto ${port} ya esta en uso. Evita iniciar el backend dos veces.`);
      process.exit(1);
    }
    throw error;
  }
}

void bootstrap();
