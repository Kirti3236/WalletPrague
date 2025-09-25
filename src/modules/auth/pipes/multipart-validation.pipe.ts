import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  BadRequestException,
} from '@nestjs/common';
import type { ObjectSchema } from 'joi';

@Injectable()
export class MultipartValidationPipe implements PipeTransform {
  constructor(private schema: ObjectSchema) {}

  transform(value: any, metadata: ArgumentMetadata) {
    // Debug: log what we're receiving for multipart
    console.log(
      'MultipartValidationPipe received:',
      JSON.stringify(value, null, 2),
    );
    console.log('Type:', typeof value);

    // For multipart/form-data, the body comes as individual fields
    // We need to validate the body structure
    const { error, value: validatedValue } = this.schema.validate(value, {
      abortEarly: true, // Return first error only
      stripUnknown: true,
      allowUnknown: false,
    });

    if (error) {
      // Return the first validation error message as a simple string
      const firstErrorMessage =
        error.details[0]?.message || 'Validation failed';
      throw new BadRequestException(firstErrorMessage);
    }

    return validatedValue;
  }
}
