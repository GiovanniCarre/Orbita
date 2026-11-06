from app.modules.mail.repository import initialize_database
from app.modules.mail.routes import router
from app.registry import Module

MODULE = Module(name="mail", router=router, startup=(initialize_database,))
