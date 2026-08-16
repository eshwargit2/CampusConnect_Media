// Run this once to add attachment columns to messages table
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const supabase = require('../supabase');

async function migrate() {
    console.log('Adding attachment columns to messages table...');

    // Try adding the columns using exec_sql RPC if available
    const { data, error } = await supabase.rpc('exec_sql', {
        sql: `
            ALTER TABLE messages ADD COLUMN IF NOT EXISTS attachment_url TEXT DEFAULT NULL;
            ALTER TABLE messages ADD COLUMN IF NOT EXISTS attachment_type TEXT DEFAULT NULL;
            ALTER TABLE messages ADD COLUMN IF NOT EXISTS attachment_name TEXT DEFAULT NULL;
        `
    });

    if (error) {
        console.log('RPC exec_sql not available or failed. Trying direct check...');
        
        // Fallback: check if columns are accessible by attempting a dummy update
        const { error: testErr } = await supabase
            .from('messages')
            .update({ attachment_url: null })
            .eq('id', '00000000-0000-0000-0000-000000000000'); // dummy id

        if (testErr && testErr.message?.includes('column "attachment_url" of relation')) {
            console.log('\n⛔ Columns do not exist yet.');
            console.log('Please run this SQL in your Supabase dashboard SQL editor:');
            console.log('\n  ALTER TABLE messages ADD COLUMN IF NOT EXISTS attachment_url TEXT DEFAULT NULL;');
            console.log('  ALTER TABLE messages ADD COLUMN IF NOT EXISTS attachment_type TEXT DEFAULT NULL;');
            console.log('  ALTER TABLE messages ADD COLUMN IF NOT EXISTS attachment_name TEXT DEFAULT NULL;\n');
        } else {
            console.log('✅ Attachment columns already exist or are accessible!');
        }
    } else {
        console.log('✅ Migration successful via RPC!');
    }
}

migrate().catch(console.error);
