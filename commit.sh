#!/bin/bash

cd ~/SECURITY_FRONTEND
git checkout dev
git add .
git commit -m "update"
git push origin dev
git checkout production
git pull origin production
git pull origin dev
git push origin production
git checkout main
git pull origin main
git pull origin production
git push origin main
git checkout dev
