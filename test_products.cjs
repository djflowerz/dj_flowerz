require('dotenv').config();
const axios = require('axios');
axios.get(process.env.VITE_SUPABASE_URL + '/rest/v1/products?select=count', {
  headers: {
    'apikey': process.env.VITE_SUPABASE_ANON_KEY,
    'Authorization': 'Bearer ' + process.env.VITE_SUPABASE_ANON_KEY
  }
}).then(res => console.log('Products:', res.status, res.data)).catch(err => console.log('Products:', err.response ? err.response.data : err.message));
