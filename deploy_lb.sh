#!/usr/bin/env bash
set -euo pipefail

WEB01_IP="${1:-<WEB_01_IP>}"
WEB02_IP="${2:-<WEB_02_IP>}"

if [[ "$WEB01_IP" == "<WEB_01_IP>" || "$WEB02_IP" == "<WEB_02_IP>" ]]; then
  echo "Usage: sudo ./deploy_lb.sh <WEB_01_IP> <WEB_02_IP>"
  exit 1
fi

sudo apt-get update -y
sudo apt-get install -y haproxy

if [ ! -f /etc/haproxy/haproxy.cfg.bak ]; then
  sudo cp /etc/haproxy/haproxy.cfg /etc/haproxy/haproxy.cfg.bak
fi

sudo tee /etc/haproxy/haproxy.cfg >/dev/null <<EOF
global
    log /dev/log local0
    log /dev/log local1 notice
    chroot /var/lib/haproxy
    stats socket /run/haproxy/admin.sock mode 660 level admin
    stats timeout 30s
    user haproxy
    group haproxy
    daemon

defaults
    log     global
    mode    http
    option  httplog
    option  dontlognull
    option  forwardfor
    timeout connect 5000ms
    timeout client  50000ms
    timeout server  50000ms

frontend http_front
    bind *:80
    default_backend web_servers

backend web_servers
    balance roundrobin
    option httpchk GET /
    server web-01 ${WEB01_IP}:80 check
    server web-02 ${WEB02_IP}:80 check
EOF

sudo haproxy -c -f /etc/haproxy/haproxy.cfg
sudo systemctl enable haproxy
sudo systemctl restart haproxy

if command -v ufw >/dev/null 2>&1 && sudo ufw status | grep -q "Status: active"; then
  sudo ufw allow 80/tcp
fi

echo "HAProxy load balancer configured for web-01 ($WEB01_IP) and web-02 ($WEB02_IP)."
#!/usr/bin/env bash
set -euo pipefail

WEB01_IP="${1:-<WEB_01_IP>}"
WEB02_IP="${2:-<WEB_02_IP>}"

if [[ "$WEB01_IP" == "<WEB_01_IP>" || "$WEB02_IP" == "<WEB_02_IP>" ]]; then
  echo "Usage: sudo ./deploy_lb.sh <WEB_01_IP> <WEB_02_IP>"
  exit 1
fi

sudo apt-get update -y
sudo apt-get install -y haproxy

if [ ! -f /etc/haproxy/haproxy.cfg.bak ]; then
  sudo cp /etc/haproxy/haproxy.cfg /etc/haproxy/haproxy.cfg.bak
fi

sudo tee /etc/haproxy/haproxy.cfg >/dev/null <<EOF
global
    log /dev/log local0
    log /dev/log local1 notice
    chroot /var/lib/haproxy
    stats socket /run/haproxy/admin.sock mode 660 level admin
    stats timeout 30s
    user haproxy
    group haproxy
    daemon

defaults
    log     global
    mode    http
    option  httplog
    option  dontlognull
    option  forwardfor
    timeout connect 5000ms
    timeout client  50000ms
    timeout server  50000ms

frontend http_front
    bind *:80
    default_backend web_servers

backend web_servers
    balance roundrobin
    option httpchk GET /
    server web-01 ${WEB01_IP}:80 check
    server web-02 ${WEB02_IP}:80 check
EOF

sudo haproxy -c -f /etc/haproxy/haproxy.cfg
sudo systemctl enable haproxy
sudo systemctl restart haproxy

if command -v ufw >/dev/null 2>&1 && sudo ufw status | grep -q "Status: active"; then
  sudo ufw allow 80/tcp
fi

echo "HAProxy load balancer configured for web-01 ($WEB01_IP) and web-02 ($WEB02_IP)."
