@echo off
echo Installing dependencies...
pip install -r requirements.txt

echo.
echo Starting NULLMESH v0 server...
echo The browser will open automatically. Keep this window open!
echo.

start http://127.0.0.1:8080/
python server.py
