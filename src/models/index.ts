export { User, UserStatus, UserRole } from './user.model';

// Export all models as an array for Sequelize initialization
import { User } from './user.model';

export const models = [User];
