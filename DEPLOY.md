# Deploy AgriMap Uganda to www.skyquestintel.com

## Ports used (no conflict with existing amharic app)
| Service | Container Port | Host Port |
|---------|---------------|-----------|
| Amharic Frontend (existing) | 80 | 127.0.0.1:3000 |
| Amharic Backend (existing) | 8000 | 127.0.0.1:8000 |
| **Uganda Frontend (new)** | 80 | **127.0.0.1:3001** |
| **Uganda Backend (new)** | 8000 | **127.0.0.1:8001** |

---

## Step 1 — DNS Setup
Add these DNS records for `skyquestintel.com` pointing to the EC2 public IP:

```
A    skyquestintel.com       → <EC2_PUBLIC_IP>
A    www.skyquestintel.com   → <EC2_PUBLIC_IP>
```

---

## Step 2 — Upload project to EC2

```bash
# From your local machine (run from the uganda/ folder)
scp -r -i your-key.pem . ec2-user@<EC2_PUBLIC_IP>:~/uganda/
```

Or use git if you have a repo set up.

---

## Step 3 — Build & start containers on EC2

```bash
cd ~/uganda
docker compose up -d --build
```

Verify:
```bash
docker ps
# Should see: uganda-frontend (port 3001), uganda-backend (port 8001)
# Plus existing: amharic-frontend (port 3000), amharic-backend (port 8000), amharic-mongodb
```

---

## Step 4 — SSL certificate

```bash
# Get cert for skyquestintel.com (both bare + www)
sudo certbot certonly --nginx -d skyquestintel.com -d www.skyquestintel.com
```

---

## Step 5 — Nginx config

```bash
# Copy the nginx config
sudo cp ~/uganda/skyquestintel.conf /etc/nginx/conf.d/skyquestintel.conf

# Test config
sudo nginx -t

# Reload
sudo systemctl reload nginx
```

---

## Step 6 — Verify

```bash
# Test backend health
curl -k https://www.skyquestintel.com/api/health

# Open in browser
# https://www.skyquestintel.com
```

---

## Quick Troubleshooting

```bash
# Check container logs
docker logs uganda-frontend
docker logs uganda-backend

# Rebuild after code changes
docker compose up -d --build

# Check nginx error log
sudo tail -f /var/log/nginx/error.log
```
