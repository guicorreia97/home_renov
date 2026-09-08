import atexit
import logging
import logging.config
import os
import queue
import sys
from logging.handlers import QueueHandler, QueueListener, RotatingFileHandler

from app.logging.json_formatter import MyAppFilter, MyJSONFormatter


class LogConfig:
    _instance = None

    def __new__(cls, *args: object, **kwargs: object) -> "LogConfig":
        if not cls._instance:
            cls._instance = super().__new__(cls)
            cls._is_configured = False
        return cls._instance

    def configure_logging(self) -> None:
        """
        Configure the logging setup for the application.
        """

        if self._is_configured:
            # Avoids configuring the logging twice, adding handlers unnecessarily
            return

        # Create logs directory if it doesn't exist
        os.makedirs("logs", exist_ok=True)

        # Setup queue and queue handler
        log_queue = queue.Queue()
        queue_handler = QueueHandler(log_queue)

        # Define log formatters
        console_formatter = logging.Formatter(
            "%(asctime)s | %(levelname)s:\t%(message)s", datefmt="%d-%m-%YT%H:%M:%S.%z"
        )
        file_formatter = MyJSONFormatter(
            fmt_keys={
                "level": "levelname",
                "message": "message",
                "timestamp": "timestamp",
                "logger": "name",
                "module": "module",
                "function": "funcName",
                "line": "lineno",
                "thread_name": "threadName",
            }
        )

        # Setup ConsoleHandler
        console_handler = logging.StreamHandler(sys.stderr)
        console_handler.setLevel(logging.WARNING)
        console_handler.setFormatter(console_formatter)

        # Setup RotatingFileHandler
        file_handler = RotatingFileHandler("logs/app.log", maxBytes=10485760, backupCount=5)
        file_handler.setLevel(logging.DEBUG)
        file_handler.setFormatter(file_formatter)
        file_handler.addFilter(MyAppFilter())

        # Setup QueueListener to listen from handlers
        listener = QueueListener(
            log_queue, console_handler, file_handler, respect_handler_level=True
        )

        # Get root logger and configure it
        root_logger = logging.getLogger()
        root_logger.addHandler(queue_handler)
        root_logger.setLevel(logging.DEBUG)

        # Start the listener and ensure it stops when the application exits
        listener.start()
        atexit.register(listener.stop)

        self._is_configured = True

    def get_logger(self) -> logging.Logger:
        """
        Gets the logger instance for the module.
        """
        return logging.getLogger(__name__)


log_config = LogConfig()
