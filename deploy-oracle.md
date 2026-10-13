# Deploy Xness on Oracle Cloud (Always Free)

Same Docker Compose setup as AWS, on one free Arm VM.

```
Browser ──HTTPS──► Nginx (host :443)
                    ├─ /    → web          127.0.0.1:3000
                    └─ /v1  → http_server  127.0.0.1:4000
                                  │ Redis Streams
                     engine ◄─────┴────► price_poller ◄── Backpack WS
                        │
                     Postgres (127.0.0.1:5432)   Redis (127.0.0.1:6379)
```

## ⚠️ Stay at $0 — two rules
1. **Never click "Upgrade to Pay As You Go."** Billing only starts after an upgrade.
2. **Only create resources labelled "Always Free-eligible."** Trial-credit resources are deleted after 30 days.

Also: **Billing → Budgets → create a ₹1 / $1 alert** as a safety net.

---

## 0. Push the repo fixes first
The server clones from GitHub, so push the latest local changes:
```bash
git add -A && git commit -m "prod hardening for Oracle deploy" && git push origin main
```

## 1. Create the account
- [oracle.com/cloud/free](https://www.oracle.com/cloud/free/) → **Start for Free**
- **Home Region:** `ap-mumbai-1` or `ap-hyderabad-1` (permanent, and Always Free only works here)
- Card: credit card or credit-like debit card (not prepaid/virtual). Indian cards: enable international transactions first.

## 2. Create the VM
**Compute → Instances → Create Instance**

| Setting | Value |
|---|---|
| Name | `xness-production` |
| Image | Canonical **Ubuntu 22.04** |
| Shape | Ampere → **VM.Standard.A1.Flex** |
| OCPUs / Memory | **2 / 12 GB** (Always Free max) |
| Network | New VCN + public subnet, ✅ **Assign public IPv4** |
| SSH key | Generate → download private key → `~/.ssh/xness-oracle.key` |
| Boot volume | 100 GB |

> "Out of capacity"? Retry later or try another Availability Domain.

## 3. Open ports 80/443
**OCI firewall:** Networking → VCN → public subnet → Security List → Add Ingress Rules: `0.0.0.0/0` TCP **80** and **443**.
Do **not** open 3000, 4000, 5432, or 6379.

**OS firewall** (after SSH, step 4):
```bash
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT
sudo netfilter-persistent save
```

## 4. SSH in
```bash
chmod 400 ~/.ssh/xness-oracle.key
ssh -i ~/.ssh/xness-oracle.key ubuntu@YOUR_PUBLIC_IP
```

## 5. Docker + swap
```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker ubuntu && exit        # SSH back in after this

sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile
sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

## 6. Deploy
```bash
git clone https://github.com/sforsanjnarao/xness.git && cd xness

cat > .env <<ENV
POSTGRES_USER=sanjana
POSTGRES_PASSWORD=$(openssl rand -hex 16)
POSTGRES_DB=postgres
DOMAIN=velocity.bitshitfalse.com
JWT_SECRET=$(openssl rand -hex 32)
ENV

docker compose -f docker-compose.prod.yml up -d --build      # ~10–15 min first time

docker compose -f docker-compose.prod.yml exec http_server \
  sh -c "cd /app/packages/db && npx prisma migrate deploy"

docker compose -f docker-compose.prod.yml restart engine
docker compose -f docker-compose.prod.yml ps                  # all 6 "Up"
```
> The engine restarts in a loop until migrations run. That's expected; the restart above clears it.

## 7. Nginx + DNS + SSL
```bash
sudo apt-get install -y nginx certbot python3-certbot-nginx
sudo cp nginx.conf /etc/nginx/sites-available/default
sudo sed -i 's/yourdomain.com www.yourdomain.com/velocity.bitshitfalse.com/' /etc/nginx/sites-available/default
sudo nginx -t && sudo systemctl restart nginx
```
**DNS:** `A  velocity → YOUR_PUBLIC_IP`. Wait until `dig +short velocity.bitshitfalse.com` returns the IP, then:
```bash
sudo certbot --nginx -d velocity.bitshitfalse.com     # choose "redirect"
```
Open **https://velocity.bitshitfalse.com** 🎉

---

## Cheatsheet
```bash
cd ~/xness
docker compose -f docker-compose.prod.yml logs -f --tail=50            # logs
git pull && docker compose -f docker-compose.prod.yml up -d --build    # redeploy
docker compose -f docker-compose.prod.yml exec -T postgres \
  pg_dump -U sanjana postgres > backup_$(date +%F).sql                 # backup
```

## Good to know
- **Idle reclaim:** Oracle may *stop* (not charge for) an Always Free VM that stays under 20% CPU, network, **and** memory for 7 days. If the site goes down, start the VM again in the console. Containers come back automatically (`restart: always`).
- **Account idle 30+ days** may be suspended. Log into the console occasionally.
