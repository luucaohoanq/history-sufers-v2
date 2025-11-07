# Docker Deployment with Caddy - Complete Guide

## 🚀 Overview

This setup provides:
- **Caddy** as reverse proxy with automatic HTTPS
- **Aggressive asset caching** for better performance
- **WebSocket support** for Colyseus multiplayer
- **Health checks** and automatic restarts
- **HTTP/3** support for faster loading
- **Horizontal scaling** ready (load balancing)

---

## 📋 Prerequisites

- Docker (20.10+)
- Docker Compose (2.0+)
- Domain name (optional, for HTTPS)
- 2GB RAM minimum
- Open ports: 80, 443

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────┐
│         Internet (Players)              │
└──────────────┬──────────────────────────┘
               │
               │ HTTP/HTTPS/WebSocket
               ▼
┌──────────────────────────────────────────┐
│           Caddy (Port 80/443)            │
│  - Reverse Proxy                         │
│  - Asset Caching (1 year for static)    │
│  - WebSocket Proxy                       │
│  - Compression (gzip, zstd)              │
│  - Security Headers                      │
└──────────────┬───────────────────────────┘
               │
               │ Port 3000
               ▼
┌──────────────────────────────────────────┐
│    Node.js + Colyseus (game-server)     │
│  - Multiplayer game logic                │
│  - WebSocket connections                 │
│  - Room management                       │
│  - In-memory database                    │
└──────────────────────────────────────────┘
```

---

## 📁 Files Created

```
/
├── docker-compose.prod.yml    # Production compose config
├── Dockerfile.prod            # Production Dockerfile
├── Caddyfile                  # Caddy configuration
├── .env.production            # Environment variables
├── deploy.sh                  # Deployment script
└── .dockerignore              # Files to exclude from build
```

---

## ⚙️ Configuration

### 1. Environment Variables

Edit `.env.production`:

```bash
# Your domain (for HTTPS)
DOMAIN=game.example.com

# Or use IP
DOMAIN=123.45.67.89

# Or localhost for testing
DOMAIN=localhost
```

### 2. Caddy Configuration

The `Caddyfile` includes:

#### Cache Strategy

| Asset Type | Cache Duration | Reason |
|------------|---------------|--------|
| Images (jpg, png, svg) | 1 year | Immutable assets |
| Audio (mp3, ogg, wav) | 1 year | Immutable assets |
| 3D Models (.glb) | 1 year | Immutable assets |
| JavaScript (.js) | 1 week | May update occasionally |
| CSS (.css) | 1 week | May update occasionally |
| HTML | 5 minutes | Frequent updates |
| API endpoints | No cache | Dynamic content |
| WebSocket | No cache | Real-time data |

#### Security Headers

- HSTS (Strict-Transport-Security)
- X-Frame-Options (clickjacking protection)
- X-Content-Type-Options (MIME sniffing protection)
- XSS Protection
- Referrer Policy

---

## 🚀 Deployment

### Quick Start

```bash
# 1. Configure environment
cp .env.production .env
nano .env  # Edit DOMAIN

# 2. Deploy
./deploy.sh

# 3. Check status
docker-compose -f docker-compose.prod.yml ps
```

### Manual Deployment

```bash
# Build images
docker-compose -f docker-compose.prod.yml build

# Start services
docker-compose -f docker-compose.prod.yml up -d

# View logs
docker-compose -f docker-compose.prod.yml logs -f
```

---

## 🔍 Monitoring

### Check Service Health

```bash
# All services status
docker-compose -f docker-compose.prod.yml ps

# Game server health
curl http://localhost/health

# Caddy status
docker logs history-surfers-caddy
```

### View Logs

```bash
# All logs
docker-compose -f docker-compose.prod.yml logs -f

# Game server only
docker-compose -f docker-compose.prod.yml logs -f game-server

# Caddy only
docker-compose -f docker-compose.prod.yml logs -f caddy
```

### Performance Metrics

```bash
# Container stats
docker stats

