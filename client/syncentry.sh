#!/bin/bash

if [ ! -d "./entry" ]; then
  git clone git@github.com:HanSight-Dev/pentagon-entry.git ./entry
  git checkout dev
else
  cd entry
  git checkout dev
  git pull origin dev
fi
