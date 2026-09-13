import os
import io
import time
import uuid
import base64
import traceback

from fastapi import FastAPI, UploadFile, File
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from PIL import Image

import uvicorn

from app import submit_function

app = FastAPI(title="CatVTON API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = "uploads"
RESULT_DIR = "results"

os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(RESULT_DIR, exist_ok=True)


def pil_to_base64(img: Image.Image):
    buffer = io.BytesIO()
    img.save(buffer, format="JPEG", quality=95)
    encoded = base64.b64encode(buffer.getvalue()).decode("utf-8")
    return f"data:image/jpeg;base64,{encoded}"


@app.get("/")
def home():
    return {
        "status": "success",
        "message": "CatVTON API Running"
    }
@app.post("/api/tryon")
async def tryon(
    person_image: UploadFile = File(...),
    cloth_image: UploadFile = File(...)
):
    start_time = time.time()

    request_id = str(uuid.uuid4())[:8]

    person_path = os.path.join(
        UPLOAD_DIR,
        f"person_{request_id}.jpg"
    )

    cloth_path = os.path.join(
        UPLOAD_DIR,
        f"cloth_{request_id}.jpg"
    )

    mask_path = os.path.join(
        UPLOAD_DIR,
        f"mask_{request_id}.png"
    )

    try:
        person_bytes = await person_image.read()
        cloth_bytes = await cloth_image.read()

        with open(person_path, "wb") as f:
            f.write(person_bytes)

        with open(cloth_path, "wb") as f:
            f.write(cloth_bytes)

        person = Image.open(person_path).convert("RGB")

        width, height = person.size

        empty_mask = Image.new(
            "RGBA",
            (width, height),
            (0, 0, 0, 0)
        )

        empty_mask.save(mask_path)

        person_dict = {
            "background": person_path,
            "layers": [mask_path]
        }

        result = submit_function(
            person_dict,
            cloth_path,
            "upper",
            50,
            4.5,
            -1,
            "result only"
        )
        if isinstance(result, (tuple, list)):
            result_image = result[0]
        else:
            result_image = result

        if isinstance(result_image, str):
            result_image = Image.open(result_image)

        if result_image.mode in ("RGBA", "P"):
            result_image = result_image.convert("RGB")

        output_path = os.path.join(
            RESULT_DIR,
            f"tryon_{request_id}.jpg"
        )

        result_image.save(
            output_path,
            format="JPEG",
            quality=95
        )

        image64 = pil_to_base64(result_image)
        return JSONResponse(
            {
                "success": True,
                "image": image64,
                "result_image": image64,
                "resultImage": image64,
                "image_url": image64,
                "url": image64,
                "output_path": output_path,
                "processing_time": round(
                    time.time() - start_time,
                    2
                )
            }
        )

    except Exception as e:
        traceback.print_exc()

        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": str(e)
            }
        )
if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "api:app",
        host="0.0.0.0",
        port=8000,
        reload=False
    )
