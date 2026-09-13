const axios = require('axios');
const FormData = require('form-data');

async function testVTO() {
    console.log("Starting VTO test with Axios...");
    try {
        const personImage = Buffer.from(
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
            'base64'
        );
        const clothImage = Buffer.from(
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
            'base64'
        );

        const form = new FormData();
        form.append('person_image', personImage, { filename: 'person.png', contentType: 'image/png' });
        form.append('cloth_image', clothImage, { filename: 'cloth.png', contentType: 'image/png' });

        const res = await axios.post('http://44.220.126.206:8000/api/tryon', form, {
            headers: form.getHeaders(),
            responseType: 'arraybuffer'
        });

        console.log("Status:", res.status);
        console.log("Content-Type:", res.headers['content-type']);
        
        if (res.headers['content-type'].includes('application/json')) {
            const data = JSON.parse(res.data.toString('utf8'));
            console.log("Response keys:", Object.keys(data));
        } else {
            console.log("Response length:", res.data.length);
        }
        
    } catch (e) {
        console.error("Error:", e.message);
        if (e.response) {
            console.error("Response:", e.response.status, e.response.data.toString('utf8').substring(0, 100));
        }
    }
}

testVTO();
