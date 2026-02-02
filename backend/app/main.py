from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.config import get_settings
from app.logging_config import setup_logging, get_logger
from app.api.routes import documents, mindmap, nodes, qa, search

settings = get_settings()
logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Setup logging first
    setup_logging()
    logger.info("Starting Claude Constitution Explorer API")
    logger.info(f"Debug mode: {settings.debug}")
    logger.info(f"Document model: {settings.claude_model_document}")
    logger.info(f"Q&A model: {settings.claude_model_qa}")
    logger.info(f"Search model: {settings.claude_model_search}")

    # Startup: create upload directory
    settings.upload_dir.mkdir(parents=True, exist_ok=True)
    logger.info(f"Upload directory: {settings.upload_dir.absolute()}")

    yield

    # Shutdown
    logger.info("Shutting down API")


app = FastAPI(
    title=settings.project_name,
    openapi_url=f"{settings.api_v1_prefix}/openapi.json",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(
    documents.router, prefix=f"{settings.api_v1_prefix}/documents", tags=["documents"]
)
app.include_router(
    mindmap.router, prefix=f"{settings.api_v1_prefix}/mindmap", tags=["mindmap"]
)
app.include_router(
    nodes.router, prefix=f"{settings.api_v1_prefix}/nodes", tags=["nodes"]
)
app.include_router(qa.router, prefix=f"{settings.api_v1_prefix}/qa", tags=["qa"])
app.include_router(
    search.router, prefix=f"{settings.api_v1_prefix}/search", tags=["search"]
)


@app.get("/health")
async def health_check():
    return {"status": "healthy"}
