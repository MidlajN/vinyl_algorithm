from pathlib import Path
import uuid

from fastapi import (
    APIRouter,
    File,
    Query,
    UploadFile,
    HTTPException
)

from services.vinyl_analyser import analyse_vinyl


router = APIRouter()

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

@router.post("/")
async def analyse(
    image: UploadFile = File(...),
    debug: bool = Query(False)
):

     # validate file type
    if not image.content_type.startswith("image/"):
        raise HTTPException(
            status_code=400,
            detail="File must be an image"
        )

    # unique filename
    extension = Path(image.filename).suffix

    filename = (
        f"{uuid.uuid4()}{extension}"
    )

    file_path = (
        UPLOAD_DIR / filename
    )

    # save file
    with open(file_path, "wb") as f:
        content = await image.read()
        f.write(content)

    # run algorithm
    result = analyse_vinyl(
        str(file_path),
        debug=debug
    )

    return result


@router.get("/test")
def test_analysis():

    result = analyse_vinyl(
        "debug/vinyl.jpg",
        debug=True
    )

    return result