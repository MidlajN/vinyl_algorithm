from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routes.analyse import router as analyse_router


app = FastAPI(
    title="Vinyl Analysis API",
    version="1.0.0"
)


# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # temporary for MVP
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {
        "message": "Vinyl API Running"
    }


@app.get("/health")
def health():
    return {
        "status": "healthy"
    }


app.include_router(
    analyse_router,
    prefix="/api/analyse",
    tags=["Analyse"]
)