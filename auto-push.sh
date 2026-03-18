#!/bin/bash
cd ~/Documents/projects/propra
git add .
git diff --cached --quiet || git commit -m "Auto-save: $(date '+%Y-%m-%d %H:%M')" && git push
