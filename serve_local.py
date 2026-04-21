#!/usr/bin/env python3

from __future__ import annotations

import contextlib
import http.server
import os
import socket
import socketserver
import sys
import webbrowser
from pathlib import Path


HOST = "127.0.0.1"
START_PORT = 8426
PROJECT_DIR = Path(__file__).resolve().parent


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(PROJECT_DIR), **kwargs)

    def end_headers(self) -> None:
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()


class ReusableTCPServer(socketserver.TCPServer):
    allow_reuse_address = True


def is_port_available(port: int) -> bool:
    with contextlib.closing(socket.socket(socket.AF_INET, socket.SOCK_STREAM)) as sock:
        return sock.connect_ex((HOST, port)) != 0


def pick_port() -> int:
    for port in range(START_PORT, START_PORT + 25):
        if is_port_available(port):
            return port
    raise RuntimeError("未找到可用端口，请稍后重试。")


def main() -> int:
    os.chdir(PROJECT_DIR)
    port = pick_port()
    url = f"http://{HOST}:{port}/"

    with ReusableTCPServer((HOST, port), NoCacheHandler) as httpd:
        print(f"Creditopia local site running at {url}")
        print("Press Ctrl+C to stop the server.")
        webbrowser.open(url)
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServer stopped.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