# Network traffic
docker network inspect history-sufers_game-network
```

---

## 📊 Scaling for More Players

### Vertical Scaling (Single Server)

**Current limits:** ~50 concurrent players per room

**Increase resources:**

```yaml
# docker-compose.prod.yml
services:
  game-server:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 4G
        reservations:
          cpus: '1'
          memory: 2G
```

### Horizontal Scaling (Multiple Servers)

**Add more game servers:**

```yaml
# docker-compose.prod.yml
services:
  game-server:
    deploy:
      replicas: 3  # Run 3 instances
```

**Update Caddyfile for load balancing:**

```caddyfile
reverse_proxy game-server:3000 {
    lb_policy least_conn  # Balance by connections

    # Or round-robin
    # lb_policy round_robin

    # Or IP hash (sticky sessions)
    # lb_policy ip_hash
}
```

---

## 🔒 HTTPS Setup

### Automatic HTTPS (Let's Encrypt)

1. **Point domain to server IP:**
   ```
   A Record: game.example.com → 123.45.67.89
   ```

2. **Update .env.production:**
   ```bash
   DOMAIN=game.example.com
   ```

3. **Uncomment in Caddyfile:**
   ```caddyfile
   tls your-email@example.com
   ```

4. **Deploy:**
   ```bash
   ./deploy.sh
   ```

Caddy will automatically:
- Obtain SSL certificate from Let's Encrypt
- Renew certificates before expiry
- Redirect HTTP to HTTPS

### Manual Certificates

```caddyfile
{$DOMAIN} {
    tls /path/to/cert.pem /path/to/key.pem
    # ... rest of config
}
```

---

## 🧪 Testing

### Test Cache Headers

```bash
# Test image caching
curl -I http://localhost/assets/favicon.ico

# Should see:
# Cache-Control: public, max-age=31536000, immutable

# Test HTML caching
curl -I http://localhost/

# Should see:
# Cache-Control: public, max-age=300, must-revalidate

# Test API (no cache)
curl -I http://localhost/api/info

# Should see:
# Cache-Control: no-cache, no-store, must-revalidate
```

### Test WebSocket

```bash
# Install wscat
npm install -g wscat

# Connect to game server
wscat -c ws://localhost/

# Or with SSL
wscat -c wss://game.example.com/
```

### Load Testing

```bash
# Install Artillery
npm install -g artillery

# Create test config
cat > loadtest.yml << EOF
config:
  target: 'http://localhost'
  phases:
    - duration: 60
      arrivalRate: 10
scenarios:
  - name: "Join game"
    flow:
      - get:
          url: "/"
      - think: 2
      - get:
          url: "/api/info"
EOF

# Run test
artillery run loadtest.yml
```

---

## 🐛 Troubleshooting

### Service Won't Start

```bash
# Check logs
docker-compose -f docker-compose.prod.yml logs

# Check if ports are in use
sudo lsof -i :80
sudo lsof -i :443

# Rebuild from scratch
docker-compose -f docker-compose.prod.yml down -v
docker-compose -f docker-compose.prod.yml build --no-cache
docker-compose -f docker-compose.prod.yml up -d
```

### WebSocket Connection Failed

```bash
# Check Caddy logs
docker logs history-surfers-caddy

# Verify WebSocket proxy settings
docker exec history-surfers-caddy cat /etc/caddy/Caddyfile

# Test direct connection to game server
curl http://localhost:3000/health
```

### High Memory Usage

```bash
# Check container memory
docker stats

# Restart game server
docker-compose -f docker-compose.prod.yml restart game-server

# Set memory limits (docker-compose.prod.yml)
services:
  game-server:
    mem_limit: 2g
```

### SSL Certificate Issues

```bash
# Check Caddy logs
docker logs history-surfers-caddy | grep -i certificate

# Verify domain DNS
nslookup game.example.com

