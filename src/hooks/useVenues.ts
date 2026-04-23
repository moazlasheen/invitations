import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { Venue } from '../types';

export function useVenues(userId: string | undefined) {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchVenues = useCallback(async () => {
    if (!userId) {
      setVenues([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const { data, error: fetchError } = await supabase
      .from('venues')
      .select('*')
      .eq('admin_id', userId)
      .order('created_at', { ascending: false });

    if (fetchError) {
      console.error('Fetch venues error:', fetchError);
      setError(fetchError.message);
    } else {
      setVenues(data || []);
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    fetchVenues();
  }, [fetchVenues]);

  const createVenue = async (name: string, description: string, imageUrl: string) => {
    if (!userId) {
      throw new Error('You must be signed in to create a venue.');
    }

    // Force refresh the session to ensure we have a valid token
    const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
    
    console.log('=== VENUE CREATION DEBUG ===');
    console.log('1. userId from hook:', userId);
    
    if (refreshError) {
      console.error('Session refresh failed:', refreshError);
      throw new Error('Session expired. Please sign out and sign back in.');
    }

    const session = refreshData?.session;
    console.log('2. Refreshed session user id:', session?.user?.id);
    console.log('3. Session role:', session?.user?.role);
    console.log('4. Token expires at:', session?.expires_at ? new Date(session.expires_at * 1000).toISOString() : 'N/A');
    console.log('5. userId matches session:', userId === session?.user?.id);

    if (!session) {
      throw new Error('No active session after refresh. Please sign out and sign back in.');
    }

    // Verify the Supabase client is using the right auth header
    const { data: authCheck } = await supabase.rpc('auth_check').maybeSingle();
    console.log('6. RPC auth check result:', authCheck);

    const insertPayload = {
      admin_id: session.user.id, // Use session user ID directly, not the hook's userId
      name: name.trim(),
      description: description.trim(),
      image_url: imageUrl.trim(),
    };

    console.log('7. Insert payload:', JSON.stringify(insertPayload, null, 2));

    const { data, error: insertError } = await supabase
      .from('venues')
      .insert(insertPayload)
      .select()
      .single();

    if (insertError) {
      console.error('=== INSERT ERROR DETAILS ===');
      console.error('Error code:', insertError.code);
      console.error('Error message:', insertError.message);
      console.error('Error details:', insertError.details);
      console.error('Error hint:', insertError.hint);
      console.error('Full error:', JSON.stringify(insertError, null, 2));

      // Try a direct test: can we even read from the table?
      const { data: readTest, error: readError } = await supabase
        .from('venues')
        .select('id')
        .limit(1);
      console.log('8. Read test result:', readTest, 'error:', readError);

      if (insertError.code === '42P01') {
        throw new Error('The venues table does not exist. Please run the database migration.');
      }
      if (insertError.code === '42501' || insertError.message?.includes('policy') || insertError.message?.includes('denied')) {
        throw new Error(
          `Permission denied. This usually means the auth token isn't being recognized. ` +
          `Try signing out completely and signing back in. ` +
          `(code: ${insertError.code}, user: ${session.user.id})`
        );
      }
      throw new Error(`${insertError.message} (code: ${insertError.code})`);
    }

    console.log('=== INSERT SUCCESS ===');
    console.log('Created venue:', data);

    setVenues((prev) => [data, ...prev]);
    return data as Venue;
  };

  const deleteVenue = async (venueId: string) => {
    const { error: deleteError } = await supabase
      .from('venues')
      .delete()
      .eq('id', venueId)
      .eq('admin_id', userId!);

    if (deleteError) {
      console.error('Delete venue error:', deleteError);
      throw new Error(deleteError.message);
    }

    setVenues((prev) => prev.filter((v) => v.id !== venueId));
  };

  return { venues, loading, error, createVenue, deleteVenue, refetch: fetchVenues };
}
