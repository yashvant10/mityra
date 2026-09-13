const url = "https://real-time-amazon-data.p.rapidapi.com/search?query=B0B63P6952&country=IN";

async function testFetch() {
  try {
    const res = await fetch(url, {
      headers: {
        'x-rapidapi-key': 'your-key-here', // Wait, I need the real key from env. I'll just import the service
      }
    });
  } catch(e) {}
}
