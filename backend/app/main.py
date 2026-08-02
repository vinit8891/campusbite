from app.routes.restaurant import router as restaurant_router
from fastapi import FastAPI
from app.db.database import database

app = FastAPI(
    title="CampusBite API",
    version="1.0.0"
)

app.include_router(restaurant_router)

@app.get("/")
async def root():
    return {
        "message": "CampusBite API Running 🚀"
    }

@app.get("/test-db")
async def test_db():

    collections = await database.list_collection_names()

    return {
        "connected": True,
        "collections": collections
    }