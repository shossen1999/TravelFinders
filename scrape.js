const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

const travelMateUrl = 'https://www.travelmate.com.bd/product-category/tours/';
const tripComHtmlPath = path.join(__dirname, 'Trip.com Official Site__ _ Travel Deals and Promotions.html');

function makeAbsoluteUrl(base, relative) {
  if (!relative) return null;
  if (relative.startsWith('http')) return relative;
  return new URL(relative, base).href;
}

async function scrape() {
  const results = [];

  // Scrape TravelMate
  try {
    const { data } = await axios.get(travelMateUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    const $ = cheerio.load(data);

    $('li.product').each((i, el) => {
  const location = $(el).find('h2.woocommerce-loop-product__title').text().trim();
  const rating = $(el).find('div.star-rating').attr('aria-label') || 'Not rated';
  const price = $(el).find('span.price').text().trim() || 'Not available';

 
  let image = null;

  
  const imgEl = $(el).find('img.attachment-woocommerce_thumbnail, img');

  image = imgEl.attr('data-srcset') || imgEl.attr('srcset') || imgEl.attr('data-src') || imgEl.attr('src') || null;

  if (image) {
    
    if (image.includes(',')) {
      image = image.split(',')[0].trim().split(' ')[0];
    }
  } else {
    image = 'No image';
  }

  image = makeAbsoluteUrl(travelMateUrl, image);

  if (location) {
    results.push({
      id: results.length + 1,
      Travel_Location: location,
      Location_Rating: rating,
      Travel_Cost: price,
      Image_URL: image
    });
  }
});

    console.log(` TravelMate scraped: ${results.length}`);
  } catch (err) {
    console.error('Failed to scrape TravelMate:', err.message);
  }

  // Scrape Trip.com
  try {
    const html = fs.readFileSync(tripComHtmlPath, 'utf-8');
    const $ = cheerio.load(html);

    $('.c-hot-hotel-item-v2__name').each((i, el) => {
      const location = $(el).text().trim() || "Unknown";
      const rating = $(el).closest('.c-hot-hotel-item-v2').find('.c-hot-hotel-item-v2__level').text().trim() || "Not rated";
      const price = $(el).closest('.c-hot-hotel-item-v2').find('.o-price__content').text().trim() || "Not available";

      
      const style = $(el).closest('.c-hot-hotel-item-v2').find('.c-hot-hotel-item-v2__image').attr('style') || '';
      
      const imageMatch = style.match(/url\(["']?(.*?)["']?\)/);
      const image = imageMatch ? imageMatch[1] : 'No image';

      if (location !== "Unknown") {
        results.push({
          id: results.length + 1,
          Travel_Location: location,
          Location_Rating: rating,
          Travel_Cost: price,
          Image_URL: image
        });
      }
    });

    console.log(`Trip.com scraped: ${results.length}`);
  } catch (err) {
    console.error(' Failed to parse Trip.com HTML:', err.message);
  }

  // Save JSON
  try {
    fs.writeFileSync('./data/travel_data.json', JSON.stringify(results, null, 2));
    console.log(` Total saved records: ${results.length}`);
  } catch (err) {
    console.error(' Failed to save JSON file:', err.message);
  }
}

scrape();
