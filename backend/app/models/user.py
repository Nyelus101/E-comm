# backend/app/models/user.py
from sqlalchemy import Column, String, Boolean, DateTime, Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
import enum
from app.database import Base


class UserRole(str, enum.Enum):
    """
    Enum means the value can only be one of these options.
    str inheritance means it serializes to a plain string ("customer", "admin").
    """
    CUSTOMER = "customer"
    ADMIN = "admin"


class User(Base):
    """
    The 'users' table in PostgreSQL.

    Each attribute decorated with Column() becomes a column in the table.
    Types like String, Boolean, DateTime map to PostgreSQL types.
    """
    __tablename__ = "users"

    # UUID primary key — more secure than sequential integers
    # (an attacker can't guess user IDs like 1, 2, 3...)
    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        index=True,
    )

    email = Column(String(255), unique=True, nullable=False, index=True)
    # index=True creates a database index — makes searching by email very fast

    hashed_password = Column(String(255), nullable=False)
    # We NEVER store plain text passwords — only bcrypt hashes

    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    phone = Column(String(20), nullable=True)

    role = Column(SAEnum(UserRole), default=UserRole.CUSTOMER, nullable=False)

    # Email verification
    is_verified = Column(Boolean, default=False, nullable=False)
    # Token stored temporarily during email confirmation
    verification_token = Column(String(255), nullable=True)

    # Account status (admin can deactivate users)
    is_active = Column(Boolean, default=True, nullable=False)

    # Password reset
    password_reset_token = Column(String(255), nullable=True)
    password_reset_expires = Column(DateTime(timezone=True), nullable=True)

    # Timestamps — server_default means the DB sets this automatically
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # ─── Relationships ───────────────────────────────────────
    # SQLAlchemy "knows" that one User has many Orders.
    # back_populates creates a two-way link: order.user and user.orders both work.
    orders = relationship("Order", back_populates="user", lazy="dynamic")
    cart = relationship("Cart", back_populates="user", uselist=False)
    reviews = relationship("Review", back_populates="user")

    def __repr__(self):
        return f"<User {self.email}>"