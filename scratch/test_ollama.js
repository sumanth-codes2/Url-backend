const apiKey = '776c62283cc7475c9b609adc6e3b0048.5giIT2Wdtj4DXlddmjEN75EY';

async function main() {
  try {
    const res = await fetch('https://ollama.com/api/tags', {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });
    console.log('Status:', res.status);
    const body = await res.text();
    console.log('Body:', body);
  } catch (err) {
    console.error('Error:', err);
  }
}

main();
