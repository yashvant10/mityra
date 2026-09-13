const key = '59fff3dd2dmsh473f65d3ff8c8bbp1e3321jsnc9990015d0ca';

async function testMatch(query) {
  const url = 'https://real-time-product-search.p.rapidapi.com/search?q=' + encodeURIComponent(query) + '&country=in&language=en&page=1';
  const res = await fetch(url, {
    headers: {
      'x-rapidapi-key': key,
      'x-rapidapi-host': 'real-time-product-search.p.rapidapi.com'
    }
  });
  const json = await res.json();
  const prods = json.data?.products || [];
  console.log(`=== Query: "${query}" -> ${prods.length} results ===`);
  prods.slice(0, 4).forEach((p, i) => {
    console.log(`[Item ${i}]`);
    console.log('  Title:', p.product_title);
    console.log('  Photo:', p.product_photos?.[0]);
    console.log('  Offer Store:', p.offer?.store_name);
    console.log('  Stores:', JSON.stringify(p.stores || []));
  });
}

(async () => {
  await testMatch('roadster men solid casual denim shirt flipkart');
  await testMatch('the bear house men slim fit shirt ajio');
})();
