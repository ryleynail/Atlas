import { createClient } from '@supabase/supabase-js';

/**
 * Creates a Supabase client using the public URL and anon key defined in
 * environment variables.  When running in the browser the keys are
 * automatically included in the bundle; on the server they should be set in
 * your deployment environment.
 */
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);