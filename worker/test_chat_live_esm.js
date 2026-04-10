import fetch from 'node-fetch';

async function testChat() {
  const startRes = await fetch('https://djflowerz.co.ke/api/chat/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'kelvinkaloki6@gmail.com' })
  });
  const startData = await startRes.json();
  const sessionId = startData.sessionId;

  const msgRes = await fetch('https://djflowerz.co.ke/api/chat/message', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId,
      text: "I paid for access but don't have it. Here is my receipt: Payment of 200.00 from kelvinkaloki6@gmail.com [subscription_1775066420654_45] Date: 1st Apr, 2026"
    })
  });
  
  if (!msgRes.ok) {
    console.error('Failed:', msgRes.status, await msgRes.text());
    return;
  }
  
  const msgData = await msgRes.json();
  
  // Wait a moment for DB update
  await new Promise(r => setTimeout(r, 1000));
  
  const sessionRes = await fetch(`https://djflowerz.co.ke/api/chat/session/${sessionId}`);
  const sessionData = await sessionRes.json();
  
  const messages = sessionData.messages || [];
  const lastBotMsg = messages.reverse().find(m => m.sender === 'bot');
  
  console.log('Bot Response:', lastBotMsg ? lastBotMsg.text : 'No bot response found');
}

testChat();
