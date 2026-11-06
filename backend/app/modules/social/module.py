from app.modules.social.repository import initialize_database
from app.modules.social.routes import router
from app.registry import Module

MODULE = Module(name="social", router=router, startup=(initialize_database,))
