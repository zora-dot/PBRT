const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

// Helper to determine if we should redirect to main site
const shouldRedirectToMain = (host) => {
  const shortDomain = process.env.VITE_CLIENT_URL_SHORTENER?.replace(/^https?:\/\//, '') || 'pb-rt.com';
  return host === shortDomain;
};

// Always log in production for debugging
const log = (message, data) => {
  console.log(message, data);
};

exports.handler = async (event) => {
  log('🔵 Redirect function triggered with:', {
    path: event.path,
    method: event.httpMethod,
    headers: event.headers,
    host: event.headers.host
  });

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, OPTIONS'
      }
    };
  }

  try {
    // Extract shortId from path
    const segments = event.path.split('/').filter(Boolean);
    const shortId = segments[segments.length - 1];
    log('🟡 Processing shortId:', shortId);

    if (!shortId) {
      log('⚠️ No shortId found, redirecting to homepage');
      return {
        statusCode: 302,
        headers: { 
          'Location': 'https://www.pastebinrichtext.com',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      };
    }

    // Query the shortened_urls table
    log('🟠 Querying Supabase for shortId:', shortId);
    const { data: urlData, error: urlError } = await supabase
      .from('shortened_urls')
      .select('paste_id, full_original_url')
      .eq('short_id', shortId)
      .single();

    log('🔍 Supabase response:', { data: urlData, error: urlError });

    if (urlError || !urlData) {
      log('🔴 Supabase Error or No Data:', { error: urlError, shortId });
      return {
        statusCode: 302,
        headers: { 
          'Location': 'https://www.pastebinrichtext.com',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      };
    }

    // Determine redirect URL based on domain
    let redirectUrl;
    if (shouldRedirectToMain(event.headers.host)) {
      // If on short domain, redirect to main site
      redirectUrl = `https://www.pastebinrichtext.com/p/${urlData.paste_id}`;
    } else {
      // On main site, use the original URL if it's external, otherwise use internal path
      redirectUrl = urlData.full_original_url.startsWith('http')
        ? urlData.full_original_url
        : `/p/${urlData.paste_id}`;
    }

    log('🟢 Redirecting to:', redirectUrl);

    // Increment click count
    try {
      const { error: rpcError } = await supabase.rpc('increment_short_url_clicks', {
        paste_id_param: urlData.paste_id
      });

      if (rpcError) {
        log('⚠️ Error incrementing click count:', rpcError);
      }
    } catch (error) {
      log('⚠️ Error calling increment_short_url_clicks:', error);
    }

    return {
      statusCode: 302,
      headers: {
        'Location': redirectUrl,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    };
  } catch (error) {
    log('🔴 Error processing redirect:', error);
    return {
      statusCode: 302,
      headers: { 
        'Location': 'https://www.pastebinrichtext.com',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    };
  }
};