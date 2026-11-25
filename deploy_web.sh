#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/root/Campus-Weather-Study-Planner"
cd "$APP_DIR"

npm install --omit=dev

cat << 'EOF' > /etc/nginx/sites-available/default
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
EOF

ln -sf /etc/nginx/sites-available/default /etc/nginx/sites-enabled/default
nginx -t

pkill -f "node server.js" || true
nohup npm start > /var/log/campus-planner.log 2>&1 &

service nginx status || service nginx start
service nginx reload
