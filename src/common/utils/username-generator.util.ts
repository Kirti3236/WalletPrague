import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { User } from '../../models/user.model';

@Injectable()
export class UsernameGeneratorUtil {
  constructor(
    @InjectModel(User)
    private userModel: typeof User,
  ) {}

  /**
   * Generates a random 6-digit number
   * @returns string - 6-digit number as string
   */
  private generateRandomDigits(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Generates a unique username in the format "User" + 6 random digits
   * @returns Promise<string> - Unique username like "User242503"
   */
  async generateUniqueUsername(): Promise<string> {
    let username: string;
    let isUnique = false;
    let attempts = 0;
    const maxAttempts = 10; // Prevent infinite loop

    do {
      const randomDigits = this.generateRandomDigits();
      username = `User${randomDigits}`;

      // Check if username already exists
      const existingUser = await this.userModel.findOne({
        where: { user_name: username },
        attributes: ['id'],
      });

      isUnique = !existingUser;
      attempts++;

      if (attempts >= maxAttempts && !isUnique) {
        // If we can't find a unique username after max attempts,
        // use timestamp to ensure uniqueness
        const timestamp = Date.now().toString().slice(-6);
        username = `User${timestamp}`;

        // Final check with timestamp-based username
        const finalCheck = await this.userModel.findOne({
          where: { user_name: username },
          attributes: ['id'],
        });

        if (!finalCheck) {
          isUnique = true;
        } else {
          // Last resort: add random suffix
          username = `User${timestamp}${Math.floor(Math.random() * 99)}`;
          isUnique = true;
        }
      }
    } while (!isUnique && attempts < maxAttempts);

    return username;
  }

  /**
   * Validates if a username follows the expected format
   * @param username - Username to validate
   * @returns boolean - True if valid format
   */
  isValidUsernameFormat(username: string): boolean {
    const usernameRegex = /^User\d{6,}$/;
    return usernameRegex.test(username);
  }
}
