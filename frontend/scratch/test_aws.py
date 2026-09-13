import requests
import io
from PIL import Image
import base64

def create_dummy_image(color, filename):
    img = Image.new('RGB', (800, 1200), color=color)
    buf = io.BytesIO()
    img.save(buf, format='PNG')
    buf.seek(0)
    return buf

def test_aws():
    person_img = create_dummy_image('blue', 'person.png')
    cloth_img = create_dummy_image('red', 'cloth.png')
    
    files = {
        'person_image': ('person.png', person_img, 'image/png'),
        'cloth_image': ('cloth.png', cloth_img, 'image/png')
    }
    
    print("Sending request to AWS VTO backend...")
    response = requests.post('http://44.220.126.206:8000/api/tryon', files=files)
    
    print("Status:", response.status_code)
    print("Content-Type:", response.headers.get('content-type'))
    
    if response.status_code == 200:
        if 'application/json' in response.headers.get('content-type', ''):
            data = response.json()
            print("Response keys:", data.keys())
            if 'result_image' in data:
                print("Result image length:", len(data['result_image']))
        else:
            try:
                result = Image.open(io.BytesIO(response.content))
                print("Result image dimensions:", result.size)
            except Exception as e:
                print("Could not open image:", e)
    else:
        print("Response:", response.text[:200])

if __name__ == '__main__':
    test_aws()
