// Run this once to add is_verified column to users table
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const supabase = require('../supabase');

async function migrate() {
    console.log('Adding is_verified column to users table...');

    // Try adding the column — Supabase doesn't support ALTER TABLE directly via JS client
    // Use raw SQL via rpc if available, otherwise use the Supabase dashboard
    const { data, error } = await supabase.rpc('exec_sql', {
        sql: `ALTER TABLE users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;`
    });

    if (error) {
        console.log('RPC not available. Trying direct approach...');
        // Fallback: just try inserting a test row to see if column exists
        const { error: testErr } = await supabase
            .from('users')
            .update({ is_verified: true })
            .eq('id', '00000000-0000-0000-0000-000000000000'); // dummy id, won't match

        if (testErr && testErr.message?.includes('column "is_verified" of relation')) {
            console.log('\n⛔ Column does not exist yet.');
            console.log('Please run this SQL in your Supabase dashboard SQL editor:');
            console.log('\n  ALTER TABLE users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;\n');
        } else {
            console.log('✅ is_verified column already exists or was added!');
        }
    } else {
        console.log('✅ Migration successful!');
    }
}

migrate().catch(console.error);
