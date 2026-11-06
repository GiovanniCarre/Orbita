from app.modules.overview.routes import router
from app.registry import Module

MODULE = Module(name="overview", router=router)
