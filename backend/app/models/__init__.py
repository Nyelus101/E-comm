# backend/app/models/__init__.py

# This imports all models so Alembic can see them all for migrations:

from app.models.user import User, UserRole
from app.models.product import Product
from app.models.order import Order, OrderItem, OrderStatus
from app.models.cart import Cart, CartItem
from app.models.review import Review