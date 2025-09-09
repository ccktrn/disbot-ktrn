#!/bin/bash

# cd to the bin directory
cd "$(dirname "$0")"
mkdir -p ../bin
cd ../bin/

# clean up old files
echo -n "old files cleaning up..."
rm -rf ./*
echo "done!"

# load yt-dlp binary for linux
echo -n "yt-dlp binary loading..."
curl -fsSL -o ./yt-dlp https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux
echo "done!"

# load ffmpeg binary for linux
echo -n "ffmpeg binary loading..."
curl -fsSL -o ./ffmpeg-master-latest-linux64-gpl.tar.xz https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-linux64-gpl.tar.xz
tar --wildcards -xf ffmpeg-master-latest-linux64-gpl.tar.xz ffmpeg-master-latest-linux64-gpl/bin/* -C ./ 
mv ffmpeg-master-latest-linux64-gpl/bin/* ./
rm -rf ffmpeg-master-latest-linux64-gpl/ ffmpeg-master-latest-linux64-gpl.tar.xz
echo "done!"

# make binaries executable
chmod +x ./*

echo "setup complete!"