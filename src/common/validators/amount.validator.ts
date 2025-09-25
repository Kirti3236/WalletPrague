import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

@ValidatorConstraint({ name: 'isAmount', async: false })
export class IsAmountConstraint implements ValidatorConstraintInterface {
  validate(value: any, _args: ValidationArguments) {
    if (value === null || value === undefined) {
      return false;
    }

    // Accept both string and number
    if (typeof value === 'string') {
      // Check if it's a valid decimal string with max 2 decimal places
      return /^\d+(\.\d{1,2})?$/.test(value);
    }

    if (typeof value === 'number') {
      // Check if it's a positive number
      return value > 0 && Number.isFinite(value);
    }

    return false;
  }

  defaultMessage(_args: ValidationArguments) {
    return 'Amount must be a positive number or a valid decimal string (e.g., "100.50" or 100.50)';
  }
}

export function IsAmount(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsAmountConstraint,
    });
  };
}
