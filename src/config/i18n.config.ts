import { I18nOptions, AcceptLanguageResolver, QueryResolver, CookieResolver } from 'nestjs-i18n';
import * as path from 'path';

export const i18nConfig: I18nOptions = {
  fallbackLanguage: 'en',
  loaderOptions: {
    path: path.join(__dirname, '../i18n/'),
    watch: false, // Disable file watching to prevent crashes
  },
  resolvers: [
    new AcceptLanguageResolver(),
    new QueryResolver(['lang']),
    new CookieResolver(['lang']),
  ],
  // Disable type generation to prevent file system issues
  // typesOutputPath: path.join(__dirname, '../generated/i18n.generated.ts'),
};
