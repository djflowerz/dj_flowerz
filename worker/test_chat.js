const fetch = require('node-fetch');

async function testChat() {
  const response = await fetch('https://djflowerz.co.ke/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      messages: [
        { role: 'user', content: 'why didn\\'t i get access to musicpool after payment. here is the receipt Payment of 200.00 from kelvinkaloki6@gmail.com [subscription_1775066420654_45] Date 1st Apr, 2026 Mobile Money falseEnding with X073' }
      ]
    })
  });
  
  const text = await response.text();
  console.log('Status:', response.status);
  console.log('Response:', text);
}

testChat();
