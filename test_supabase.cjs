require('dotenv').config();
const axios = require('axios');
axios.get(process.env.VITE_SUPABASE_URL + '/rest/v1/scanned_tracks?select=count', {
  headers: {
    'apikey': process.env.VITE_SUPABASE_ANON_KEY,
    'Authorization': 'Bearer ' + process.env.VITE_SUPABASE_ANON_KEY
  }
}).then(res => console.log(res.status, res.data)).catch(err => console.log(err.response ? err.response.data : err.message));
