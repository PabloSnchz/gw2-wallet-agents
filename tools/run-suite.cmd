@echo off
for %%f in (tests\*.test.js tests\*.smoke.js) do (
  echo === %%f
  node "%%f" 2>&1 | findstr /C:"pass /"
)
