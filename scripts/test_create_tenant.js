
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://orteozxuuyhwgmwswnqt.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ydGVvenh1dXlod2dtd3N3bnF0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzNzcxODEsImV4cCI6MjA4Njk1MzE4MX0.kyR076l_OB3L6dhZeVHdOzSZcKEGNgK7M2JGJ2X7yoM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testDuplicateTenant() {
    const domain = 'duplicate-test.lexhub';

    const tenant1 = {
        name: 'Original Tenant',
        domain: domain,
        plan: 'Starter',
        status: 'Active',
        crm_stage: 'Prospect',
        mrr: 0,
        join_date: new Date().toISOString().split('T')[0]
    };

    console.log('Creating first tenant...');
    const { error: error1 } = await supabase.from('tenants').insert(tenant1);
    if (error1) {
        if (error1.code === '23505') {
            console.log('First tenant already exists (expected if ran before).');
        } else {
            console.error('Error creating first tenant:', error1);
        }
    } else {
        console.log('First tenant created.');
    }

    const tenant2 = {
        name: 'Duplicate Tenant',
        domain: domain,
        plan: 'Professional',
        status: 'Pending',
        crm_stage: 'Prospect',
        mrr: 0,
        join_date: new Date().toISOString().split('T')[0]
    };

    console.log('Attempting to create duplicate tenant...');
    const { data, error } = await supabase
        .from('tenants')
        .insert(tenant2)
        .select()
        .single();

    if (error) {
        console.error('Error creating duplicate tenant:', error);
        console.log('Error Code:', error.code);
        console.log('Error Message:', error.message);
        console.log('Error Details:', error.details);
    } else {
        console.log('Duplicate tenant created (UNEXPECTED):', data);
    }
}

testDuplicateTenant();
