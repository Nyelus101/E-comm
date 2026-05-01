# backend/alembic/env.py
from logging.config import fileConfig
from sqlalchemy import engine_from_config, pool
from alembic import context
import os
import sys

# Add the backend directory to Python path so we can import our app
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from app.config import settings
from app.database import Base
import app.models  # noqa: F401 — must import all models so Alembic sees them

config = context.config

# Override the sqlalchemy.url from alembic.ini with our settings
config.set_main_option("sqlalchemy.url", settings.DATABASE_URL)

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata  # This tells Alembic what tables should exist


def run_migrations_offline():
    url = config.get_main_option("sqlalchemy.url")
    context.configure(url=url, target_metadata=target_metadata, literal_binds=True)
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online():
    connectable = engine_from_config(
        config.get_section(config.config_ini_section),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
        # connect_args={"sslmode": "require"},
    )
    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()










## Second code doesn't seem to be working right
# # backend/alembic/env.py
# import os
# import sys
# from logging.config import fileConfig
# from sqlalchemy import engine_from_config, pool
# from alembic import context

# sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

# from app.config import settings
# from app.database import Base
# import app.models  # noqa

# config = context.config

# # Use LOCAL_DATABASE_URL if available (running from local venv)
# # Fall back to DATABASE_URL (running inside Docker)
# db_url = os.getenv("LOCAL_DATABASE_URL") or settings.DATABASE_URL
# config.set_main_option("sqlalchemy.url", db_url)

# if config.config_file_name is not None:
#     fileConfig(config.config_file_name)

# target_metadata = Base.metadata


# def run_migrations_offline() -> None:
#     url = config.get_main_option("sqlalchemy.url")
#     context.configure(url=url, target_metadata=target_metadata, literal_binds=True)
#     with context.begin_transaction():
#         context.run_migrations()


# def run_migrations_online() -> None:
#     connectable = engine_from_config(
#         config.get_section(config.config_ini_section),
#         prefix="sqlalchemy.",
#         poolclass=pool.NullPool,
#     )
#     with connectable.connect() as connection:
#         context.configure(connection=connection, target_metadata=target_metadata)
#         with context.begin_transaction():
#             context.run_migrations()


# if context.is_offline_mode():
#     run_migrations_offline()
# else:
#     run_migrations_online()