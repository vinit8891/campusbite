from fastapi import FastAPI

app = FastAPI(
    title="CampusBite API",
    version="1.0.0",
    description="Backend API for CampusBite"
)

@app.get("/")
def root():
    return {
        "message": "Welcome to CampusBite API 🚀"
    }

@app.get("/health")
def health():
    return {
        "status": "healthy"
    }