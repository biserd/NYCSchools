import { defineConfig } from 'drizzle-kit';
export default defineConfig({schema:'./shared/schema.ts',out:'./migrations-d1',dialect:'sqlite'});