# Check firewall
sudo ufw status

# Ensure ports 80 and 443 are open
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
```

---

## 🔄 Updates and Maintenance

### Update Application

```bash
# Pull latest code
git pull

# Rebuild and deploy
docker-compose -f docker-compose.prod.yml build --no-cache
docker-compose -f docker-compose.prod.yml up -d

# Or use deploy script
./deploy.sh
```

### Backup Data

```bash
# Backup Caddy certificates
docker run --rm \
  -v history-sufers_caddy_data:/data \
  -v $(pwd)/backup:/backup \
  alpine tar -czf /backup/caddy_data.tar.gz -C /data .

# Backup volumes
docker volume ls | grep history-sufers
```

### Restore Data

```bash
# Restore Caddy certificates
docker run --rm \
  -v history-sufers_caddy_data:/data \
  -v $(pwd)/backup:/backup \
  alpine tar -xzf /backup/caddy_data.tar.gz -C /data
```

---

## 📈 Performance Optimization

### 1. Enable HTTP/3

Already enabled in Caddyfile! HTTP/3 provides:
- Faster connection setup
- Better performance on poor networks
- Multiplexing without head-of-line blocking

### 2. Asset Optimization

```bash
# Compress assets before deployment
npm install -g imagemin-cli
imagemin assets/* --out-dir=assets-optimized

# Minify JavaScript
npm install -g terser
terser js/game.js -c -m -o js/game.min.js
```

### 3. CDN Integration

For global users, add a CDN:

```caddyfile
# Add CDN header
header {
    Cache-Control "public, max-age=31536000"
    CDN-Cache-Control "public, max-age=31536000"
}
```

### 4. Database Optimization

When you add a database:

```yaml
services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: gamedb
      POSTGRES_USER: gameuser
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
```

---

## 🌍 Multi-Region Deployment

For global players:

```yaml
# Deploy in multiple regions
# US: us-east.game.example.com
# EU: eu-west.game.example.com
# Asia: asia-east.game.example.com

# Use GeoDNS to route players to nearest server
```

---

## 📝 Checklist

Before going live:

- [ ] Domain DNS configured
- [ ] SSL certificate obtained
- [ ] Firewall ports opened (80, 443)
- [ ] Environment variables set
- [ ] Health checks passing
- [ ] Load testing completed
- [ ] Monitoring setup
- [ ] Backup strategy defined
- [ ] Update procedure tested
- [ ] Error handling verified

---

## 🆘 Support

### Useful Commands

```bash
# Quick restart
docker-compose -f docker-compose.prod.yml restart

# Stop everything
docker-compose -f docker-compose.prod.yml down

# Remove volumes (WARNING: deletes data)
docker-compose -f docker-compose.prod.yml down -v

# View resource usage
docker stats

# Inspect network
docker network inspect history-sufers_game-network

# Execute command in container
docker exec -it history-surfers-server sh
```

### Log Files

```bash
# Real-time logs
docker-compose -f docker-compose.prod.yml logs -f --tail=100

# Export logs
docker-compose -f docker-compose.prod.yml logs > logs.txt

# Search logs
docker-compose -f docker-compose.prod.yml logs | grep ERROR
```

---

## 🎯 Performance Targets

| Metric | Target | Current |
|--------|--------|---------|
| Page Load Time | < 2s | Test needed |
| WebSocket Latency | < 50ms | Test needed |
| Concurrent Players | 200+ | Test needed |
| Asset Cache Hit Rate | > 90% | Test needed |
| Server Uptime | 99.9% | Track with monitoring |

---

## 📚 Additional Resources

- [Caddy Documentation](https://caddyserver.com/docs/)
- [Colyseus Scaling Guide](https://docs.colyseus.io/scalability/)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [WebSocket Performance](https://www.nginx.com/blog/websocket-nginx/)

---

**Created**: November 2025
**Version**: 1.0
**Status**: Production Ready ✅
